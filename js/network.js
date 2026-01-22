export default class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = [];
        this.hostConnection = null;
        this.isHost = false;
        this.myId = null;
        this.onDataReceived = null;
    }

    async init(customId = null) {
        return new Promise((resolve, reject) => {
            const opts = { debug: 1 };
            this.peer = new Peer(customId ? customId : undefined, opts);

            this.peer.on('open', (id) => {
                this.myId = id;
                console.log(`[P2P] Conectado. ID: ${id}`);
                resolve(id);
            });

            this.peer.on('error', (err) => reject(err));
            this.peer.on('connection', (conn) => this.handleConnection(conn));
        });
    }

    startHosting(config) {
        this.isHost = true;
        this.gameConfig = config;
    }

    connectToHost(hostId) {
        this.isHost = false;
        const conn = this.peer.connect(hostId);
        this.handleConnection(conn);
    }

    handleConnection(conn) {
        conn.on('open', () => {
            if (this.isHost) {
                this.connections.push(conn);
                conn.send({
                    type: 'WELCOME',
                    data: { seed: this.gameConfig.seed }
                });
            } else {
                this.hostConnection = conn;
            }
        });

        conn.on('data', (packet) => {
            // Relay: Host retransmite movimentos para todos
            if (this.isHost && packet.type === 'PLAYER_MOVE') {
                this.broadcast(packet, conn.peer);
            }
            if (this.onDataReceived) this.onDataReceived(packet);
        });

        conn.on('close', () => {
            this.connections = this.connections.filter(c => c !== conn);
            if (this.onDataReceived) {
                this.onDataReceived({ type: 'PLAYER_DISCONNECT', id: conn.peer });
            }
        });
    }

    broadcast(packet, excludeId = null) {
        if (this.isHost) {
            this.connections.forEach(c => {
                if (c.peer !== excludeId) c.send(packet);
            });
        } else if (this.hostConnection) {
            this.hostConnection.send(packet);
        }
    }
}
