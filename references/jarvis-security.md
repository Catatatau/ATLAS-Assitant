---
name: jarvis-security
description: >
  Use this skill when reviewing, hardening, or fixing security issues in the J.A.R.V.I.S
  project specifically. Trigger for: "check security", "is this safe", "fix security",
  "harden the app", "protect the endpoints", "secure Ngrok", "sanitize input",
  "fix the CORS", "protect the API", or any request about credentials, secrets,
  tokens, authentication, authorization, or data exposure in the JARVIS project.

  Stack: Python/Flask + React/Vite + Ollama + PyAutoGUI + Ngrok + Netlify.
---

# J.A.R.V.I.S — Security Skill

## Threat Model

JARVIS is a local personal assistant with remote access via Ngrok.
Primary threats:
1. **Exposed Ngrok URL** → anyone with the URL can control the machine
2. **Unsanitized PyAutoGUI input** → arbitrary code/action execution
3. **Hardcoded secrets** → credentials in git history
4. **Unprotected endpoints** → no auth on screen stream, chat, automation routes
5. **CORS misconfiguration** → any origin can call the API

This is a personal tool, not enterprise software. Security measures must be practical
and not make the project harder to run locally.

---

## Security Layers (in order of importance)

### 1. Secret Management

**Never in code:**
```python
# ❌ WRONG
NGROK_URL = "https://abc123.ngrok.io"
SECRET_KEY = "minha-senha-123"

# ✅ CORRECT
import os
NGROK_URL = os.getenv("NGROK_URL")
SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(24).hex())
```

**Required `.env` variables:**
```env
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
NGROK_AUTH_TOKEN=<from ngrok dashboard>
ALLOWED_ORIGINS=http://localhost:5173,https://your-netlify-app.netlify.app
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Required `.gitignore` entries:**
```
.env
*.env
.env.local
__pycache__/
*.pyc
```

### 2. Basic API Authentication

Minimum viable auth for personal use (token in header):
```python
# config.py
import os
import secrets

API_TOKEN = os.getenv("API_TOKEN", secrets.token_hex(16))

# utils/auth.py
from functools import wraps
from flask import request, jsonify
from config import API_TOKEN

def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-API-Token")
        if not token or token != API_TOKEN:
            return jsonify({"erro": "Não autorizado"}), 401
        return f(*args, **kwargs)
    return decorated

# Usage in routes:
@bp.route('/api/automation', methods=['POST'])
@require_token
def automation_endpoint():
    ...
```

**Frontend — include token in requests:**
```js
// services/api.js
const API_TOKEN = import.meta.env.VITE_API_TOKEN

export async function apiPost(endpoint, data) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': API_TOKEN,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
```

### 3. CORS Configuration

```python
# app.py
from flask_cors import CORS
import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

CORS(app, origins=allowed_origins, supports_credentials=True)
```

Never use `CORS(app)` with no arguments (allows everything).

### 4. Input Sanitization

**PyAutoGUI commands — highest risk:**
```python
import re

# Whitelist approach — only allow known safe patterns
ALLOWED_PYAUTOGUI_ACTIONS = {"click", "type", "scroll", "hotkey", "press"}

def sanitize_automation_command(command: str) -> str:
    """Remove any characters that could enable injection."""
    # Allow only alphanumeric, spaces, common punctuation
    return re.sub(r'[^\w\s\-.,!?@#]', '', command).strip()

def validate_action(action: str) -> bool:
    return action.lower() in ALLOWED_PYAUTOGUI_ACTIONS
```

**Flask request validation:**
```python
def validate_chat_input(data: dict) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, "Formato inválido"
    message = data.get("message", "")
    if not isinstance(message, str):
        return False, "Mensagem deve ser texto"
    if len(message) > 4096:
        return False, "Mensagem muito longa"
    if not message.strip():
        return False, "Mensagem vazia"
    return True, ""
```

### 5. Flask Security Settings

```python
# app.py
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB max upload
)

# Never in any environment:
# app.run(debug=True)  ← only for local dev, never when Ngrok is active
```

### 6. Ngrok Security

If using Ngrok with a public URL, add IP allowlist or use Ngrok's auth:
```python
# Verify requests come from expected Netlify origin
def is_trusted_origin(request) -> bool:
    origin = request.headers.get("Origin", "")
    referer = request.headers.get("Referer", "")
    allowed = os.getenv("ALLOWED_ORIGINS", "").split(",")
    return any(origin.startswith(a) or referer.startswith(a) for a in allowed)
```

---

## Security Audit Checklist

Run through this for every audit:

**Secrets**
- [ ] No hardcoded tokens, passwords, or URLs in any `.py` or `.js` file
- [ ] `.env` exists and is in `.gitignore`
- [ ] `.env.example` exists with placeholder values (not real values)
- [ ] `SECRET_KEY` is random and from env

**Endpoints**
- [ ] All automation endpoints have auth (`@require_token`)
- [ ] Chat endpoint validates and limits message length
- [ ] Screen stream endpoint is not publicly accessible without auth
- [ ] No endpoint uses `eval()`, `exec()`, or `subprocess` on user input

**PyAutoGUI**
- [ ] `FAILSAFE = True` is set at startup
- [ ] All automation input is sanitized with a whitelist approach
- [ ] Actions are logged before execution

**Frontend**
- [ ] No secrets in `VITE_*` variables that end up in the bundle
- [ ] API token is sent in headers, not query strings
- [ ] No sensitive data in `localStorage` or `sessionStorage`

**Network**
- [ ] CORS has explicit allowed origins, not `*`
- [ ] Ngrok URL is not committed to git
- [ ] Ngrok is not started automatically without awareness

---

## Quick Fixes (Apply Immediately If Found)

| Issue | Fix |
|-------|-----|
| `debug=True` in app.run | Change to `debug=os.getenv("FLASK_DEBUG", "false").lower() == "true"` |
| `CORS(app)` with no args | Add `origins=allowed_origins` from env |
| Hardcoded secret | Move to `.env`, load with `os.getenv()` |
| No try/except in automation | Wrap all `pyautogui.*` calls |
| `pyautogui.FAILSAFE = False` | Change to `True` |
| Token in URL query param | Move to `X-API-Token` header |
| `.env` not in `.gitignore` | Add immediately, rotate any exposed secrets |
