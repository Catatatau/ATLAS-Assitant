@echo off
title Instalacao do ATLAS
echo Instalando tudo...

echo Verificando Node.js...
node -v || (echo ERRO: Instale Node.js 22 em nodejs.org && pause && exit /b 1)

echo Verificando Python...
python --version || (echo ERRO: Instale Python em python.org && pause && exit /b 1)

echo Instalando OpenClaw...
npm install -g openclaw@latest

echo Instalando dependencias Python...
cd C:\jarvis-project\python-agent
pip install flask pyautogui psutil keyboard Pillow requests

echo.
echo CONCLUIDO! Execute scripts\start-jarvis.bat para iniciar.
pause
