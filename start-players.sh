#!/bin/bash

# start-players.sh - Script para iniciar múltiplos jogadores facilmente

echo "🏈 Iniciador de Jogadores - Futebol de Botão"
echo "=========================================="

# Função para iniciar um novo jogador
start_player() {
    local player_num=$1
    local port=$2
    
    echo "🚀 Iniciando Jogador $player_num na porta $port..."
    
    # Iniciar proxy em terminal separado
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="Jogador $player_num - Proxy" -- bash -c "
            echo '🎮 Jogador $player_num - Proxy Cliente';
            echo 'Porta: $port';
            echo '==========================';
            node local-proxy-client.js $port;
            echo 'Pressione Enter para fechar...';
            read
        " &
    elif command -v xterm &> /dev/null; then
        xterm -title "Jogador $player_num - Proxy" -e "
            echo '🎮 Jogador $player_num - Proxy Cliente';
            echo 'Porta: $port';
            echo '==========================';
            node local-proxy-client.js $port;
            echo 'Pressione Enter para fechar...';
            read
        " &
    else
        echo "❌ Terminal gráfico não encontrado (gnome-terminal ou xterm)"
        echo "💡 Execute manualmente: node local-proxy-client.js $port"
    fi
    
    # Aguardar um pouco para o proxy iniciar
    sleep 2
    
    # Abrir navegador se disponível
    if command -v xdg-open &> /dev/null; then
        echo "🌐 Abrindo navegador para Jogador $player_num..."
        xdg-open "http://localhost:$port" &
    elif command -v open &> /dev/null; then  # macOS
        echo "🌐 Abrindo navegador para Jogador $player_num..."
        open "http://localhost:$port" &
    else
        echo "🌐 Acesse manualmente: http://localhost:$port"
    fi
}

# Verificar se o servidor está rodando
echo "🔍 Verificando servidor..."
if ! pgrep -f "src/server.ts" > /dev/null && ! pgrep -f "ts-node.*server" > /dev/null; then
    echo "⚠️  Servidor não está rodando!"
    echo "💡 Execute primeiro: npm start"
    echo ""
    read -p "Deseja iniciar o servidor agora? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🚀 Iniciando servidor..."
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --title="Servidor UDP" -- bash -c "
                echo '🏈 Servidor de Futebol de Botão';
                echo '============================';
                npm start;
                echo 'Pressione Enter para fechar...';
                read
            " &
        else
            echo "💡 Execute em outro terminal: npm start"
        fi
        echo "⏳ Aguardando servidor iniciar..."
        sleep 5
    else
        echo "❌ Servidor necessário para funcionar!"
        exit 1
    fi
fi

echo ""
echo "Quantos jogadores deseja iniciar?"
echo "1) 2 jogadores (recomendado)"
echo "2) 4 jogadores (máximo)"
echo "3) Quantidade personalizada"
echo "4) Apenas 1 jogador"
echo ""
read -p "Escolha uma opção (1-4): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "🎮 Iniciando 2 jogadores..."
        start_player 1 8081
        start_player 2 8082
        ;;
    2)
        echo "🎮 Iniciando 4 jogadores..."
        start_player 1 8081
        start_player 2 8082
        start_player 3 8083
        start_player 4 8084
        ;;
    3)
        read -p "Quantos jogadores? (1-8): " num_players
        if [[ $num_players =~ ^[1-8]$ ]]; then
            echo "🎮 Iniciando $num_players jogadores..."
            for ((i=1; i<=num_players; i++)); do
                port=$((8080 + i))
                start_player $i $port
            done
        else
            echo "❌ Número inválido! Use 1-8."
            exit 1
        fi
        ;;
    4)
        echo "🎮 Iniciando 1 jogador..."
        start_player 1 8081
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac

echo ""
echo "✅ Todos os jogadores foram iniciados!"
echo ""
echo "📝 Instruções:"
echo "1. Aguarde os proxies iniciarem (alguns segundos)"
echo "2. Os navegadores devem abrir automaticamente"
echo "3. Em cada navegador, clique em 'Conectar'"
echo "4. Use mouse para direcionar, Shift para correr, clique para chutar"
echo ""
echo "🔧 Troubleshooting:"
echo "- Se o navegador não abrir, acesse manualmente as URLs mostradas"
echo "- Se não conectar, verifique se o servidor está rodando"
echo "- Para fechar, use Ctrl+C nos terminais dos proxies"
echo ""
echo "🎉 Bom jogo!"