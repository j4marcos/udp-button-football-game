// local-proxy-client.js - Cliente proxy que serve HTTP frontend e comunica via UDP com servidor
const http = require('http');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const url = require('url');

class LocalProxyClient {
    constructor(port = null) {
        // HTTP Server para servir o frontend
        this.httpServer = null;
        this.httpPort = port || this.findAvailablePort();
        
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

        // Armazenar último estado do jogo para API
        this.lastGameState = null;
        
        // Estatísticas de rede
        this.networkStats = {
            latency: 0,
            jitter: 0,
            packetLoss: 0
        };
        
        this.init();
    }

    findAvailablePort() {
        // Gera uma porta aleatória entre 8080 e 8999
        return Math.floor(Math.random() * 920) + 8080;
    }

    init() {
        this.setupHTTPServer();
        this.setupUDPClient();
        this.startGameLoop();
        
        console.log('🚀 Cliente Proxy Local iniciado');
        console.log(`🌐 Frontend disponível em: http://localhost:${this.httpPort}`);
        console.log('🎮 Servidor UDP: 127.0.0.1:33333');
    }

    setupHTTPServer() {
        this.httpServer = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            
            // Configurar CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // API endpoints
            if (parsedUrl.pathname === '/api/connect') {
                this.handleConnect(req, res);
            } else if (parsedUrl.pathname === '/api/input') {
                this.handleInput(req, res);
            } else if (parsedUrl.pathname === '/api/gamestate') {
                this.handleGameState(req, res);
            } else if (parsedUrl.pathname === '/api/status') {
                this.handleStatus(req, res);
            } else if (parsedUrl.pathname === '/api/stats') {
                this.handleNetworkStats(req, res);
            } else {
                // Servir arquivos estáticos
                this.serveStaticFile(req, res, parsedUrl.pathname);
            }
        });

        this.httpServer.listen(this.httpPort, () => {
            console.log(`🌐 Servidor HTTP rodando na porta ${this.httpPort}`);
        });
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

    serveStaticFile(req, res, pathname) {
        if (pathname === '/') {
            pathname = '/index.html';
        }

        const filePath = path.join(__dirname, 'public', pathname);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Arquivo não encontrado');
                return;
            }

            // Definir content-type baseado na extensão
            const ext = path.extname(filePath).toLowerCase();
            const contentType = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.wav': 'audio/wav',
                '.mp4': 'video/mp4',
                '.woff': 'application/font-woff',
                '.ttf': 'application/font-ttf',
                '.eot': 'application/vnd.ms-fontobject',
                '.otf': 'application/font-otf',
                '.wasm': 'application/wasm'
            }[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }

    handleConnect(req, res) {
        if (req.method === 'POST') {
            console.log('🎮 Conectando ao servidor UDP...');
            
            const joinPacket = {
                type: 'join_game',
                sequence: this.sequenceNumber++,
                timestamp: Date.now()
            };
            
            this.sendUDPPacket(joinPacket);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Conectando ao servidor...',
                playerId: this.playerId,
                team: this.playerTeam
            }));
        } else {
            res.writeHead(405);
            res.end('Method not allowed');
        }
    }

    handleInput(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const inputData = JSON.parse(body);
                    this.handlePlayerInput(inputData);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Erro ao processar input:', error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
        } else {
            res.writeHead(405);
            res.end('Method not allowed');
        }
    }

    handleGameState(req, res) {
        // Converter formato do servidor para formato do frontend
        const convertedGameState = this.convertGameStateFormat(this.lastGameState);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            gameState: convertedGameState,
            playerId: this.playerId,
            team: this.playerTeam,
            connected: this.connected,
            networkStats: this.networkStats
        }));
    }

    handleStatus(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            connected: this.connected,
            playerId: this.playerId,
            team: this.playerTeam,
            serverHost: this.serverHost,
            serverPort: this.serverPort,
            proxyPort: this.httpPort,
            networkStats: this.networkStats
        }));
    }

    convertGameStateFormat(gameState) {
        if (!gameState) return null;

        // Converter formato do servidor para formato do frontend
        const converted = { ...gameState };
        
        // Converter score de team1/team2 para red/blue
        if (gameState.score) {
            converted.score = {
                red: gameState.score.team1 || 0,
                blue: gameState.score.team2 || 0
            };
        }

        // Converter team dos jogadores
        if (gameState.players) {
            converted.players = gameState.players.map(player => ({
                ...player,
                team: player.team === 'team1' ? 'red' : 'blue'
            }));
        }

        return converted;
    }

    handleNetworkStats(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            networkStats: this.networkStats,
            connected: this.connected,
            timestamp: Date.now()
        }));
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
        
        // Calcular velocidade baseada na direção - sempre se move na direção do mouse
        const baseSpeed = 2000; // Velocidade base aumentada
        const runningSpeed = 4000; // Velocidade quando correndo
        const speed = inputData.isRunning ? runningSpeed : baseSpeed; // Sempre se move, mais rápido quando correndo
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
        // Só log pings/pongs para evitar spam
        if (packet.type !== 'game_state') {
            console.log('📨 UDP recebido:', packet.type);
        }
        
        switch (packet.type) {
            case 'game_state':
                this.handleGameStateFromUDP(packet.data);
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

    handleGameStateFromUDP(gameState) {
        // Log cada 10 mensagens para debug intensivo  
        if (this.sequenceNumber % 10 === 0) {
            console.log('🎮 Estado do jogo recebido:', {
                players: gameState?.players?.length || 0,
                ballPos: gameState?.ball?.position,
                score: gameState?.score,
                isGameActive: gameState?.isGameActive
            });
        }
        
        // Armazenar o último estado do jogo
        this.lastGameState = gameState;
    }

    handleJoinConfirmed(data) {
        this.playerId = data.playerId;
        this.playerTeam = data.team;
        this.connected = true;
        
        console.log(`✅ Conectado como ${this.playerId} no ${this.playerTeam}`);
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
            
            // Atualizar estatísticas de rede
            this.updateNetworkStats(latency);
        }
    }

    updateNetworkStats(latency) {
        // Calcular latência média
        this.networkStats.latency = Math.round((this.networkStats.latency * 0.8) + (latency * 0.2));
        
        // Calcular jitter (variação da latência)
        const jitter = Math.abs(latency - this.networkStats.latency);
        this.networkStats.jitter = Math.round((this.networkStats.jitter * 0.8) + (jitter * 0.2));
        
        // Packet loss será calculado baseado em timeouts (por enquanto 0)
        this.networkStats.packetLoss = 0;
    }

    sendUDPPacket(packet) {
        const message = Buffer.from(JSON.stringify(packet));
        this.udpClient.send(message, this.serverPort, this.serverHost, (err) => {
            if (err) {
                console.error('Erro ao enviar pacote UDP:', err);
            }
        });
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
        console.log(`  🌐 Frontend: http://localhost:${this.httpPort}`);
        console.log(`  🎮 Servidor: ${this.connected ? 'Conectado' : 'Desconectado'}`);
        if (this.playerId) {
            console.log(`  👤 Jogador: ${this.playerId} (${this.playerTeam})`);
        }
    }

    shutdown() {
        console.log('🛑 Desligando cliente proxy...');
        
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        if (this.udpClient) {
            this.udpClient.close();
        }
        
        process.exit(0);
    }
}

// Inicializar cliente proxy
const port = process.argv[2] ? parseInt(process.argv[2]) : null;
const proxyClient = new LocalProxyClient(port);

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