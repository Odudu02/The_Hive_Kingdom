import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game();
        
        this.lastSent = 0;
        this.sendRate = 50; // Atualiza a rede a cada 50ms

        this.init();
    }

    init() {
        // --- 1. Eventos de Rede ---
        this.network.onDataReceived = (pkg) => {
            switch(pkg.type) {
                case 'WELCOME':
                    console.log("[MAIN] Conectado. Seed:", pkg.data.seed);
                    const nick = this.ui.inputs.nickname.value || "Guest";
                    this.startGame(pkg.data.seed, this.network.myId, nick);
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
            if (!data.sessionId) return alert("Defina o ID da sessão");
            
            try {
                const id = await this.network.init(data.sessionId);
                this.network.startHosting({ seed: data.seed });
                alert(`Reino Criado!\nID: ${id}`);
                this.startGame(data.seed, id, data.nickname);
            } catch (e) {
                alert("Erro: ID em uso ou falha de conexão.");
                console.error(e);
            }
        });

        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const data = this.ui.getJoinData();
            if (!data.targetSessionId) return alert("Informe o ID do Host");

            try {
                await this.network.init(null);
                this.network.connectToHost(data.targetSessionId);
            } catch (e) {
                console.error(e);
                alert("Erro ao conectar.");
            }
        });
    }

    async startGame(seed, id, nick) {
        await this.game.loadAssets();
        this.ui.showScreen('game');
        this.game.init(seed, id, nick);
    }
}

window.onload = () => new GameApp();
