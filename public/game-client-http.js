// game-client-http.js - Cliente que se comunica via HTTP com o proxy
class HTTPGameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Estado do jogo
        this.gameState = null;
        this.playerId = null;
        this.playerTeam = null;
        this.connected = false;
        
        // Estado de input
        this.input = {
            direction: 0,
            isRunning: false,
            kick: false
        };
        
        // Mouse/touch
        this.mousePos = { x: 0, y: 0 };
        this.isMouseDown = false;
        
        // Elementos da UI
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            playerInfo: document.getElementById('playerInfo'),
            teamInfo: document.getElementById('teamInfo'),
            connectBtn: document.getElementById('connectBtn'),
            matchStatus: document.getElementById('matchStatus'),
            redScore: document.getElementById('redScore'),
            blueScore: document.getElementById('blueScore'),
            playersList: document.getElementById('playersList'),
            latencyInfo: document.getElementById('latencyInfo'),
            jitterInfo: document.getElementById('jitterInfo'),
            packetLossInfo: document.getElementById('packetLossInfo')
        };

        // Verificar se elementos críticos existem
        if (!this.elements.connectBtn || !this.elements.connectionStatus) {
            console.error('❌ Elementos HTML essenciais não encontrados!');
        }
        
        // Estatísticas de rede
        this.networkStats = {
            latency: 0,
            jitter: 0,
            packetLoss: 0
        };
        
        this.init();
    }

    init() {
        console.log('🎮 Inicializando cliente HTTP...');
        
        this.setupEventListeners();
        this.startGameLoop();
        this.checkStatus();
        
        console.log('✅ Cliente HTTP inicializado');
    }

    setupEventListeners() {
        // Botão de conectar
        this.elements.connectBtn.addEventListener('click', () => {
            this.connect();
        });

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            this.isMouseDown = true;
            this.updateInput();
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isMouseDown = false;
            this.updateInput();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            this.updateInput();
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.input.isRunning = true;
                this.updateInput();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.input.isRunning = false;
                this.updateInput();
            }
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.isMouseDown = true;
        this.updateInput();
    }

    handleMouseUp(e) {
        this.isMouseDown = false;
        this.updateInput();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.updateInput();
    }

    updateInput() {
        if (!this.connected || !this.playerId) {
            return;
        }

        // Encontrar posição do jogador
        const player = this.findMyPlayer();
        if (!player) return;

        // Calcular direção do mouse relativo ao jogador
        const dx = this.mousePos.x - player.position.x;
        const dy = this.mousePos.y - player.position.y;
        const direction = Math.atan2(dy, dx);

        // Atualizar input
        this.input.direction = direction;
        this.input.kick = this.isMouseDown;

        // Enviar input para o proxy
        this.sendInput();
    }

    findMyPlayer() {
        if (!this.gameState || !this.gameState.players) {
            return null;
        }

        return this.gameState.players.find(p => p.id === this.playerId);
    }

    async connect() {
        try {
            console.log('🔗 Conectando ao servidor...');
            this.elements.connectBtn.disabled = true;
            this.elements.connectBtn.textContent = 'Conectando...';

            const response = await fetch('/api/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Conectado com sucesso!');
                this.connected = true;
                this.updateUI();
            } else {
                console.error('❌ Erro na conexão:', result.error);
                this.elements.connectBtn.disabled = false;
                this.elements.connectBtn.textContent = 'Conectar';
            }
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            this.elements.connectBtn.disabled = false;
            this.elements.connectBtn.textContent = 'Conectar';
        }
    }

    async sendInput() {
        if (!this.connected) return;

        try {
            await fetch('/api/input', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.input)
            });
        } catch (error) {
            console.error('❌ Erro ao enviar input:', error);
        }
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            this.connected = status.connected;
            this.playerId = status.playerId;
            this.playerTeam = status.team;
            
            this.updateUI();
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
        }
    }

    async fetchGameState() {
        if (!this.connected) return;

        try {
            const response = await fetch('/api/gamestate');
            const data = await response.json();
            
            if (data.gameState) {
                this.gameState = data.gameState;
                this.playerId = data.playerId;
                this.playerTeam = data.team;
                this.connected = data.connected;
                
                // Atualizar estatísticas de rede se disponíveis
                if (data.networkStats) {
                    this.networkStats = data.networkStats;
                }
                
                this.updateUI();
                this.render();
            }
        } catch (error) {
            console.error('❌ Erro ao buscar estado do jogo:', error);
        }
    }

    async fetchNetworkStats() {
        if (!this.connected) return;

        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.networkStats) {
                this.networkStats = data.networkStats;
                this.updateNetworkUI();
            }
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas de rede:', error);
        }
    }

    updateUI() {
        // Status da conexão
        if (this.connected) {
            this.elements.connectionStatus.textContent = 'Conectado';
            this.elements.connectionStatus.className = 'status-connected';
            this.elements.connectBtn.style.display = 'none';
        } else {
            this.elements.connectionStatus.textContent = 'Desconectado';
            this.elements.connectionStatus.className = 'status-disconnected';
            this.elements.connectBtn.style.display = 'block';
            this.elements.connectBtn.disabled = false;
            this.elements.connectBtn.textContent = 'Conectar';
        }

        // Informações do jogador
        this.elements.playerInfo.textContent = this.playerId || '-';
        this.elements.teamInfo.textContent = this.playerTeam || '-';

        // Placar e status da partida
        if (this.gameState) {
            this.elements.redScore.textContent = this.gameState.score?.red || 0;
            this.elements.blueScore.textContent = this.gameState.score?.blue || 0;

            if (this.gameState.isGameActive) {
                this.elements.matchStatus.textContent = 'Partida em andamento';
                this.elements.matchStatus.className = 'match-status match-active';
            } else {
                this.elements.matchStatus.textContent = 'Aguardando jogadores...';
                this.elements.matchStatus.className = 'match-status match-waiting';
            }

            // Lista de jogadores
            this.updatePlayersList();
        }

        // Atualizar estatísticas de rede
        this.updateNetworkUI();
    }

    updateNetworkUI() {
        // Verificar se os elementos existem antes de tentar atualizar
        if (!this.elements.latencyInfo || !this.elements.jitterInfo || !this.elements.packetLossInfo) {
            return;
        }

        if (this.connected && this.networkStats) {
            this.elements.latencyInfo.textContent = `${this.networkStats.latency}ms`;
            this.elements.jitterInfo.textContent = `${this.networkStats.jitter}ms`;
            this.elements.packetLossInfo.textContent = `${this.networkStats.packetLoss}%`;
        } else {
            this.elements.latencyInfo.textContent = '-';
            this.elements.jitterInfo.textContent = '-';
            this.elements.packetLossInfo.textContent = '-';
        }
    }

    updatePlayersList() {
        if (!this.gameState || !this.gameState.players) {
            this.elements.playersList.innerHTML = '<div class="player-item">Nenhum jogador conectado</div>';
            return;
        }

        let playersHTML = '';
        this.gameState.players.forEach(player => {
            const isMe = player.id === this.playerId;
            const cssClass = isMe ? 'player-item player-me' : 'player-item';
            const teamColor = player.team === 'red' ? '🔴' : '🔵';
            const meText = isMe ? ' (Você)' : '';
            
            playersHTML += `
                <div class="${cssClass}">
                    ${teamColor} ${player.id}${meText}
                </div>
            `;
        });

        this.elements.playersList.innerHTML = playersHTML;
    }

    render() {
        if (!this.gameState) {
            this.renderWaitingScreen();
            return;
        }

        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Desenhar campo
        this.drawField();

        // Desenhar bola
        if (this.gameState.ball) {
            this.drawBall(this.gameState.ball);
        }

        // Desenhar jogadores
        if (this.gameState.players) {
            this.gameState.players.forEach(player => {
                this.drawPlayer(player);
            });
        }
    }

    renderWaitingScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desenhar campo mesmo sem jogo
        this.drawField();
        
        // Texto de aguardo
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Aguardando conexão...', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawField() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Campo verde
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 0, width, height);

        // Linhas do campo
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // Borda do campo
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Linha do meio
        ctx.beginPath();
        ctx.moveTo(width / 2, 10);
        ctx.lineTo(width / 2, height - 10);
        ctx.stroke();

        // Círculo central
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Gols
        const goalWidth = 80;
        const goalHeight = 160;
        const goalY = (height - goalHeight) / 2;

        // Gol esquerdo
        ctx.strokeRect(10, goalY, 30, goalHeight);
        
        // Gol direito
        ctx.strokeRect(width - 40, goalY, 30, goalHeight);

        // Áreas
        const areaWidth = 120;
        const areaHeight = 240;
        const areaY = (height - areaHeight) / 2;

        // Área esquerda
        ctx.strokeRect(10, areaY, areaWidth, areaHeight);
        
        // Área direita
        ctx.strokeRect(width - areaWidth - 10, areaY, areaWidth, areaHeight);
    }

    drawBall(ball) {
        const ctx = this.ctx;
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ball.position.x, ball.position.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Contorno preto
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawPlayer(player) {
        const ctx = this.ctx;
        const isMe = player.id === this.playerId;
        
        // Cor do jogador baseada no time
        if (player.team === 'red') {
            ctx.fillStyle = isMe ? '#FF0000' : '#CC0000';
        } else {
            ctx.fillStyle = isMe ? '#0000FF' : '#0000CC';
        }

        // Corpo do jogador (círculo)
        ctx.beginPath();
        ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Contorno para o jogador atual
        if (isMe) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // ID do jogador
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.id, player.position.x, player.position.y - 25);

        // Indicador de direção se estiver se movendo
        if (player.velocity && (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1)) {
            const dirLength = 25;
            const endX = player.position.x + Math.cos(Math.atan2(player.velocity.y, player.velocity.x)) * dirLength;
            const endY = player.position.y + Math.sin(Math.atan2(player.velocity.y, player.velocity.x)) * dirLength;

            ctx.strokeStyle = isMe ? '#FFD700' : 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(player.position.x, player.position.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Seta
            const arrowSize = 8;
            const angle = Math.atan2(player.velocity.y, player.velocity.x);
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - arrowSize * Math.cos(angle - Math.PI / 6),
                endY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - arrowSize * Math.cos(angle + Math.PI / 6),
                endY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
        }
    }

    startGameLoop() {
        // Buscar estado do jogo regularmente
        setInterval(() => {
            this.fetchGameState();
        }, 50); // 20 FPS

        // Buscar estatísticas de rede com menos frequência
        setInterval(() => {
            if (this.connected) {
                this.fetchNetworkStats();
            }
        }, 1000); // 1 FPS

        // Verificar status ocasionalmente
        setInterval(() => {
            if (!this.connected) {
                this.checkStatus();
            }
        }, 2000);
    }
}

// Inicializar cliente quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new HTTPGameClient();
});