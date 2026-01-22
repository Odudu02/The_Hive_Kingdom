import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game();
        
        this.lastSent = 0;
        this.sendRate = 50; //ms

        this.init();
    }

    init() {
        // --- 1. Eventos de Rede ---
        this.network.onDataReceived = (pkg) => {
            switch(pkg.type) {
                case 'WELCOME':
                    console.log("[MAIN] Conectado. Seed:", pkg.data.seed);
                    // Captura o nickname do input ou define um padrão
                    const myNick = this.ui.inputs.nickname.value.trim() || "Convidado";
                    this.startGame(pkg.data.seed, this.network.myId, myNick);
                    break;
                
                case 'PLAYER_MOVE':
                    this.game.updateRemotePlayer(pkg.id, pkg.data);
                    break;

                case 'PLAYER_DISCONNECT':
                    this.game.removePlayer(pkg.id);
                    break;
            }
        };

        // --- 2. Eventos do Jogo ---
        this.game.onPlayerMove = (data) => {
            const now = Date.now();
            if (now - this.lastSent > this.sendRate) {
                this.network.broadcast({
                    type: 'PLAYER_MOVE',
                    id: this.network.myId,
                    data: data
                });
                this.lastSent = now;
            }
        };

        // --- 3. Eventos de UI ---
        this.ui.buttons.startHost.addEventListener('click', async () => {
            const data = this.ui.getHostData();
            if (!data.sessionId) return alert("Defina o ID da sessão para fundar o reino.");
            
            try {
                // Inicializa o Peer com o ID personalizado
                const id = await this.network.init(data.sessionId);
                this.network.startHosting({ seed: data.seed });
                
                console.log(`[MAIN] Reino Criado! ID: ${id} | Seed: ${data.seed}`);
                this.startGame(data.seed, id, data.nickname || "Host");
            } catch (e) {
                alert("Erro: Este ID já pode estar em uso ou houve falha na rede.");
                console.error(e);
            }
        });

        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const data = this.ui.getJoinData();
            if (!data.targetSessionId) return alert("Informe o ID do Reino que deseja entrar.");

            try {
                // Guests usam ID aleatório gerado pelo PeerJS
                await this.network.init(null);
                this.network.connectToHost(data.targetSessionId);
            } catch (e) {
                console.error(e);
                alert("Erro ao tentar conectar ao reino.");
            }
        });
    }

    async startGame(seed, id, nick) {
        // Bloqueia cliques repetidos durante o carregamento
        if (this.game.isRunning) return;

        console.log("[MAIN] Carregando recursos do Reino...");
        await this.game.loadAssets();
        
        // Transição visual de telas
        this.ui.showScreen('game');
        
        // Inicializa o motor do jogo com a seed e dados do player
        this.game.init(seed, id, nick);
    }
}

// Inicialização Global
window.onload = () => {
    window.gameApp = new GameApp();
};
