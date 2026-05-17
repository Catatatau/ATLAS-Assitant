@echo off
title J.A.R.V.I.S — Sistema Online
color 0B

echo.
echo  ========================================
echo       J . A . R . V . I . S   v1.0
echo  ========================================
echo.

echo [1/3] Iniciando Ollama...
start "" ollama serve
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando Agente Python...
start "Jarvis Agent" cmd /k "cd /d C:\jarvis-project\python-agent && python main.py"
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando OpenClaw Gateway...
start "Jarvis OpenClaw" cmd /k "openclaw gateway"
timeout /t 3 /nobreak >nul

echo.
echo  Abrindo Web UI...
start "" http://127.0.0.1:18789

echo.
echo  JARVIS Online!
echo  Web UI:    http://127.0.0.1:18789
echo  Agent:     http://127.0.0.1:5001/health
echo  Telegram:  use o bot que voce criou
echo.
pause
