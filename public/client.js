"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dgram = require("dgram");
class GameClient {
    constructor() {
        this.PORT = 33333;
        this.HOST = '127.0.0.1';
        this.sequenceNumber = 0;
        this.playerId = null;
        this.playerTeam = null;
        this.playerInput = { x: 0, y: 0 };
        this.inputInterval = null;
        this.latency = 0;
        this.lastPingTime = 0;
        this.client = dgram.createSocket('udp4');
        this.setupEventHandlers();
        this.simulatePlayerInput();
    }
    setupEventHandlers() {
        this.client.on('message', (msg, rinfo) => {
            try {
                const packet = JSON.parse(msg.toString());
                this.handleServerMessage(packet);
            }
            catch (error) {
                console.error('Erro ao processar mensagem do servidor:', error);
            }
        });
        this.client.on('error', (err) => {
            console.error('Erro no cliente UDP:', err);
        });
        this.client.on('close', () => {
            console.log('Conexão UDP fechada');
        });
    }
    handleServerMessage(packet) {
        switch (packet.type) {
            case 'game_state':
                this.handleGameState(packet.data);
                break;
            case 'ping':
                this.handlePing(packet);
                break;
            case 'join_confirmed':
                this.handleJoinConfirmed(packet.data);
                break;
            case 'pong':
                this.handlePong(packet);
                break;
            default:
                console.log('Tipo de pacote desconhecido:', packet.type);
        }
    }
    handleGameState(gameState) {
        if (gameState) {
            console.clear();
            console.log('=== ESTADO DO JOGO ===');
            console.log(`Placar: Time 1: ${gameState.score.team1} x Time 2: ${gameState.score.team2}`);
            console.log(`Jogadores: ${gameState.players.length}`);
            console.log(`Bola: x=${gameState.ball.position.x.toFixed(1)}, y=${gameState.ball.position.y.toFixed(1)}`);
            console.log(`Latência: ${this.latency}ms`);
            console.log('====================');
        }
    }
    handlePing(packet) {
        this.sendPacket({
            type: 'pong',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: { originalTimestamp: packet.timestamp }
        });
    }
    handleJoinConfirmed(data) {
        this.playerId = data.playerId;
        this.playerTeam = data.team;
        console.log(`✅ Conectado ao jogo como ${data.playerId} no ${data.team}`);
    }
    handlePong(packet) {
        if (packet.data && packet.data.originalTimestamp === this.lastPingTime) {
            this.latency = Date.now() - this.lastPingTime;
        }
    }
    simulatePlayerInput() {
        this.inputInterval = setInterval(() => {
            this.playerInput = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };
            if (Math.abs(this.playerInput.x) > 0.1 || Math.abs(this.playerInput.y) > 0.1) {
                this.sendPlayerInput();
            }
        }, 1000 / 20);
    }
    sendPlayerInput() {
        if (!this.playerId)
            return;
        const inputPacket = {
            type: 'player_input',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: {
                position: { x: 100, y: 100 },
                velocity: {
                    x: this.playerInput.x * 100,
                    y: this.playerInput.y * 100
                }
            }
        };
        this.sendPacket(inputPacket);
    }
    sendPacket(packet) {
        const message = Buffer.from(JSON.stringify(packet));
        this.client.send(message, this.PORT, this.HOST, (err) => {
            if (err) {
                console.error('Erro ao enviar pacote:', err);
            }
        });
    }
    connect() {
        console.log('🎮 Conectando ao servidor...');
        this.sendPacket({
            type: 'join_game',
            sequence: this.sequenceNumber++,
            timestamp: Date.now()
        });
        setInterval(() => {
            this.lastPingTime = Date.now();
            this.sendPacket({
                type: 'ping',
                sequence: this.sequenceNumber++,
                timestamp: this.lastPingTime
            });
        }, 2000);
        console.log('✅ Cliente UDP iniciado. Pressione Ctrl+C para sair.');
    }
    disconnect() {
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
        }
        this.client.close();
        console.log('👋 Cliente desconectado');
    }
}
const client = new GameClient();
client.connect();
process.on('SIGINT', () => {
    console.log('\n🛑 Desconectando...');
    client.disconnect();
    process.exit(0);
});
//# sourceMappingURL=client.js.map