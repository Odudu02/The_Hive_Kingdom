import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game(); // O Game já instancia o InputHandler internamente
        
        // Controle de taxa de envio (Network Throttle)
        this.lastSentTime = 0;
        this.sendRate = 50; // ms (aprox 20 updates/segundo)

        this.initListeners();
    }

    initListeners() {
        // ============================================================
        // 1. EVENTOS DE REDE (O que fazer quando chegar dados)
        // ============================================================
        this.network.onDataReceived = (packet) => {
            switch (packet.type) {
                case 'WELCOME':
                    // Guest recebe este pacote ao entrar na sala
                    console.log("[MAIN] Conectado ao Host. Seed recebida:", packet.data.seed);
                    const myNick = this.ui.inputs.nickname.value || "Guest";
                    // Inicia o jogo
                    this.startGame(packet.data.seed, this.network.myId, myNick);
                    break;
                
                case 'PLAYER_MOVE':
                    // Atualiza a posição de outro jogador na tela
                    this.game.updateRemotePlayer(packet.id, packet.data);
                    break;

                case 'PLAYER_DISCONNECT':
                    // Remove jogador que saiu
                    this.game.removePlayer(packet.id);
                    break;
            }
        };

        // ============================================================
        // 2. EVENTOS DO JOGO (O que fazer quando EU me movo)
        // ============================================================
        this.game.onPlayerMove = (playerState) => {
            const now = Date.now();
            // Só envia se passou o tempo do throttle
            if (now - this.lastSentTime > this.sendRate) {
                this.network.broadcast({
                    type: 'PLAYER_MOVE',
                    id: this.network.myId,
                    data: playerState
                });
                this.lastSentTime = now;
            }
        };

        // ============================================================
        // 3. EVENTOS DE UI (Botões Iniciais)
        // ============================================================
        
        // --- HOST (CRIAR) ---
        this.ui.buttons.startHost.addEventListener('click', async () => {
            const hostData = this.ui.getHostData();
            
            if (!hostData.sessionId) {
                alert("Por favor, digite um ID para a sessão.");
                return;
            }

            try {
                // Inicia PeerJS com ID fixo
                const id = await this.network.init(hostData.sessionId);
                
                // Configura lógica de Host
                this.network.startHosting({ seed: hostData.seed });
                
                alert(`Reino fundado com sucesso!\nID: ${id}\nSeed: ${hostData.seed}`);
                
                // Inicia o jogo localmente
                this.startGame(hostData.seed, id, hostData.nickname);

            } catch (err) {
                alert("Erro ao criar sessão. O ID pode já estar em uso.");
                console.error(err);
            }
        });

        // --- JOIN (ENTRAR) ---
        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const joinData = this.ui.getJoinData();

            if (!joinData.targetSessionId) {
                alert("Por favor, digite o ID do Host.");
                return;
            }

            try {
                // Inicia PeerJS com ID aleatório
                await this.network.init(null); 
                
                // Tenta conectar ao Host
                this.network.connectToHost(joinData.targetSessionId);
                
                console.log("[MAIN] Aguardando pacote WELCOME...");
                // O jogo NÃO inicia aqui. Ele inicia no 'case WELCOME' lá em cima.

            } catch (err) {
                console.error(err);
                alert("Erro ao conectar ao servidor P2P.");
            }
        });
    }

    async startGame(seed, myId, nickname) {
        // 1. Carrega imagens
        await this.game.loadAssets();
        
        // 2. Troca Tela
        this.ui.showScreen('game');
        
        // 3. Inicia Engine
        this.game.init(seed, myId, nickname);
    }
}

// Inicializa quando a página carregar
window.onload = () => {
    new GameApp();
};
