import { createSeededRandom } from './utils.js';
import InputHandler from './inputs.js';

export default class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler();

        this.tileSize = 64;
        this.camera = { x: 0, y: 0 };
        this.assets = {};
        
        // Jogadores
        this.myId = null;
        this.localPlayer = { x: 0, y: 0, speed: 300, facing: 'down', nickname: 'Eu' };
        this.remotePlayers = new Map(); // Armazena { x, y, facing, nickname }

        this.seed = null;
        this.rng = null;
        
        // Loop
        this.lastTime = 0;
        this.onPlayerMove = null; // Callback para o main.js enviar rede

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async loadAssets() {
        const imageList = {
            'bee_idle': 'assets/BeeIdle.png', // Usado se parado
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
                img.onload = () => { this.assets[key] = img; resolve(); };
                img.onerror = () => { console.warn(`Asset faltante: ${key}`); resolve(); };
            });
        });
        await Promise.all(promises);
    }

    init(seed, myId, nickname) {
        this.seed = seed;
        this.myId = myId;
        this.localPlayer.nickname = nickname;
        this.rng = createSeededRandom(this.seed);
        
        requestAnimationFrame((t) => this.loop(t));
    }

    // Atualiza dados de um player remoto
    updateRemotePlayer(id, data) {
        if (id === this.myId) return; // Ignora eco
        this.remotePlayers.set(id, data);
    }

    removePlayer(id) {
        this.remotePlayers.delete(id);
    }

    loop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000; // Segundos
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        // 1. Processa Input
        const input = this.input.getDirection();

        if (input.isMoving) {
            this.localPlayer.x += input.x * this.localPlayer.speed * deltaTime;
            this.localPlayer.y += input.y * this.localPlayer.speed * deltaTime;
            this.localPlayer.facing = input.facing;

            // Notifica Main para enviar rede
            if (this.onPlayerMove) {
                this.onPlayerMove({
                    x: Math.round(this.localPlayer.x),
                    y: Math.round(this.localPlayer.y),
                    facing: this.localPlayer.facing,
                    nickname: this.localPlayer.nickname
                });
            }
        }

        // 2. Atualiza Câmera (Centraliza no Player)
        // Lerp simples para suavidade (Linear Interpolation)
        const targetCamX = this.localPlayer.x - this.canvas.width / 2;
        const targetCamY = this.localPlayer.y - this.canvas.height / 2;
        
        this.camera.x += (targetCamX - this.camera.x) * 0.1; // 10% de suavização
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
    }

    draw() {
        this.ctx.fillStyle = '#2ea44f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- MUNDO ---
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

                if (tileType === 'flower') {
                    // Desenha apenas se tiver o asset, se não, um quadrado rosa
                    if(this.assets['flower']) 
                        this.ctx.drawImage(this.assets['flower'], x, y, 64, 64);
                    else {
                        this.ctx.fillStyle = 'pink';
                        this.ctx.fillRect(x+10, y+10, 44, 44);
                    }
                }
            }
        }

        // --- PLAYERS REMOTOS ---
        this.remotePlayers.forEach((p, id) => {
            this.drawPlayer(p, 'yellow');
        });

        // --- PLAYER LOCAL ---
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(player, nameColor) {
        // Converte posição do mundo para posição da tela
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;

        // Seleciona Sprite baseado no Facing
        let spriteKey = 'bee_idle';
        if (player.facing === 'up') spriteKey = 'bee_up';
        if (player.facing === 'down') spriteKey = 'bee_down';
        if (player.facing === 'left') spriteKey = 'bee_left';
        if (player.facing === 'right') spriteKey = 'bee_right';

        const sprite = this.assets[spriteKey] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, screenX, screenY, 64, 64);
        } else {
            // Fallback se não tiver imagem
            this.ctx.fillStyle = 'yellow';
            this.ctx.fillRect(screenX, screenY, 64, 64);
        }

        // Nickname
        this.ctx.fillStyle = nameColor;
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.nickname || 'Unknown', screenX + 32, screenY - 10);
    }

    getTileType(x, y) {
        const localSeed = `${this.seed}_${x}_${y}`;
        const val = createSeededRandom(localSeed)();
        if (val > 0.90) return 'flower';
        return 'grass';
    }
}
