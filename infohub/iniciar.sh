#!/usr/bin/env sh
# Inicia o InfoHub no macOS ou Linux: sh iniciar.sh
cd "$(dirname "$0")/backend" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js nao encontrado. Instale a versao LTS em https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install || exit 1
echo "InfoHub vai abrir em http://localhost:3000 (Ctrl+C para parar)"
npm start
