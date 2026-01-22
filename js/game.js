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
        
        // Sistema de Partículas
        this.particles = [];
        this.maxParticles = 100; // Quantidade equilibrada para naturalidade
        
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
        
        // Inicializa o Pool de Partículas (Invisíveis no início)
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0, type: 'smoke' });
        }

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

        this.update(deltaTime, timestamp);
        this.draw(timestamp);

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime, timestamp) {
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

        // Atualiza Partículas
        this.updateParticles(deltaTime, timestamp);
    }

    updateParticles(dt, time) {
        this.particles.forEach(p => {
            if (p.life > 0) {
                p.life -= dt;
                p.y += p.vy * dt;
                // Efeito de balanço suave (Vento)
                p.x += Math.sin(time / 500 + p.size) * 0.5;
                if (p.type === 'smoke') p.size += dt * 5;
            } else {
                // Respawn da partícula em um tile queimado visível
                this.respawnParticle(p);
            }
        });
    }

    respawnParticle(p) {
        // Tenta encontrar um ponto aleatório na tela
        const randX = this.camera.x + Math.random() * this.canvas.width;
        const randY = this.camera.y + Math.random() * this.canvas.height;
        
        const col = Math.floor(randX / this.tileSize);
        const row = Math.floor(randY / this.tileSize);
        const tile = this.getTileData(col, row);

        if (tile.biome === 'burned') {
            p.x = randX;
            p.y = randY;
            p.life = 1 + Math.random() * 2;
            p.type = Math.random() > 0.7 ? 'soot' : 'smoke';
            p.vy = -20 - Math.random() * 30; // Sobe
            p.size = p.type === 'smoke' ? 2 : 1;
        } else {
            p.life = 0; // Tenta novamente no próximo frame
        }
    }

    draw(timestamp) {
        this.ctx.fillStyle = '#111'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        // 1. Desenha Solo e Objetos
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;
                const tileData = this.getTileData(c, r);

                if (tileData.biome === 'safe') {
                    this.ctx.fillStyle = tileData.detailVar > 0.7 ? '#2a7a3f' : '#2d8544';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                } else {
                    const grayBase = 25 + (tileData.detailVar * 20);
                    this.ctx.fillStyle = `rgb(${grayBase}, ${grayBase}, ${grayBase})`;
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                }

                if (tileData.object === 'flower' && this.assets['flower']) {
                    this.ctx.drawImage(this.assets['flower'], x+8, y+8, 48, 48);
                } else if (tileData.object === 'ember') {
                    const individualPulse = (Math.sin((timestamp / 400) + (tileData.detailVar * 10)) + 1) / 2;
                    this.ctx.fillStyle = `rgba(255, ${80 + (individualPulse * 120)}, 20, ${0.4 + individualPulse * 0.6})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x + 12 + (tileData.offsetX * 40), y + 12 + (tileData.offsetY * 40), 2 + (individualPulse * 2), 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // 2. Desenha Partículas (Fumaça e Fuligem)
        this.drawParticles();

        // 3. Desenha Players
        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawParticles() {
        this.particles.forEach(p => {
            if (p.life > 0) {
                const alpha = Math.min(p.life, 0.5); // Transparência suave
                this.ctx.fillStyle = p.type === 'smoke' ? `rgba(150, 150, 150, ${alpha * 0.4})` : `rgba(0, 0, 0, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x - this.camera.x, p.y - this.camera.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
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
        this.ctx.fillText(player.nickname || '?', screenX + 32, screenY - 10);
    }

    getTileData(col, row) {
        const localSeed = `${this.seed}_${col}_${row}`;
        const rng = createSeededRandom(localSeed);
        const val1 = rng(); 
        const val2 = rng();
        const offsetX = rng();
        const offsetY = rng();
        const dist = Math.sqrt(col*col + row*row);
        const noise = (val1 * 2.8); 
        const safeZoneRadius = 3.2;
        let biome = (dist < safeZoneRadius + noise) ? 'safe' : 'burned';
        let object = null;
        if (biome === 'safe') {
            if (val2 > 0.94) object = 'flower'; 
        } else {
            if (val2 > 0.985) object = 'ember'; 
        }
        return { biome, object, detailVar: val1, offsetX, offsetY };
    }
}
