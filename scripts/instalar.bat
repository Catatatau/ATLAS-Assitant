@echo off
title Instalacao do ATLAS
echo Instalando tudo...

echo Verificando Node.js...
node -v || (echo ERRO: Instale Node.js 22 em nodejs.org && pause && exit /b 1)

echo Verificando Python...
python --version || (echo ERRO: Instale Python em python.org && pause && exit /b 1)

echo Instalando OpenClaw e Ngrok...
npm install -g openclaw@latest
npm install -g ngrok

echo Instalando dependencias Python...
cd /d "%~dp0..\python-agent"
pip install flask flask-cors pyautogui psutil keyboard Pillow requests
pip install numpy opencv-python mediapipe || echo AVISO: dependencias de visao nao instaladas. O chat continua funcionando; use Python 3.10-3.12 para ATLAS Vision.

echo.
echo CONCLUIDO! Execute scripts\start-jarvis.bat para iniciar.
pause
