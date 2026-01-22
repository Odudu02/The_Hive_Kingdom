import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game();
        
        // Controle de taxa de envio (Network Throttle)
        this.lastSentTime = 0;
        this.sendRate = 50; // Envia updates a cada 50ms (20 vezes por segundo)

        this.initListeners();
    }

    initListeners() {
        // --- CONFIGURAÇÃO DE REDE PARA JOGO ---
        
        // 1. Recebendo dados da rede
        this.network.onDataReceived = (packet) => {
            switch (packet.type) {
                case 'WELCOME':
                    // Guest recebe seed e inicia
                    console.log("Conectado! Seed:", packet.data.seed);
                    const myNick = this.ui.inputs.nickname.value || "Guest";
                    this.startGame(packet.data.seed, this.network.myId, myNick);
                    break;
                
                case 'PLAYER_MOVE':
                    // Atualiza posição de outro player no meu jogo
                    this.game.updateRemotePlayer(packet.id, packet.data);
                    break;

                case 'PLAYER_DISCONNECT':
                    this.game.removePlayer(packet.id);
                    break;
            }
        };

        // 2. Enviando dados do jogo (Movimento Local)
        this.game.onPlayerMove = (playerState) => {
            const now = Date.now();
            if (now - this.lastSentTime > this.sendRate) {
                this.network.broadcast({
                    type: 'PLAYER_MOVE',
                    id: this.network.myId, // Quem sou eu
                    data: playerState
                });
                this.lastSentTime = now;
            }
        };

        // --- EVENTOS DE UI (Botões) ---

        // Host
        this.ui.buttons.startHost.addEventListener('click', async () => {
            const hostData = this.ui.getHostData();
            if (!hostData.sessionId) return alert("ID necessário");

            try {
                const id = await this.network.init(hostData.sessionId);
                this.network.startHosting({ seed: hostData.seed });
                alert(`Reino criado! ID: ${id}`);
                
                // Inicia jogo
                this.startGame(hostData.seed, id, hostData.nickname);
            } catch (err) {
                alert("Erro ao criar. ID em uso?");
                console.error(err);
            }
        });

        // Guest
        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const joinData = this.ui.getJoinData();
            if (!joinData.targetSessionId) return alert("ID do Host necessário");

            try {
                // Guest entra com ID automático
                await this.network.init(null); 
                this.network.connectToHost(joinData.targetSessionId);
                // O jogo inicia no evento 'WELCOME' do network.onDataReceived
            } catch (err) {
                console.error(err);
            }
        });
    }

    async startGame(seed, myId, nickname) {
        await this.game.loadAssets();
        this.ui.showScreen('game');
        this.game.init(seed, myId, nickname);
    }
}

window.onload = () => new GameApp();
