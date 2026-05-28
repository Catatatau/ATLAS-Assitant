@echo off
setlocal EnableExtensions EnableDelayedExpansion
title J.A.R.V.I.S — Cérebro Híbrido
color 0B

echo.
echo  ========================================
echo       J . A . R . V . I . S   v3.0
echo    Multi-Model AI (Qwen 3 + DeepSeek)
echo  ========================================
echo.

echo [1/5] Verificando dependencias Python...
call :ensure_python_deps
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel preparar as dependencias Python.
  pause
  exit /b 1
)

echo [2/5] Verificando dependencias do site...
call :ensure_web_deps
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel preparar as dependencias do site.
  pause
  exit /b 1
)

echo [3/5] Verificando Servidor de IA (Ollama)...
call :ensure_ollama
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel iniciar o Ollama na porta 11434.
  echo Feche o processo que esta usando essa porta ou reinicie o Ollama.
  pause
  exit /b 1
)

echo [4/5] Carregando Modelo Neural (Qwen 3 8B)...
start "ATLAS Brain" cmd /k "ollama run qwen3:8b"
timeout /t 3 /nobreak >nul

echo [5/5] Iniciando Agente Python e Servidor Web...
start "ATLAS Agent" cmd /k "cd /d ""%~dp0..\python-agent"" && python main.py"
timeout /t 2 /nobreak >nul

start "ATLAS Web UI" cmd /k "cd /d ""%~dp0..\jarvis-web"" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ATLAS Online (Multi-Modelo: Qwen 3 + DeepSeek Coder)!
echo  Troque o modelo pelo painel lateral da Web UI.
echo.
pause >nul

exit /b 0

:ensure_python_deps
python --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: Python nao encontrado. Instale Python e marque "Add python.exe to PATH".
  exit /b 1
)
python -m pip --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: PIP nao encontrado. Reinstale o Python marcando a opcao pip.
  exit /b 1
)
python -c "import flask, flask_cors, pyautogui, psutil, keyboard, requests" >nul 2>&1
if %errorlevel%==0 (
  echo Dependencias Python OK.
  exit /b 0
)
echo Instalando dependencias Python ausentes...
cd /d "%~dp0..\python-agent"
python -m pip install -r requirements.txt
exit /b %errorlevel%

:ensure_web_deps
node -v >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js LTS e tente novamente.
  exit /b 1
)
npm -v >nul 2>&1
if errorlevel 1 (
  echo ERRO: NPM nao encontrado. Reinstale o Node.js marcando a opcao npm.
  exit /b 1
)
cd /d "%~dp0..\jarvis-web"
if exist node_modules\.bin\vite.cmd (
  echo Dependencias do site OK.
  exit /b 0
)
echo Instalando dependencias do site Atlas Web...
if exist package-lock.json (
  call npm ci || call npm install
) else (
  call npm install
)
if errorlevel 1 exit /b 1
if not exist node_modules\.bin\vite.cmd (
  echo ERRO: Vite nao foi instalado em node_modules.
  exit /b 1
)
exit /b 0

:ensure_ollama
where ollama >nul 2>&1
if errorlevel 1 (
  echo ERRO: Ollama nao encontrado. Instale o Ollama e tente novamente.
  exit /b 1
)
ollama list >nul 2>&1
if %errorlevel%==0 (
  echo Ollama ja esta rodando e respondendo na porta 11434.
  exit /b 0
)

set "OLLAMA_PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":11434 .*LISTENING"') do set "OLLAMA_PORT_PID=%%P"
if defined OLLAMA_PORT_PID (
  echo Porta 11434 ja esta ocupada pelo PID %OLLAMA_PORT_PID%, mas o Ollama nao respondeu.
  exit /b 1
)

start "Ollama AI" cmd /k "ollama serve"
for /l %%I in (1,1,10) do (
  timeout /t 1 /nobreak >nul
  ollama list >nul 2>&1
  if !errorlevel!==0 exit /b 0
)
exit /b 1

