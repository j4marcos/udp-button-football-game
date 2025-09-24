// public/browser-client.js - Cliente do navegador que se conecta via WebSocket ao cliente local
class BrowserGameClient {
    constructor() {
        this.ws = null;
        this.canvas = null;
        this.ctx = null;
        this.gameState = null;
        this.playerId = null;
        this.connected = false;
        
        // Estados de input
        this.mousePosition = { x: 0, y: 0 };
        this.playerPosition = { x: 400, y: 300 };
        this.isRunning = false;
        this.kickRequested = false;
        
        // Direção baseada no mouse
        this.playerDirection = 0; // em radianos
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupWebSocket();
        this.setupControls();
        this.startGameLoop();
        
        console.log('🎮 Cliente do navegador iniciado');
        console.log('🌐 Tentando conectar ao proxy local...');
    }

    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'gameCanvas';
            this.canvas.width = 800;
            this.canvas.height = 600;
            document.body.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.border = '2px solid #333';
        this.canvas.style.cursor = 'crosshair';
    }

    setupWebSocket() {
        // Conectar ao cliente local na porta 8080
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('🌐 Conectado ao cliente local');
            this.connected = true;
            this.updateStatus('Conectado ao cliente local');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Erro ao processar mensagem:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('❌ Desconectado do cliente local');
            this.connected = false;
            this.updateStatus('Desconectado - Tentando reconectar...');
            
            // Tentar reconectar após 2 segundos
            setTimeout(() => {
                this.setupWebSocket();
            }, 2000);
        };
        
        this.ws.onerror = (error) => {
            console.error('Erro WebSocket:', error);
            this.updateStatus('Erro de conexão');
        };
    }

    setupControls() {
        console.log('🎮 Configurando controles...');
        
        // Controle do mouse para direção - jogador sempre se move na direção do mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
            
            // Calcular direção baseada na posição do mouse
            if (this.playerId && this.gameState) {
                const player = this.gameState.players.find(p => p.id === this.playerId);
                if (player) {
                    const dx = this.mousePosition.x - player.position.x;
                    const dy = this.mousePosition.y - player.position.y;
                    
                    // Só atualiza direção se o mouse estiver longe o suficiente do jogador
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 10) { // Zona morta de 10 pixels
                        this.playerDirection = Math.atan2(dy, dx);
                        this.sendInput(); // Envia input automaticamente quando muda direção
                    }
                }
            }
        });
        
        // Click do mouse para correr (velocidade extra)
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Botão esquerdo
                console.log('🏃 Correndo (velocidade extra)');
                this.isRunning = true;
                this.sendInput();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Botão esquerdo
                console.log('🚶 Andando (velocidade normal)');
                this.isRunning = false;
                this.sendInput();
            }
        });
        
        // Tecla espaço para chutar
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                console.log('⚽ Chutando');
                this.kickRequested = true;
                this.sendInput();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.kickRequested = false;
            }
        });
        
        // Prevenir menu de contexto no canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    sendInput() {
        if (!this.connected || !this.ws) {
            console.log('❌ Não conectado - não enviando input');
            return;
        }
        
        const inputData = {
            type: 'player_input',
            data: {
                direction: this.playerDirection,
                isRunning: this.isRunning,
                kick: this.kickRequested,
                mousePosition: { ...this.mousePosition },
                timestamp: Date.now()
            }
        };
        
        console.log('📤 Enviando input:', inputData);
        this.ws.send(JSON.stringify(inputData));
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'game_state':
                this.gameState = data.data;
                break;
            case 'player_assigned':
                this.playerId = data.playerId;
                this.updateStatus(`Jogador: ${this.playerId}`);
                console.log(`✅ Jogador atribuído: ${this.playerId}`);
                break;
            case 'connection_status':
                this.updateStatus(data.message);
                break;
            default:
                console.log('Mensagem recebida:', data);
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
        
        // Enviar input continuamente para movimento suave
        setInterval(() => {
            // Sempre envia input para manter movimento contínuo
            this.sendInput();
        }, 1000 / 30); // 30 FPS para input suave
    }

    render() {
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fundo do campo
        this.drawField();
        
        if (!this.gameState) {
            this.drawWaitingMessage();
            return;
        }
        
        // Renderizar bola
        this.drawBall();
        
        // Renderizar jogadores
        this.drawPlayers();
        
        // Renderizar UI
        this.drawUI();
        
        // Renderizar mira do mouse
        this.drawMouseCursor();
    }

    drawField() {
        // Campo verde
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Linhas do campo
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        
        // Bordas
        this.ctx.strokeRect(10, 10, this.canvas.width - 20, this.canvas.height - 20);
        
        // Linha central
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 10);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height - 10);
        this.ctx.stroke();
        
        // Círculo central
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 50, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Goals
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, this.canvas.height / 2 - 60, 10, 120); // Goal esquerdo
        this.ctx.fillRect(this.canvas.width - 10, this.canvas.height / 2 - 60, 10, 120); // Goal direito
    }

    drawBall() {
        if (!this.gameState || !this.gameState.ball) return;
        
        const ball = this.gameState.ball;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(ball.position.x, ball.position.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Sombra da bola
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(ball.position.x + 2, ball.position.y + 2, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPlayers() {
        if (!this.gameState || !this.gameState.players) return;
        
        this.gameState.players.forEach(player => {
            const isCurrentPlayer = player.id === this.playerId;
            
            // Cor do jogador baseada no time
            this.ctx.fillStyle = player.team === 'team1' ? '#FF5722' : '#2196F3';
            
            // Desenhar corpo do jogador
            this.ctx.beginPath();
            this.ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Destacar jogador atual
            if (isCurrentPlayer) {
                this.ctx.strokeStyle = '#FFEB3B';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
            
            // Desenhar direção do jogador
            if (player.direction !== undefined) {
                const endX = player.position.x + Math.cos(player.direction) * 25;
                const endY = player.position.y + Math.sin(player.direction) * 25;
                
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(player.position.x, player.position.y);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
            
            // Nome do jogador
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.id.substring(0, 8), player.position.x, player.position.y - 25);
        });
    }

    drawMouseCursor() {
        if (!this.playerId || !this.gameState) return;
        
        const player = this.gameState.players.find(p => p.id === this.playerId);
        if (!player) return;
        
        // Linha da mira
        this.ctx.strokeStyle = this.isRunning ? '#FF5722' : '#FFEB3B';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(player.position.x, player.position.y);
        this.ctx.lineTo(this.mousePosition.x, this.mousePosition.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Cursor do mouse
        this.ctx.fillStyle = this.isRunning ? '#FF5722' : '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.arc(this.mousePosition.x, this.mousePosition.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawUI() {
        if (!this.gameState) return;
        
        // Placar
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${this.gameState.score.team1} x ${this.gameState.score.team2}`,
            this.canvas.width / 2,
            40
        );
        
        // Instruções
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Mouse: Mirar | Click: Correr | Espaço: Chutar', 10, this.canvas.height - 10);
    }

    drawWaitingMessage() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Aguardando conexão...', this.canvas.width / 2, this.canvas.height / 2);
    }

    updateStatus(message) {
        let statusDiv = document.getElementById('status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                z-index: 1000;
            `;
            document.body.appendChild(statusDiv);
        }
        statusDiv.textContent = message;
        console.log('📱 Status:', message);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando cliente do navegador...');
    const client = new BrowserGameClient();
    window.gameClient = client; // Para debug
});