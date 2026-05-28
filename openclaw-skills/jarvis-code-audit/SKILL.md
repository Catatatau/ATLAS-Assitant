---
name: jarvis-code-audit
description: >
  Use this skill for ANY task involving the J.A.R.V.I.S project — a personal AI assistant
  built with Python/Flask (backend), React/Vite (frontend), Ollama/Llama 3.2 (local LLM),
  PyAutoGUI (automation), Brazilian Portuguese STT/TTS (voice), real-time screen streaming,
  and remote access via Ngrok + Netlify.

  Trigger this skill when the user asks to: audit, fix, refactor, debug, scan, review,
  improve, or add features to the JARVIS project. Also trigger for: Flask bugs,
  React/Vite issues, Ollama integration problems, voice control bugs, screen streaming
  issues, WebSocket problems, PyAutoGUI automation risks, NLP command systems,
  security reviews, performance improvements, and architecture changes in this project.

  Even if the user only says "fix the bug", "refactor this", "add a feature", or
  "check my code" — if context shows it's the JARVIS project, use this skill.
---

# J.A.R.V.I.S — Code Audit & Development Skill

## Project Identity

**J.A.R.V.I.S** (Just A Rather Very Intelligent System) is a personal AI assistant
inspired by Tony Stark's Jarvis. It runs fully locally, with remote access capability.

**Owner profile:** Brazilian developer, intermediate level, values clean and professional
code but keeps the project beginner-friendly.

---

## Stack Reference

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.x + Flask |
| Frontend | React 18 + Vite |
| Local AI | Ollama + Llama 3.2 |
| Automation | PyAutoGUI |
| Voice (STT) | Brazilian Portuguese speech-to-text |
| Voice (TTS) | Brazilian Portuguese text-to-speech |
| Streaming | WebSockets (real-time screen + chat) |
| Remote Access | Ngrok (tunnel) + Netlify (frontend host) |
| UI Style | iMessage-style chat interface |
| Language (UI/Voice) | Brazilian Portuguese (pt-BR) |

---

## Folder Structure (expected)

```
jarvis/
├── backend/
│   ├── app.py                  # Flask entry point
│   ├── routes/                 # Route blueprints
│   │   ├── chat.py
│   │   ├── voice.py
│   │   ├── screen.py
│   │   └── automation.py
│   ├── services/               # Business logic
│   │   ├── ollama_service.py
│   │   ├── tts_service.py
│   │   ├── stt_service.py
│   │   ├── screen_service.py
│   │   └── command_service.py
│   ├── utils/                  # Helpers
│   ├── config.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── VoiceControl/
│   │   │   └── ScreenView/
│   │   ├── hooks/
│   │   ├── services/           # API + WebSocket clients
│   │   ├── store/              # State management
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── scripts/                    # Automation / startup scripts
├── .env.example
└── README.md
```

---

## Audit Workflow

When performing a code audit, follow this sequence:

### Phase 1 — Scan
Read all files before touching anything. Build a mental map of:
- What each file does
- What's broken, unsafe, or duplicated
- What's completely unused

### Phase 2 — Prioritize
Fix in this order:
1. **Crashes / errors** — anything that breaks the app
2. **Security risks** — exposed secrets, unsafe endpoints, no auth
3. **Performance blockers** — blocking loops, high CPU/RAM, memory leaks
4. **Bugs** — wrong behavior, broken imports, race conditions
5. **Code quality** — dead code, duplication, bad naming, poor structure

### Phase 3 — Fix
- Fix directly. Don't ask for permission on obvious issues.
- Preserve all existing features and behavior.
- Keep Brazilian Portuguese in voice/UI strings.
- Don't rewrite entire files unless absolutely necessary.

### Phase 4 — Report
End with only:
1. Short summary of fixes
2. List of changed files
3. Critical warnings (if any)
4. Commands to run (if any)

---

## Backend — Known Risk Areas

### Flask / General
- Check for `debug=True` in production paths
- Ensure CORS is restricted (not `*`) when Ngrok is active
- All endpoints must handle errors with try/except + proper HTTP codes
- Use `threading.Lock()` around any shared mutable state
- No blocking I/O on the main Flask thread — use threads or async
- Use `app.config` for settings, never hardcode paths or keys

### Ollama Integration
- Always set a timeout on Ollama API calls (default can hang)
- Stream responses correctly — don't buffer entire LLM output
- Handle `ConnectionRefusedError` when Ollama isn't running
- Validate model name from config, not hardcoded

### PyAutoGUI
- Always wrap in try/except — GUI errors crash the thread
- Add `pyautogui.FAILSAFE = True` (move mouse to corner = stop)
- Never run automation commands without sanitizing input first
- Log all automation actions for debugging

### Voice Control (STT/TTS)
- STT must run in a separate thread — never block Flask
- TTS queue must be thread-safe
- Handle microphone not found gracefully
- pt-BR locale must be set explicitly, not assumed

### Screen Streaming
- Cap FPS to avoid saturating CPU (15-30 FPS max)
- Compress frames before sending (JPEG, not PNG)
- WebSocket must handle disconnect/reconnect gracefully
- Never stream raw uncompressed frames

### NLP Command System
- Regex patterns must be compiled at startup, not per-request
- Command matching must be case-insensitive for pt-BR
- Unknown commands must return a helpful fallback, not crash
- Separate command parsing from command execution

---

## Frontend — Known Risk Areas

### React / State
- Use `useCallback` / `useMemo` on expensive renders
- WebSocket listeners must be cleaned up in `useEffect` return
- Never store sensitive data in `localStorage`
- Chat state must handle concurrent messages without race conditions

### WebSocket (Realtime)
- Reconnection logic must have exponential backoff
- Binary frames (screen stream) must be handled separately from JSON (chat)
- Always check `ws.readyState` before sending

### Vite / Build
- Env vars must use `VITE_` prefix
- No secrets in frontend env vars (Ngrok URL is OK, API keys are not)
- Check `vite.config.js` for correct proxy setup in dev

### UI / Accessibility
- Chat input must be accessible (label + aria)
- Voice button must have visual state feedback (listening / idle)
- Screen view must have fallback when stream is unavailable
- Mobile layout must not break on narrow screens (< 380px)

---

## Security Checklist

- [ ] No hardcoded secrets or API keys in any file
- [ ] `.env` is in `.gitignore`
- [ ] Ngrok URLs are not exposed in frontend bundle
- [ ] Flask endpoints validate all input
- [ ] PyAutoGUI commands are sanitized before execution
- [ ] CORS is configured with explicit allowed origins
- [ ] No `eval()` or `exec()` on user input
- [ ] Screen stream requires auth token (even basic)

---

## Performance Checklist

- [ ] Screen streaming FPS is capped
- [ ] Ollama calls are streamed, not buffered
- [ ] STT runs in background thread
- [ ] TTS uses a queue, not blocking calls
- [ ] React components don't re-render on every WebSocket frame
- [ ] Large assets are lazy-loaded

---

## Naming Conventions

| Context | Convention |
|---------|-----------|
| Python files | `snake_case.py` |
| Python classes | `PascalCase` |
| Python functions/vars | `snake_case` |
| React components | `PascalCase.jsx` |
| React hooks | `useCamelCase.js` |
| React utils/services | `camelCase.js` |
| CSS classes | `kebab-case` |
| Env vars | `UPPER_SNAKE_CASE` |

---

## Output Format for Audits

Always end a full audit with this exact structure:

```
## ✅ Fixed
- [brief list of fixes]

## 📁 Files Changed
- path/to/file.py — reason
- path/to/file.jsx — reason

## ⚠️ Warnings
- [anything the developer must know manually]

## 🚀 Commands to Run
- pip install -r requirements.txt
- npm install
- [any migration or setup steps]
```

---

## Feature Addition Workflow

When asked to add a new feature:
1. Identify which layer(s) it touches (backend / frontend / both)
2. Check if a similar pattern already exists in the codebase — reuse it
3. Follow the existing file structure — don't create new folders unless needed
4. Add the feature with the minimum code necessary
5. Don't add new dependencies unless there's no reasonable alternative

---

## Reference Files

Load these when needed — don't load all at once:

| File | When to Read |
|------|-------------|
| `references/audit-prompt.md` | Full audit prompt to use as system context |
| `references/jarvis-feature-dev.md` | Adding or extending features |
| `references/jarvis-security.md` | Security review or hardening |
| `references/jarvis-performance.md` | Performance issues, slow app, high CPU/RAM |

---

## Context Clues

If the user shares only a partial file or a snippet, infer the full context from:
- The stack (Flask + React)
- The pt-BR language requirement
- The Ollama/local LLM setup (no OpenAI, no cloud AI by default)
- The iMessage-style chat UI
- The voice-first interaction model

Never assume cloud APIs are available unless explicitly stated.
