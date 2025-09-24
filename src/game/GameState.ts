// src/game/GameState.ts
export interface Vector2D {
    x: number;
    y: number;
}

export interface Player {
    id: string;
    position: Vector2D;
    velocity: Vector2D;
    direction?: number;
    team: 'team1' | 'team2';
    size: number;
    maxSpeed: number;
}

export interface Ball {
    position: Vector2D;
    velocity: Vector2D;
    size: number;
    friction: number;
}

export interface GameField {
    width: number;
    height: number;
    goals: {
        team1: { x: number; y: number; width: number; height: number };
        team2: { x: number; y: number; width: number; height: number };
    };
}

export interface GameScore {
    team1: number;
    team2: number;
}

export class GameState {
    public players: Map<string, Player> = new Map();
    public ball: Ball;
    public field: GameField;
    public score: GameScore = { team1: 0, team2: 0 };
    public gameTime: number = 0;
    public isGameActive: boolean = false;
    public maxPlayersPerTeam: number = 6;

    constructor() {
        this.field = {
            width: 800,
            height: 600,
            goals: {
                team1: { x: 0, y: 250, width: 20, height: 100 },
                team2: { x: 780, y: 250, width: 20, height: 100 }
            }
        };

        this.ball = {
            position: { x: this.field.width / 2, y: this.field.height / 2 },
            velocity: { x: 0, y: 0 },
            size: 8,
            friction: 0.98
        };
    }

    addPlayer(playerId: string, team: 'team1' | 'team2'): Player | null {
        const teamPlayers = Array.from(this.players.values()).filter(p => p.team === team);
        
        if (teamPlayers.length >= this.maxPlayersPerTeam) {
            return null; // Time cheio
        }

        const player: Player = {
            id: playerId,
            position: this.getInitialPlayerPosition(team, teamPlayers.length),
            velocity: { x: 0, y: 0 },
            team,
            size: 12,
            maxSpeed: 200
        };

        this.players.set(playerId, player);
        return player;
    }

    removePlayer(playerId: string): void {
        this.players.delete(playerId);
    }

    private getInitialPlayerPosition(team: 'team1' | 'team2', playerIndex: number): Vector2D {
        const fieldWidth = this.field.width;
        const fieldHeight = this.field.height;
        
        // Posições iniciais básicas para cada time
        const positions = {
            team1: [
                { x: 100, y: fieldHeight / 2 }, // Goleiro
                { x: 200, y: fieldHeight / 3 },
                { x: 200, y: 2 * fieldHeight / 3 },
                { x: 300, y: fieldHeight / 4 },
                { x: 300, y: 3 * fieldHeight / 4 },
                { x: 350, y: fieldHeight / 2 }
            ],
            team2: [
                { x: fieldWidth - 100, y: fieldHeight / 2 }, // Goleiro
                { x: fieldWidth - 200, y: fieldHeight / 3 },
                { x: fieldWidth - 200, y: 2 * fieldHeight / 3 },
                { x: fieldWidth - 300, y: fieldHeight / 4 },
                { x: fieldWidth - 300, y: 3 * fieldHeight / 4 },
                { x: fieldWidth - 350, y: fieldHeight / 2 }
            ]
        };

        return positions[team][playerIndex] || { x: fieldWidth / 2, y: fieldHeight / 2 };
    }

    updatePlayerPosition(playerId: string, position: Vector2D, velocity: Vector2D): void {
        const player = this.players.get(playerId);
        if (!player) return;

        // Aplicar limites de velocidade
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed > player.maxSpeed) {
            const scale = player.maxSpeed / speed;
            velocity.x *= scale;
            velocity.y *= scale;
        }

        // Limitar posição dentro do campo
        position.x = Math.max(player.size, Math.min(this.field.width - player.size, position.x));
        position.y = Math.max(player.size, Math.min(this.field.height - player.size, position.y));

        player.position = position;
        player.velocity = velocity;
    }

    updateBallPhysics(deltaTime: number): void {
        // Atualizar posição da bola
        this.ball.position.x += this.ball.velocity.x * deltaTime;
        this.ball.position.y += this.ball.velocity.y * deltaTime;

        // Aplicar atrito
        this.ball.velocity.x *= this.ball.friction;
        this.ball.velocity.y *= this.ball.friction;

        // Colisão com as bordas do campo
        if (this.ball.position.x <= this.ball.size || this.ball.position.x >= this.field.width - this.ball.size) {
            this.ball.velocity.x *= -0.8;
            this.ball.position.x = Math.max(this.ball.size, Math.min(this.field.width - this.ball.size, this.ball.position.x));
        }

        if (this.ball.position.y <= this.ball.size || this.ball.position.y >= this.field.height - this.ball.size) {
            this.ball.velocity.y *= -0.8;
            this.ball.position.y = Math.max(this.ball.size, Math.min(this.field.height - this.ball.size, this.ball.position.y));
        }
    }

    checkCollisions(): void {
        // Verificar colisões jogador-bola
        this.players.forEach(player => {
            const dx = player.position.x - this.ball.position.x;
            const dy = player.position.y - this.ball.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.size + this.ball.size) {
                // Colisão detectada - transferir movimento do jogador para a bola
                const force = 0.3;
                this.ball.velocity.x = player.velocity.x * force;
                this.ball.velocity.y = player.velocity.y * force;

                // Separar jogador e bola
                const overlap = (player.size + this.ball.size) - distance;
                const separationX = (dx / distance) * overlap * 0.5;
                const separationY = (dy / distance) * overlap * 0.5;

                this.ball.position.x -= separationX;
                this.ball.position.y -= separationY;
            }
        });
    }

    checkGoals(): 'team1' | 'team2' | null {
        // Verificar gol no time 1 (lado esquerdo)
        if (this.ball.position.x <= this.field.goals.team1.x + this.field.goals.team1.width &&
            this.ball.position.y >= this.field.goals.team1.y &&
            this.ball.position.y <= this.field.goals.team1.y + this.field.goals.team1.height) {
            this.score.team2++;
            this.resetBall();
            return 'team2';
        }

        // Verificar gol no time 2 (lado direito)
        if (this.ball.position.x >= this.field.goals.team2.x &&
            this.ball.position.y >= this.field.goals.team2.y &&
            this.ball.position.y <= this.field.goals.team2.y + this.field.goals.team2.height) {
            this.score.team1++;
            this.resetBall();
            return 'team1';
        }

        return null;
    }

    resetBall(): void {
        this.ball.position = { x: this.field.width / 2, y: this.field.height / 2 };
        this.ball.velocity = { x: 0, y: 0 };
    }

    updatePlayerDirection(playerId: string, direction: number): void {
        const player = this.players.get(playerId);
        if (player) {
            player.direction = direction;
        }
    }

    handlePlayerKick(playerId: string): void {
        const player = this.players.get(playerId);
        if (!player) return;

        // Verificar se a bola está próxima o suficiente para chutar
        const dx = player.position.x - this.ball.position.x;
        const dy = player.position.y - this.ball.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.size + this.ball.size + 20) { // Alcance do chute
            // Aplicar força de chute na direção do jogador
            const kickForce = 400;
            const directionX = player.direction !== undefined ? Math.cos(player.direction) : -dx / distance;
            const directionY = player.direction !== undefined ? Math.sin(player.direction) : -dy / distance;

            this.ball.velocity.x = directionX * kickForce;
            this.ball.velocity.y = directionY * kickForce;
        }
    }

    getGameState() {
        return {
            players: Array.from(this.players.values()),
            ball: this.ball,
            score: this.score,
            gameTime: this.gameTime,
            isGameActive: this.isGameActive,
            field: this.field
        };
    }
}