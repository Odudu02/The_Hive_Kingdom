import { createSeededRandom } from './utils.js';
import InputHandler from './inputs.js';

export default class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Instancia inputs
        this.input = new InputHandler();

        this.tileSize = 64;
        this.camera = { x: 0, y: 0 };
        this.assets = {};
        
        // Dados do Jogador Local
        this.localPlayer = { x: 0, y: 0, speed: 300, facing: 'down', nickname: 'Eu' };
        
        // Map para Jogadores Remotos (Chave = ID, Valor = Dados)
        this.remotePlayers = new Map();
        
        // Configurações do Mundo
        this.seed = null;
        this.rng = null;
        this.isRunning = false;

        // Callbacks (definidos pelo main.js)
        this.onPlayerMove = null; 

        // Loop de animação
        this.lastTime = 0;

        // Ajuste inicial de tela
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async loadAssets() {
        const imageList = {
            'bee_idle': 'assets/BeeIdle.png',
            'bee_up': 'assets/BeeUp.png',
            'bee_down': 'assets/BeeDown.png',
            'bee_left': 'assets/BeeLeft.png',
            'bee_right': 'assets/BeeRight.png',
            'flower': 'assets/Flower.png'
        };

        const promises = Object.keys(imageList).map(key => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = imageList[key];
                img.onload = () => {
                    this.assets[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`[GAME] Asset não encontrado: ${key}`);
                    resolve(); // Resolve mesmo com erro para não travar
                };
            });
        });

        await Promise.all(promises);
        console.log('[GAME] Assets carregados (ou ignorados).');
    }

    init(seed, myId, nickname) {
        this.seed = seed;
        this.myId = myId;
        this.localPlayer.nickname = nickname;
        
        // Inicializa RNG
        this.rng = createSeededRandom(this.seed);
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        console.log(`[GAME] Iniciado. Seed: ${this.seed}, ID: ${this.myId}`);
        requestAnimationFrame((t) => this.loop(t));
    }

    // Chamado via rede quando outro player se move
    updateRemotePlayer(id, data) {
        if (id === this.myId) return;
        this.remotePlayers.set(id, data);
    }

    // Chamado via rede quando alguém desconecta
    removePlayer(id) {
        this.remotePlayers.delete(id);
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        // 1. Obter Input (Teclado ou Touch)
        const inputState = this.input.getState();

        // 2. Movimentação Local
        if (inputState.isMoving) {
            this.localPlayer.x += inputState.x * this.localPlayer.speed * deltaTime;
            this.localPlayer.y += inputState.y * this.localPlayer.speed * deltaTime;
            this.localPlayer.facing = inputState.facing;

            // Envia para a rede (Main.js vai tratar o throttle/taxa de envio)
            if (this.onPlayerMove) {
                this.onPlayerMove({
                    x: Math.round(this.localPlayer.x),
                    y: Math.round(this.localPlayer.y),
                    facing: this.localPlayer.facing,
                    nickname: this.localPlayer.nickname
                });
            }
        }

        // 3. Câmera segue o player (Lerp suave)
        const targetCamX = this.localPlayer.x - this.canvas.width / 2;
        const targetCamY = this.localPlayer.y - this.canvas.height / 2;
        
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
    }

    draw() {
        // Fundo
        this.ctx.fillStyle = '#2ea44f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- RENDER DO MUNDO (CULLING) ---
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const tileType = this.getTileType(c, r);
                
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;

                // Desenha Grid Debug (opcional)
                // this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                // this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);

                if (tileType === 'flower') {
                    if (this.assets['flower']) {
                        this.ctx.drawImage(this.assets['flower'], x + 8, y + 8, 48, 48);
                    } else {
                        // Fallback: Bola Rosa
                        this.ctx.fillStyle = 'hotpink';
                        this.ctx.beginPath();
                        this.ctx.arc(x + 32, y + 32, 16, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }

        // --- PLAYERS REMOTOS ---
        this.remotePlayers.forEach((playerData) => {
            this.drawPlayer(playerData, 'yellow');
        });

        // --- PLAYER LOCAL ---
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(player, nameColor) {
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;

        // Seleciona Sprite
        let spriteKey = 'bee_idle';
        // Mapeia facing para sprite
        if (player.facing === 'up') spriteKey = 'bee_up';
        if (player.facing === 'down') spriteKey = 'bee_down';
        if (player.facing === 'left') spriteKey = 'bee_left';
        if (player.facing === 'right') spriteKey = 'bee_right';

        const sprite = this.assets[spriteKey] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, screenX, screenY, 64, 64);
        } else {
            // Fallback: Quadrado
            this.ctx.fillStyle = nameColor;
            this.ctx.fillRect(screenX, screenY, 64, 64);
        }

        // Nickname
        this.ctx.fillStyle = nameColor;
        this.ctx.font = 'bold 14px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(player.nickname || '?', screenX + 32, screenY - 10);
        this.ctx.shadowBlur = 0;
    }

    // Geração Procedural Determinística
    getTileType(x, y) {
        const localSeed = `${this.seed}_${x}_${y}`;
        const val = createSeededRandom(localSeed)();

        if (val > 0.90) return 'flower';
        return 'grass';
    }
}
