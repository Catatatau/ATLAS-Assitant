/**
 * ATLAS Vision — Shared type definitions (JSDoc)
 * Camera processing is local/on-device
 */

/**
 * @typedef {Object} DetectedObject
 * @property {string} label - Object class name (e.g. 'cell phone')
 * @property {number} confidence - Detection confidence 0-1
 * @property {number[]} bbox - [x, y, width, height] in pixels
 */

/**
 * @typedef {Object} HandResult
 * @property {Array<{x: number, y: number, z: number}>} landmarks - 21 hand landmarks
 * @property {string} gesture - Detected gesture name
 * @property {number} confidence - Gesture confidence 0-1
 * @property {'Left'|'Right'} handedness
 */

/**
 * @typedef {Object} VisionRawData
 * @property {HandResult[]} hands
 * @property {DetectedObject[]} objects
 * @property {number} fps
 * @property {number} ts - Timestamp
 */

/**
 * @typedef {Object} VisionState
 * @property {boolean} cameraEnabled
 * @property {string|null} cameraError
 * @property {boolean} handDetected
 * @property {string|null} currentGesture
 * @property {DetectedObject[]} detectedObjects
 * @property {string} lastVisionSummary - Output from Caveman model
 * @property {number} confidence
 * @property {number} fps
 * @property {function} startCamera
 * @property {function} stopCamera
 * @property {function} analyzeFrame - Trigger Caveman summary
 */

export const GESTURE_LABELS = {
  PALM: 'Palma Aberta',
  FIST: 'Punho',
  POINTING: 'Apontando',
  PINCH: 'Pinça',
  THUMBS_UP: 'Polegar',
  UNKNOWN: 'Desconhecido',
};

export const VISION_ERRORS = {
  PERMISSION_DENIED: 'Permissão de câmera negada. Habilite nas configurações do navegador.',
  NOT_FOUND: 'Nenhuma câmera encontrada neste dispositivo.',
  NOT_SECURE: 'Câmera requer HTTPS. Use npm run dev:https ou localhost.',
  NOT_SUPPORTED: 'Seu navegador não suporta acesso à câmera.',
  GENERIC: 'Erro ao acessar a câmera. Tente novamente.',
};
