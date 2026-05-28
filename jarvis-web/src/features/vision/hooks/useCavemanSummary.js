import { useState, useRef, useCallback } from 'react';

// Camera processing is local/on-device
// Caveman Model: compresses vision data into ~80-150 tokens
// before sending to the main LLM. Never sends frames or raw landmarks.

const CAVEMAN_SYSTEM = 'Você resume dados de visão computacional em 1-2 frases objetivas em português. Sem preâmbulo, sem markdown. Apenas o resumo factual.';

const DEBOUNCE_MS = 2000;

/**
 * Generates a local fallback summary when Ollama is unreachable.
 * This ensures the vision pipeline works even without a running LLM.
 */
function localFallback(raw) {
  const parts = [];

  if (raw.hands && raw.hands.length > 0) {
    const handDescriptions = raw.hands.map(h => {
      const hand = h.handedness === 'Left' ? 'esquerda' : 'direita';
      return `mão ${hand} — ${h.gesture} (${Math.round(h.confidence * 100)}%)`;
    });
    parts.push(`${raw.hands.length} mão(s) detectada(s): ${handDescriptions.join('; ')}`);
  }

  if (raw.objects && raw.objects.length > 0) {
    const objList = raw.objects.slice(0, 5).map(o => `${o.label} (${o.confidence}%)`);
    parts.push(`Objetos: ${objList.join(', ')}`);
  }

  if (parts.length === 0) {
    parts.push('Nenhuma detecção no frame atual.');
  }

  return parts.join('. ') + '.';
}

export default function useCavemanSummary() {
  const [lastVisionSummary, setLastVisionSummary] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const lastCallRef = useRef(0);
  const ollamaUrlRef = useRef('http://localhost:11434');

  const compress = useCallback(async (raw) => {
    const now = Date.now();
    if (now - lastCallRef.current < DEBOUNCE_MS) return lastVisionSummary;
    lastCallRef.current = now;

    setIsCompressing(true);

    // Prepare a compact representation (no raw landmark arrays)
    const compact = {
      hands: (raw.hands || []).map(h => ({
        gesture: h.gesture,
        confidence: Math.round(h.confidence * 100),
        handedness: h.handedness,
      })),
      objects: (raw.objects || []).map(o => ({
        label: o.label,
        confidence: o.confidence
      })).slice(0, 5)
    };

    try {
      const response = await fetch(`${ollamaUrlRef.current}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:1b', // or deepseek-coder, whatever local model
          system: CAVEMAN_SYSTEM,
          prompt: `Dados de visão:\n${JSON.stringify(compact)}`,
          stream: false,
        })
      });
      if (response.ok) {
        const data = await response.json();
        const sum = data.response.trim();
        setLastVisionSummary(sum);
        setIsCompressing(false);
        return sum;
      }
    } catch (e) {
      // Fallback
    }

    const fallback = localFallback(raw);
    setLastVisionSummary(fallback);
    setIsCompressing(false);
    return fallback;
  }, [lastVisionSummary]);

  return { lastVisionSummary, isCompressing, compress };
}
