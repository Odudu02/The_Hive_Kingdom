import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game();
        this.lastSent = 0;
        this.sendRate = 50; 
        this.init();
    }

    init() {
        this.network.onDataReceived = (pkg) => {
            if (pkg.type === 'WELCOME') {
                const nick = this.ui.inputs.nickname.value || "Bee";
                this.startGame(pkg.data.seed, this.network.myId, nick);
            } else if (pkg.type === 'PLAYER_MOVE') {
                this.game.updateRemotePlayer(pkg.id, pkg.data);
            } else if (pkg.type === 'PLAYER_DISCONNECT') {
                this.game.removePlayer(pkg.id);
            }
        };

        this.game.onPlayerMove = (data) => {
            const now = Date.now();
            if (now - this.lastSent > this.sendRate) {
                this.network.broadcast({ type: 'PLAYER_MOVE', id: this.network.myId, data });
                this.lastSent = now;
            }
        };

        this.ui.buttons.startHost.addEventListener('click', async () => {
            const data = this.ui.getHostData();
            if (!data.sessionId) return alert("ID Requerido");
            const id = await this.network.init(data.sessionId);
            this.network.startHosting({ seed: data.seed });
            this.startGame(data.seed, id, data.nickname);
        });

        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const data = this.ui.getJoinData();
            if (!data.targetSessionId) return alert("ID do Host Requerido");
            await this.network.init(null);
            this.network.connectToHost(data.targetSessionId);
        });
    }

    async startGame(seed, id, nick) {
        await this.game.loadAssets();
        this.ui.showScreen('game');
        this.game.init(seed, id, nick);
    }
}

window.onload = () => new GameApp();
