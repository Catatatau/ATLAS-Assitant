import React, { useRef, useEffect } from 'react';
import { useVision } from '../context/VisionProvider.jsx';
import { drawHandSkeleton, HAND_THEMES } from '../hooks/useHandDetection.js';
import { drawObjects } from '../hooks/useObjectDetection.js';

// ─── Icosahedron geometry ───
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(v => { const l = Math.hypot(...v); return [v[0]/l, v[1]/l, v[2]/l]; });

const ICO_FACES = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
];
const edgeSet = new Set();
ICO_FACES.forEach(([a,b,c]) => {
  [[a,b],[b,c],[c,a]].forEach(([i,j]) => edgeSet.add(`${Math.min(i,j)}-${Math.max(i,j)}`));
});
const ICO_EDGES = [...edgeSet].map(k => k.split('-').map(Number));

// Inner cube
const CUBE_V = [
  [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
  [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
].map(v => v.map(c => c * 0.45));
const CUBE_EDGES = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7],
];

// Rotation
const rx = (v,a) => [v[0], v[1]*Math.cos(a)-v[2]*Math.sin(a), v[1]*Math.sin(a)+v[2]*Math.cos(a)];
const ry = (v,a) => [v[0]*Math.cos(a)+v[2]*Math.sin(a), v[1], -v[0]*Math.sin(a)+v[2]*Math.cos(a)];
const rz = (v,a) => [v[0]*Math.cos(a)-v[1]*Math.sin(a), v[0]*Math.sin(a)+v[1]*Math.cos(a), v[2]];
function project(v, cx, cy, scale) {
  const z = v[2] + 4;
  return [(v[0]/z)*scale+cx, (v[1]/z)*scale+cy, z];
}

// ─── Finger counting from landmarks ───
function countFingers(handLm) {
  if (!handLm || handLm.length < 21) return 0;
  let count = 0;
  // Thumb: use y-distance method which is handedness-agnostic
  const thumbTip = handLm[4];
  const thumbIP = handLm[3];
  const thumbMCP = handLm[2];
  const thumbDist = Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y);
  const thumbRef = Math.hypot(thumbIP.x - thumbMCP.x, thumbIP.y - thumbMCP.y);
  if (thumbDist > thumbRef * 1.4) count++;

  // Index: tip (8) above PIP (6) — "above" = lower y
  if (handLm[8].y < handLm[6].y) count++;
  // Middle
  if (handLm[12].y < handLm[10].y) count++;
  // Ring
  if (handLm[16].y < handLm[14].y) count++;
  // Pinky
  if (handLm[20].y < handLm[18].y) count++;

  return count;
}

// ─── Effect definitions per finger count ───
// (Palma Aberta = 5 fingers and Punho = 0 fingers are excluded — used for cursor/click)
const FINGER_EFFECTS = {
  1: { base: [0, 200, 255],   name: 'MATRIX SCAN',      filter: 'hue-rotate(180deg) saturate(1.8) contrast(1.3)' },
  2: { base: [255, 0, 100],   name: 'CHROMATIC SPLIT',  filter: 'saturate(2.5) contrast(1.4) brightness(1.1)' },
  3: { base: [255, 140, 0],   name: 'THERMAL VISION',   filter: 'hue-rotate(320deg) saturate(3) contrast(1.5) brightness(0.9)' },
  4: { base: [130, 0, 255],   name: 'WARP FIELD',       filter: 'hue-rotate(250deg) saturate(2) contrast(1.6) brightness(1.05)' },
};
const DEFAULT_THEME = { base: [0, 220, 255], name: 'HOLOGRAM MODE' };

export default function PinchCube() {
  const { 
    landmarks, rawResults, latestPredictions, 
    cameraEnabled, videoRef, canvasRef // Now using the unified canvasRef from context
  } = useVision();
  
  const stateRef = useRef({
    cx: 0, cy: 0, scale: 90,
    rotX: 0, rotY: 0, rotZ: 0,
    dX: 0, dY: 0,
    fadePct: 0,
    autoRotX: 0, autoRotY: 0, autoRotZ: 0,
    // Effect state
    effectStrength: 0,
    activeEffect: null,
    smoothFingers: 0,
    // Particles
    trailHistory: [],
  });
  
  const lmRef = useRef([]);
  const rafRef = useRef(null);
  const prevFilterRef = useRef('');

  useEffect(() => { lmRef.current = landmarks || []; }, [landmarks]);

  useEffect(() => {
    if (!cameraEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const video = videoRef?.current;
      const st = stateRef.current;
      const lm = lmRef.current;
      const ctx = canvas.getContext('2d');

      if (video && video.videoWidth) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const t = performance.now() / 1000;

      // 1. DYNAMIC FILTERS & FINGER COUNT
      const hand = lm.length >= 1 ? lm[0] : null;
      const rawFingers = hand ? countFingers(hand.landmarks) : 0;

      st.smoothFingers += (rawFingers - st.smoothFingers) * 0.15;
      const fingers = Math.round(st.smoothFingers);

      const effect = (fingers >= 1 && fingers <= 4) ? FINGER_EFFECTS[fingers] : null;

      if (effect) {
        st.effectStrength = Math.min(1, st.effectStrength + 0.05);
        st.activeEffect = effect;
      } else {
        st.effectStrength = Math.max(0, st.effectStrength - 0.03);
        if (st.effectStrength < 0.05) st.activeEffect = null;
      }

      const eff = st.effectStrength;
      const activeEff = st.activeEffect;
      const [cr, cg, cb] = activeEff ? activeEff.base : DEFAULT_THEME.base;

      if (video) {
        let targetFilter = '';
        if (activeEff && eff > 0.1) {
          targetFilter = activeEff.filter;
        }
        if (targetFilter !== prevFilterRef.current) {
          video.style.filter = targetFilter;
          video.style.transition = 'filter 0.4s ease';
          prevFilterRef.current = targetFilter;
        }
      }

      if (activeEff && eff > 0.05) {
        drawCameraEffect(ctx, W, H, fingers, eff, t, cr, cg, cb);
      }

      // 2. UNIFIED RENDERER: OBJECT DETECTIONS
      if (latestPredictions?.current?.length > 0) {
        drawObjects(ctx, W, H, latestPredictions.current);
      }

      // 3. UNIFIED RENDERER: HAND SKELETONS
      if (rawResults?.landmarks) {
        rawResults.landmarks.forEach((handLm, idx) => {
          const themeIndex = idx % HAND_THEMES.length;
          drawHandSkeleton(ctx, handLm, W, H, HAND_THEMES[themeIndex]);
        });
      }

      // 4. HOLOGRAM & PINCH CUBE
      const getPinch = (h) => {
        if (!h?.landmarks || h.landmarks.length < 21) return null;
        const th = h.landmarks[4], ix = h.landmarks[8];
        const d = Math.hypot(th.x - ix.x, th.y - ix.y);
        if (d > 0.065) return null; // Increased pinch tolerance slightly
        return { x: ((th.x+ix.x)/2)*W, y: ((th.y+ix.y)/2)*H };
      };

      const p0 = lm.length >= 1 ? getPinch(lm[0]) : null;
      const p1 = lm.length >= 2 ? getPinch(lm[1]) : null;
      const active = p0 !== null && p1 !== null;

      st.fadePct = active ? Math.min(1, st.fadePct + 0.06) : Math.max(0, st.fadePct - 0.04);

      if (active) {
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2;
        st.cx += (mx - st.cx) * 0.12;
        st.cy += (my - st.cy) * 0.12;
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        st.scale += (dist * 0.4 - st.scale) * 0.1;
        st.rotZ += (Math.atan2(p1.y - p0.y, p1.x - p0.x) - st.rotZ) * 0.06;
        st.dX += ((p1.y - p0.y) / H * 2.5 - st.dX) * 0.08;
        st.dY += ((p1.x - p0.x) / W * 2.5 - st.dY) * 0.08;
        st.trailHistory.push({ x: st.cx, y: st.cy, t: performance.now() });
        if (st.trailHistory.length > 30) st.trailHistory.shift();
      }

      const breathe = Math.sin(t * 0.8) * 0.003;
      st.autoRotX += 0.01 + breathe;
      st.autoRotY += 0.015 + breathe * 0.5;
      st.autoRotZ += 0.005;

      if (st.fadePct > 0.01) {
        const alpha = st.fadePct;
        const pulse = 1 + Math.sin(t * 2) * 0.04;
        const energyPulse = 0.5 + Math.sin(t * 4) * 0.5;

        const transform = (verts, extraScale = 1) => verts.map(v => {
          let p = [v[0]*(1+v[2]*st.dX*0.15), v[1]*(1+v[2]*st.dY*0.15), v[2]];
          p = rx(p, st.autoRotX + st.dX*0.6);
          p = ry(p, st.autoRotY + st.dY*0.6);
          p = rz(p, st.rotZ + st.autoRotZ);
          return project(p, st.cx, st.cy, st.scale * pulse * extraScale);
        });

        const icoPts = transform(ICO_V);
        const cubePts = transform(CUBE_V);

        const sortEdges = (edges, pts) => [...edges].sort((a, b) =>
          (pts[a[0]][2]+pts[a[1]][2]) - (pts[b[0]][2]+pts[b[1]][2])
        );
        const sortedIco = sortEdges(ICO_EDGES, icoPts);
        const sortedCube = sortEdges(CUBE_EDGES, cubePts);

        if (st.trailHistory.length > 1) {
          const now = performance.now();
          ctx.save();
          for (let i = 1; i < st.trailHistory.length; i++) {
            const prev = st.trailHistory[i-1], curr = st.trailHistory[i];
            const age = (now - curr.t) / 800;
            const a = Math.max(0, (1-age) * alpha * 0.3);
            if (a <= 0) continue;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`;
            ctx.lineWidth = 2*(1-age);
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(curr.x, curr.y); ctx.stroke();
          }
          ctx.restore();
        }

        const ag = ctx.createRadialGradient(st.cx, st.cy, 0, st.cx, st.cy, st.scale*2.5);
        ag.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha*0.1})`);
        ag.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha*0.03})`);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.filter = 'blur(8px)';
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha*0.3})`;
        ctx.lineWidth = 5;
        sortedIco.forEach(([i,j]) => {
          ctx.beginPath(); ctx.moveTo(icoPts[i][0], icoPts[i][1]); ctx.lineTo(icoPts[j][0], icoPts[j][1]); ctx.stroke();
        });
        ctx.restore();

        sortedIco.forEach(([i,j]) => {
          const avgZ = (icoPts[i][2]+icoPts[j][2])/2;
          const d = Math.min(1, Math.max(0.2, avgZ/5));
          const g = ctx.createLinearGradient(icoPts[i][0], icoPts[i][1], icoPts[j][0], icoPts[j][1]);
          g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha*d})`);
          g.addColorStop(1, `rgba(${Math.min(255,cr+60)},${Math.min(255,cg+60)},${cb},${alpha*d*0.7})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.5+d;
          ctx.beginPath(); ctx.moveTo(icoPts[i][0], icoPts[i][1]); ctx.lineTo(icoPts[j][0], icoPts[j][1]); ctx.stroke();
        });

        ctx.save(); ctx.filter = 'blur(4px)';
        sortedCube.forEach(([i,j]) => {
          ctx.strokeStyle = `rgba(255,255,255,${alpha*0.15*energyPulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cubePts[i][0], cubePts[i][1]); ctx.lineTo(cubePts[j][0], cubePts[j][1]); ctx.stroke();
        });
        ctx.restore();

        sortedCube.forEach(([i,j]) => {
          const d = Math.min(1, Math.max(0.3, (cubePts[i][2]+cubePts[j][2])/10));
          ctx.strokeStyle = `rgba(255,255,255,${alpha*d*0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cubePts[i][0], cubePts[i][1]); ctx.lineTo(cubePts[j][0], cubePts[j][1]); ctx.stroke();
        });

        icoPts.forEach(([px,py,pz]) => {
          const sz = Math.min(7, Math.max(2.5, pz*1.8));
          const b = Math.min(1, Math.max(0.4, pz/5));
          const h = ctx.createRadialGradient(px,py,0, px,py,sz*4);
          h.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha*b*0.5})`);
          h.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha*b*0.15})`);
          h.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = h;
          ctx.beginPath(); ctx.arc(px, py, sz*4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${alpha*b*0.9})`;
          ctx.beginPath(); ctx.arc(px, py, sz*0.5, 0, Math.PI*2); ctx.fill();
        });

        if (alpha > 0.3) {
          ICO_FACES.map((f,i) => ({ f, z: (icoPts[f[0]][2]+icoPts[f[1]][2]+icoPts[f[2]][2])/3 }))
            .sort((a,b) => a.z - b.z)
            .forEach(({ f, z }) => {
              const a = Math.max(0, Math.min(0.06, (z/6)*0.08)) * alpha;
              if (a < 0.005) return;
              ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
              ctx.beginPath();
              ctx.moveTo(icoPts[f[0]][0], icoPts[f[0]][1]);
              ctx.lineTo(icoPts[f[1]][0], icoPts[f[1]][1]);
              ctx.lineTo(icoPts[f[2]][0], icoPts[f[2]][1]);
              ctx.closePath(); ctx.fill();
            });
        }

        if (active && alpha > 0.4) {
          [p0, p1].forEach(({ x, y }) => {
            for (let layer = 0; layer < 3; layer++) {
              const g = ctx.createLinearGradient(x, y, st.cx, st.cy);
              const la = [0.6,0.3,0.15][layer], lw = [1.5,3,6][layer];
              g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha*la})`);
              g.addColorStop(0.4, `rgba(255,255,255,${alpha*la*0.5})`);
              g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
              ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = lw;
              if (layer === 0) ctx.setLineDash([4,6]);
              ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(st.cx, st.cy); ctx.stroke(); ctx.restore();
            }
            const fg = ctx.createRadialGradient(x,y,0, x,y,22);
            fg.addColorStop(0, `rgba(255,255,255,${alpha*0.9})`);
            fg.addColorStop(0.3, `rgba(${cr},${cg},${cb},${alpha*0.6})`);
            fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(x,y,22,0,Math.PI*2); ctx.fill();
            for (let s = 0; s < 3; s++) {
              const sa = t*6+s*(Math.PI*2/3), sr = 12+Math.sin(t*3+s)*4;
              ctx.fillStyle = `rgba(255,255,255,${alpha*0.7})`;
              ctx.beginPath(); ctx.arc(x+Math.cos(sa)*sr, y+Math.sin(sa)*sr, 1.5, 0, Math.PI*2); ctx.fill();
            }
          });
        }

        if (alpha > 0.2) {
          ctx.save(); ctx.setLineDash([3,5]);
          const ringR = st.scale * 1.6;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha*0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(st.cx, st.cy, ringR, ringR*Math.abs(Math.cos(t*0.5)), t*0.3, 0, Math.PI*2);
          ctx.stroke(); ctx.restore();
          const da = t*1.5;
          ctx.fillStyle = `rgba(255,255,255,${alpha*0.8})`;
          ctx.beginPath();
          ctx.arc(st.cx+Math.cos(da)*ringR, st.cy+Math.sin(da)*ringR*Math.abs(Math.cos(t*0.5)), 2.5, 0, Math.PI*2);
          ctx.fill();
        }

        if (alpha > 0.6) {
          const label = activeEff ? activeEff.name : 'HOLOGRAM MODE';
          const labelY = st.cy + st.scale * 1.8 + 10;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          const m = ctx.measureText(label);
          const lw = m.width + 16;
          ctx.fillStyle = `rgba(0,0,0,${alpha*0.4})`;
          ctx.beginPath(); ctx.roundRect(st.cx-lw/2, labelY-8, lw, 16, 3); ctx.fill();
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha*0.3})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.roundRect(st.cx-lw/2, labelY-8, lw, 16, 3); ctx.stroke();
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha*0.85})`;
          ctx.textAlign = 'center';
          ctx.fillText(label, st.cx, labelY+3);
          ctx.textAlign = 'left';
        }
      }

      // HUD indicators
      if (fingers >= 1 && fingers <= 4 && eff > 0.2) {
        const indX = W - 60, indY = H - 40;
        for (let f = 0; f < 4; f++) {
          const fx = indX + f * 14;
          const isActive = f < fingers;
          ctx.fillStyle = isActive
            ? `rgba(${cr},${cg},${cb},${eff * 0.9})`
            : `rgba(255,255,255,${eff * 0.15})`;
          ctx.beginPath();
          ctx.arc(fx, indY, isActive ? 4 : 3, 0, Math.PI*2);
          ctx.fill();
          if (isActive) {
            const dot = ctx.createRadialGradient(fx, indY, 0, fx, indY, 10);
            dot.addColorStop(0, `rgba(${cr},${cg},${cb},${eff*0.3})`);
            dot.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = dot;
            ctx.beginPath(); ctx.arc(fx, indY, 10, 0, Math.PI*2); ctx.fill();
          }
        }
      }

      st.trailHistory = st.trailHistory.filter(p => performance.now() - p.t < 800);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      const v = videoRef?.current;
      if (v) { v.style.filter = ''; v.style.transition = ''; }
      prevFilterRef.current = '';
    };
  }, [cameraEnabled, videoRef, canvasRef]); // Added canvasRef dependency

  if (!cameraEnabled) return null;

  // We DO NOT render <canvas> here anymore because VisionCamera.jsx provides it.
  // PinchCube is now purely a rendering logic controller that hooks into the Vision context!
  return null;
}

// ════════════════════════════════════════════════════════════════
// ─── CAMERA EFFECTS (canvas overlays per finger count) ────────
// ════════════════════════════════════════════════════════════════
function drawCameraEffect(ctx, W, H, fingers, strength, t, cr, cg, cb) {
  ctx.save();

  switch (fingers) {
    case 1: {
      const scanY = ((t * 150) % (H + 100)) - 50;
      const beamH = 70;
      const beamGrad = ctx.createLinearGradient(0, scanY - beamH, 0, scanY + beamH);
      beamGrad.addColorStop(0, 'rgba(0,200,255,0)');
      beamGrad.addColorStop(0.4, `rgba(0,220,255,${strength * 0.2})`);
      beamGrad.addColorStop(0.5, `rgba(180,255,255,${strength * 0.35})`);
      beamGrad.addColorStop(0.6, `rgba(0,220,255,${strength * 0.2})`);
      beamGrad.addColorStop(1, 'rgba(0,200,255,0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, scanY - beamH, W, beamH * 2);

      const lineCount = 60;
      for (let i = 0; i < lineCount; i++) {
        const y = (i / lineCount) * H;
        const dist = Math.abs(y - scanY);
        const a = Math.max(0, 1 - dist / 120) * strength * 0.25;
        if (a < 0.01) continue;
        ctx.strokeStyle = `rgba(0,220,255,${a})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      if (strength > 0.3) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(0,220,255,${strength * 0.35})`;
        for (let i = 0; i < 6; i++) {
          const dy = scanY - 30 + i * 12;
          if (dy < 0 || dy > H) continue;
          const hex = Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join(' ').toUpperCase();
          ctx.fillText(hex, 15 + Math.sin(t + i) * 10, dy);
        }
      }

      const bLen = 40, bW = 2;
      ctx.strokeStyle = `rgba(0,220,255,${strength * 0.5})`;
      ctx.lineWidth = bW;
      const margin = 20;
      ctx.beginPath(); ctx.moveTo(margin, margin+bLen); ctx.lineTo(margin, margin); ctx.lineTo(margin+bLen, margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-margin-bLen, margin); ctx.lineTo(W-margin, margin); ctx.lineTo(W-margin, margin+bLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(margin, H-margin-bLen); ctx.lineTo(margin, H-margin); ctx.lineTo(margin+bLen, H-margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-margin-bLen, H-margin); ctx.lineTo(W-margin, H-margin); ctx.lineTo(W-margin, H-margin-bLen); ctx.stroke();
      break;
    }

    case 2: {
      const shift = strength * 15;
      const time = Math.sin(t * 3) * 5;

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,0,60,${strength * 0.08})`;
      ctx.fillRect(shift + time, -3, W, H);
      ctx.fillStyle = `rgba(0,255,200,${strength * 0.06})`;
      ctx.fillRect(-shift - time, 3, W, H);
      ctx.fillStyle = `rgba(80,0,255,${strength * 0.05})`;
      ctx.fillRect(time * 0.5, shift * 0.3, W, H);
      ctx.globalCompositeOperation = 'source-over';

      const prismX = (W * 0.5) + Math.sin(t * 1.5) * W * 0.3;
      const bandW = 100 + Math.sin(t * 2) * 30;
      const prismGrad = ctx.createLinearGradient(prismX - bandW/2, 0, prismX + bandW/2, 0);
      const colors = ['rgba(255,0,0,','rgba(255,120,0,','rgba(255,255,0,','rgba(0,255,0,','rgba(0,100,255,','rgba(130,0,255,'];
      colors.forEach((c, i) => prismGrad.addColorStop(i/(colors.length-1), c + (strength*0.12) + ')'));
      ctx.fillStyle = prismGrad;
      ctx.fillRect(prismX - bandW/2, 0, bandW, H);

      for (let i = 0; i < 8; i++) {
        const y = (t * 80 + i * 90) % (H + 200) - 100;
        ctx.strokeStyle = `rgba(255,0,100,${strength * 0.12})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(W, y + shift * 4);
        ctx.stroke();
      }
      break;
    }

    case 3: {
      const thermGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
      thermGrad.addColorStop(0, `rgba(255,200,0,${strength * 0.12})`);
      thermGrad.addColorStop(0.4, `rgba(255,100,0,${strength * 0.08})`);
      thermGrad.addColorStop(0.8, `rgba(180,0,255,${strength * 0.06})`);
      thermGrad.addColorStop(1, `rgba(0,0,80,${strength * 0.1})`);
      ctx.fillStyle = thermGrad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = `rgba(255,140,0,${strength * 0.08})`;
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      if (strength > 0.3) {
        for (let i = 0; i < 15; i++) {
          const hx = Math.sin(t * 0.7 + i * 2.3) * W * 0.4 + W/2;
          const hy = Math.cos(t * 0.5 + i * 1.7) * H * 0.4 + H/2;
          const hr = 20 + Math.sin(t * 2 + i) * 10;
          const hGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
          hGrad.addColorStop(0, `rgba(255,255,100,${strength * 0.12})`);
          hGrad.addColorStop(0.5, `rgba(255,100,0,${strength * 0.06})`);
          hGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = hGrad;
          ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI*2); ctx.fill();
        }
      }

      if (strength > 0.4) {
        const temp = (36.5 + Math.sin(t) * 0.3).toFixed(1);
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(255,200,0,${strength * 0.7})`;
        ctx.fillText(`${temp}°C`, W - 80, 30);
      }
      break;
    }

    case 4: {
      const cx = W/2, cy = H/2;
      const maxR = Math.max(W, H) * 0.5;
      for (let r = 0; r < 8; r++) {
        const radius = (r / 8) * maxR + Math.sin(t * 2 + r * 0.8) * 20;
        const warpX = Math.sin(t * 1.5 + r * 0.5) * 15;
        const warpY = Math.cos(t * 1.2 + r * 0.7) * 15;
        const a = (1 - r/8) * strength * 0.18;
        ctx.strokeStyle = `rgba(130,0,255,${a})`;
        ctx.lineWidth = 2 - r * 0.15;
        ctx.beginPath();
        ctx.ellipse(cx + warpX, cy + warpY, radius, radius * (0.8 + Math.sin(t+r)*0.2), t*0.2+r*0.3, 0, Math.PI*2);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const angle = (i/6) * Math.PI * 2 + t * 0.5;
        const len = maxR * (0.5 + Math.sin(t * 3 + i) * 0.2);
        const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle)*len, cy + Math.sin(angle)*len);
        grad.addColorStop(0, `rgba(200,100,255,${strength * 0.3})`);
        grad.addColorStop(0.5, `rgba(130,0,255,${strength * 0.15})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        let px = cx, py = cy;
        const steps = 8;
        for (let s = 1; s <= steps; s++) {
          const progress = s / steps;
          const jitter = (Math.sin(t * 5 + i * 3 + s * 7) * 8) * strength;
          px = cx + Math.cos(angle) * len * progress + Math.cos(angle + Math.PI/2) * jitter;
          py = cy + Math.sin(angle) * len * progress + Math.sin(angle + Math.PI/2) * jitter;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      if (strength > 0.3) {
        const pixSize = 12;
        const pixCount = Math.floor(strength * 20);
        for (let i = 0; i < pixCount; i++) {
          const px = Math.floor((Math.sin(t*2+i*4.7)*0.5+0.5) * W / pixSize) * pixSize;
          const py = Math.floor((Math.cos(t*1.8+i*3.1)*0.5+0.5) * H / pixSize) * pixSize;
          ctx.fillStyle = `rgba(130,0,255,${strength * 0.08})`;
          ctx.fillRect(px, py, pixSize, pixSize);
          ctx.strokeStyle = `rgba(200,100,255,${strength * 0.12})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, pixSize, pixSize);
        }
      }

      if (strength > 0.5) {
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(180,100,255,${strength * 0.4 + Math.sin(t*4)*0.1})`;
        ctx.textAlign = 'center';
        ctx.fillText('⌬ DIMENSIONAL WARP ⌬', W/2, 30);
        ctx.textAlign = 'left';
      }
      break;
    }

    default: break;
  }

  ctx.restore();
}
