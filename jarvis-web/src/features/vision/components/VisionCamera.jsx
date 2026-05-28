import React, { useState } from 'react';
import { useVision } from './VisionProvider.jsx';
import PinchCube from './PinchCube.jsx';
import VirtualMouse from './VirtualMouse.jsx';

function Ti({ name, className = '' }) {
  return <i className={`ti ti-${name} ${className}`.trim()} aria-hidden="true" />;
}

export default function VisionCamera() {
  const { videoRef, canvasRef, cameraEnabled, cameraError, fps, handDetected, currentGesture, confidence, stopCamera } = useVision();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!cameraEnabled && !cameraError) return null;

  return (
    <>
      <div 
        className={`vision-container ${isExpanded ? 'fullscreen' : 'preview'}`} 
        onClick={() => { if (!isExpanded) setIsExpanded(true); }}
        title={!isExpanded ? "Clique para expandir" : ""}
      >
        <div className="vision-fullscreen-content">
          {isExpanded && (
            <button 
              type="button" 
              style={{ 
                position: 'absolute', top: 20, right: 20, zIndex: 10000, 
                background: 'rgba(255,50,50,0.2)', color: '#ff4444', 
                border: '1px solid rgba(255,50,50,0.4)', borderRadius: '8px',
                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold'
              }}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            >
              <Ti name="x" />
              Minimizar
            </button>
          )}

          {cameraError ? (
            <div className="vision-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
              <Ti name="alert-triangle" size={isExpanded ? 48 : 24} color="var(--danger)" />
              {isExpanded && <span>{cameraError}</span>}
            </div>
          ) : (
            <div className="vision-feed" style={{ display: 'block', position: 'relative', width: '100%', height: '100%' }}>
              <video
                ref={videoRef}
                className="vision-video"
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%' }}
              />
              <canvas ref={canvasRef} className="vision-canvas" style={{ width: '100%', height: '100%' }} />
              <PinchCube />

              {/* HUD overlay */}
              {isExpanded && (
                <div className="vision-hud">
                  {fps > 0 && <span className="vision-fps">{fps} FPS</span>}
                  {handDetected && currentGesture && currentGesture !== 'Desconhecido' && (
                    <span className="vision-gesture-hud">
                      Gesto: {currentGesture} | Conf: {confidence}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <VirtualMouse />
    </>
  );
}
