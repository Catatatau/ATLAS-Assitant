@echo off
setlocal EnableExtensions EnableDelayedExpansion
title J.A.R.V.I.S — Cérebro Híbrido
color 0B

set "ROOT=%~dp0.."
set "AGENT_DIR=%ROOT%\python-agent"
set "WEB_DIR=%ROOT%\jarvis-web"
set "VENV_DIR=%AGENT_DIR%\.venv"
set "PY_EXE=%VENV_DIR%\Scripts\python.exe"

echo.
echo  ========================================
echo       J . A . R . V . I . S   v3.0
echo    Multi-Model AI (Qwen 3 + DeepSeek)
echo  ========================================
echo.

echo [1/6] Verificando dependencias Python...
call :ensure_python_deps
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel preparar as dependencias Python.
  pause
  exit /b 1
)

echo [2/6] Verificando dependencia da camera...
call :ensure_camera_deps
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel preparar a camera/gestos.
  echo Execute scripts\instalar.bat e confirme que aparece "cv2 OK" e "mediapipe OK".
  pause
  exit /b 1
)

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
call :free_port 5001 "ATLAS Agent antigo"
start "ATLAS Agent" cmd /k "cd /d ""%AGENT_DIR%"" && ""%PY_EXE%"" main.py"
timeout /t 2 /nobreak >nul

call :free_port 5173 "ATLAS Web antigo"
start "ATLAS Web UI" cmd /k "cd /d ""%WEB_DIR%"" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ATLAS Online (Multi-Modelo: Qwen 3 + DeepSeek Coder)!
echo  Troque o modelo pelo painel lateral da Web UI.
echo.
pause >nul

exit /b 0

:free_port
set "TARGET_PORT=%~1"
set "TARGET_NAME=%~2"
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% .*LISTENING"') do set "PORT_PID=%%P"
if defined PORT_PID (
  echo Encerrando %TARGET_NAME% na porta %TARGET_PORT% ^(PID %PORT_PID%^)...
  taskkill /F /PID %PORT_PID% >nul 2>&1
  timeout /t 1 /nobreak >nul
)
exit /b 0

:ensure_python_deps
where python >nul 2>&1
if errorlevel 1 (
  echo ERRO: Python nao encontrado. Instale Python e marque "Add python.exe to PATH".
  exit /b 1
)
if not exist "%PY_EXE%" (
  echo Ambiente Python do Agent nao encontrado. Criando .venv...
  python -m venv "%VENV_DIR%"
  if errorlevel 1 exit /b 1
)
"%PY_EXE%" -m pip --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: PIP nao encontrado na .venv. Execute scripts\instalar.bat.
  exit /b 1
)
"%PY_EXE%" -c "import flask, flask_cors, pyautogui, psutil, keyboard, requests" >nul 2>&1
if %errorlevel%==0 (
  echo Dependencias Python OK.
  exit /b 0
)
echo Instalando dependencias Python ausentes...
cd /d "%AGENT_DIR%"
"%PY_EXE%" -m pip install -r requirements.txt
exit /b %errorlevel%

:ensure_camera_deps
"%PY_EXE%" -c "import cv2, mediapipe" >nul 2>&1
if %errorlevel%==0 (
  echo Dependencias da camera OK ^(cv2 + mediapipe^).
  exit /b 0
)
echo Dependencias da camera ausentes. Instalando opencv-python e mediapipe...
cd /d "%AGENT_DIR%"
"%PY_EXE%" -m pip install --upgrade numpy opencv-python mediapipe
if errorlevel 1 (
  echo ERRO: nao foi possivel instalar dependencias da camera agora.
  exit /b 1
)
"%PY_EXE%" -c "import cv2, mediapipe" >nul 2>&1
if errorlevel 1 (
  echo ERRO: camera instalou, mas cv2/mediapipe ainda nao importou.
  echo Python usado pelo Agent:
  "%PY_EXE%" -c "import sys; print(sys.executable)"
  echo Tente:
  echo "%PY_EXE%" -m pip install --upgrade --force-reinstall opencv-python mediapipe
  exit /b 1
)
echo Dependencias da camera instaladas ^(cv2 + mediapipe^).
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
cd /d "%WEB_DIR%"
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

