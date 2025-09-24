// local-proxy-client.js - Cliente local que recebe WebSocket do navegador e envia UDP para o servidor
const WebSocket = require('ws');
const dgram = require('dgram');

class LocalProxyClient {
    constructor() {
        // WebSocket Server para receber do navegador
        this.wsServer = null;
        this.browserClient = null;
        
        // UDP Client para comunicar com o servidor
        this.udpClient = dgram.createSocket('udp4');
        this.serverHost = '127.0.0.1';
        this.serverPort = 33333;
        
        // Estado do jogador
        this.playerId = null;
        this.playerTeam = null;
        this.connected = false;
        this.sequenceNumber = 0;
        
        // Controle de input
        this.lastInput = {
            direction: 0,
            isRunning: false,
            kick: false
        };
        
        this.init();
    }

    init() {
        this.setupWebSocketServer();
        this.setupUDPClient();
        this.startGameLoop();
        
        console.log('🚀 Cliente Proxy Local iniciado');
        console.log('📡 WebSocket Server: ws://localhost:8080');
        console.log('🎮 UDP Server: 127.0.0.1:33333');
    }

    setupWebSocketServer() {
        this.wsServer = new WebSocket.Server({ port: 8080 });
        
        this.wsServer.on('connection', (ws) => {
            console.log('🌐 Navegador conectado via WebSocket');
            this.browserClient = ws;
            
            // Conectar ao servidor UDP quando o navegador conectar
            this.connectToUDPServer();
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleBrowserMessage(data);
                } catch (error) {
                    console.error('Erro ao processar mensagem do navegador:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('❌ Navegador desconectado');
                this.browserClient = null;
            });
            
            ws.on('error', (error) => {
                console.error('Erro WebSocket:', error);
            });
        });
        
        console.log('🌐 WebSocket Server rodando na porta 8080');
    }

    setupUDPClient() {
        this.udpClient.on('message', (msg, rinfo) => {
            try {
                const packet = JSON.parse(msg.toString());
                this.handleUDPMessage(packet);
            } catch (error) {
                console.error('Erro ao processar mensagem UDP:', error);
            }
        });
        
        this.udpClient.on('error', (err) => {
            console.error('Erro UDP:', err);
        });
        
        this.udpClient.on('close', () => {
            console.log('❌ Conexão UDP fechada');
            this.connected = false;
        });
    }

    connectToUDPServer() {
        console.log('🎮 Conectando ao servidor UDP...');
        
        const joinPacket = {
            type: 'join_game',
            sequence: this.sequenceNumber++,
            timestamp: Date.now()
        };
        
        this.sendUDPPacket(joinPacket);
        
        this.sendToBrowser({
            type: 'connection_status',
            message: 'Conectando ao servidor...'
        });
    }

    handleBrowserMessage(data) {
        console.log('📨 Mensagem do navegador:', data.type);
        
        switch (data.type) {
            case 'player_input':
                this.handlePlayerInput(data.data);
                break;
            default:
                console.log('Tipo de mensagem desconhecido do navegador:', data.type);
        }
    }

    handlePlayerInput(inputData) {
        console.log('🎮 Input recebido:', {
            direction: inputData.direction,
            isRunning: inputData.isRunning,
            kick: inputData.kick
        });
        
        // Atualizar estado do input
        this.lastInput = {
            direction: inputData.direction,
            isRunning: inputData.isRunning,
            kick: inputData.kick
        };
        
        // Calcular velocidade baseada na direção e se está correndo
        const speed = inputData.isRunning ? 250 : 0; // Só se move quando está correndo
        const velocity = {
            x: Math.cos(inputData.direction) * speed,
            y: Math.sin(inputData.direction) * speed
        };
        
        // Enviar input para o servidor UDP
        const inputPacket = {
            type: 'player_input',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: {
                velocity: velocity,
                direction: inputData.direction,
                kick: inputData.kick,
                isRunning: inputData.isRunning
            }
        };
        
        console.log('📤 Enviando para servidor UDP:', inputPacket);
        this.sendUDPPacket(inputPacket);
    }

    handleUDPMessage(packet) {
        console.log('📨 UDP recebido:', packet.type);
        
        switch (packet.type) {
            case 'game_state':
                this.handleGameState(packet.data);
                break;
            case 'join_confirmed':
                this.handleJoinConfirmed(packet.data);
                break;
            case 'ping':
                this.handlePing(packet);
                break;
            case 'pong':
                this.handlePong(packet);
                break;
            default:
                console.log('Tipo de pacote UDP desconhecido:', packet.type);
        }
    }

    handleGameState(gameState) {
        // Log ocasional para debug (apenas a cada 60 mensagens - 1 vez por segundo)
        if (this.sequenceNumber % 60 === 0) {
            console.log('🎮 Estado do jogo recebido:', {
                players: gameState.players?.length || 0,
                ballPos: gameState.ball?.position,
                score: gameState.score
            });
        }
        
        // Repassar estado do jogo para o navegador
        this.sendToBrowser({
            type: 'game_state',
            data: gameState
        });
    }

    handleJoinConfirmed(data) {
        this.playerId = data.playerId;
        this.playerTeam = data.team;
        this.connected = true;
        
        console.log(`✅ Conectado como ${this.playerId} no ${this.playerTeam}`);
        
        // Informar o navegador sobre o jogador
        this.sendToBrowser({
            type: 'player_assigned',
            playerId: this.playerId,
            team: this.playerTeam
        });
        
        this.sendToBrowser({
            type: 'connection_status',
            message: `Conectado como ${this.playerId}`
        });
    }

    handlePing(packet) {
        // Responder ao ping
        const pongPacket = {
            type: 'pong',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: { originalTimestamp: packet.timestamp }
        };
        
        this.sendUDPPacket(pongPacket);
    }

    handlePong(packet) {
        // Calcular latência se necessário
        if (packet.data && packet.data.originalTimestamp) {
            const latency = Date.now() - packet.data.originalTimestamp;
            console.log(`📡 Latência: ${latency}ms`);
        }
    }

    sendUDPPacket(packet) {
        const message = Buffer.from(JSON.stringify(packet));
        this.udpClient.send(message, this.serverPort, this.serverHost, (err) => {
            if (err) {
                console.error('Erro ao enviar pacote UDP:', err);
            }
        });
    }

    sendToBrowser(data) {
        if (this.browserClient && this.browserClient.readyState === WebSocket.OPEN) {
            this.browserClient.send(JSON.stringify(data));
        }
    }

    startGameLoop() {
        // Enviar ping periodicamente
        setInterval(() => {
            if (this.connected) {
                const pingPacket = {
                    type: 'ping',
                    sequence: this.sequenceNumber++,
                    timestamp: Date.now()
                };
                this.sendUDPPacket(pingPacket);
            }
        }, 2000);
        
        // Monitorar estado da conexão
        setInterval(() => {
            this.logStatus();
        }, 5000);
    }

    logStatus() {
        console.log('📊 Status:');
        console.log(`  🌐 Navegador: ${this.browserClient ? 'Conectado' : 'Desconectado'}`);
        console.log(`  🎮 Servidor: ${this.connected ? 'Conectado' : 'Desconectado'}`);
        if (this.playerId) {
            console.log(`  👤 Jogador: ${this.playerId} (${this.playerTeam})`);
        }
    }

    shutdown() {
        console.log('🛑 Desligando cliente proxy...');
        
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        if (this.udpClient) {
            this.udpClient.close();
        }
        
        process.exit(0);
    }
}

// Inicializar cliente proxy
const proxyClient = new LocalProxyClient();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT, desligando...');
    proxyClient.shutdown();
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recebido SIGTERM, desligando...');
    proxyClient.shutdown();
});

module.exports = LocalProxyClient;