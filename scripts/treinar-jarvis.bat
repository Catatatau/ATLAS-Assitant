@echo off
title Treinador do J.A.R.V.I.S
color 0E

echo.
echo  ========================================
echo    TREINADOR DO J.A.R.V.I.S
echo    Ensine novos comandos ao seu assistente
echo  ========================================
echo.

cd /d "%~dp0..\python-agent"
python treinar.py

pause
