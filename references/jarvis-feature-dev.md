---
name: jarvis-feature-dev
description: >
  Use this skill when the user wants to ADD, EXTEND, or BUILD NEW FEATURES for the
  J.A.R.V.I.S project. Trigger for requests like: "add voice command for X",
  "create a new automation", "add a new route", "build a new React component",
  "integrate X into JARVIS", "add a new NLP command", "make JARVIS do X".

  Also trigger when the user asks to: connect a new API, extend the command system,
  add a new screen action, improve the chat UI, add notifications, add a dashboard,
  add memory/context to the AI, integrate a new TTS/STT engine, or add any new
  capability to the assistant.

  Stack: Python/Flask backend, React/Vite frontend, Ollama/Llama 3.2, PyAutoGUI,
  pt-BR voice (STT+TTS), WebSockets, Ngrok+Netlify. Language: Brazilian Portuguese.
---

# J.A.R.V.I.S — Feature Development Skill

## Before Writing Any Code

1. Read `jarvis-code-audit/SKILL.md` for full project context and conventions
2. Identify which layer(s) the feature touches
3. Check for existing patterns to reuse
4. Plan the minimum viable implementation

---

## Feature Templates

### New Voice Command (NLP)

**Backend** (`services/command_service.py`):
```python
# Pattern compiled at module level
COMANDO_REGEX = re.compile(r'(palavra|chave|alternativa)', re.IGNORECASE)

def handle_comando_exemplo(texto: str) -> dict:
    """Descrição do que o comando faz."""
    try:
        # lógica aqui
        return {"status": "ok", "resultado": "..."}
    except Exception as e:
        logger.error(f"Erro no comando exemplo: {e}")
        return {"status": "erro", "mensagem": str(e)}

# Registrar no dispatcher de comandos
COMMAND_REGISTRY = {
    COMANDO_REGEX: handle_comando_exemplo,
    # ...
}
```

**Rules:**
- Regex compiled at module load, never inside the handler
- Always return `{"status": "ok"|"erro", ...}`
- Log all errors
- Keep pt-BR in all user-facing strings

---

### New Flask Route

```python
# routes/nova_rota.py
from flask import Blueprint, request, jsonify
from services.novo_service import fazer_algo
import logging

logger = logging.getLogger(__name__)
nova_rota_bp = Blueprint('nova_rota', __name__)

@nova_rota_bp.route('/api/nova-rota', methods=['POST'])
def endpoint():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"erro": "Dados inválidos"}), 400
        
        resultado = fazer_algo(dados)
        return jsonify(resultado), 200
    
    except Exception as e:
        logger.error(f"Erro em /api/nova-rota: {e}")
        return jsonify({"erro": "Erro interno"}), 500
```

**Register in `app.py`:**
```python
from routes.nova_rota import nova_rota_bp
app.register_blueprint(nova_rota_bp)
```

---

### New React Component

```jsx
// components/NovoComponente/NovoComponente.jsx
import { useState, useEffect, useCallback } from 'react'
import styles from './NovoComponente.module.css'

export function NovoComponente({ prop1, onAction }) {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    // setup
    return () => {
      // cleanup — SEMPRE limpar listeners e timers
    }
  }, [])

  const handleAcao = useCallback(() => {
    // lógica
    onAction?.(estado)
  }, [estado, onAction])

  return (
    <div className={styles.container}>
      {/* conteúdo */}
    </div>
  )
}
```

```css
/* components/NovoComponente/NovoComponente.module.css */
.container {
  /* estilos */
}
```

```js
// components/NovoComponente/index.js
export { NovoComponente } from './NovoComponente'
```

---

### New PyAutoGUI Automation

```python
# services/automation_service.py
import pyautogui
import logging

pyautogui.FAILSAFE = True  # Mover mouse pro canto = parar
logger = logging.getLogger(__name__)

def executar_acao(parametro: str) -> dict:
    """Descrição da ação de automação."""
    # Sanitizar input SEMPRE antes de usar
    parametro = parametro.strip()
    if not parametro:
        return {"status": "erro", "mensagem": "Parâmetro vazio"}
    
    try:
        # ação pyautogui aqui
        logger.info(f"Automação executada: {parametro}")
        return {"status": "ok"}
    except pyautogui.FailSafeException:
        logger.warning("Automação interrompida pelo failsafe")
        return {"status": "interrompido"}
    except Exception as e:
        logger.error(f"Erro na automação: {e}")
        return {"status": "erro", "mensagem": str(e)}
```

---

### WebSocket Event (Realtime)

**Backend** (Flask-SocketIO):
```python
@socketio.on('nome_evento')
def handle_evento(data):
    try:
        # processar
        emit('resposta_evento', {"dados": resultado})
    except Exception as e:
        emit('erro', {"mensagem": str(e)})
```

**Frontend** (React hook):
```js
// hooks/useSocketEvento.js
import { useEffect } from 'react'
import { socket } from '../services/socket'

export function useSocketEvento(onDados) {
  useEffect(() => {
    socket.on('resposta_evento', onDados)
    return () => {
      socket.off('resposta_evento', onDados)  // cleanup OBRIGATÓRIO
    }
  }, [onDados])
}
```

---

### New Service (Backend)

```python
# services/novo_service.py
import logging
from config import Config

logger = logging.getLogger(__name__)

class NovoService:
    def __init__(self):
        self.config = Config()
        # inicialização
    
    def fazer_algo(self, entrada: str) -> dict:
        try:
            # lógica
            return {"resultado": "..."}
        except Exception as e:
            logger.error(f"Erro em NovoService.fazer_algo: {e}")
            raise
```

---

## Checklist Before Finishing a Feature

- [ ] Error handling in every function that can fail
- [ ] Logger calls (not `print()`) for errors and important actions
- [ ] Input sanitization for anything from the user or network
- [ ] Cleanup in React `useEffect` return (WebSocket, timers, listeners)
- [ ] User-facing strings in Brazilian Portuguese (pt-BR)
- [ ] No new dependencies added without necessity
- [ ] Feature registered/connected to the rest of the app (blueprint, component import, etc.)
- [ ] Tested mentally: what happens if Ollama is offline? If microphone fails? If network drops?

---

## Common Patterns Already in JARVIS (Reuse These)

| Need | Reuse |
|------|-------|
| Call Ollama | `services/ollama_service.py` |
| Speak output | `services/tts_service.py` |
| Listen for voice | `services/stt_service.py` |
| Run automation | `services/automation_service.py` |
| Stream to frontend | existing WebSocket setup |
| Parse NLP command | `services/command_service.py` COMMAND_REGISTRY |
| API call from React | `src/services/api.js` |
| Real-time data | `src/hooks/useSocket.js` |

Never duplicate logic that already exists. Extend it instead.
