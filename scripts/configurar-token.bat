@echo off
title Configurar Token Ngrok
echo Configurando o seu token do Ngrok...
"%~dp0ngrok.exe" config add-authtoken 3EMhPKTKQDUfLLEXZ1OMQaO6sGX_4Z3pdHB72hwUtERnzVU9k
echo.
echo ==============================================
echo Token configurado com sucesso!
echo Voce ja pode fechar esta janela e abrir o iniciar-ngrok.bat
echo ==============================================
pause
