import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import useCamera from '../hooks/useCamera.js';
import useHandDetection from '../hooks/useHandDetection.js';
import useObjectDetection from '../hooks/useObjectDetection.js';
import useCavemanSummary from '../hooks/useCavemanSummary.js';

// Camera processing is local/on-device

const VisionContext = createContext(null);

export function useVision() {
  const ctx = useContext(VisionContext);
  if (!ctx) throw new Error('useVision must be used within VisionProvider');
  return ctx;
}

export default function VisionProvider({ children }) {
  const canvasRef = useRef(null);
  const fpsRef = useRef({ count: 0, last: performance.now(), value: 0 });
  const [fps, setFps] = useState(0);

  const { videoRef, cameraEnabled, cameraError, startCamera, stopCamera } = useCamera();
  
  // Notice we removed canvasRef from the hook calls since rendering is now unified
  const { 
    handDetected, currentGesture, confidence, landmarks, rawResults 
  } = useHandDetection(videoRef, cameraEnabled);
  
  const { 
    detectedObjects, latestPredictions 
  } = useObjectDetection(videoRef, cameraEnabled);
  
  const { lastVisionSummary, isCompressing, compress } = useCavemanSummary();

  // FPS counter
  useEffect(() => {
    if (!cameraEnabled) {
      setFps(0);
      return;
    }

    let raf;
    const tick = () => {
      const f = fpsRef.current;
      f.count++;
      const now = performance.now();
      if (now - f.last >= 1000) {
        f.value = f.count;
        f.count = 0;
        f.last = now;
        setFps(f.value);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraEnabled]);

  // Trigger Caveman summary for the chat
  const analyzeFrame = useCallback(async () => {
    const raw = {
      hands: landmarks.map(h => ({
        gesture: h.gesture,
        confidence: h.confidence,
        handedness: h.handedness,
      })),
      objects: detectedObjects,
      fps,
      ts: Date.now(),
    };
    return compress(raw);
  }, [landmarks, detectedObjects, fps, compress]);

  const value = {
    // Refs for VisionCamera component
    videoRef,
    canvasRef, // Use this canvasRef for the unified renderer
    // State
    cameraEnabled,
    cameraError,
    handDetected,
    currentGesture,
    detectedObjects,
    latestPredictions, // Ref to latest object predictions for 60fps rendering
    rawResults,        // Raw mediapipe hand results for 60fps rendering
    lastVisionSummary,
    isCompressing,
    confidence,
    fps,
    landmarks,
    // Actions
    startCamera,
    stopCamera,
    analyzeFrame,
  };

  return (
    <VisionContext.Provider value={value}>
      {children}
    </VisionContext.Provider>
  );
}
