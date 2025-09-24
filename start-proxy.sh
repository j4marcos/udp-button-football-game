#!/bin/bash

# start-proxy.sh - Script para iniciar um novo proxy cliente

echo "🚀 Iniciando novo proxy cliente..."

# Verificar se foi passada uma porta específica
if [ $# -eq 1 ]; then
    PORT=$1
    echo "📡 Usando porta específica: $PORT"
    node local-proxy-client.js $PORT
else
    echo "📡 Usando porta aleatória..."
    node local-proxy-client.js
fi