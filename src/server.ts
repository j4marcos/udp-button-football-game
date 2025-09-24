// src/server.ts
import { GameEventEmitter } from './events/EventEmitter';
import { GameEventType } from './events/GameEvents';
import { UDPManager } from './network/UDPManager';
import { HTTPServer } from './network/HTTPServer';
import { GameManager } from './game/GameManager';

class ButtonFootballServer {
    private eventEmitter: GameEventEmitter;
    private udpManager: UDPManager;
    private httpServer: HTTPServer;
    private gameManager: GameManager;
    
    private readonly UDP_PORT = 33333;
    private readonly HTTP_PORT = 3000;
    private readonly HOST = '127.0.0.1';

    constructor() {
        console.log('🏈 Iniciando Servidor de Futebol de Botão...');
        
        // Inicializar sistema de eventos
        this.eventEmitter = new GameEventEmitter();
        
        // Inicializar gerenciador do jogo
        this.gameManager = new GameManager(this.eventEmitter);
        
        // Inicializar gerenciador UDP
        this.udpManager = new UDPManager(this.UDP_PORT, this.HOST, this.eventEmitter);
        
        // Inicializar servidor HTTP
        this.httpServer = new HTTPServer(this.HTTP_PORT, this.eventEmitter);
        
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Lidar com atualizações do jogo para transmitir via rede
        this.eventEmitter.on(GameEventType.MATCH_UPDATE, (gameState) => {
            // Enviar estado do jogo via UDP para clientes conectados
            this.udpManager.broadcastGameState(gameState);
            
            // Enviar estado do jogo via WebSocket para espectadores
            this.httpServer.broadcastGameState(gameState);
        });

        // Lidar com eventos de gol
        this.eventEmitter.on(GameEventType.GOAL_SCORED, (goalData) => {
            console.log(`⚽ GOL! Time ${goalData.team} marcou!`);
            this.logGameStats();
        });

        // Lidar com conexões de jogadores
        this.eventEmitter.on(GameEventType.PLAYER_CONNECT, (playerData) => {
            console.log(`🎮 Jogador conectado: ${playerData.playerId}`);
            this.logGameStats();
        });

        // Lidar com desconexões de jogadores
        this.eventEmitter.on(GameEventType.PLAYER_DISCONNECT, (playerData) => {
            console.log(`👋 Jogador desconectado: ${playerData.playerId}`);
            this.logGameStats();
        });

        // Lidar com atualizações de métricas de rede
        this.eventEmitter.on(GameEventType.LATENCY_UPDATE, (metrics) => {
            // Log apenas de métricas críticas
            if (metrics.latency > 100 || metrics.packetLoss > 5) {
                console.warn(`⚠️  Métricas de rede ruins para ${metrics.playerId}: 
                    Latência: ${metrics.latency}ms, 
                    Perda: ${(metrics.packetLoss * 100).toFixed(1)}%`);
            }
        });

        // Handler para requisições de estado do jogo via WebSocket
        this.eventEmitter.on('get_game_state_request', (ws) => {
            const gameState = this.gameManager.getGameState();
            ws.send(JSON.stringify({
                type: 'game_state_response',
                data: gameState,
                timestamp: Date.now()
            }));
        });
    }

    private logGameStats(): void {
        const playersCount = this.gameManager.getConnectedPlayersCount();
        const isGameActive = this.gameManager.isGameRunning();
        const gameState = this.gameManager.getGameState();
        
        console.log(`📊 Status do Jogo: 
            Jogadores: ${playersCount}/12
            Jogo Ativo: ${isGameActive ? 'Sim' : 'Não'}
            Placar: ${gameState.score.team1} x ${gameState.score.team2}
        `);
    }

    public async start(): Promise<void> {
        try {
            console.log('🚀 Iniciando serviços...');
            
            // Iniciar servidor HTTP
            await this.httpServer.start();
            
            // Iniciar gerenciador UDP
            this.udpManager.start();
            
            // Iniciar loops de monitoramento
            this.startMonitoring();
            
            console.log('✅ Servidor iniciado com sucesso!');
            console.log(`🌐 Interface Web: http://localhost:${this.HTTP_PORT}`);
            console.log(`📡 Servidor UDP: ${this.HOST}:${this.UDP_PORT}`);
            console.log('');
            console.log('📋 Comandos disponíveis:');
            console.log('  - Ctrl+C: Parar servidor');
            console.log('  - Acesse http://localhost:3000 para jogar');
            console.log('');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            process.exit(1);
        }
    }

    private startMonitoring(): void {
        // Log de estatísticas a cada 10 segundos
        setInterval(() => {
            if (this.gameManager.getConnectedPlayersCount() > 0) {
                this.logGameStats();
                this.logNetworkStats();
            }
        }, 10000);
    }

    private logNetworkStats(): void {
        const clients = this.udpManager.getConnectedClients();
        
        console.log('📡 Estatísticas de Rede:');
        clients.forEach(client => {
            const packetLossPercent = (client.packetLoss / client.totalPackets * 100).toFixed(1);
            console.log(`  ${client.id.substr(0, 8)}: 
                Latência: ${client.latency}ms | 
                Jitter: ${client.jitter.toFixed(1)}ms | 
                Perda: ${packetLossPercent}%`);
        });
    }

    public async stop(): Promise<void> {
        console.log('🛑 Parando servidor...');
        
        this.gameManager.stopGame();
        this.udpManager.stop();
        this.httpServer.stop();
        
        console.log('✅ Servidor parado com sucesso!');
    }
}

// Inicializar e executar servidor
const server = new ButtonFootballServer();

// Lidar com sinais de parada
process.on('SIGINT', async () => {
    console.log('\n🛑 Recebido sinal de parada...');
    await server.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recebido sinal de término...');
    await server.stop();
    process.exit(0);
});

// Iniciar servidor
server.start().catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

