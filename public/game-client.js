// public/game-client.js
class ButtonFootballClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.websocket = null;
        this.udpClient = null;
        
        this.isConnected = false;
        this.playerId = null;
        this.playerTeam = null;
        
        // Game state
        this.gameState = {
            players: [],
            ball: { position: { x: 400, y: 300 }, velocity: { x: 0, y: 0 } },
            score: { team1: 0, team2: 0 },
            gameTime: 0,
            field: {
                width: 800,
                height: 600,
                goals: {
                    team1: { x: 0, y: 250, width: 20, height: 100 },
                    team2: { x: 780, y: 250, width: 20, height: 100 }
                }
            }
        };
        
        // Input handling
        this.keys = {};
        this.playerInput = { x: 0, y: 0 };
        this.lastInputSent = 0;
        
        // Network metrics
        this.networkStats = {
            latency: 0,
            jitter: 0,
            packetLoss: 0,
            fps: 60
        };
        
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fpsCounter = 0;
        
        this.setupEventListeners();
        this.startRenderLoop();
    }
    
    setupEventListeners() {
        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });
        
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.updatePlayerInput();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updatePlayerInput();
        });
        
        // Canvas focus
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
        
        this.canvas.tabIndex = 1; // Make canvas focusable
    }
    
    connect() {
        try {
            // Connect to WebSocket for game updates
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('WebSocket conectado');
                this.updateConnectionStatus(true);
                
                // Request to join game as player
                this.websocket.send(JSON.stringify({
                    type: 'join_as_player',
                    timestamp: Date.now()
                }));
            };
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket desconectado');
                this.updateConnectionStatus(false);
            };
            
            this.websocket.onerror = (error) => {
                console.error('Erro WebSocket:', error);
                this.updateConnectionStatus(false);
            };
            
            // Start UDP client simulation (in real implementation, this would use WebRTC or similar)
            this.startUDPSimulation();
            
        } catch (error) {
            console.error('Erro ao conectar:', error);
            this.updateConnectionStatus(false);
        }
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.stopUDPSimulation();
        this.updateConnectionStatus(false);
    }
    
    startUDPSimulation() {
        // Simulate UDP communication through WebSocket
        // In a real implementation, you'd use WebRTC or a WebSocket wrapper for UDP-like behavior
        this.udpInterval = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.sendPlayerInput();
            }
        }, 1000 / 20); // 20 Hz
    }
    
    stopUDPSimulation() {
        if (this.udpInterval) {
            clearInterval(this.udpInterval);
        }
    }
    
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'welcome':
                console.log(message.message);
                break;
                
            case 'game_state_update':
                this.updateGameState(message.data);
                break;
                
            case 'player_connected':
                this.addPlayer(message.data);
                break;
                
            case 'player_disconnected':
                this.removePlayer(message.data.playerId);
                break;
                
            case 'goal_scored':
                this.handleGoal(message.data);
                break;
                
            case 'spectator_joined':
                console.log('Entrou como espectador');
                break;
                
            case 'player_joined':
                this.handlePlayerJoined(message.data);
                break;
                
            default:
                console.log('Mensagem não reconhecida:', message.type);
        }
    }
    
    updatePlayerInput() {
        let x = 0, y = 0;
        
        // WASD or Arrow keys
        if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
        
        this.playerInput = { x, y };
    }
    
    sendPlayerInput() {
        if (!this.playerInput.x && !this.playerInput.y) return;
        
        const now = Date.now();
        if (now - this.lastInputSent < 1000 / 20) return; // Rate limit
        
        const inputData = {
            type: 'player_input_sim',
            playerId: this.playerId,
            input: this.playerInput,
            timestamp: now
        };
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(inputData));
        }
        
        this.lastInputSent = now;
    }
    
    handlePlayerJoined(data) {
        this.playerId = data.playerId;
        this.playerTeam = data.team;
        console.log(`✅ Entrou no jogo como ${data.playerId} no ${data.team}`);
        
        // Update UI to show player status
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = `Jogando como ${data.team === 'team1' ? 'Time Azul' : 'Time Vermelho'}`;
        statusEl.className = 'status connected';
    }
    
    updateGameState(newState) {
        if (newState) {
            this.gameState = { ...this.gameState, ...newState };
            this.updateUI();
        }
    }
    
    addPlayer(playerData) {
        console.log('Jogador conectado:', playerData.playerId);
        this.updatePlayersList();
    }
    
    removePlayer(playerId) {
        console.log('Jogador desconectado:', playerId);
        this.updatePlayersList();
    }
    
    handleGoal(goalData) {
        console.log('Gol!', goalData);
        // Add visual effects or animations here
    }
    
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusEl = document.getElementById('connectionStatus');
        const btnEl = document.getElementById('connectBtn');
        
        if (connected) {
            statusEl.textContent = 'Conectado';
            statusEl.className = 'status connected';
            btnEl.textContent = 'Desconectar';
            btnEl.className = 'connect-button disconnect-button';
        } else {
            statusEl.textContent = 'Desconectado';
            statusEl.className = 'status disconnected';
            btnEl.textContent = 'Conectar ao Jogo';
            btnEl.className = 'connect-button';
        }
    }
    
    updateUI() {
        // Update score
        document.getElementById('team1Score').textContent = this.gameState.score.team1;
        document.getElementById('team2Score').textContent = this.gameState.score.team2;
        
        // Update game time
        const minutes = Math.floor(this.gameState.gameTime / 60000);
        const seconds = Math.floor((this.gameState.gameTime % 60000) / 1000);
        document.getElementById('gameTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update network stats
        document.getElementById('latency').textContent = `${this.networkStats.latency} ms`;
        document.getElementById('jitter').textContent = `${this.networkStats.jitter.toFixed(1)} ms`;
        document.getElementById('packetLoss').textContent = `${this.networkStats.packetLoss.toFixed(1)}%`;
        document.getElementById('fps').textContent = this.networkStats.fps;
    }
    
    updatePlayersList() {
        const playersListEl = document.getElementById('playersList');
        playersListEl.innerHTML = '';
        
        if (this.gameState.players.length === 0) {
            playersListEl.innerHTML = '<div class="player-item"><span>Nenhum jogador conectado</span></div>';
            return;
        }
        
        this.gameState.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player-item';
            playerEl.innerHTML = `
                <span class="${player.team}">${player.id.substr(0, 8)}...</span>
                <span>${player.team === 'team1' ? 'Azul' : 'Vermelho'}</span>
            `;
            playersListEl.appendChild(playerEl);
        });
    }
    
    startRenderLoop() {
        const render = (currentTime) => {
            this.calculateFPS(currentTime);
            this.clearCanvas();
            this.drawField();
            this.drawPlayers();
            this.drawBall();
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
    
    calculateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.networkStats.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }
    
    clearCanvas() {
        this.ctx.fillStyle = '#228B22'; // Green field
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawField() {
        const field = this.gameState.field;
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        
        // Field border
        this.ctx.strokeRect(0, 0, field.width, field.height);
        
        // Center line
        this.ctx.beginPath();
        this.ctx.moveTo(field.width / 2, 0);
        this.ctx.lineTo(field.width / 2, field.height);
        this.ctx.stroke();
        
        // Center circle
        this.ctx.beginPath();
        this.ctx.arc(field.width / 2, field.height / 2, 50, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Goals
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        
        // Team 1 goal (left)
        const goal1 = field.goals.team1;
        this.ctx.strokeRect(goal1.x, goal1.y, goal1.width, goal1.height);
        
        // Team 2 goal (right)
        const goal2 = field.goals.team2;
        this.ctx.strokeRect(goal2.x, goal2.y, goal2.width, goal2.height);
        
        // Goal areas
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 200, 100, 200); // Team 1 area
        this.ctx.strokeRect(field.width - 100, 200, 100, 200); // Team 2 area
    }
    
    drawPlayers() {
        this.gameState.players.forEach(player => {
            this.ctx.save();
            
            // Player color based on team
            if (player.team === 'team1') {
                this.ctx.fillStyle = '#4FC3F7'; // Blue
            } else {
                this.ctx.fillStyle = '#FF7043'; // Red
            }
            
            // Draw player
            this.ctx.beginPath();
            this.ctx.arc(player.position.x, player.position.y, player.size || 12, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Player border
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Player ID (first few characters)
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                player.id.substr(7, 3), 
                player.position.x, 
                player.position.y + 3
            );
            
            this.ctx.restore();
        });
    }
    
    drawBall() {
        const ball = this.gameState.ball;
        
        this.ctx.save();
        
        // Ball
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(ball.position.x, ball.position.y, ball.size || 8, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Ball border
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Ball pattern (simple lines)
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(ball.position.x - 4, ball.position.y);
        this.ctx.lineTo(ball.position.x + 4, ball.position.y);
        this.ctx.moveTo(ball.position.x, ball.position.y - 4);
        this.ctx.lineTo(ball.position.x, ball.position.y + 4);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
}

// Initialize the game when page loads
window.addEventListener('load', () => {
    const game = new ButtonFootballClient();
    console.log('Cliente do jogo inicializado');
});