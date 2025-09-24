// src/network/UDPManager.ts
import * as dgram from 'dgram';
import { GameEventEmitter } from '../events/EventEmitter';
import { GameEventType, PlayerMoveEvent, PlayerConnectEvent, NetworkMetrics } from '../events/GameEvents';

export interface ClientSession {
    id: string;
    address: string;
    port: number;
    lastSeen: number;
    lastSequence: number;
    packetLoss: number;
    totalPackets: number;
    receivedPackets: number;
    latency: number;
    lastPingTime?: number;
    jitter: number;
    lastPacketArrivalTime: number;
    team?: 'team1' | 'team2';
}

export interface UDPPacket {
    type: string;
    sequence: number;
    timestamp: number;
    data?: any;
}

export class UDPManager {
    private server: dgram.Socket;
    private sessions = new Map<string, ClientSession>();
    private eventEmitter: GameEventEmitter;
    private port: number;
    private host: string;
    private sequenceNumber = 0;

    constructor(port: number, host: string, eventEmitter: GameEventEmitter) {
        this.port = port;
        this.host = host;
        this.eventEmitter = eventEmitter;
        this.server = dgram.createSocket('udp4');
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.server.on('listening', () => {
            const address = this.server.address();
            console.log(`Servidor UDP escutando em ${address?.address}:${address?.port}`);
        });

        this.server.on('error', (err) => {
            console.error('Erro no servidor UDP:', err);
        });

        this.server.on('message', (msg, rinfo) => {
            this.handleMessage(msg, rinfo);
        });

        this.server.on('close', () => {
            console.log('Servidor UDP fechado');
        });
    }

    private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
        const clientKey = `${rinfo.address}:${rinfo.port}`;
        const now = Date.now();

        try {
            const packet: UDPPacket = JSON.parse(msg.toString());
            let session = this.sessions.get(clientKey);

            // Criar nova sessão se necessário
            if (!session) {
                session = this.createClientSession(clientKey, rinfo);
                this.sessions.set(clientKey, session);
                
                this.eventEmitter.emit(GameEventType.PLAYER_CONNECT, {
                    playerId: session.id,
                    address: rinfo.address,
                    port: rinfo.port,
                    timestamp: now
                } as PlayerConnectEvent);
            }

            // Atualizar métricas da sessão
            this.updateSessionMetrics(session, packet, now);

            // Processar diferentes tipos de pacote
            this.processPacket(session, packet);

        } catch (error) {
            console.error('Erro ao processar mensagem UDP:', error);
        }
    }

    private createClientSession(clientKey: string, rinfo: dgram.RemoteInfo): ClientSession {
        return {
            id: this.generatePlayerId(),
            address: rinfo.address,
            port: rinfo.port,
            lastSeen: Date.now(),
            lastSequence: -1,
            packetLoss: 0,
            totalPackets: 0,
            receivedPackets: 0,
            latency: 0,
            jitter: 0,
            lastPacketArrivalTime: Date.now(),
            team: this.assignTeam()
        };
    }

    private generatePlayerId(): string {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private assignTeam(): 'team1' | 'team2' {
        const team1Count = Array.from(this.sessions.values()).filter(s => s.team === 'team1').length;
        const team2Count = Array.from(this.sessions.values()).filter(s => s.team === 'team2').length;
        
        return team1Count <= team2Count ? 'team1' : 'team2';
    }

    private updateSessionMetrics(session: ClientSession, packet: UDPPacket, now: number): void {
        session.lastSeen = now;
        session.totalPackets++;

        // Calcular perda de pacotes
        if (session.lastSequence !== -1 && packet.sequence > session.lastSequence + 1) {
            const lost = packet.sequence - (session.lastSequence + 1);
            session.packetLoss += lost;
        } else {
            session.receivedPackets++;
        }
        session.lastSequence = packet.sequence;

        // Calcular latência (se for um pong)
        if (packet.type === 'pong' && session.lastPingTime) {
            session.latency = now - session.lastPingTime;
            session.lastPingTime = undefined;
        }

        // Calcular jitter
        const expectedInterval = 1000 / 20; // 20 FPS esperados
        const actualInterval = now - session.lastPacketArrivalTime;
        const jitterValue = Math.abs(actualInterval - expectedInterval);
        session.jitter = session.jitter * 0.9 + jitterValue * 0.1; // Média móvel
        session.lastPacketArrivalTime = now;

        // Emitir métricas atualizadas
        this.eventEmitter.emit(GameEventType.LATENCY_UPDATE, {
            playerId: session.id,
            latency: session.latency,
            jitter: session.jitter,
            packetLoss: session.packetLoss / session.totalPackets,
            timestamp: now
        } as NetworkMetrics);
    }

    private processPacket(session: ClientSession, packet: UDPPacket): void {
        switch (packet.type) {
            case 'player_input':
                this.handlePlayerInput(session, packet);
                break;
            case 'ping':
                this.handlePing(session, packet);
                break;
            case 'pong':
                this.handlePong(session, packet);
                break;
            case 'join_game':
                this.handleJoinGame(session, packet);
                break;
            default:
                console.warn(`Tipo de pacote desconhecido: ${packet.type}`);
        }
    }

    private handlePlayerInput(session: ClientSession, packet: UDPPacket): void {
        if (packet.data && packet.data.velocity) {
            // Se não há posição no pacote, use a posição atual do jogador no GameManager
            // ou calcule baseado na velocidade e timestamp
            this.eventEmitter.emit(GameEventType.PLAYER_MOVE, {
                playerId: session.id,
                position: packet.data.position || { x: 0, y: 0 }, // Será atualizado pelo GameManager
                velocity: packet.data.velocity,
                direction: packet.data.direction,
                isRunning: packet.data.isRunning,
                kick: packet.data.kick,
                timestamp: packet.timestamp,
                sequence: packet.sequence
            } as PlayerMoveEvent);
        }
    }

    private handlePing(session: ClientSession, packet: UDPPacket): void {
        // Responder com pong
        this.sendToClient(session, {
            type: 'pong',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: { originalTimestamp: packet.timestamp }
        });
    }

    private handlePong(session: ClientSession, packet: UDPPacket): void {
        // O pong é uma resposta ao ping que enviamos
        // A latência já foi calculada em updateSessionMetrics
        // Aqui podemos apenas logar se necessário para debug
        if (packet.data && packet.data.originalTimestamp) {
            const latency = Date.now() - packet.data.originalTimestamp;
            // Log opcional para debug
            // console.log(`📡 Pong recebido de ${session.id}, latência: ${latency}ms`);
        }
    }

    private handleJoinGame(session: ClientSession, packet: UDPPacket): void {
        // Confirmar entrada no jogo
        this.sendToClient(session, {
            type: 'join_confirmed',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: {
                playerId: session.id,
                team: session.team
            }
        });
    }

    public sendToClient(session: ClientSession, packet: UDPPacket): void {
        const message = Buffer.from(JSON.stringify(packet));
        this.server.send(message, session.port, session.address, (err) => {
            if (err) {
                console.error(`Erro ao enviar para ${session.id}:`, err);
            }
        });
    }

    public broadcastToAll(packet: UDPPacket): void {
        this.sessions.forEach(session => {
            this.sendToClient(session, packet);
        });
    }

    public broadcastGameState(gameState: any): void {
        const packet: UDPPacket = {
            type: 'game_state',
            sequence: this.sequenceNumber++,
            timestamp: Date.now(),
            data: gameState
        };

        this.broadcastToAll(packet);
    }

    public sendPingToAll(): void {
        this.sessions.forEach(session => {
            session.lastPingTime = Date.now();
            this.sendToClient(session, {
                type: 'ping',
                sequence: this.sequenceNumber++,
                timestamp: Date.now()
            });
        });
    }

    public removeSession(clientKey: string): void {
        const session = this.sessions.get(clientKey);
        if (session) {
            this.eventEmitter.emit(GameEventType.PLAYER_DISCONNECT, {
                playerId: session.id,
                timestamp: Date.now()
            });
            this.sessions.delete(clientKey);
        }
    }

    public getConnectedClients(): ClientSession[] {
        return Array.from(this.sessions.values());
    }

    public cleanupInactiveSessions(): void {
        const now = Date.now();
        const timeout = 10000; // 10 segundos

        this.sessions.forEach((session, key) => {
            if (now - session.lastSeen > timeout) {
                console.log(`Removendo sessão inativa: ${session.id}`);
                this.removeSession(key);
            }
        });
    }

    public start(): void {
        this.server.bind(this.port, this.host);
        
        // Limpeza periódica de sessões inativas
        setInterval(() => {
            this.cleanupInactiveSessions();
        }, 5000);

        // Ping periódico para medir latência
        setInterval(() => {
            this.sendPingToAll();
        }, 2000);
    }

    public stop(): void {
        this.server.close();
    }
}