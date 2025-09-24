// src/network/HTTPServer.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { GameEventEmitter } from '../events/EventEmitter';
import { GameEventType } from '../events/GameEvents';

export class HTTPServer {
    private app: express.Application;
    private server: any;
    private wss: WebSocketServer;
    private port: number;
    private eventEmitter: GameEventEmitter;

    constructor(port: number, eventEmitter: GameEventEmitter) {
        this.port = port;
        this.eventEmitter = eventEmitter;
        this.app = express();
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        
        this.setupRoutes();
        this.setupWebSocket();
    }

    private setupRoutes(): void {
        // Middleware para servir arquivos estáticos
        this.app.use(express.static(path.join(__dirname, '../../public')));
        this.app.use(express.json());

        // Rota principal - servir o jogo
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/index.html'));
        });

        // API para informações do jogo
        this.app.get('/api/game-info', (req, res) => {
            res.json({
                name: 'UDP Button Football Game',
                version: '1.0.0',
                maxPlayers: 12,
                gameMode: 'multiplayer',
                status: 'active'
            });
        });

        // API para estatísticas do servidor
        this.app.get('/api/server-stats', (req, res) => {
            // Estas informações virão do UDPManager
            res.json({
                connectedPlayers: 0,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: Date.now()
            });
        });

        // Rota para download do cliente standalone
        this.app.get('/download/client', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/client.ts'));
        });
    }

    private setupWebSocket(): void {
        this.wss.on('connection', (ws, req) => {
            console.log('Nova conexão WebSocket estabelecida');

            // Enviar informações iniciais do jogo
            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Conectado ao servidor do jogo',
                timestamp: Date.now()
            }));

            // Lidar com mensagens do cliente
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(ws, message);
                } catch (error) {
                    console.error('Erro ao processar mensagem WebSocket:', error);
                }
            });

            ws.on('close', () => {
                console.log('Conexão WebSocket fechada');
            });

            ws.on('error', (error) => {
                console.error('Erro WebSocket:', error);
            });
        });

        // Escutar eventos do jogo para transmitir via WebSocket
        this.eventEmitter.on(GameEventType.GOAL_SCORED, (data) => {
            this.broadcastToWebSockets({
                type: 'goal_scored',
                data,
                timestamp: Date.now()
            });
        });

        this.eventEmitter.on(GameEventType.PLAYER_CONNECT, (data) => {
            this.broadcastToWebSockets({
                type: 'player_connected',
                data,
                timestamp: Date.now()
            });
        });

        this.eventEmitter.on(GameEventType.PLAYER_DISCONNECT, (data) => {
            this.broadcastToWebSockets({
                type: 'player_disconnected',
                data,
                timestamp: Date.now()
            });
        });
    }

    private handleWebSocketMessage(ws: any, message: any): void {
        switch (message.type) {
            case 'get_game_state':
                // Solicitar estado atual do jogo
                this.eventEmitter.emit('get_game_state_request', ws);
                break;
            
            case 'spectator_join':
                // Adicionar como espectador
                ws.send(JSON.stringify({
                    type: 'spectator_joined',
                    message: 'Você está agora assistindo o jogo',
                    timestamp: Date.now()
                }));
                break;
            
            case 'player_input_sim':
                // Simular input de jogador via WebSocket (para testes web)
                this.handlePlayerInputSim(ws, message);
                break;
            
            case 'join_as_player':
                // Permitir que cliente web se torne um jogador
                this.handleJoinAsPlayer(ws, message);
                break;
            
            default:
                console.log('Mensagem WebSocket não reconhecida:', message.type);
        }
    }

    private handlePlayerInputSim(ws: any, message: any): void {
        // Simular input de jogador através do WebSocket
        // Isso permite que clientes web joguem sem UDP direto
        if (message.playerId && message.input) {
            // Emitir evento de movimento do jogador
            this.eventEmitter.emit(GameEventType.PLAYER_MOVE, {
                playerId: message.playerId,
                position: { x: 400, y: 300 }, // Posição simulada
                velocity: {
                    x: message.input.x * 100, // Converter input para velocidade
                    y: message.input.y * 100
                },
                timestamp: message.timestamp || Date.now(),
                sequence: Date.now() // Usar timestamp como sequencia
            });
        }
    }

    private handleJoinAsPlayer(ws: any, message: any): void {
        // Permitir que cliente WebSocket se torne um jogador
        const playerId = `web_player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simular evento de conexão de jogador
        this.eventEmitter.emit(GameEventType.PLAYER_CONNECT, {
            playerId: playerId,
            address: 'websocket',
            port: 0,
            timestamp: Date.now()
        });

        // Responder com confirmação
        ws.send(JSON.stringify({
            type: 'player_joined',
            data: {
                playerId: playerId,
                team: 'team1' // Será determinado pelo GameManager
            },
            timestamp: Date.now()
        }));

        // Armazenar informação do jogador WebSocket
        (ws as any).playerId = playerId;
        (ws as any).isPlayer = true;
    }

    private broadcastToWebSockets(message: any): void {
        this.wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    public broadcastGameState(gameState: any): void {
        this.broadcastToWebSockets({
            type: 'game_state_update',
            data: gameState,
            timestamp: Date.now()
        });
    }

    public start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(`Servidor HTTP rodando em http://localhost:${this.port}`);
                console.log(`WebSocket disponível em ws://localhost:${this.port}`);
                resolve();
            });
        });
    }

    public stop(): void {
        this.wss.close();
        this.server.close();
    }
}