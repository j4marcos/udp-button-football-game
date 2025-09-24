// src/events/GameEvents.ts
export enum GameEventType {
    // UDP Events
    PLAYER_MOVE = 'player_move',
    PLAYER_CONNECT = 'player_connect',
    PLAYER_DISCONNECT = 'player_disconnect',
    BALL_UPDATE = 'ball_update',
    
    // Game Events
    GOAL_SCORED = 'goal_scored',
    GAME_START = 'game_start',
    GAME_END = 'game_end',
    MATCH_UPDATE = 'match_update',
    
    // Network Events
    PING = 'ping',
    PONG = 'pong',
    PACKET_LOSS = 'packet_loss',
    LATENCY_UPDATE = 'latency_update'
}

export interface PlayerMoveEvent {
    playerId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    timestamp: number;
    sequence: number;
}

export interface PlayerConnectEvent {
    playerId: string;
    address: string;
    port: number;
    timestamp: number;
}

export interface GoalEvent {
    playerId: string;
    team: 'team1' | 'team2';
    score: { team1: number; team2: number };
    timestamp: number;
}

export interface NetworkMetrics {
    playerId: string;
    latency: number;
    jitter: number;
    packetLoss: number;
    timestamp: number;
}