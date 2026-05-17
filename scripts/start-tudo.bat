@echo off
title J.A.R.V.I.S — Cérebro Híbrido
color 0B

echo.
echo  ========================================
echo       J . A . R . V . I . S   v2.0
echo  ========================================
echo.

echo [1/4] Iniciando Servidor de IA (Ollama)...
start "Ollama AI" cmd /k "ollama serve"
timeout /t 3 /nobreak >nul

echo [2/4] Carregando Modelo Neural...
start "Jarvis Brain" cmd /k "ollama run llama3.2:1b"
timeout /t 3 /nobreak >nul

echo [3/4] Iniciando Agente Python (Hibrido)...
start "Jarvis Agent" cmd /k "cd /d C:\jarvis-project\python-agent && python main.py"
timeout /t 2 /nobreak >nul

echo [4/4] Iniciando Servidor Web (React)...
start "Jarvis Web UI" cmd /k "cd /d C:\jarvis-project\jarvis-web && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  JARVIS Online (Modo Hibrido Inteligente)!
echo.
pause >nul
