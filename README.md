# J.A.R.V.I.S — Just A Rather Very Intelligent System

Um assistente virtual pessoal executado localmente. Integrado com Ollama (Llama 3.2), PyAutoGUI para automações de sistema, uma interface React limpa e comunicação segura.

## Estrutura do Projeto

- **/jarvis-web**: Frontend desenvolvido em React/Vite. Interface de chat e controle estilo iMessage.
- **/python-agent**: Backend construído em Python + Flask que manipula requisições locais e executa automações do Windows.
- **/openclaw-skills**: Diretório contendo as skills do sistema, incluindo comandos de Windows e auditorias.
- **/scripts**: Scripts para iniciar, treinar e expor o Jarvis via ngrok.
- **/logs**: Armazenamento de logs locais e screenshots da tela.
- **/references**: Documentação e prompts de sistema.

## Recentes Atualizações (SKILL-2 Code Audit)

- **Segurança (PyAutoGUI)**: A trava de segurança `FAILSAFE` foi habilitada.
- **Segurança (CORS)**: Acesso CORS restrito para aumentar a segurança durante o uso do Ngrok.
- **Motor NLP Customizado**: Suporte nativo ao `custom_commands.json` inicializado no momento de boot do agente (Zero delay nas respostas para atalhos pessoais!).

## Como Iniciar

1. Inicie o Backend (Agent): `scripts\start-jarvis.bat`
2. Inicie a Nuvem/Acesso externo: `scripts\iniciar-ngrok.bat`
3. A interface web pode ser usada localmente via `npm run dev` no diretório web.

## Requisitos

- Python 3.10+
- Node.js (v18+)
- Ollama instalado localmente
