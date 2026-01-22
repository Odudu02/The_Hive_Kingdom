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
        
        this.seed = null;
        this.rng = null;
        this.isRunning = false;
        
        this.onPlayerMove = null; 
        this.lastTime = 0;

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
                img.onload = () => { this.assets[key] = img; resolve(); };
                img.onerror = () => resolve(); 
            });
        });
        await Promise.all(promises);
    }

    init(seed, myId, nickname) {
        this.seed = seed;
        this.myId = myId;
        this.localPlayer.nickname = nickname;
        this.rng = createSeededRandom(this.seed);
        
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    updateRemotePlayer(id, data) {
        if (id === this.myId) return;
        this.remotePlayers.set(id, data);
    }

    removePlayer(id) {
        this.remotePlayers.delete(id);
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw(timestamp); // Passamos o timestamp para o efeito de pulsação

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        const input = this.input.getState();

        if (input.isMoving) {
            this.localPlayer.x += input.x * this.localPlayer.speed * deltaTime;
            this.localPlayer.y += input.y * this.localPlayer.speed * deltaTime;
            this.localPlayer.facing = input.facing;

            if (this.onPlayerMove) {
                this.onPlayerMove({
                    x: Math.round(this.localPlayer.x),
                    y: Math.round(this.localPlayer.y),
                    facing: this.localPlayer.facing,
                    nickname: this.localPlayer.nickname
                });
            }
        }

        const targetCamX = this.localPlayer.x - this.canvas.width / 2;
        const targetCamY = this.localPlayer.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
    }

    draw(timestamp) {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Cálculo da pulsação da brasa (valor entre 0 e 1)
        const pulse = (Math.sin(timestamp / 500) + 1) / 2;

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;
                const tileData = this.getTileData(c, r);

                if (tileData.biome === 'safe') {
                    // Verde Orgânico
                    this.ctx.fillStyle = '#2d8544'; 
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Detalhes de grama sutis
                    if (tileData.detailVar > 0.6) {
                        this.ctx.strokeStyle = '#3eb05d';
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.moveTo(x + 20, y + 40);
                        this.ctx.lineTo(x + 22, y + 35);
                        this.ctx.stroke();
                    }
                } else {
                    // Cinza de Fuligem Orgânico
                    const grayBase = 35 + (tileData.detailVar * 15);
                    this.ctx.fillStyle = `rgb(${grayBase}, ${grayBase}, ${grayBase})`;
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Manchas de cinza escura
                    if (tileData.detailVar < 0.3) {
                        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        this.ctx.beginPath();
                        this.ctx.arc(x + 32, y + 32, 15, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // Objetos
                if (tileData.object === 'flower') {
                    if (this.assets['flower']) {
                        this.ctx.drawImage(this.assets['flower'], x + 8, y + 8, 48, 48);
                    }
                } 
                else if (tileData.object === 'ember') {
                    // Brasa pulsante
                    const glowSize = 5 + (pulse * 10);
                    const alpha = 0.3 + (pulse * 0.7);
                    
                    this.ctx.shadowColor = `rgba(255, 69, 0, ${alpha})`;
                    this.ctx.shadowBlur = glowSize;
                    this.ctx.fillStyle = `rgba(255, ${100 + (pulse * 100)}, 0, ${alpha})`;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(x + 32, y + 32, 3 + (pulse * 2), 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(player, color) {
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;
        let spriteKey = `bee_${player.facing}`;
        const sprite = this.assets[spriteKey] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, screenX, screenY, 64, 64);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, 64, 64);
        }

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(player.nickname || '?', screenX + 32, screenY - 10);
        this.ctx.shadowBlur = 0;
    }

    getTileData(col, row) {
        const localSeed = `${this.seed}_${col}_${row}`;
        const rng = createSeededRandom(localSeed);
        const val1 = rng();
        const val2 = rng();

        // Cálculo de distância com ruído para borda orgânica
        const dist = Math.sqrt(col*col + row*row);
        const noise = (val1 * 2.5); // Aumentamos o ruído para ser mais irregular
        const safeZoneRadius = 3.5;

        let biome = (dist < safeZoneRadius + noise) ? 'safe' : 'burned';

        let object = null;
        if (biome === 'safe') {
            if (val2 > 0.92) object = 'flower'; // Menos flores para parecer natural
        } else {
            if (val2 > 0.98) object = 'ember'; // Menos brasas, mas pulsantes
        }

        return { biome, object, detailVar: val1 };
    }
}
