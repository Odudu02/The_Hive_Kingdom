import UI from './ui.js';
import NetworkManager from './network.js';

class GameApp {
    constructor() {
        this.ui = new UI();
        this.network = new NetworkManager();
        this.initListeners();
    }

    initListeners() {
        // Evento: Usuário clica em CRIAR REINO
        this.ui.buttons.startHost.addEventListener('click', async () => {
            const hostData = this.ui.getHostData();
            
            if (!hostData.sessionId) {
                alert("Por favor, defina um ID para a sessão.");
                return;
            }

            try {
                // Inicializa a rede com o ID escolhido
                await this.network.init(hostData.sessionId);
                
                // Configura o jogo como Host
                this.network.startHosting({
                    seed: hostData.seed,
                    password: hostData.password
                });

                alert(`Reino fundado! Compartilhe o ID: ${hostData.sessionId}`);
                // Transição para a tela do jogo (Placeholder por enquanto)
                this.ui.showScreen('game');
                // Aqui chamaremos a função para iniciar o Canvas do jogo
                
            } catch (error) {
                alert("Erro ao criar sessão. O ID pode já estar em uso.");
                console.error(error);
            }
        });

        // Evento: Usuário clica em CONECTAR
        this.ui.buttons.startJoin.addEventListener('click', async () => {
            const joinData = this.ui.getJoinData();

            if (!joinData.targetSessionId) {
                alert("Insira o ID do Reino.");
                return;
            }

            try {
                // Guest inicia com ID aleatório (null)
                await this.network.init(null);
                
                // Conecta ao Host
                this.network.connectToHost(joinData.targetSessionId);

                // Aguardamos o evento 'game-start' disparado pelo network.js ao receber a seed
            } catch (error) {
                console.error(error);
            }
        });

        // Evento Global: Jogo pronto para começar (disparado pelo Network ao receber dados do Host)
        window.addEventListener('game-start', (e) => {
            const serverData = e.detail;
            console.log("Iniciando jogo com a seed:", serverData.seed);
            this.ui.showScreen('game');
            // TODO: Iniciar a Engine do Jogo (Grid, Canvas, Bee Sprites)
        });
    }
}

// Inicializa a aplicação
window.onload = () => {
    const app = new GameApp();
};
