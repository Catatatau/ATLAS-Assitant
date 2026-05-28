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

echo [2/4] Carregando Modelo Neural (Qwen 3 8B)...
start "ATLAS Brain" cmd /k "ollama run qwen3:8b"
timeout /t 3 /nobreak >nul

echo [3/4] Iniciando Agente Python (Hibrido Multi-Modelo)...
start "ATLAS Agent" cmd /k "cd /d ""%~dp0..\python-agent"" && python main.py"
timeout /t 2 /nobreak >nul

echo [4/4] Iniciando Servidor Web (React)...
start "ATLAS Web UI" cmd /k "cd /d ""%~dp0..\jarvis-web"" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ATLAS Online (Multi-Modelo: Qwen 3 + DeepSeek Coder)!
echo  Troque o modelo pelo painel lateral da Web UI.
echo.
pause >nul

