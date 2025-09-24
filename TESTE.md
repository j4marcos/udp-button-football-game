# 🎮 Guia de Teste Rápido

## Como testar o jogo agora mesmo

### 1. Instalação Rápida
```bash
# Na pasta do projeto
npm install

# Compilar o pacote shared
cd packages/shared && npm run build && cd ../..
```

### 2. Executar o Servidor
```bash
# Terminal 1
npm run dev:server

# Você deve ver:
# 🚀 Iniciando servidor de futebol de botão...
# 🎮 Servidor UDP rodando em 0.0.0.0:41234
# ✅ Servidor iniciado com sucesso!
```

### 3. Executar o Cliente
```bash
# Terminal 2 (nova aba/janela)
npm run dev:client

# Você deve ver:
# Local:   http://localhost:3000/
# Network: http://192.168.x.x:3000/
```

### 4. Jogar
1. Abra `http://localhost:3000` no navegador
2. Abra uma **segunda aba** ou **janela** no mesmo endereço
3. O jogo inicia automaticamente quando 2 jogadores se conectam!

### 5. Controles

**Desktop:**
- `WASD` ou setas = Movimento
- `Shift` = Correr
- `Espaço` = Dash/Chute

**Mobile:**
- Joystick virtual = Movimento
- Botão RUN = Correr  
- Botão DASH = Chute

## 🐛 Resolução de Problemas

### Erro "Cannot find module"
```bash
# Instalar dependências em todos os pacotes
npm install
cd packages/server && npm install
cd ../client && npm install
cd ../shared && npm install && npm run build
```

### Servidor não conecta
- Verifique se a porta 41234 está livre
- Tente reiniciar o servidor
- Verifique o firewall

### Cliente não carrega
- Verifique se a porta 3000 está livre
- Tente `http://127.0.0.1:3000` em vez de localhost
- Limpe o cache do navegador

### Jogo não responde
- Abra o console do navegador (F12)
- Verifique se há erros JavaScript
- Recarregue a página

## 🎯 O que esperar

✅ **Funcionando:**
- Conexão cliente-servidor
- Movimento básico dos jogadores
- Interface responsiva
- Controles mobile

⚠️ **Em desenvolvimento:**
- Física completa da bola
- Sistema de gols
- Colisões entre jogadores
- Otimizações de rede avançadas

## 📊 Logs úteis

**Servidor (Terminal):**
```
📊 Status do jogo - Jogadores: 2/2 | Status: playing
👋 Jogador player_xxx entrou no jogo (Team 1)
```

**Cliente (Console do Browser):**
```
🔗 Conectado ao servidor
👋 Jogador entrou: {id: "player_xxx", teamId: 1}
📊 Ping: 15ms | Jitter: 2ms | Loss: 0.0%
```
