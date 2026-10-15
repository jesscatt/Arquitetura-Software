@echo off
chcp 65001 >nul
title InfoHub
cd /d "%~dp0backend"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias, so na primeira vez...
  call npm.cmd install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Abrindo http://localhost:3000 em alguns segundos. Para parar, feche esta janela.
start "" cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm.cmd start
pause
