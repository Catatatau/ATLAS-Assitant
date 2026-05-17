@echo off
title Exportando Jarvis para a Nuvem
color 0A

echo ==========================================
echo  Preparando os arquivos para o Netlify...
echo ==========================================
echo.
echo Compilando e otimizando o site (isso pode levar alguns segundos)...

cd /d C:\jarvis-project\jarvis-web
call npm run build

echo.
echo ==============================================
echo [ SUCESSO! PASTA PRONTA ]
echo ==============================================
echo.
echo O seu site foi otimizado e está dentro da pasta "dist".
echo.
echo PASSO A PASSO PARA PUBLICAR:
echo 1. Acesse o site: https://app.netlify.com/drop
echo 2. Vai aparecer uma area pontilhada na tela do site.
echo 3. Arraste a pasta "dist" (que vai abrir agora) para dentro do Netlify.
echo.
echo O Netlify vai te dar um link publico na hora!
echo.
echo Pressione qualquer tecla para abrir a pasta "dist"...
pause >nul

start explorer "C:\jarvis-project\jarvis-web\dist"
