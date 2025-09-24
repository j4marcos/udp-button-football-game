# ⚽ UDP Button Football Game

Um jogo multiplayer online de futebol de botão com servidor UDP para movimento em tempo real. Implementa gerenciamento de sessões, sincronização de estado entre clientes e monitoramento avançado de métricas de rede com técnicas de otimização como interpolação/extrapolação e compensação de lag.

## 🎮 Características

### 🚀 Servidor Completo
- **Servidor HTTP**: Interface web para jogar e assistir (Porta 3000)
- **Servidor UDP**: Comunicação em tempo real para gameplay (Porta 33333)
- **WebSocket**: Transmissão ao vivo para espectadores
- **Arquitetura Modular**: Separação clara de responsabilidades

### 🏃‍♂️ Funcionalidades de Jogo
- **Futebol de Botão Multiplayer**: Até 12 jogadores (6 por time)
- **Física Realística**: Colisões, atrito e movimento da bola
- **Sistema de Pontuação**: Placar em tempo real
- **Times Automáticos**: Balanceamento automático de jogadores

### 🌐 Otimizações de Rede
- **Monitoramento de Métricas**: Latência, jitter e perda de pacotes
- **Interpolação/Extrapolação**: Compensação de lag para movimento suave
- **Retransmissão Seletiva**: Reenvio de pacotes críticos
- **Otimização de Prioridade**: Redução de updates para jogadores distantes
- **Interpolação**: Movimento suave de outros jogadores
- **Predição do Cliente**: Responsividade instantânea aos inputs
- **Compensação de Lag**: Justiça em ações críticas como chutes
- **Métricas de Rede**: Monitoramento de ping, jitter e perda de pacotes
- **Retransmissão Seletiva**: Garantia de entrega para eventos críticos

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura monorepo com três pacotes principais:

```
packages/
├── shared/     # Tipos, interfaces e constantes compartilhadas
├── server/     # Servidor UDP com física e lógica de jogo
└── client/     # Cliente web com Phaser 3
```

### 📦 Tecnologias Utilizadas

**Backend:**
- Node.js + TypeScript
- Matter.js (física 2D)
- dgram (UDP nativo)
- WebSockets (fallback/híbrido)

**Frontend:**
- Phaser 3 (renderização e física do cliente)
- Vite (bundler)
- HTML5 Canvas
- TypeScript

**Ferramentas:**
- npm workspaces (monorepo)
- nodemon (desenvolvimento)
- ts-node (execução TypeScript)

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+ 
- npm 8+

### 1. Clonar e Instalar
```bash
# Clonar o repositório
git clone https://github.com/j4marcos/udp-button-football-game.git
cd udp-button-football-game

# Instalar dependências (todas as workspaces)
npm install
```

### 2. Compilar Dependências Compartilhadas
```bash
# Compilar tipos compartilhados
npm run build:shared
```

### 3. Executar em Desenvolvimento

**Terminal 1 - Servidor:**
```bash
npm run dev:server
```

**Terminal 2 - Cliente:**
```bash
npm run dev:client
```

### 4. Acessar o Jogo
- Abra o navegador em `http://localhost:3000`
- Abra uma segunda aba/janela para ter 2 jogadores
- O jogo inicia automaticamente quando 2 jogadores se conectam

## 🎯 Como Jogar

### 🖥️ Controles Desktop
- **WASD** ou **Setas**: Movimento
- **Shift**: Correr (movimento mais rápido)
- **Espaço**: Dash/Chute (impulso forte)

### 📱 Controles Mobile
- **Joystick Virtual**: Movimento direcional
- **Botão RUN**: Correr
- **Botão DASH**: Chute/empurrão

### 🏆 Objetivo
- Empurre a bola para o gol adversário
- Primeiro a marcar X gols vence
- Após cada gol, jogadores e bola retornam às posições iniciais

## 🔧 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev:server      # Servidor em modo desenvolvimento
npm run dev:client      # Cliente em modo desenvolvimento
npm run build           # Compilar todos os pacotes
```

### Produção
```bash
npm run build:server    # Compilar servidor
npm run build:client    # Compilar cliente  
npm run start:server    # Executar servidor compilado
npm run start:client    # Servir cliente compilado
```

### Pacotes Individuais
```bash
# Shared
cd packages/shared
npm run build           # Compilar tipos
npm run dev             # Watch mode

# Server  
cd packages/server
npm run build           # Compilar servidor
npm run dev             # Desenvolvimento com nodemon
npm run start           # Executar compilado

# Client
cd packages/client
npm run build           # Build para produção
npm run dev             # Servidor de desenvolvimento
npm run preview         # Preview do build
```

## 🌐 Configuração de Rede

### Portas Padrão
- **Servidor UDP**: `41234`
- **Cliente Web**: `3000`
- **WebSocket** (fallback): `41235`

### Configurações do Servidor
```typescript
// packages/server/src/index.ts
const server = new UDPServer(41234); // Porta UDP
```

### Configurações do Cliente
```typescript
// packages/client/src/network/UDPClient.ts
const client = new UDPClient('localhost', 41234); // Host e porta
```

## 📊 Monitoramento e Debug

### Métricas de Rede
O jogo monitora automaticamente:
- **Ping**: Latência entre cliente e servidor
- **Jitter**: Variação na latência  
- **Packet Loss**: Porcentagem de pacotes perdidos

### Console Debug
```javascript
// No browser, acesse:
window.GAME_CONFIG       // Configurações do jogo
console.log("📊 Métricas de rede"); // Logs automáticos
```

### Logs do Servidor
```bash
# O servidor mostra estatísticas a cada 10 segundos:
📊 Status do jogo - Jogadores: 2/2 | Status: playing | Placar: 1-0
```

## 🔄 Técnicas de Otimização Implementadas

### 1. Interpolação de Posição
- Outros jogadores são renderizados suavemente entre estados do servidor
- Reduz "teleporte" visual causado por updates discretos

### 2. Predição do Cliente (Client-Side Prediction)
- Seu próprio jogador responde instantaneamente aos inputs
- Elimina a sensação de lag nos controles

### 3. Reconciliação com o Servidor (Server Reconciliation)  
- Corrige suavemente divergências entre predição local e estado autoritativo
- Mantém precisão sem perder responsividade

### 4. Compensação de Lag (Lag Compensation)
- Servidor "volta no tempo" para validar ações como chutes
- Garante justiça mesmo com latências diferentes

### 5. Retransmissão Seletiva
- Eventos críticos (gols, fim de jogo) são garantidos via ACK
- Combina confiabilidade TCP com velocidade UDP

## 🎨 Personalização

### Constantes do Jogo
```typescript
// packages/shared/src/constants.ts
export const GAME_CONFIG = {
  FIELD_WIDTH: 800,           // Largura do campo
  FIELD_HEIGHT: 400,          // Altura do campo
  PLAYER_RADIUS: 15,          // Tamanho dos jogadores
  BALL_RADIUS: 8,             // Tamanho da bola
  PLAYER_WALK_FORCE: 5,       // Força de caminhada
  PLAYER_RUN_FORCE: 10,       // Força de corrida
  PLAYER_DASH_FORCE: 50,      // Força do dash
  // ... mais configurações
};
```

### Cores dos Times
```typescript
// packages/shared/src/constants.ts
export const TEAM_COLORS = {
  TEAM_1: '#FF4444', // Vermelho
  TEAM_2: '#4444FF', // Azul
  BALL: '#FFFFFF',   // Branco
  FIELD: '#22AA22',  // Verde
};
```

## 🚧 Roadmap / Melhorias Futuras

### 🎮 Gameplay
- [ ] Power-ups temporários
- [ ] Diferentes modos de jogo (1v1, torneio)
- [ ] Customização de jogadores
- [ ] Sistema de ranking/estatísticas

### 🌐 Rede e Performance
- [ ] Salas privadas com códigos
- [ ] Espectador mode
- [ ] Replay system
- [ ] Otimização de banda com compressão

### 📱 Mobile e UI
- [ ] Suporte a PWA (Progressive Web App)
- [ ] Instalação offline
- [ ] Vibração em eventos (gol, colisão)
- [ ] Melhor feedback visual

### 🛠️ Tecnológico
- [ ] Migração para WebRTC DataChannel
- [ ] Servidor dedicado na nuvem
- [ ] Load balancing para múltiplas salas
- [ ] Matchmaking automático

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🏆 Créditos

Desenvolvido por **j4marcos** como demonstração de:
- Programação multiplayer em tempo real
- Otimizações de rede para jogos
- Arquitetura cliente-servidor robusta
- Desenvolvimento full-stack com TypeScript

---

**⚽ Divirta-se jogando futebol de botão online! ⚽**