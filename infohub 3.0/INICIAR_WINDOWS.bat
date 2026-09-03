@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando InfoHub com Docker...
  docker compose up --build
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  echo Docker nao encontrado. Abrindo apenas a interface visual em http://localhost:4173
  py -m http.server 4173 --directory "frontend"
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo Docker nao encontrado. Abrindo apenas a interface visual em http://localhost:4173
  python -m http.server 4173 --directory "frontend"
  goto :eof
)
echo Instale Docker Desktop para executar o sistema completo.
pause
