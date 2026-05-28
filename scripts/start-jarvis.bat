@echo off
setlocal EnableExtensions EnableDelayedExpansion
title J.A.R.V.I.S — Sistema Online
color 0B

echo.
echo  ========================================
echo       J . A . R . V . I . S   v1.0
echo  ========================================
echo.

echo [1/3] Verificando Ollama...
call :ensure_ollama
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel iniciar o Ollama na porta 11434.
  echo Feche o processo que esta usando essa porta ou reinicie o Ollama.
  pause
  exit /b 1
)

echo [2/3] Iniciando Agente Python...
start "Jarvis Agent" cmd /k "cd /d ""%~dp0..\python-agent"" && python main.py"
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando OpenClaw Gateway...
start "Jarvis OpenClaw" cmd /k "openclaw gateway start"
timeout /t 3 /nobreak >nul

echo.
echo  Abrindo Web UI...
start "" http://127.0.0.1:18789

echo.
echo  JARVIS Online!
echo  Web UI:    http://127.0.0.1:18789
echo  Agent:     http://127.0.0.1:5001/health
echo  Telegram:  Lembre de adicionar fdp do crlh
echo.
pause

exit /b 0

:ensure_ollama
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
