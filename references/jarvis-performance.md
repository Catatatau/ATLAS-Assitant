---
name: jarvis-performance
description: >
  Use this skill when diagnosing or fixing performance, memory, or resource issues
  in the J.A.R.V.I.S project. Trigger for: "app is slow", "high CPU", "memory leak",
  "voice is laggy", "screen stream is slow/choppy", "Ollama response is slow",
  "the app freezes", "WebSocket drops", "reconnection issues", "thread problems",
  "Flask is blocking", "TTS/STT is slow", or any performance complaint about JARVIS.
---

# J.A.R.V.I.S — Performance & Debugging Skill

## Performance Architecture

JARVIS has 4 concurrent subsystems. Each must run independently:

```
Flask Main Thread ──► handles HTTP + WebSocket routing ONLY
     │
     ├── Thread: Ollama ──► streams LLM responses
     ├── Thread: STT ────► listens for voice continuously  
     ├── Thread: TTS ────► speaks responses (queue-based)
     └── Thread: Screen ─► captures + streams frames
```

**Rule:** Nothing slow runs on the Flask thread. Everything gets its own thread.

---

## Subsystem Performance Specs

### Screen Streaming
```python
# services/screen_service.py
import mss
import cv2
import numpy as np
import time

FRAME_INTERVAL = 1 / 15  # 15 FPS max — tune down if CPU is high
JPEG_QUALITY = 50         # Lower = smaller = faster — tune as needed

class ScreenStreamer:
    def __init__(self):
        self.running = False
        self._lock = threading.Lock()
    
    def capture_frame(self) -> bytes:
        with mss.mss() as sct:
            frame = np.array(sct.grab(sct.monitors[1]))
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGRA2RGB)
            # Resize to reduce bandwidth
            frame_small = cv2.resize(frame_rgb, (1280, 720))
            _, buffer = cv2.imencode(
                '.jpg', frame_small,
                [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
            )
            return buffer.tobytes()
    
    def stream_loop(self, emit_fn):
        while self.running:
            start = time.monotonic()
            try:
                frame = self.capture_frame()
                emit_fn(frame)
            except Exception as e:
                logger.error(f"Screen capture error: {e}")
                time.sleep(1)
            
            elapsed = time.monotonic() - start
            sleep_time = max(0, FRAME_INTERVAL - elapsed)
            time.sleep(sleep_time)
```

### Ollama Streaming
```python
# services/ollama_service.py
import requests
import json

OLLAMA_TIMEOUT = 30  # seconds for connection
STREAM_TIMEOUT = 120  # seconds for full response

def stream_response(prompt: str, emit_fn):
    """Stream Ollama response chunk by chunk."""
    try:
        with requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": True},
            stream=True,
            timeout=(OLLAMA_TIMEOUT, STREAM_TIMEOUT)
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line)
                    if token := chunk.get("response"):
                        emit_fn(token)
                    if chunk.get("done"):
                        break
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Ollama não está rodando. Inicie com: ollama serve")
    except requests.exceptions.Timeout:
        raise RuntimeError("Ollama demorou demais para responder")
```

### TTS Queue (Non-blocking)
```python
# services/tts_service.py
import threading
import queue

class TTSService:
    def __init__(self):
        self._queue = queue.Queue()
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()
    
    def speak(self, text: str):
        """Non-blocking — adds to queue and returns immediately."""
        self._queue.put(text)
    
    def _worker(self):
        while True:
            text = self._queue.get()
            try:
                self._synthesize(text)  # blocking, but in its own thread
            except Exception as e:
                logger.error(f"TTS error: {e}")
            finally:
                self._queue.task_done()
    
    def _synthesize(self, text: str):
        # actual TTS implementation here
        pass
```

### STT (Background Listener)
```python
# services/stt_service.py
import threading

class STTService:
    def __init__(self, on_result):
        self.on_result = on_result
        self._thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._running = False
    
    def start(self):
        self._running = True
        self._thread.start()
    
    def stop(self):
        self._running = False
    
    def _listen_loop(self):
        while self._running:
            try:
                text = self._recognize()  # blocking call in background
                if text:
                    self.on_result(text)
            except Exception as e:
                logger.error(f"STT error: {e}")
                time.sleep(2)  # backoff on error
```

---

## React Performance

### WebSocket — Don't Re-render on Every Frame
```jsx
// ❌ WRONG — causes re-render on every screen frame
const [screenFrame, setScreenFrame] = useState(null)
useEffect(() => {
  socket.on('screen_frame', (data) => setScreenFrame(data))  // triggers re-render!
}, [])

// ✅ CORRECT — update canvas directly, no React state
const canvasRef = useRef(null)
useEffect(() => {
  const handleFrame = (data) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0)
    img.src = `data:image/jpeg;base64,${data}`
  }
  socket.on('screen_frame', handleFrame)
  return () => socket.off('screen_frame', handleFrame)
}, [])
```

### Chat — Virtualize Long Lists
If chat has 100+ messages, use windowing:
```jsx
// Only render visible messages
import { useVirtualizer } from '@tanstack/react-virtual'
// or simple manual approach: keep last 50 messages in state
const MAX_MESSAGES = 50
setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), newMessage])
```

### Prevent Unnecessary Re-renders
```jsx
// Wrap expensive components
const MemoizedMessage = React.memo(ChatMessage)

// Stable callbacks
const handleSend = useCallback((text) => {
  sendMessage(text)
}, [sendMessage])
```

---

## Debugging Guide

### Diagnosing High CPU
1. Check screen streaming FPS — reduce `FRAME_INTERVAL` or lower `JPEG_QUALITY`
2. Check if Ollama is running when not needed (it idles fine, but streaming uses CPU)
3. Check React DevTools for components re-rendering too often
4. Check if STT is continuously processing audio — should sleep on silence

### Diagnosing Memory Leaks
**Backend:**
- Flask + long-running threads: check for objects growing unboundedly
- Screen frames: ensure captured numpy arrays are not accumulated

**Frontend:**
- React DevTools → Profiler → check component mount/unmount
- WebSocket listeners added but not cleaned up in `useEffect` return
- Image objects created for screen frames — ensure they're released

### Diagnosing WebSocket Drops
```js
// services/socket.js — add reconnection with backoff
import { io } from 'socket.io-client'

export const socket = io(API_BASE, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity,
  transports: ['websocket'],  // skip long-polling
})

socket.on('connect_error', (err) => {
  console.warn('WebSocket erro:', err.message)
})
```

### Diagnosing Flask Blocking
If the Flask app freezes or is slow to respond:
1. Check if any route is doing blocking I/O (file read, Ollama call, STT) synchronously
2. Check if there's a `time.sleep()` on the main thread
3. Use `threading.Thread(daemon=True)` for all long-running operations
4. Consider `Flask-SocketIO` with `async_mode='threading'`

---

## Performance Benchmarks (Targets)

| Metric | Target |
|--------|--------|
| Screen stream latency | < 200ms |
| Chat response (first token) | < 2s |
| TTS start delay | < 500ms |
| STT recognition delay | < 1s |
| Flask endpoint response | < 100ms (excluding AI) |
| Frontend re-render (chat) | < 16ms (60fps) |
| Memory (backend) | < 500MB |
| CPU idle (no activity) | < 5% |
