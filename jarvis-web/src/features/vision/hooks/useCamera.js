import { useState, useRef, useCallback, useEffect } from 'react';
import { VISION_ERRORS } from './visionTypes.js';

/**
 * useCamera — manages getUserMedia lifecycle.
 * Camera processing is local/on-device.
 * Camera NEVER activates without explicit user click.
 */
export default function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isInsecure = window.location.protocol !== 'https:' && window.location.hostname !== 'localhost';
      setCameraError(isInsecure ? VISION_ERRORS.NOT_SECURE : VISION_ERRORS.NOT_SUPPORTED);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 99999 },
          height: { ideal: 99999 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraEnabled(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(VISION_ERRORS.PERMISSION_DENIED);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(VISION_ERRORS.NOT_FOUND);
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setCameraError(VISION_ERRORS.GENERIC);
      } else {
        setCameraError(VISION_ERRORS.GENERIC);
      }
      console.error('[ATLAS Vision] Camera error:', err);
    }
  }, []);

  // Cleanup on unmount — stop all tracks
  useEffect(() => {
    if (cameraEnabled && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraEnabled]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { videoRef, cameraEnabled, cameraError, startCamera, stopCamera };
}
