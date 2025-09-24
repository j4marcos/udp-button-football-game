# 🏈 UDP Button Football Game - Arquitetura Cliente/Servidor Separada

Um jogo multiplayer de futebol de botão onde o cliente e servidor são completamente separados. O cliente funciona como um proxy HTTP que serve o frontend e se comunica via UDP com o servidor.

## 🏗️ Nova Arquitetura

### Servidor (TypeScript)
- **Localização**: `src/server.ts`
- **Função**: Gerencia o estado do jogo, física, colisões e lógica
- **Comunicação**: Recebe comandos via UDP e envia estados do jogo
- **Porta**: 33333 (UDP)

### Cliente Proxy (JavaScript/Node.js)
- **Localização**: `local-proxy-client.js`
- **Função**: 
  - Serve o frontend via HTTP
  - Recebe inputs do navegador via API REST
  - Converte para comandos UDP para o servidor
  - Cada instância = 1 jogador
- **Porta**: Aleatória (8080-8999) ou especificada

### Frontend (HTML/JavaScript)
- **Localização**: `public/`
- **Função**: Interface do jogo no navegador
- **Comunicação**: API REST com o proxy cliente
- **Arquivo principal**: `index.html` + `game-client-http.js`

## 🚀 Como Usar

### 1. Iniciar o Servidor
```bash
# Compilar TypeScript
npm run build

# Iniciar servidor UDP
npm start
```

### 2. Iniciar Jogador 1 (Proxy + Frontend)
```bash
# Porta aleatória
node local-proxy-client.js

# Ou porta específica
node local-proxy-client.js 8080

# Ou usando o script auxiliar
./start-proxy.sh
./start-proxy.sh 8080
```

**Resultado**: Console mostrará algo como:
```
🚀 Cliente Proxy Local iniciado
🌐 Frontend disponível em: http://localhost:8234
🎮 Servidor UDP: 127.0.0.1:33333
```

### 3. Iniciar Jogador 2 (Novo Proxy)
```bash
# Em outro terminal
./start-proxy.sh
```

**Resultado**: Novo proxy em porta diferente:
```
🚀 Cliente Proxy Local iniciado
🌐 Frontend disponível em: http://localhost:8567
🎮 Servidor UDP: 127.0.0.1:33333
```

### 4. Acessar os Frontends
- **Jogador 1**: Abre `http://localhost:8234` no navegador
- **Jogador 2**: Abre `http://localhost:8567` no navegador
- Cada um clica em "Conectar" para entrar no jogo

## 📁 Estrutura de Arquivos

```
├── src/                          # Servidor (TypeScript)
│   ├── server.ts                # Servidor principal
│   ├── game/                    # Lógica do jogo
│   ├── network/                 # Gerenciamento de rede
│   └── events/                  # Sistema de eventos
├── public/                      # Frontend (HTML/JS)
│   ├── index.html              # Interface principal
│   ├── game-client-http.js     # Cliente JavaScript HTTP
│   └── ...
├── local-proxy-client.js       # Cliente proxy Node.js
├── start-proxy.sh             # Script para iniciar novos proxies
└── package.json               # Dependências
```

## 🔄 Fluxo de Comunicação

```
[Navegador] --HTTP--> [Proxy Cliente] --UDP--> [Servidor]
     ↑                       ↓                     ↓
[Interface]            [HTTP Server]        [Game Logic]
                       [UDP Client]         [State Management]
```

### Sequência Típica:
1. **Servidor**: Inicia e aguarda conexões UDP na porta 33333
2. **Proxy Cliente**: Inicia servidor HTTP e cliente UDP
3. **Frontend**: Usuário acessa URL do proxy no navegador
4. **Conexão**: Frontend faz POST `/api/connect` → Proxy envia `join_game` via UDP
5. **Input**: Mouse/teclado → POST `/api/input` → Proxy converte para UDP
6. **Estado**: Servidor envia estado → Proxy armazena → Frontend busca via GET `/api/gamestate`

## 🌐 API do Proxy Cliente

### Endpoints HTTP:
- **GET** `/` - Serve o frontend (index.html)
- **POST** `/api/connect` - Conecta jogador ao servidor
- **POST** `/api/input` - Envia input do jogador
- **GET** `/api/gamestate` - Busca estado atual do jogo
- **GET** `/api/status` - Status da conexão do proxy

### Comandos UDP (Proxy ↔ Servidor):
- `join_game` - Solicitar entrada no jogo
- `player_input` - Enviar movimento/ação do jogador
- `game_state` - Receber estado atualizado do jogo
- `ping/pong` - Manter conexão ativa

## 🎮 Controles

- **Mouse**: Direcionar jogador
- **Shift**: Correr (mais velocidade)
- **Clique**: Chutar a bola
- **Touch**: Suporte para dispositivos móveis

## 💡 Vantagens da Nova Arquitetura

1. **Separação Completa**: Cliente e servidor independentes
2. **Múltiplos Jogadores Fácil**: Cada novo proxy = novo jogador
3. **Flexibilidade**: Proxies podem rodar em máquinas diferentes
4. **Escalabilidade**: Fácil adicionar novos recursos ao proxy
5. **Debugging**: Logs separados para cliente e servidor
6. **Deploy**: Servidor pode rodar em cloud, proxies localmente

## 🔧 Desenvolvimento

### Dependências
```bash
npm install ws dgram http fs path url
```

### Scripts Úteis
```bash
# Compilar servidor
npm run build

# Iniciar servidor
npm start

# Iniciar múltiplos proxies rapidamente
for i in {1..4}; do
    gnome-terminal -- bash -c "./start-proxy.sh; bash"
done
```

## 🐛 Troubleshooting

### Proxy não conecta ao servidor
- Verificar se servidor está rodando na porta 33333
- Verificar firewall/antivírus

### Frontend não carrega
- Verificar se proxy está rodando
- Verificar porta no console do proxy
- Tentar acessar http://localhost:PORTA

### Jogador não se move
- Clicar em "Conectar" no frontend
- Verificar console do navegador (F12)
- Verificar logs do proxy no terminal

## 📝 TODO

- [ ] Reconexão automática quando servidor cai
- [ ] Configuração via arquivo (IPs, portas)
- [ ] Interface para escolher time
- [ ] Spectator mode (só visualizar)
- [ ] WebRTC para comunicação direta entre proxies