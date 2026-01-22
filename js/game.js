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
        
        this.localPlayer = { x: 0, y: 0, speed: 300, facing: 'down', nickname: 'Eu' };
        this.remotePlayers = new Map();
        
        // Responsividade
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Garante que o canvas preencha a tela corretamente em mobile após rotação
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // ... (Métodos loadAssets, init, updateRemotePlayer e removePlayer mantidos iguais) ...
    // Vou omitir aqui para economizar espaço, mantenha o código anterior dessas funções
    // APENAS ADICIONE loadAssets, init, updateRemotePlayer, removePlayer do step anterior AQUI.

    // Copie o loadAssets, init, updateRemotePlayer, removePlayer do passo anterior para cá.
    // Abaixo apenas o UPDATE e DRAW alterados/revisados

    async loadAssets() {
        // Mesmo código anterior
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
                img.onload = () => { this.assets[key] = img; resolve(); };
                img.onerror = () => { resolve(); };
            });
        });
        await Promise.all(promises);
    }
    
    init(seed, myId, nickname) {
        this.seed = seed;
        this.myId = myId;
        this.localPlayer.nickname = nickname;
        this.rng = createSeededRandom(this.seed);
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    updateRemotePlayer(id, data) { this.remotePlayers.set(id, data); }
    removePlayer(id) { this.remotePlayers.delete(id); }

    loop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        // Input unificado (Keyboard + Joystick)
        const input = this.input.getDirection();

        if (input.isMoving) {
            // Input.x e Input.y agora podem ser fracionados (0.5), permitindo andar devagar no joystick
            this.localPlayer.x += input.x * this.localPlayer.speed * deltaTime;
            this.localPlayer.y += input.y * this.localPlayer.speed * deltaTime;
            this.localPlayer.facing = input.facing;

            // Callback para rede
            if (this.onPlayerMove) {
                this.onPlayerMove({
                    x: Math.round(this.localPlayer.x),
                    y: Math.round(this.localPlayer.y),
                    facing: this.localPlayer.facing,
                    nickname: this.localPlayer.nickname
                });
            }
        }

        // Câmera segue player
        const targetCamX = this.localPlayer.x - this.canvas.width / 2;
        const targetCamY = this.localPlayer.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
    }

    draw() {
        // Limpa tela
        this.ctx.fillStyle = '#2ea44f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Renderiza Grid (Otimizado)
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
                    if(this.assets['flower']) 
                        this.ctx.drawImage(this.assets['flower'], x, y, 64, 64);
                    else {
                        this.ctx.fillStyle = 'pink';
                        this.ctx.beginPath();
                        this.ctx.arc(x+32, y+32, 20, 0, Math.PI*2);
                        this.ctx.fill();
                    }
                }
            }
        }

        // Players Remotos
        this.remotePlayers.forEach((p) => this.drawPlayer(p, 'yellow'));
        // Player Local
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(player, color) {
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;

        // Sprite ou Placeholder
        let spriteKey = `bee_${player.facing}`; // ex: bee_left
        if (!['up','down','left','right'].includes(player.facing)) spriteKey = 'bee_idle';
        
        const sprite = this.assets[spriteKey] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, screenX, screenY, 64, 64);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, 64, 64);
        }
        
        // Nick
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(player.nickname || '?', screenX + 32, screenY - 10);
        this.ctx.shadowBlur = 0;
    }

    getTileType(x, y) {
        const localSeed = `${this.seed}_${x}_${y}`;
        const val = createSeededRandom(localSeed)();
        if (val > 0.90) return 'flower';
        return 'grass';
    }
}
