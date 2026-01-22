import UI from './ui.js';
import NetworkManager from './network.js';
import Game from './game.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.game = new Game(); // Instancia o Motor
        
        this.initListeners();
    }

    initListeners() {
        // --- EVENTOS DE UI ---

        // Botão: CRIAR REINO (Host)
        this.ui.buttons.startHost.addEventListener('click', async () => {
            const hostData = this.ui.getHostData();
            
            if (!hostData.sessionId) {
                alert("Por favor, defina um ID para a sessão.");
                return;
            }

            try {
                // 1. Inicializa Rede
                await this.network.init(hostData.sessionId);
                
                // 2. Configura Host
                this.network.startHosting({
                    seed: hostData.seed,
                    password: hostData.password
                });

                alert(`Reino fundado! ID: ${hostData.sessionId}\nSeed: ${hostData.seed}`);
                
                // 3. Inicia o Jogo Localmente
                await this.startGame(hostData.seed);

            } catch (error) {
                alert("Erro ao criar sessão. O ID pode já estar em uso.");
                console.error(error);
            }
        });

        // Botão: CONECTAR (Guest)
        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const joinData = this.ui.getJoinData();

            if (!joinData.targetSessionId) {
                alert("Insira o ID do Reino.");
                return;
            }

            try {
                // 1. Inicializa Rede (ID aleatório)
                await this.network.init(null);
                
                // 2. Conecta ao Host
                this.network.connectToHost(joinData.targetSessionId);
                
                // O jogo iniciará quando o evento 'game-start' for recebido

            } catch (error) {
                console.error(error);
            }
        });

        // --- EVENTOS DE REDE/SISTEMA ---

        // Disparado quando o Guest recebe o pacote de boas-vindas do Host
        window.addEventListener('game-start', async (e) => {
            const serverData = e.detail;
            console.log("Recebido comando de início do Host. Seed:", serverData.seed);
            await this.startGame(serverData.seed);
        });
    }

    // Função centralizada para iniciar a engine
    async startGame(seed) {
        // Carrega imagens antes de mostrar a tela
        await this.game.loadAssets();
        
        // Troca a tela UI -> Game Canvas
        this.ui.showScreen('game');
        
        // Inicia o loop do jogo
        this.game.init(seed);
    }
}

// Inicializa a aplicação
window.onload = () => {
    const app = new GameApp();
};
