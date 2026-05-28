import React, { useEffect, useRef } from 'react';
import { useVision } from './VisionProvider.jsx';

export default function VirtualMouse() {
  const { landmarks, cameraEnabled } = useVision();
  const cursorRef = useRef(null);
  const clickStateRef = useRef({
    isPinching: false,
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

    // Palm center = midpoint between wrist (0) and middle finger MCP (9)
    const wrist = lm[0];
    const middleMCP = lm[9];
    const palmCenter = {
      x: (wrist.x + middleMCP.x) / 2,
      y: (wrist.y + middleMCP.y) / 2,
    };

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
          cursorRef.current.style.background = 'rgba(0, 255, 100, 0.8)';
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
        cursorRef.current.style.background = 'rgba(0, 220, 255, 0.5)';
      }
    }

  }, [landmarks, cameraEnabled]);

  if (!cameraEnabled) return null;

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: -10, left: -10,
        width: 20, height: 20,
        borderRadius: '50%',
        background: 'rgba(0, 220, 255, 0.5)',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        pointerEvents: 'none',
        zIndex: 999999,
        transition: 'transform 0.05s linear, background 0.2s, opacity 0.2s',
        opacity: 0,
        boxShadow: '0 0 10px rgba(0,220,255,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 4, height: 4, background: '#fff', borderRadius: '50%' }} />
    </div>
  );
}
