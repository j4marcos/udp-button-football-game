// src/game/GameManager.ts
import { GameState } from './GameState';
import { GameEventEmitter } from '../events/EventEmitter';
import { GameEventType, PlayerMoveEvent, GoalEvent } from '../events/GameEvents';

export class GameManager {
    private gameState: GameState;
    private eventEmitter: GameEventEmitter;
    private gameLoopInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 60; // 60 FPS
    private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
    private lastUpdateTime = Date.now();

    constructor(eventEmitter: GameEventEmitter) {
        this.eventEmitter = eventEmitter;
        this.gameState = new GameState();
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Lidar com movimento de jogadores
        this.eventEmitter.on(GameEventType.PLAYER_MOVE, (data: PlayerMoveEvent) => {
            this.handlePlayerMove(data);
        });

        // Lidar com conexão de jogadores
        this.eventEmitter.on(GameEventType.PLAYER_CONNECT, (data: any) => {
            this.handlePlayerConnect(data.playerId);
        });

        // Lidar com desconexão de jogadores
        this.eventEmitter.on(GameEventType.PLAYER_DISCONNECT, (data: any) => {
            this.handlePlayerDisconnect(data.playerId);
        });
    }

    private handlePlayerMove(data: PlayerMoveEvent): void {
        // Aplicar interpolação/extrapolação para compensar latência
        const interpolatedPosition = this.interpolatePosition(data);
        const smoothedVelocity = this.smoothVelocity(data.velocity);
        
        this.gameState.updatePlayerPosition(
            data.playerId, 
            interpolatedPosition, 
            smoothedVelocity
        );
    }

    private interpolatePosition(data: PlayerMoveEvent): { x: number; y: number } {
        // Implementação básica de interpolação para compensar lag
        const now = Date.now();
        const timeDelta = (now - data.timestamp) / 1000; // Converter para segundos
        
        // Extrapolação simples baseada na velocidade
        const extrapolatedX = data.position.x + data.velocity.x * timeDelta;
        const extrapolatedY = data.position.y + data.velocity.y * timeDelta;
        
        return { x: extrapolatedX, y: extrapolatedY };
    }

    private smoothVelocity(velocity: { x: number; y: number }): { x: number; y: number } {
        // Aplicar suavização na velocidade para evitar movimentos bruscos
        const maxSpeed = 200; // pixels por segundo
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            return {
                x: velocity.x * scale,
                y: velocity.y * scale
            };
        }
        
        return velocity;
    }

    private handlePlayerConnect(playerId: string): void {
        // Tentar adicionar jogador ao jogo
        const team = this.determinePlayerTeam();
        const player = this.gameState.addPlayer(playerId, team);
        
        if (player) {
            console.log(`Jogador ${playerId} adicionado ao ${team}`);
            
            // Verificar se o jogo pode começar
            if (this.gameState.players.size >= 2 && !this.gameState.isGameActive) {
                this.startGame();
            }
        } else {
            console.log(`Não foi possível adicionar jogador ${playerId} - times cheios`);
        }
    }

    private handlePlayerDisconnect(playerId: string): void {
        this.gameState.removePlayer(playerId);
        console.log(`Jogador ${playerId} removido do jogo`);
        
        // Pausar o jogo se não houver jogadores suficientes
        if (this.gameState.players.size < 2 && this.gameState.isGameActive) {
            this.pauseGame();
        }
    }

    private determinePlayerTeam(): 'team1' | 'team2' {
        const players = Array.from(this.gameState.players.values());
        const team1Count = players.filter(p => p.team === 'team1').length;
        const team2Count = players.filter(p => p.team === 'team2').length;
        
        return team1Count <= team2Count ? 'team1' : 'team2';
    }

    public startGame(): void {
        if (this.gameLoopInterval) return; // Já está rodando
        
        console.log('Iniciando o jogo...');
        this.gameState.isGameActive = true;
        this.lastUpdateTime = Date.now();
        
        this.gameLoopInterval = setInterval(() => {
            this.updateGame();
        }, this.TICK_INTERVAL);
        
        this.eventEmitter.emit(GameEventType.GAME_START, {
            timestamp: Date.now(),
            players: Array.from(this.gameState.players.values())
        });
    }

    public pauseGame(): void {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        this.gameState.isGameActive = false;
        console.log('Jogo pausado');
    }

    public stopGame(): void {
        this.pauseGame();
        this.gameState.gameTime = 0;
        this.gameState.score = { team1: 0, team2: 0 };
        this.gameState.resetBall();
        
        console.log('Jogo finalizado');
        
        this.eventEmitter.emit(GameEventType.GAME_END, {
            timestamp: Date.now(),
            finalScore: this.gameState.score
        });
    }

    private updateGame(): void {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // Converter para segundos
        this.lastUpdateTime = now;
        
        if (!this.gameState.isGameActive) return;
        
        // Atualizar tempo de jogo
        this.gameState.gameTime += deltaTime * 1000; // Manter em milissegundos
        
        // Atualizar física da bola
        this.gameState.updateBallPhysics(deltaTime);
        
        // Verificar colisões
        this.gameState.checkCollisions();
        
        // Verificar gols
        const goalScorer = this.gameState.checkGoals();
        if (goalScorer) {
            this.handleGoal(goalScorer);
        }
        
        // Emitir estado atualizado do jogo
        this.emitGameUpdate();
        
        // Aplicar otimizações de rede
        this.applyNetworkOptimizations();
    }

    private handleGoal(scoringTeam: 'team1' | 'team2'): void {
        console.log(`Gol do ${scoringTeam}!`);
        
        const goalEvent: GoalEvent = {
            playerId: 'unknown', // Em uma implementação mais completa, identificaríamos quem fez o gol
            team: scoringTeam,
            score: { ...this.gameState.score },
            timestamp: Date.now()
        };
        
        this.eventEmitter.emit(GameEventType.GOAL_SCORED, goalEvent);
        
        // Pausar brevemente após o gol
        setTimeout(() => {
            this.repositionPlayersAfterGoal();
        }, 2000);
    }

    private repositionPlayersAfterGoal(): void {
        // Reposicionar jogadores nas posições iniciais
        let team1Index = 0;
        let team2Index = 0;
        
        this.gameState.players.forEach(player => {
            if (player.team === 'team1') {
                player.position = this.getInitialPosition('team1', team1Index++);
            } else {
                player.position = this.getInitialPosition('team2', team2Index++);
            }
            player.velocity = { x: 0, y: 0 };
        });
    }

    private getInitialPosition(team: 'team1' | 'team2', index: number): { x: number; y: number } {
        const field = this.gameState.field;
        const positions = {
            team1: [
                { x: 100, y: field.height / 2 },
                { x: 200, y: field.height / 3 },
                { x: 200, y: 2 * field.height / 3 },
                { x: 300, y: field.height / 4 },
                { x: 300, y: 3 * field.height / 4 },
                { x: 350, y: field.height / 2 }
            ],
            team2: [
                { x: field.width - 100, y: field.height / 2 },
                { x: field.width - 200, y: field.height / 3 },
                { x: field.width - 200, y: 2 * field.height / 3 },
                { x: field.width - 300, y: field.height / 4 },
                { x: field.width - 300, y: 3 * field.height / 4 },
                { x: field.width - 350, y: field.height / 2 }
            ]
        };
        
        return positions[team][index] || { x: field.width / 2, y: field.height / 2 };
    }

    private emitGameUpdate(): void {
        const gameState = this.gameState.getGameState();
        this.eventEmitter.emit(GameEventType.MATCH_UPDATE, gameState);
    }

    private applyNetworkOptimizations(): void {
        // Implementar otimizações como:
        // - Retransmissão seletiva de pacotes críticos
        // - Compressão de dados de estado
        // - Priorização de dados importantes (posição da bola vs posição de jogadores distantes)
        
        // Por enquanto, apenas log das otimizações aplicadas
        if (this.gameState.players.size > 6) {
            // Reduzir frequência de updates para jogadores distantes da bola
            this.optimizePlayerUpdates();
        }
    }

    private optimizePlayerUpdates(): void {
        // Otimização: reduzir frequência de updates para jogadores longe da ação
        const ballPos = this.gameState.ball.position;
        const players = Array.from(this.gameState.players.values());
        
        players.forEach(player => {
            const distance = Math.sqrt(
                Math.pow(player.position.x - ballPos.x, 2) + 
                Math.pow(player.position.y - ballPos.y, 2)
            );
            
            // Jogadores mais distantes da bola podem ter updates menos frequentes
            // Esta lógica seria implementada no sistema de rede
            if (distance > 200) {
                // Marcar para update menos frequente
                (player as any).lowPriorityUpdate = true;
            } else {
                (player as any).lowPriorityUpdate = false;
            }
        });
    }

    public getGameState() {
        return this.gameState.getGameState();
    }

    public getConnectedPlayersCount(): number {
        return this.gameState.players.size;
    }

    public isGameRunning(): boolean {
        return this.gameState.isGameActive;
    }
}