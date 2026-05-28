import React, { useEffect, useRef } from 'react';
import { useVision } from './VisionProvider.jsx';

export default function VirtualMouse() {
  const { landmarks, cameraEnabled } = useVision();
  const cursorRef = useRef(null);
  const clickStateRef = useRef({
    isClicking: false,
    lastClickTime: 0,
  });

  useEffect(() => {
    if (!cameraEnabled) return;
    
    // We only use the primary hand (landmarks[0]) for the mouse
    const hand = landmarks?.[0];
    if (!hand || !hand.landmarks || hand.landmarks.length < 21) {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      return;
    }

    const lm = hand.landmarks;

    const palmAnchors = [0, 5, 9, 13, 17];
    const palmCenter = palmAnchors.reduce((acc, idx) => {
      acc.x += lm[idx].x;
      acc.y += lm[idx].y;
      return acc;
    }, { x: 0, y: 0 });
    palmCenter.x /= palmAnchors.length;
    palmCenter.y /= palmAnchors.length;

    // Screen dimensions
    const W = window.innerWidth;
    const H = window.innerHeight;

    let cursorX = 0;
    let cursorY = 0;

    const isFullscreen = document.querySelector('.vision-container.fullscreen') !== null;

    if (isFullscreen) {
      // Fullscreen mode (Laser pointer): Map to exact letterboxed video frame for visual alignment
      let vLeft = 0, vTop = 0, vWidth = W, vHeight = H;
      const video = document.querySelector('.vision-video');
      if (video && video.videoWidth) {
        const containerRatio = W / H;
        const videoRatio = video.videoWidth / video.videoHeight;
        if (containerRatio > videoRatio) {
          vHeight = H;
          vWidth = H * videoRatio;
          vLeft = (W - vWidth) / 2;
        } else {
          vWidth = W;
          vHeight = W / videoRatio;
          vTop = (H - vHeight) / 2;
        }
      }
      cursorX = vLeft + (1 - palmCenter.x) * vWidth;
      cursorY = vTop + palmCenter.y * vHeight;
    } else {
      // Preview mode (Trackpad): Map 0-1 to window dimensions so the pointer moves globally
      cursorX = (1 - palmCenter.x) * W;
      cursorY = palmCenter.y * H;
    }

    if (cursorRef.current) {
      cursorRef.current.style.opacity = '1';
      cursorRef.current.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    }

    // Detect FIST to click instead of pinch
    const isClicking = hand.gesture === 'Punho';

    const st = clickStateRef.current;
    const now = performance.now();

    if (isClicking && !st.isClicking) {
      st.isClicking = true;
      
      // Debounce clicks to avoid spamming
      if (now - st.lastClickTime > 400) {
        st.lastClickTime = now;
        
        // Visual feedback for click
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${cursorX}px, ${cursorY}px) scale(0.6)`;
          cursorRef.current.style.background = 'rgba(255, 90, 70, 0.88)';
          cursorRef.current.style.boxShadow = '0 0 24px rgba(255,90,70,0.65), inset 0 0 10px rgba(255,255,255,0.4)';
        }

        // 1. Hide cursor temporarily so elementFromPoint doesn't hit the cursor itself
        if (cursorRef.current) cursorRef.current.style.display = 'none';
        
        // 2. Find element under the pointer
        const element = document.elementFromPoint(cursorX, cursorY);
        
        // 3. Restore cursor
        if (cursorRef.current) cursorRef.current.style.display = 'flex';

        // 4. Trigger click if it's a valid element
        if (element) {
          element.click(); // Works for buttons, links, etc.
        }
      }
    } else if (!isClicking && st.isClicking) {
      st.isClicking = false;
      if (cursorRef.current) {
        cursorRef.current.style.background = 'rgba(0, 220, 255, 0.58)';
        cursorRef.current.style.boxShadow = '0 0 18px rgba(0,220,255,0.7), inset 0 0 10px rgba(255,255,255,0.35)';
      }
    }

  }, [landmarks, cameraEnabled]);

  if (!cameraEnabled) return null;

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: -12, left: -12,
        width: 24, height: 24,
        borderRadius: '50%',
        background: 'rgba(0, 220, 255, 0.58)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        pointerEvents: 'none',
        zIndex: 999999,
        transition: 'transform 0.05s linear, background 0.18s, opacity 0.2s, box-shadow 0.18s',
        opacity: 0,
        boxShadow: '0 0 18px rgba(0,220,255,0.7), inset 0 0 10px rgba(255,255,255,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px #fff' }} />
    </div>
  );
}
