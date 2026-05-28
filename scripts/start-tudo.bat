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

echo [2/6] Verificando dependencia da camera...
call :ensure_camera_deps

echo [3/6] Verificando dependencias do site...
call :ensure_web_deps
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel preparar as dependencias do site.
  pause
  exit /b 1
)

echo [4/6] Verificando Servidor de IA (Ollama)...
call :ensure_ollama
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel iniciar o Ollama na porta 11434.
  echo Feche o processo que esta usando essa porta ou reinicie o Ollama.
  pause
  exit /b 1
)

echo [5/6] Carregando Modelo Neural (Qwen 3 8B)...
start "ATLAS Brain" cmd /k "ollama run qwen3:8b"
timeout /t 3 /nobreak >nul

echo [6/6] Iniciando Agente Python e Servidor Web...
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

:ensure_camera_deps
python -c "import cv2" >nul 2>&1
if %errorlevel%==0 (
  echo Dependencia da camera OK ^(cv2^).
  exit /b 0
)
echo cv2 nao encontrado. Instalando opencv-python...
cd /d "%~dp0..\python-agent"
python -m pip install --upgrade numpy opencv-python
if errorlevel 1 (
  echo AVISO: nao foi possivel instalar opencv-python agora.
  echo Execute scripts\instalar.bat para instalar a camera completa.
  exit /b 0
)
python -c "import cv2" >nul 2>&1
if errorlevel 1 (
  echo AVISO: opencv-python instalou, mas cv2 ainda nao importou.
  echo Execute: python -m pip install --upgrade --force-reinstall opencv-python
  exit /b 0
)
echo Dependencia da camera instalada ^(cv2^).
exit /b 0

:ensure_web_deps
where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js LTS e tente novamente.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: NPM nao encontrado. Reinstale o Node.js marcando a opcao npm.
  exit /b 1
)
cd /d "%~dp0..\jarvis-web"
if not exist package.json (
  echo ERRO: package.json nao encontrado na pasta jarvis-web.
  exit /b 1
)
if exist node_modules\.bin\vite.cmd (
  echo Dependencias do site OK.
  exit /b 0
)
echo ERRO: Dependencias do site nao estao instaladas.
echo Execute scripts\instalar.bat uma vez e depois rode start-tudo.bat novamente.
exit /b 1

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

