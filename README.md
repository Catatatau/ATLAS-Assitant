<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-2-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Ollama-LLM-FF6F00?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white" />
</p>

<h1 align="center">🤖 J.A.R.V.I.S — Assistente Pessoal com IA</h1>

<p align="center">
  <b>Um assistente de automação para Windows controlado por voz e texto,<br>com interface web React e inteligência artificial híbrida.</b>
</p>

<p align="center">
  <i>Controle seu PC de qualquer lugar — pelo celular, pela nuvem, ou por voz.</i>
</p>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Como Usar](#-como-usar)
- [Acesso Remoto (Ngrok)](#-acesso-remoto-ngrok)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Funciona por Dentro](#-como-funciona-por-dentro)

---

## 🧠 Visão Geral

O **J.A.R.V.I.S** é um assistente pessoal para Windows inspirado no Jarvis do Tony Stark. Ele utiliza uma **arquitetura híbrida de inteligência**:

1. **Motor NLP Local (Regex)** — Responde a comandos diretos em **0ms de delay** (abrir apps, controlar mídia, status do sistema).
2. **Cérebro Profundo (Ollama LLM)** — Para conversas complexas e perguntas inteligentes, repassa para um modelo de IA local (Llama 3.2).

Isso significa que comandos simples como *"abre o Chrome"* são executados **instantaneamente**, enquanto perguntas como *"me conte uma piada"* passam pelo modelo de IA para gerar respostas naturais.

---

## 🏗 Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                        USUÁRIO                                   │
│               (Voz / Texto / Botões)                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                   JARVIS WEB UI (React + Vite)                   │
│                                                                  │
│  • Chat com bolhas estilo iMessage                               │
│  • Speech-to-Text (Web Speech API)                               │
│  • Text-to-Speech (respostas faladas em PT-BR)                   │
│  • Painel lateral com botões de ação direta                      │
│  • Tela ao vivo (streaming MJPEG do PC remoto)                   │
│  • Modal de configuração para acesso remoto (Ngrok)              │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTP (fetch)
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                PYTHON AGENT (Flask — porta 5001)                 │
│                                                                  │
│  /chat     → Motor NLP (regex) → Se não casa → Ollama LLM       │
│  /execute  → Executa ação direto (botões do painel)              │
│  /stream   → MJPEG stream ao vivo da tela                        │
│  /frame    → Frame único em base64 (para Ngrok)                  │
│  /health   → Heartbeat de status                                 │
│                                                                  │
│  executor.py → Mapa de ações → Módulos de ação                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MÓDULOS DE AÇÃO (actions/)                     │
│                                                                  │
│  apps.py       → Abrir/fechar programas (Discord, Chrome, etc.)  │
│  media.py      → Play/Pause, Volume, Próxima/Anterior faixa     │
│  system.py     → CPU, RAM, Disco, Shutdown, Restart, Sleep       │
│  screenshot.py → Captura de tela com base64                      │
│  web.py        → Abrir URLs no navegador                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Funcionalidades

### 🎙️ Controle por Voz
- Reconhecimento de fala em **português brasileiro** (Web Speech API)
- Respostas **faladas** pelo navegador (Text-to-Speech)
- Ativação por botão de microfone com animação pulsante

### 💻 Automação do Windows
| Comando | O que faz |
|---------|-----------|
| `"Abre o Chrome"` | Abre o Google Chrome |
| `"Abre o Discord"` | Abre o Discord |
| `"Abre o YouTube"` | Abre youtube.com no navegador |
| `"Fecha o Chrome"` | Mata o processo do Chrome |
| `"Play"` / `"Pausa"` | Controla reprodução de mídia |
| `"Aumenta o volume"` | Sobe o volume do sistema |
| `"Próxima música"` | Pula para a próxima faixa |
| `"Status do sistema"` | Mostra CPU, RAM e disco |
| `"Tira um print"` | Captura screenshot e exibe no chat |
| `"Suspender"` | Coloca o PC em modo sleep |

### 📡 Tela ao Vivo
- Streaming em tempo real da tela do PC
- Funciona via MJPEG (local) ou polling de frames base64 (remoto via Ngrok)
- ~10 FPS local / ~1.2 FPS remoto

### 🌐 Acesso Remoto
- Deploy da UI em **Netlify** (grátis)
- Túnel seguro via **Ngrok** para o agente Python
- Controle o PC de qualquer lugar pelo celular

### 🤖 IA Conversacional
- Respostas inteligentes via **Ollama** (Llama 3.2 1B)
- Modelo roda 100% local — sem API keys, sem custos
- Fallback gracioso quando o modelo está offline

---

## 🛠 Tecnologias

| Componente | Tecnologia |
|------------|-----------|
| **Frontend** | React 18, Vite 5, Lucide Icons |
| **Backend** | Python 3.10+, Flask, Flask-CORS |
| **IA** | Ollama + Llama 3.2 (1B) |
| **Automação** | PyAutoGUI, psutil, keyboard |
| **Túnel** | Ngrok |
| **Deploy Web** | Netlify |

---

## 📦 Instalação

### Pré-requisitos

- **Windows 10/11**
- **Python 3.10+** → [python.org](https://python.org)
- **Node.js 18+** → [nodejs.org](https://nodejs.org)
- **Ollama** → [ollama.ai](https://ollama.ai) *(opcional, para IA conversacional)*

### Instalação rápida

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/jarvis.git
cd jarvis

# 2. Execute o instalador automático
scripts\instalar.bat
```

### Instalação manual

```bash
# Dependências Python
cd python-agent
pip install flask flask-cors pyautogui psutil keyboard Pillow requests

# Dependências Node.js (frontend)
cd ../jarvis-web
npm install

# (Opcional) Baixar modelo de IA
ollama pull llama3.2:1b
```

---

## 🚀 Como Usar

### Início rápido (tudo de uma vez)

```bash
scripts\start-tudo.bat
```

Isso inicia automaticamente:
1. **Ollama** (servidor de IA)
2. **Modelo Llama 3.2** (cérebro profundo)
3. **Agente Python** na porta 5001
4. **Interface Web React** (Vite dev server)

### Uso manual (passo a passo)

```bash
# Terminal 1 — IA
ollama serve

# Terminal 2 — Agente Python
cd python-agent
python main.py

# Terminal 3 — Interface Web
cd jarvis-web
npm run dev
```

Acesse: **https://localhost:5173** (Vite com SSL local)

---

## 🌍 Acesso Remoto (Ngrok)

Para controlar seu PC de qualquer lugar (celular, outro computador):

### 1. Publicar a interface na nuvem

```bash
scripts\exportar-site.bat
```
Arraste a pasta `dist/` para o [Netlify Drop](https://app.netlify.com/drop).

### 2. Criar o túnel seguro

```bash
# Instale e configure o Ngrok (uma vez)
ngrok config add-authtoken SEU_TOKEN_AQUI

# Inicie o túnel
scripts\iniciar-ngrok.bat
```

### 3. Conectar a UI ao túnel

Na interface web, clique no ícone ⚙️ (engrenagem) e cole o link do Ngrok.

> **Exemplo:** `https://abc123.ngrok-free.app`

---

## 📂 Estrutura do Projeto

```
jarvis-project/
├── python-agent/              # 🧠 Backend — Servidor Flask
│   ├── main.py                #    Servidor principal (rotas, NLP, chat)
│   ├── executor.py            #    Mapa de ações → módulos
│   └── actions/               #    Módulos de automação
│       ├── apps.py            #      Abrir/fechar programas
│       ├── media.py           #      Controles de mídia (play, volume)
│       ├── system.py          #      Info do sistema, shutdown, sleep
│       ├── screenshot.py      #      Captura de tela
│       └── web.py             #      Abrir URLs
│
├── jarvis-web/                # 🖥️ Frontend — React + Vite
│   ├── index.html             #    HTML base
│   ├── package.json           #    Dependências Node
│   ├── vite.config.js         #    Config do Vite (SSL local)
│   └── src/
│       ├── main.jsx           #    Entry point React
│       ├── App.jsx            #    Componente principal (chat + painel)
│       └── index.css          #    Estilização completa
│
├── scripts/                   # ⚡ Scripts de automação (.bat)
│   ├── instalar.bat           #    Instala todas as dependências
│   ├── start-tudo.bat         #    Inicia tudo de uma vez
│   ├── start-jarvis.bat       #    Inicia com OpenClaw Gateway
│   ├── iniciar-ngrok.bat      #    Cria túnel seguro
│   └── exportar-site.bat      #    Build para deploy no Netlify
│
├── openclaw-skills/           # 🔌 Skills para OpenClaw Gateway
│   └── jarvis-windows/
│       └── SKILL.md           #    Definição da skill de automação
│
├── .gitignore
└── README.md
```

---

## 🔧 Como Funciona por Dentro

### Fluxo de um comando por voz

```
Usuário fala: "Abre o Chrome"
        │
        ▼
[Web Speech API] → Converte fala em texto
        │
        ▼
[App.jsx] → POST /chat { message: "abre o chrome" }
        │
        ▼
[main.py — Motor NLP]
  regex: r'(abrir|abre) (o|a)?\s*(.*)'
  match! → target = "chrome"
        │
        ▼
[executor.py] → mapa['open_app']()
        │
        ▼
[actions/apps.py] → open_app("chrome")
  → subprocess.Popen("C:\...\chrome.exe")
        │
        ▼
Resposta: { text: "Iniciando chrome." }
        │
        ▼
[App.jsx] → Exibe no chat + fala a resposta (TTS)
```

### Fluxo de uma pergunta inteligente

```
Usuário digita: "Me conte uma piada"
        │
        ▼
[main.py — Motor NLP]
  Nenhum regex casa → cai no fallback
        │
        ▼
[Ollama API] → POST http://127.0.0.1:11434/api/generate
  modelo: llama3.2:1b
  prompt: "Você é o Jarvis..."
        │
        ▼
Resposta da IA: { response_text: "Piada...", is_action: false }
        │
        ▼
[App.jsx] → Exibe no chat + fala a resposta
```

### Painel de ação direta

Os botões do painel lateral (Chrome, YouTube, Play/Pause, etc.) chamam `POST /execute` diretamente, **ignorando o LLM** para latência zero.

---

## 📄 Licença

Este projeto é de uso pessoal/educacional. Sinta-se livre para usar, modificar e aprender com ele.

---

<p align="center">
  Feito com 💙 por <b>João</b> — Inspirado no Jarvis do Tony Stark
</p>
