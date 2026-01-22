export default class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = []; // Lista de conexões (se Host)
        this.hostConnection = null; // Conexão única (se Guest)
        this.isHost = false;
        this.myId = null;
    }

    // Inicializa o Peer (Identidade na rede)
    async init(customId = null) {
        return new Promise((resolve, reject) => {
            // Opções do PeerJS
            const options = {
                debug: 2 // Nível de log (errors e warnings)
            };

            // Se o usuário definiu um ID, tentamos usá-lo
            if (customId) {
                this.peer = new Peer(customId, options);
            } else {
                this.peer = new Peer(null, options);
            }

            this.peer.on('open', (id) => {
                this.myId = id;
                console.log(`[P2P] Conectado à rede global. Meu ID: ${id}`);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error(`[P2P] Erro:`, err);
                reject(err);
            });

            // Handler para quando alguém tenta conectar em mim
            this.peer.on('connection', (conn) => this.handleIncomingConnection(conn));
        });
    }

    // Lógica para o HOST
    startHosting(gameConfig) {
        this.isHost = true;
        console.log(`[P2P] Sessão iniciada. Seed do mapa: ${gameConfig.seed}`);
        // Aqui futuramente guardaremos o estado do jogo e a seed para enviar aos novos players
        this.gameConfig = gameConfig;
    }

    handleIncomingConnection(conn) {
        if (!this.isHost) {
            // Se não sou host e alguém conecta em mim, rejeito ou trato como p2p mesh (futuro)
            return;
        }

        conn.on('open', () => {
            console.log(`[P2P] Novo jogador conectado: ${conn.peer}`);
            this.connections.push(conn);

            // Passo 1: Enviar dados iniciais (Seed, Estado do Mundo)
            conn.send({
                type: 'WELCOME',
                data: {
                    seed: this.gameConfig.seed,
                    mapData: "chunk_data_placeholder" // Placeholder para chunks
                }
            });
        });

        conn.on('data', (data) => {
            console.log(`[P2P] Dados recebidos de ${conn.peer}:`, data);
            // Aqui entraremos com a lógica de replicar dados para outros players
        });
        
        conn.on('close', () => {
            console.log(`[P2P] Jogador desconectado: ${conn.peer}`);
            this.connections = this.connections.filter(c => c !== conn);
        });
    }

    // Lógica para o GUEST (Entrar em Reino)
    connectToHost(hostId) {
        this.isHost = false;
        console.log(`[P2P] Tentando conectar ao Host: ${hostId}`);

        const conn = this.peer.connect(hostId, {
            reliable: true
        });

        conn.on('open', () => {
            console.log(`[P2P] Conexão estabelecida com o Host!`);
            this.hostConnection = conn;
        });

        conn.on('data', (packageData) => {
            console.log(`[P2P] Pacote recebido do Host:`, packageData);
            
            // Reação ao pacote de boas-vindas
            if (packageData.type === 'WELCOME') {
                console.log(`[GAME] Seed recebida: ${packageData.data.seed}`);
                // Dispara evento global para o jogo iniciar
                const event = new CustomEvent('game-start', { detail: packageData.data });
                window.dispatchEvent(event);
            }
        });

        conn.on('error', (err) => {
            console.error(`[P2P] Erro na conexão com host:`, err);
            alert("Erro ao conectar com o Host. Verifique o ID.");
        });
    }
}
