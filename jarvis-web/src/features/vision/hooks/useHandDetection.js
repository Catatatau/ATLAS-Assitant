import { useState, useRef, useCallback, useEffect } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

// Camera processing is local/on-device

// Full 21-point hand skeleton with finger groupings for colored rendering
const FINGER_CONNECTIONS = [
  // Thumb
  { joints: [[0,1],[1,2],[2,3],[3,4]], color: [255, 100, 80] },
  // Index
  { joints: [[0,5],[5,6],[6,7],[7,8]], color: [80, 200, 255] },
  // Middle
  { joints: [[9,10],[10,11],[11,12]], color: [100, 255, 150] },
  // Ring
  { joints: [[13,14],[14,15],[15,16]], color: [255, 200, 80] },
  // Pinky
  { joints: [[17,18],[18,19],[19,20]], color: [200, 100, 255] },
  // Palm base
  { joints: [[0,5],[0,9],[0,13],[0,17],[5,9],[9,13],[13,17]], color: [160, 220, 255] },
  // MCP connections
  { joints: [[0,9],[9,10]], color: [100, 255, 150] },
  { joints: [[0,13],[13,14]], color: [255, 200, 80] },
];

// Flat list for efficient rendering
const ALL_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // thumb
  [0,5],[5,6],[6,7],[7,8],       // index
  [0,9],[9,10],[10,11],[11,12],  // middle
  [0,13],[13,14],[14,15],[15,16],// ring
  [0,17],[17,18],[18,19],[19,20],// pinky
  [5,9],[9,13],[13,17],          // palm
];
const PALM_ANCHORS = [0, 5, 9, 13, 17];

// Which landmark indices belong to each finger tip/segment
const FINGER_SEGMENTS = [
  { indices: [0,1,2,3,4],        color: [255, 110, 90] },   // thumb
  { indices: [5,6,7,8],          color: [80, 210, 255] },   // index
  { indices: [9,10,11,12],       color: [90, 255, 160] },   // middle
  { indices: [13,14,15,16],      color: [255, 210, 90] },   // ring
  { indices: [17,18,19,20],      color: [210, 100, 255] },  // pinky
  { indices: [0],                color: [200, 230, 255] },  // wrist
];

// Connection finger color map
const CONNECTION_COLORS = (() => {
  const map = {};
  FINGER_SEGMENTS.forEach(({ indices, color }) => {
    indices.forEach(i => { map[i] = color; });
  });
  return map;
})();

// Gesture labels in pt-BR
const GESTURE_PT_BR = {
  None: 'Desconhecido',
  Closed_Fist: 'Punho',
  Open_Palm: 'Palma Aberta',
  Pointing_Up: 'Apontando',
  Thumb_Down: 'Polegar p/ Baixo',
  Thumb_Up: 'Polegar p/ Cima',
  Victory: 'Vitória (V)',
  ILoveYou: 'Eu te amo (🤘)',
};

// Landmark importance for ball size
const LANDMARK_SIZE = [
  8, // wrist - large
  4,4,4,6,  // thumb
  4,4,4,6,  // index
  4,4,4,6,  // middle
  4,4,4,6,  // ring
  4,4,4,6,  // pinky
];

// Two distinct color schemes for left/right hands
const HAND_THEMES = [
  { primary: [0, 220, 255], secondary: [0, 140, 180], core: [230, 255, 250] },
  { primary: [255, 170, 40], secondary: [190, 80, 20], core: [255, 245, 220] },
];

function getPalmCenterPx(handLm, W, H) {
  const center = PALM_ANCHORS.reduce((acc, idx) => {
    acc.x += handLm[idx].x;
    acc.y += handLm[idx].y;
    return acc;
  }, { x: 0, y: 0 });

  return {
    x: (center.x / PALM_ANCHORS.length) * W,
    y: (center.y / PALM_ANCHORS.length) * H,
  };
}

// Draw a single hand skeleton on a given canvas context
function drawHandSkeleton(ctx, handLm, W, H, theme, alpha = 1) {
  const { primary: [pr, pg, pb], secondary: [sr, sg, sb], core = [255, 255, 255] } = theme;
  const [kr, kg, kb] = core;
  const palmCenter = getPalmCenterPx(handLm, W, H);
  const palmPoints = PALM_ANCHORS.map((idx) => ({
    x: handLm[idx].x * W,
    y: handLm[idx].y * H,
  }));

  ctx.save();
  ctx.beginPath();
  palmPoints.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  const palmGlow = ctx.createRadialGradient(palmCenter.x, palmCenter.y, 4, palmCenter.x, palmCenter.y, 70);
  palmGlow.addColorStop(0, `rgba(${pr},${pg},${pb},${alpha * 0.28})`);
  palmGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = palmGlow;
  ctx.fill();
  ctx.strokeStyle = `rgba(${kr},${kg},${kb},${alpha * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // ─── Draw connections with gradient + glow ───
  ALL_CONNECTIONS.forEach(([a, b]) => {
    const ax = handLm[a].x * W, ay = handLm[a].y * H;
    const bx = handLm[b].x * W, by = handLm[b].y * H;

    const colorA = CONNECTION_COLORS[a] || [pr, pg, pb];
    const colorB = CONNECTION_COLORS[b] || [pr, pg, pb];

    const grad = ctx.createLinearGradient(ax, ay, bx, by);
    grad.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},${alpha * 0.9})`);
    grad.addColorStop(1, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},${alpha * 0.9})`);

    // Glow pass
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${alpha * 0.35})`;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();

    // Sharp line
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

    ctx.strokeStyle = `rgba(${kr},${kg},${kb},${alpha * 0.7})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  });

  // ─── Draw landmark dots with glow ───
  handLm.forEach((pt, idx) => {
    const x = pt.x * W, y = pt.y * H;
    const baseColor = CONNECTION_COLORS[idx] || [pr, pg, pb];
    const size = (LANDMARK_SIZE[idx] || 4);
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    const isWrist = idx === 0;

    // Glow halo
    const glowR = size * 3;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    glow.addColorStop(0, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha * 0.5})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();

    // Outer ring (fingertips and wrist only)
    if (isTip || isWrist) {
      ctx.strokeStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha * 0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, size + 3, 0, Math.PI * 2); ctx.stroke();
    }

    // Core dot
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.beginPath(); ctx.arc(x, y, size * 0.55, 0, Math.PI * 2); ctx.fill();

    // Colored dot center
    ctx.fillStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha * 0.8})`;
    ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2); ctx.fill();
  });

  const orb = ctx.createRadialGradient(palmCenter.x, palmCenter.y, 0, palmCenter.x, palmCenter.y, 34);
  orb.addColorStop(0, `rgba(${kr},${kg},${kb},${alpha})`);
  orb.addColorStop(0.35, `rgba(${pr},${pg},${pb},${alpha * 0.72})`);
  orb.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
  ctx.fillStyle = orb;
  ctx.beginPath(); ctx.arc(palmCenter.x, palmCenter.y, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(${kr},${kg},${kb},${alpha * 0.7})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(palmCenter.x, palmCenter.y, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(${kr},${kg},${kb},${alpha * 0.95})`;
  ctx.beginPath(); ctx.arc(palmCenter.x, palmCenter.y, 5, 0, Math.PI * 2); ctx.fill();
}

export default function useHandDetection(videoRef, enabled) {
  const [handDetected, setHandDetected] = useState(false);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState([]);
  const [rawResults, setRawResults] = useState(null); // raw mediapipe results for unified renderer
  const recognizerRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(-1);

  // Load model
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (cancelled) return;

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          recognizer.close();
          return;
        }
        recognizerRef.current = recognizer;
        setIsModelLoaded(true);
      } catch (err) {
        console.error('[ATLAS Vision] Gesture model load error:', err);
      }
    })();

    return () => {
      cancelled = true;
      setIsModelLoaded(false);
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, [enabled]);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const recognizer = recognizerRef.current;

    if (!video || !recognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    // Deduplicate timestamps — MediaPipe requires strictly increasing timestamps
    if (now <= lastTimeRef.current) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimeRef.current = now;

    try {
      const results = recognizer.recognizeForVideo(video, now);

      if (results.landmarks && results.landmarks.length > 0) {
        setHandDetected(true);
        setRawResults(results);
        const allLandmarks = [];

        results.landmarks.forEach((handLm, idx) => {
          let gestureName = 'None';
          let conf = 0;
          if (results.gestures && results.gestures[idx] && results.gestures[idx].length > 0) {
            const topGesture = results.gestures[idx][0];
            gestureName = topGesture.categoryName;
            conf = topGesture.score;
          }

          const translatedGesture = GESTURE_PT_BR[gestureName] || gestureName;
          const hand = results.handedness?.[idx]?.[0]?.categoryName || 'Unknown';

          allLandmarks.push({ landmarks: handLm, gesture: translatedGesture, confidence: conf, handedness: hand });

          if (idx === 0) {
            setCurrentGesture(translatedGesture);
            setConfidence(Math.round(conf * 100));
          }
        });

        setLandmarks(allLandmarks);
      } else {
        setHandDetected(false);
        setCurrentGesture(null);
        setConfidence(0);
        setLandmarks([]);
        setRawResults(null);
      }
    } catch (err) {
      // Silently handle frame-level errors
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  // Start/stop detection loop
  useEffect(() => {
    if (enabled && isModelLoaded && recognizerRef.current) {
      rafRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isModelLoaded, detect]);

  return { handDetected, currentGesture, confidence, landmarks, rawResults };
}

// Export drawing utility for the unified renderer
export { drawHandSkeleton, HAND_THEMES };
