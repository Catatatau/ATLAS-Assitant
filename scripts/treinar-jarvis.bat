@echo off
setlocal EnableExtensions
title Treinador do J.A.R.V.I.S
color 0E

set "ROOT=%~dp0.."
set "AGENT_DIR=%ROOT%\python-agent"
set "VENV_DIR=%AGENT_DIR%\.venv"
set "PY_EXE=%VENV_DIR%\Scripts\python.exe"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

echo.
echo  ========================================
echo    TREINADOR DO J.A.R.V.I.S
echo    Ensine novos comandos ao seu assistente
echo  ========================================
echo.

if not exist "%PY_EXE%" (
  echo Ambiente Python do Agent nao encontrado. Criando .venv...
  where python >nul 2>&1
  if errorlevel 1 (
    echo ERRO: Python nao encontrado. Instale Python e marque "Add python.exe to PATH".
    goto :fail
  )
  python -m venv "%VENV_DIR%"
  if errorlevel 1 goto :fail
)

"%PY_EXE%" -m pip --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: pip nao encontrado na .venv do Agent. Execute scripts\instalar.bat.
  goto :fail
)

cd /d "%AGENT_DIR%" || goto :fail
"%PY_EXE%" "%AGENT_DIR%\treinar.py"
if errorlevel 1 goto :fail

pause
exit /b 0

:fail
echo.
echo ERRO: nao foi possivel iniciar o treinador.
pause
exit /b 1
