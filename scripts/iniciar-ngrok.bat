@echo off
title Jarvis - Tunel Ngrok
color 0D

echo ==========================================
echo        Iniciando o Tunel Seguro
echo ==========================================
echo.
echo Este script cria uma ponte entre a internet e o seu PC.
echo.
echo Certifique-se de que o start-tudo.bat esta rodando
echo e que voce ja configurou o seu Authtoken do Ngrok!
echo.
echo Pressione qualquer tecla para gerar o seu link...
pause >nul

ngrok http 5001
