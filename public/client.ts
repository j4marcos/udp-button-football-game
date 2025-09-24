// public/client.ts - Cliente UDP standalone
import dgram = require('dgram');

interface UDPPacket {
    type: string;
    sequence: number;
    timestamp: number;
    data?: any;
}

class UDPGameClient {
    private client: dgram.Socket;
    private readonly PORT = 33333;
    private readonly HOST = '127.0.0.1';
    private sequenceNumber = 0;
    private playerId: string | null = null;
    private playerTeam: 'team1' | 'team2' | null = null;
    
    // Input simulation
    private playerInput = { x: 0, y: 0 };
    private inputInterval: NodeJS.Timeout | null = null;
    
    // Network metrics
    private latency = 0;
    private lastPingTime = 0;

    constructor() {
        this.client = dgram.createSocket('udp4');
        this.setupEventHandlers();
        this.simulatePlayerInput();
    }

    private setupEventHandlers(): void {
        this.client.on('message', (msg, rinfo) => {
            try {
                const packet: UDPPacket = JSON.parse(msg.toString());
                this.handleServerMessage(packet);
            } catch (error) {
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

    private handleServerMessage(packet: UDPPacket): void {
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

    private handleGameState(gameState: any): void {
        // Atualizar estado local do jogo
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

    private handlePing(packet: UDPPacket): void {
        // Responder com pong
        this.sendPacket({
            type: 'pong',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: { originalTimestamp: packet.timestamp }
        });
    }

    private handleJoinConfirmed(data: any): void {
        this.playerId = data.playerId;
        this.playerTeam = data.team;
        console.log(`✅ Conectado ao jogo como ${data.playerId} no ${data.team}`);
    }

    private handlePong(packet: UDPPacket): void {
        if (packet.data && packet.data.originalTimestamp === this.lastPingTime) {
            this.latency = Date.now() - this.lastPingTime;
        }
    }

    private simulatePlayerInput(): void {
        // Simular movimento aleatório do jougar
        this.inputInterval = setInterval(() => {
            // Gerar movimento aleatório
            this.playerInput = {
                x: (Math.random() - 0.5) * 2, // -1 a 1
                y: (Math.random() - 0.5) * 2  // -1 a 1
            };
            
            // Enviar input apenas se houver movimento
            if (Math.abs(this.playerInput.x) > 0.1 || Math.abs(this.playerInput.y) > 0.1) {
                this.sendPlayerInput();
            }
        }, 1000 / 20); // 20 FPS
    }

    private sendPlayerInput(): void {
        if (!this.playerId) return;

        const inputPacket: UDPPacket = {
            type: 'player_input',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: {
                position: { x: 100, y: 100 }, // Posição simulada
                velocity: {
                    x: this.playerInput.x * 100, // Velocidade baseada no input
                    y: this.playerInput.y * 100
                }
            }
        };

        this.sendPacket(inputPacket);
    }

    private sendPacket(packet: UDPPacket): void {
        const message = Buffer.from(JSON.stringify(packet));
        this.client.send(message, this.PORT, this.HOST, (err) => {
            if (err) {
                console.error('Erro ao enviar pacote:', err);
            }
        });
    }

    public connect(): void {
        console.log('🎮 Conectando ao servidor...');
        
        // Solicitar entrada no jogo
        this.sendPacket({
            type: 'join_game',
            sequence: this.sequenceNumber++,
            timestamp: Date.now()
        });

        // Enviar ping periódico
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

    public disconnect(): void {
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
        }
        this.client.close();
        console.log('👋 Cliente desconectado');
    }
}

// Inicializar cliente
const client = new UDPGameClient();
client.connect();

// Lidar com sinal de parada
process.on('SIGINT', () => {
    console.log('\n🛑 Desconectando...');
    client.disconnect();
    process.exit(0);
});