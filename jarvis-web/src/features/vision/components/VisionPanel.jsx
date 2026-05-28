import React from 'react';
import { useVision } from './VisionProvider.jsx';

// Camera processing is local/on-device

function Ti({ name, className = '' }) {
  return <i className={`ti ti-${name} ${className}`.trim()} aria-hidden="true" />;
}

export default function VisionPanel() {
  const {
    cameraEnabled,
    startCamera,
    stopCamera,
    handDetected,
    currentGesture,
    confidence,
    detectedObjects,
    lastVisionSummary,
    isCompressing,
    analyzeFrame,
  } = useVision();

  return (
    <div className="vision-panel">
      {/* Toggle Section */}
      <div className="vision-panel-section">
        <span className="section-label">Controle ATLAS Vision</span>
        <button
          type="button"
          className={`vision-toggle-btn ${cameraEnabled ? 'active' : ''}`}
          onClick={cameraEnabled ? stopCamera : startCamera}
        >
          <Ti name={cameraEnabled ? 'camera-off' : 'camera'} />
          <span>{cameraEnabled ? 'Desativar Visão' : 'Ativar Visão (Popup Central)'}</span>
        </button>
      </div>

      {cameraEnabled && (
        <>
          {/* Gesture section */}
          <div className="vision-panel-section">
            <span className="section-label">Gestos</span>
            {handDetected && currentGesture ? (
              <div className="vision-gesture-badge">
                <Ti name="hand-finger" />
                <span className="vision-gesture-name">{currentGesture}</span>
                <span className="vision-gesture-conf">{confidence}%</span>
              </div>
            ) : (
              <div className="vision-no-data">
                <Ti name="hand-off" />
                <span>Nenhuma mão detectada</span>
              </div>
            )}
          </div>

          {/* Objects section */}
          <div className="vision-panel-section">
            <span className="section-label">Objetos</span>
            {detectedObjects.length > 0 ? (
              <ul className="vision-object-list">
                {detectedObjects.slice(0, 8).map((obj, i) => (
                  <li key={`${obj.label}-${i}`} className="vision-object-item">
                    <span className="vision-object-name">{obj.label}</span>
                    <div className="vision-object-bar-wrap">
                      <div
                        className="vision-object-bar"
                        style={{ width: `${obj.confidence}%` }}
                      />
                    </div>
                    <span className="vision-object-conf">{obj.confidence}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="vision-no-data">
                <Ti name="box-off" />
                <span>Nenhum objeto detectado</span>
              </div>
            )}
          </div>

          {/* Caveman summary section */}
          <div className="vision-panel-section">
            <span className="section-label">Resumo Visual (Caveman)</span>
            {lastVisionSummary ? (
              <div className="vision-summary-card">
                <p>{lastVisionSummary}</p>
              </div>
            ) : (
              <div className="vision-no-data">
                <Ti name="brain" />
                <span>Use "Analisar Câmera" no chat</span>
              </div>
            )}
            <button
              type="button"
              className="vision-analyze-btn"
              onClick={analyzeFrame}
              disabled={isCompressing}
            >
              <Ti name={isCompressing ? 'loader-2' : 'analyze'} className={isCompressing ? 'spin' : ''} />
              <span>{isCompressing ? 'Comprimindo...' : 'Gerar Resumo'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
