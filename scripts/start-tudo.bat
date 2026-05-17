@echo off
title J.A.R.V.I.S — Cérebro Híbrido
color 0B

echo.
echo  ========================================
echo       J . A . R . V . I . S   v3.0
echo    Multi-Model AI (Qwen 3 + DeepSeek)
echo  ========================================
echo.

echo [1/4] Iniciando Servidor de IA (Ollama)...
start "Ollama AI" cmd /k "ollama serve"
timeout /t 3 /nobreak >nul

echo [2/4] Carregando Modelo Neural (Qwen 3)...
start "Jarvis Brain" cmd /k "ollama run qwen3.6:latest"
timeout /t 3 /nobreak >nul

echo [3/4] Iniciando Agente Python (Hibrido Multi-Modelo)...
start "Jarvis Agent" cmd /k "cd /d C:\jarvis-project\python-agent && python main.py"
timeout /t 2 /nobreak >nul

echo [4/4] Iniciando Servidor Web (React)...
start "Jarvis Web UI" cmd /k "cd /d C:\jarvis-project\jarvis-web && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  JARVIS Online (Multi-Modelo: Qwen 3 + DeepSeek Coder)!
echo  Troque o modelo pelo painel lateral da Web UI.
echo.
pause >nul

