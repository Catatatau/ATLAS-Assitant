import { useState, useRef, useCallback, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

// Camera processing is local/on-device

// Object class → icon emoji mapping for richer UI
const OBJ_ICONS = {
  person: '🧍', chair: '🪑', car: '🚗', dog: '🐕', cat: '🐈',
  bottle: '🍶', cup: '☕', laptop: '💻', phone: '📱', book: '📚',
  keyboard: '⌨️', mouse: '🖱️', tv: '📺', monitor: '🖥️',
  cell_phone: '📱', remote: '📡', scissors: '✂️', clock: '🕐',
  vase: '🏺', potted_plant: '🌿', backpack: '🎒', umbrella: '☂️',
  handbag: '👜', tie: '👔', suitcase: '🧳', sports_ball: '⚽',
  bicycle: '🚲', motorcycle: '🏍️', airplane: '✈️', bus: '🚌',
  train: '🚂', truck: '🚚', boat: '⛵',
};

// Class → color for bounding boxes
const OBJ_COLORS = {
  person:  [255, 100, 100],
  default: [0,   210, 190],
};

function getObjColor(cls) {
  return OBJ_COLORS[cls] || OBJ_COLORS.default;
}

// Draw all object detections on a canvas context
function drawObjects(ctx, W, H, predictions) {
  predictions.forEach(pred => {
    const [x, y, w, h] = pred.bbox;
    const [r, g, b] = getObjColor(pred.class);
    const label = `${OBJ_ICONS[pred.class] || '📦'} ${pred.class} ${Math.round(pred.score * 100)}%`;

    // Bounding box with corner accents
    ctx.save();

    // Dashed box
    ctx.strokeStyle = `rgba(${r},${g},${b},0.65)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Corner brackets (solid)
    const cLen = Math.min(20, w * 0.2, h * 0.2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'square';
    // TL
    ctx.beginPath(); ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen); ctx.stroke();

    // Box glow
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // Label background
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const textW = ctx.measureText(label).width;
    const padH = 6, padV = 4;
    const labelH = 18;
    const labelY = y - labelH - 2 < 0 ? y + 2 : y - labelH - 2;

    ctx.fillStyle = `rgba(${Math.floor(r*0.2)},${Math.floor(g*0.2)},${Math.floor(b*0.2)},0.88)`;
    ctx.beginPath();
    ctx.roundRect(x, labelY, textW + padH * 2, labelH, 4);
    ctx.fill();

    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(x, labelY, textW + padH * 2, labelH, 4);
    ctx.stroke();

    // Label text
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.fillText(label, x + padH, labelY + labelH - padV);

    ctx.restore();
  });
}

export default function useObjectDetection(videoRef, enabled) {
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const lastDetectRef = useRef(0);
  const pendingRef = useRef(false);
  const latestPredictionsRef = useRef([]);

  // Load COCO-SSD with mobilenet_v2 (better accuracy vs lite_mobilenet_v2)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        // Use mobilenet_v2 for better object recognition
        const model = await cocoSsd.load({ base: 'mobilenet_v2' });
        if (cancelled) return;
        modelRef.current = model;
        setIsModelLoaded(true);
      } catch (err) {
        // Fallback to lite version
        try {
          const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (!cancelled) {
            modelRef.current = model;
            setIsModelLoaded(true);
          }
        } catch (e) {
          console.error('[ATLAS Vision] Object detection model load error:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
      setIsModelLoaded(false);
      modelRef.current = null;
      latestPredictionsRef.current = [];
    };
  }, [enabled]);

  // Async detection loop: runs detection every ~150ms independently
  // This avoids blocking the animation frame loop
  const scheduleDetect = useCallback(() => {
    if (pendingRef.current) return;
    const now = performance.now();
    const elapsed = now - lastDetectRef.current;
    const delay = Math.max(0, 150 - elapsed); // ~6-7 FPS for object detection (heavier model)

    setTimeout(() => {
      const video = videoRef.current;
      const model = modelRef.current;
      if (!video || !model || video.readyState < 2 || !enabled) {
        pendingRef.current = false;
        return;
      }

      pendingRef.current = true;
      lastDetectRef.current = performance.now();

      model.detect(video)
        .then(predictions => {
          const filtered = predictions.filter(p => p.score > 0.45);
          latestPredictionsRef.current = filtered;
          setDetectedObjects(filtered.map(p => ({
            label: p.class,
            icon: OBJ_ICONS[p.class] || '📦',
            confidence: Math.round(p.score * 100),
            bbox: p.bbox,
          })));
        })
        .catch(() => {})
        .finally(() => {
          pendingRef.current = false;
        });
    }, delay);
  }, [videoRef, enabled]);

  // Keep scheduling detection while enabled
  useEffect(() => {
    if (!enabled || !isModelLoaded) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      scheduleDetect();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isModelLoaded, scheduleDetect]);

  return { detectedObjects, latestPredictions: latestPredictionsRef };
}

// Export drawing utility for the unified renderer
export { drawObjects, getObjColor };
