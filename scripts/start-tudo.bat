@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ATLAS - Start Tudo
color 0B

set "ROOT=%~dp0.."
set "AGENT_DIR=%ROOT%\python-agent"
set "WEB_DIR=%ROOT%\jarvis-web"
set "VENV_DIR=%AGENT_DIR%\.venv"
set "PY_EXE=%VENV_DIR%\Scripts\python.exe"

echo.
echo  ========================================
echo       A T L A S   v3.0
echo    Multi-Model AI ^(Qwen 3 + DeepSeek^)
echo  ========================================
echo.

echo [1/6] Preparando Python do Agent...
where python >nul 2>&1
if errorlevel 1 (
  echo ERRO: Python nao encontrado. Instale Python e marque "Add python.exe to PATH".
  pause
  exit /b 1
)

if not exist "%PY_EXE%" (
  echo Criando ambiente isolado em python-agent\.venv...
  python -m venv "%VENV_DIR%"
  if errorlevel 1 (
    echo ERRO: nao foi possivel criar a .venv do Agent.
    pause
    exit /b 1
  )
)

"%PY_EXE%" -m pip --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: pip nao encontrado na .venv do Agent.
  pause
  exit /b 1
)

"%PY_EXE%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo ERRO: nao foi possivel atualizar pip/setuptools/wheel.
  pause
  exit /b 1
)

cd /d "%AGENT_DIR%"
"%PY_EXE%" -c "import flask, flask_cors, pyautogui, psutil, keyboard, requests" >nul 2>&1
if errorlevel 1 (
  echo Instalando dependencias principais do Agent...
  "%PY_EXE%" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo ERRO: nao foi possivel instalar dependencias principais do Agent.
    pause
    exit /b 1
  )
)
echo Dependencias Python OK.

echo.
echo [2/6] Preparando camera e gestos...
"%PY_EXE%" -c "import cv2, mediapipe" >nul 2>&1
if errorlevel 1 (
  echo Instalando dependencias da camera ^(cv2 + mediapipe^)...
  "%PY_EXE%" -m pip install --upgrade numpy opencv-python mediapipe
  if errorlevel 1 (
    echo ERRO: nao foi possivel instalar opencv-python/mediapipe.
    pause
    exit /b 1
  )
)

"%PY_EXE%" -c "import cv2, mediapipe; print('Camera OK - cv2 importado')"
if errorlevel 1 (
  echo ERRO: cv2/mediapipe ainda nao importou no Python do Agent.
  echo Python usado:
  "%PY_EXE%" -c "import sys; print(sys.executable)"
  pause
  exit /b 1
)

echo.
echo [3/6] Preparando site Atlas Web...
where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js LTS.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: NPM nao encontrado. Reinstale o Node.js marcando npm.
  pause
  exit /b 1
)

cd /d "%WEB_DIR%"
if not exist package.json (
  echo ERRO: package.json nao encontrado em "%WEB_DIR%".
  pause
  exit /b 1
)

if not exist node_modules\.bin\vite.cmd (
  echo Instalando dependencias do site...
  if exist package-lock.json (
    if exist node_modules (
      call npm install --no-audit --no-fund
    ) else (
      call npm ci --no-audit --no-fund
      if errorlevel 1 call npm install --no-audit --no-fund
    )
  ) else (
    call npm install --no-audit --no-fund
  )
  if errorlevel 1 (
    echo ERRO: npm nao conseguiu instalar as dependencias do site.
    pause
    exit /b 1
  )
)

if not exist node_modules\.bin\vite.cmd (
  echo ERRO: Vite nao foi instalado em node_modules.
  pause
  exit /b 1
)
echo Dependencias do site OK.

echo.
echo [4/6] Verificando Ollama...
where ollama >nul 2>&1
if errorlevel 1 (
  echo ERRO: Ollama nao encontrado. Instale o Ollama.
  pause
  exit /b 1
)

ollama list >nul 2>&1
if errorlevel 1 (
  set "OLLAMA_PORT_PID="
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":11434 .*LISTENING"') do set "OLLAMA_PORT_PID=%%P"
  if defined OLLAMA_PORT_PID (
    echo ERRO: porta 11434 ocupada pelo PID !OLLAMA_PORT_PID!, mas o Ollama nao respondeu.
    echo Feche esse processo ou reinicie o Ollama.
    pause
    exit /b 1
  )

  start "Ollama AI" cmd /k "ollama serve"
  for /l %%I in (1,1,15) do (
    timeout /t 1 /nobreak >nul
    ollama list >nul 2>&1
    if !errorlevel!==0 goto ollama_ok
  )
  echo ERRO: Ollama nao respondeu apos iniciar.
  pause
  exit /b 1
)
:ollama_ok
echo Ollama OK.

echo.
echo [5/6] Encerrando instancias antigas...
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5001 .*LISTENING"') do set "PORT_PID=%%P"
if defined PORT_PID (
  echo Encerrando Agent antigo na porta 5001 ^(PID !PORT_PID!^)...
  taskkill /F /PID !PORT_PID! >nul 2>&1
  timeout /t 1 /nobreak >nul
)

set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do set "PORT_PID=%%P"
if defined PORT_PID (
  echo Encerrando Web antiga na porta 5173 ^(PID !PORT_PID!^)...
  taskkill /F /PID !PORT_PID! >nul 2>&1
  timeout /t 1 /nobreak >nul
)

echo.
echo [6/6] Iniciando ATLAS...
start "ATLAS Brain" cmd /k "ollama run qwen3:8b"
timeout /t 2 /nobreak >nul

start "ATLAS Agent" cmd /k "cd /d ""%AGENT_DIR%"" && ""%PY_EXE%"" ""%AGENT_DIR%\main.py"""
timeout /t 2 /nobreak >nul

start "ATLAS Web UI" cmd /k "cd /d ""%WEB_DIR%"" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo  ATLAS Online!
echo  Web local: http://127.0.0.1:5173
echo  Agent:     http://127.0.0.1:5001/health
echo.
pause
exit /b 0
