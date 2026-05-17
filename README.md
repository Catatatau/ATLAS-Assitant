<div align="center">
  <br />
  <h1>🌍 ATLAS ASSISTANT</h1>
  <p>
    <strong>Seu Assistente Virtual Pessoal Avançado de Execução Local</strong>
  </p>
  <p>
    Integração Perfeita com Ollama (LLMs) • Automação PyAutoGUI • Interface React Moderna
  </p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
    <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js Version" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Ollama-Local_LLM-black?style=for-the-badge&logo=meta&logoColor=white" alt="Ollama" />
  </p>
</div>

<br />

## 📖 Sobre o ATLAS
O **ATLAS ASSISTANT** (Anteriormente Jarvis) é um sistema de assistência virtual ultrarrápido projetado para rodar localmente no seu computador. Ele combina a inteligência profunda de Modelos de Linguagem de Larga Escala (LLMs via Ollama) com a velocidade de execução de um motor NLP local baseado em Regex para comandos diários em tempo real.

O resultado é um assistente seguro, privado, que pode tanto responder a perguntas complexas de código quanto aumentar o volume do seu PC, abrir aplicativos, e controlar a reprodução de mídia sem qualquer latência na nuvem.

---

## ⚡ Principais Funcionalidades

- **🧠 Inteligência Híbrida**: Um motor de Processamento de Linguagem Natural local com 0ms de delay para comandos exatos (ex: "Abrir YouTube", "Pausar música") e fallback para a IA Profunda (Ollama) em tarefas complexas.
- **🖥️ Automação de Sistema**: Integração de baixo nível com o Windows utilizando `PyAutoGUI` e comandos de shell para controlar volume, abrir softwares, tirar screenshots e verificar métricas.
- **💬 Interface Premium React**: Um chat estilo iMessage com suporte a Dark Mode automático, design polido, e feedbacks instantâneos visuais.
- **🔒 Privacidade & Segurança**: Processamento de IA 100% local. Inclui restrições severas de CORS para a comunicação externa e bloqueios `FAILSAFE` nas automações de tela.
- **☁️ Remote Access Ready**: Suporte nativo ao `ngrok` e tunelamento seguro para controlar o seu computador pelo celular onde quer que você esteja.

---

## 📁 Arquitetura do Projeto

A arquitetura do ATLAS é modularizada para máxima eficiência e manutenção:

```text
C:\jarvis-project\
├── jarvis-web/        # Interface Frontend React/Vite (Atlas Panel)
├── python-agent/      # Servidor Backend Flask (O "Cérebro" e executor de ações)
│   ├── actions/       # Módulos de ação (media, system, web, apps)
│   ├── main.py        # Ponto de entrada do backend e API
│   └── executor.py    # Roteador de automações locais
├── scripts/           # Scripts batch para fácil inicialização
├── openclaw-skills/   # Documentação de Skills e extensões do assistente
└── logs/              # Logs de auditoria do sistema e screenshots salvas
```

---

## 🚀 Como Iniciar

### Pré-requisitos
Certifique-se de ter os seguintes softwares instalados na sua máquina:
- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Ollama](https://ollama.ai/) rodando com modelos recomendados (`qwen3:8b`, `deepseek-coder:6.7b`)

### Instalação e Boot

1. **Inicie o Servidor Backend do Atlas:**
   Navegue até a pasta `scripts` e execute o script de inicialização do agente. Ele subirá a API na porta `5001`.
   ```bash
   .\scripts\start-jarvis.bat
   ```

2. **Inicie a Interface Web do Atlas:**
   Para rodar a interface de forma local para testes, utilize o NPM no diretório frontend:
   ```bash
   cd jarvis-web
   npm run dev
   ```
   A interface estará disponível em `http://localhost:5173`.

3. **(Opcional) Acesso Externo via Ngrok:**
   Se desejar controlar o seu computador através do celular ou fora de casa:
   ```bash
   .\scripts\iniciar-ngrok.bat
   ```

---

## 🛠️ Personalização (Custom Commands)

O Atlas possui suporte nativo à injeção de comandos rápidos via `custom_commands.json` (dentro da pasta `python-agent/`). Adicione triggers em português e mapeie diretamente para as ações do sistema (ex: `open_app`, `volume_up`, `screenshot`) para contornar completamente o tempo de processamento da IA pesada.

---

<div align="center">
  <b>Construído com extrema dedicação e foco em Performance e Segurança.</b><br>
  <i>ATLAS ASSISTANT — Always Listening, Always Solving.</i>
</div>
