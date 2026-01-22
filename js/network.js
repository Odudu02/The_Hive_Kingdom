export default class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = []; // Lista de conexões (Host mantém todas)
        this.hostConnection = null; // Guest mantém só esta
        this.isHost = false;
        this.myId = null;
        
        // Callback para quando dados chegarem (definido no main.js)
        this.onDataReceived = null; 
    }

    async init(customId = null) {
        return new Promise((resolve, reject) => {
            const options = { debug: 1 };
            this.peer = new Peer(customId ? customId : undefined, options);

            this.peer.on('open', (id) => {
                this.myId = id;
                console.log(`[P2P] ID: ${id}`);
                resolve(id);
            });

            this.peer.on('error', (err) => reject(err));
            this.peer.on('connection', (conn) => this.handleConnection(conn));
        });
    }

    startHosting(gameConfig) {
        this.isHost = true;
        this.gameConfig = gameConfig;
    }

    connectToHost(hostId) {
        this.isHost = false;
        const conn = this.peer.connect(hostId);
        this.handleConnection(conn);
    }

    handleConnection(conn) {
        conn.on('open', () => {
            console.log(`[P2P] Conectado: ${conn.peer}`);
            
            if (this.isHost) {
                this.connections.push(conn);
                // Envia dados iniciais
                conn.send({
                    type: 'WELCOME',
                    data: { seed: this.gameConfig.seed, hostId: this.myId }
                });
            } else {
                this.hostConnection = conn;
            }
        });

        conn.on('data', (packet) => {
            // Se sou Host e recebo dados de um Guest, repasso para os outros (Relay)
            if (this.isHost && packet.type === 'PLAYER_MOVE') {
                this.broadcast(packet, conn.peer); // Não manda de volta pra quem enviou
            }

            // Repassa os dados para o Main processar (Atualizar o jogo)
            if (this.onDataReceived) this.onDataReceived(packet);
        });

        conn.on('close', () => {
            console.log(`[P2P] Desconectado: ${conn.peer}`);
            this.connections = this.connections.filter(c => c !== conn);
            // Avisar main para remover player desconectado
            if (this.onDataReceived) {
                this.onDataReceived({ type: 'PLAYER_DISCONNECT', id: conn.peer });
            }
        });
    }

    // Envia dados para a rede
    broadcast(packet, excludeId = null) {
        if (this.isHost) {
            // Host manda para todos (menos quem enviou, se houver)
            this.connections.forEach(conn => {
                if (conn.peer !== excludeId) {
                    conn.send(packet);
                }
            });
        } else if (this.hostConnection) {
            // Guest manda apenas para o Host
            this.hostConnection.send(packet);
        }
    }
}
