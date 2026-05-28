import { useEffect, useRef } from 'react';

const NUM_RINGS = 55;
const NUM_PTS = 180;
const INNER = 52;
const OUTER = 102;

function easeAmp(target, current, speed) {
  return current + (target - current) * speed;
}

export default function AtlasOrb({ state = 'idle', stateLabel = 'em espera' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(state);
  const sizeRef = useRef(320);
  const audioRef = useRef({
    stream: null,
    ctx: null,
    analyser: null,
    dataArray: null,
    audioLevel: 0,
    targetAmp: 0,
    currentAmp: 0,
    time: 0,
    raf: null,
  });

  stateRef.current = state;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const updateSize = () => {
      const rect = wrap.getBoundingClientRect();
      const size = Math.round(Math.min(rect.width, rect.height)) || 320;
      if (size !== sizeRef.current) {
        sizeRef.current = size;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = size;
          canvas.height = size;
        }
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const stopMic = () => {
      audio.stream?.getTracks().forEach((t) => t.stop());
      audio.stream = null;
      audio.analyser = null;
      audio.dataArray = null;
      audio.ctx?.close().catch(() => {});
      audio.ctx = null;
    };

    if (state !== 'listening') {
      stopMic();
      return stopMic;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audio.stream = stream;
        audio.ctx = ctx;
        audio.analyser = analyser;
        audio.dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        /* visualização segue sem áudio */
      }
    })();

    return () => {
      cancelled = true;
      stopMic();
    };
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const audio = audioRef.current;

    const getAudioLevel = () => {
      if (!audio.analyser || !audio.dataArray) return 0;
      audio.analyser.getByteFrequencyData(audio.dataArray);
      let sum = 0;
      for (let i = 0; i < audio.dataArray.length; i += 1) sum += audio.dataArray[i];
      return (sum / audio.dataArray.length) / 255;
    };

    const draw = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) {
        audio.raf = requestAnimationFrame(draw);
        return;
      }

      const CX = W / 2;
      const CY = H / 2;
      const scale = W / 320;
      const inner = INNER * scale;
      const outer = OUTER * scale;

      ctx.clearRect(0, 0, W, H);

      if (s === 'listening') {
        audio.audioLevel = getAudioLevel();
      } else {
        audio.audioLevel *= 0.92;
      }

      if (s === 'idle') {
        audio.targetAmp = (5.5 + Math.sin(audio.time * 0.4) * 1.2) * scale;
      } else if (s === 'listening') {
        audio.targetAmp = (8 + audio.audioLevel * 38) * scale;
      } else {
        audio.targetAmp = (12 + Math.sin(audio.time * 2.2) * 5) * scale;
      }
      audio.currentAmp = easeAmp(audio.targetAmp, audio.currentAmp, 0.08);

      const spd = s === 'idle' ? 0.5 : s === 'listening' ? 1.4 : 1.1;
      let r = 0;
      let g = 200;
      let b = 220;
      if (s === 'responding') {
        g = 210;
        b = 180;
      }

      for (let ri = 0; ri < NUM_RINGS; ri += 1) {
        const t = ri / (NUM_RINGS - 1);
        const radius = inner + t * (outer - inner);
        const midness = 1 - Math.abs(t - 0.5) * 2;
        const alpha = 0.06 + midness * 0.18 + audio.audioLevel * 0.12;
        const phaseOffset = ri * 0.22;

        ctx.beginPath();
        for (let pi = 0; pi <= NUM_PTS; pi += 1) {
          const angle = (pi / NUM_PTS) * Math.PI * 2;
          const w1 = Math.sin(angle * 9 + audio.time * spd * 1.3 + phaseOffset) * audio.currentAmp * 1.0;
          const w2 = Math.sin(angle * 5 - audio.time * spd * 0.9 + phaseOffset * 1.4) * audio.currentAmp * 0.55;
          const w3 = Math.sin(angle * 14 + audio.time * spd * 0.6 + phaseOffset * 0.7) * audio.currentAmp * 0.3;
          const w4 = Math.sin(angle * 3 - audio.time * spd * 1.7 + phaseOffset * 2.1) * audio.currentAmp * 0.2;
          const rr = radius + w1 + w2 + w3 + w4;
          const x = CX + Math.cos(angle) * rr;
          const y = CY + Math.sin(angle) * rr;
          if (pi === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = Math.max(0.6, 0.85 * scale);
        ctx.stroke();
      }

      const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, inner);
      grd.addColorStop(0, `rgba(${r},${g},${b},${0.04 + audio.audioLevel * 0.08})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const grd2 = ctx.createRadialGradient(CX, CY, outer - 10 * scale, CX, CY, outer + 30 * scale + audio.currentAmp);
      grd2.addColorStop(0, `rgba(${r},${g},${b},${0.04 + audio.audioLevel * 0.06})`);
      grd2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd2;
      ctx.fillRect(0, 0, W, H);

      audio.time += 0.016;
      audio.raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (audio.raf) cancelAnimationFrame(audio.raf);
    };
  }, []);

  return (
    <div className="orb-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} id="orb-canvas" aria-hidden="true" />
      <div className="state-label">{stateLabel}</div>
    </div>
  );
}
