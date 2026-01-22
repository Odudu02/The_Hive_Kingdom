import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game();
        
        this.lastSent = 0;
        this.sendRate = 45; // Pequeno ajuste para 45ms (aprox. 22hz) para maior fluidez

        this.init();
    }

    init() {
        // --- 1. Eventos de Rede ---
        this.network.onDataReceived = (pkg) => {
            switch(pkg.type) {
                case 'WELCOME':
                    console.log("[MAIN] Conectado ao Host. Sincronizando biomas...");
                    const myNick = this.ui.inputs.nickname.value.trim() || "Zangão";
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
            if (!data.sessionId) return alert("ID da sessão é obrigatório.");
            
            try {
                const id = await this.network.init(data.sessionId);
                this.network.startHosting({ seed: data.seed });
                
                console.log(`[MAIN] Reino Fundado! Seed: ${data.seed}`);
                this.startGame(data.seed, id, data.nickname || "Rei");
            } catch (e) {
                alert("Erro: ID em uso. Tente outro nome para o seu reino.");
                console.error(e);
            }
        });

        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const data = this.ui.getJoinData();
            if (!data.targetSessionId) return alert("ID do Reino destino é necessário.");

            try {
                await this.network.init(null);
                this.network.connectToHost(data.targetSessionId);
            } catch (e) {
                console.error(e);
                alert("Não foi possível localizar este reino.");
            }
        });
    }

    async startGame(seed, id, nick) {
        if (this.game.isRunning) return;

        // Feedback visual de carregamento pode ser adicionado aqui futuramente
        await this.game.loadAssets();
        
        this.ui.showScreen('game');
        
        // Inicializa o motor com suporte aos novos biomas e detalhes orgânicos
        this.game.init(seed, id, nick);
        console.log("[MAIN] Jogo iniciado com sucesso.");
    }
}

window.onload = () => {
    window.gameApp = new GameApp();
};
