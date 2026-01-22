import { createSeededRandom, fractalNoise } from './utils.js';
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
        
        // Partículas
        this.particles = [];
        this.maxParticles = 120;
        
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
        
        // Pool de partículas
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

        this.updateParticles(deltaTime, timestamp);
    }

    updateParticles(dt, time) {
        this.particles.forEach(p => {
            if (p.life > 0) {
                p.life -= dt;
                p.y += p.vy * dt;
                p.x += Math.sin(time / 600 + p.size) * 0.4;
                if (p.type === 'smoke') p.size += dt * 4;
            } else {
                this.respawnParticle(p);
            }
        });
    }

    respawnParticle(p) {
        const randX = this.camera.x + Math.random() * this.canvas.width;
        const randY = this.camera.y + Math.random() * this.canvas.height;
        const col = Math.floor(randX / this.tileSize);
        const row = Math.floor(randY / this.tileSize);
        const tile = this.getTileData(col, row);

        if (tile.biome === 'burned') {
            p.x = randX;
            p.y = randY;
            p.life = 1 + Math.random() * 1.5;
            p.type = Math.random() > 0.8 ? 'soot' : 'smoke';
            p.vy = -15 - Math.random() * 25;
            p.size = p.type === 'smoke' ? 1.5 : 0.8;
        } else {
            p.life = 0;
        }
    }

    draw(timestamp) {
        this.ctx.fillStyle = '#0a0a0a'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        // 1. Solo e Biomas
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;
                const tile = this.getTileData(c, r);

                // Solo base
                if (tile.biome === 'safe') {
                    // Variação de verde baseada no ruído fino
                    const g = 110 + (tile.detailVar * 30);
                    this.ctx.fillStyle = `rgb(40, ${g}, 60)`;
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Detalhe de grama orgânica
                    if (tile.detailVar > 0.5) {
                        this.ctx.strokeStyle = `rgba(100, 200, 100, 0.4)`;
                        this.ctx.beginPath();
                        this.ctx.moveTo(x + tile.offsetX * 50, y + tile.offsetY * 50);
                        this.ctx.lineTo(x + tile.offsetX * 50 + 2, y + tile.offsetY * 50 - 4);
                        this.ctx.stroke();
                    }
                } else {
                    // Variação de cinza/terra queimada
                    const b = 20 + (tile.detailVar * 25);
                    this.ctx.fillStyle = `rgb(${b}, ${b-5}, ${b-5})`;
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Manchas de fuligem aglomeradas
                    if (tile.detailVar < 0.3) {
                        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        this.ctx.beginPath();
                        this.ctx.arc(x + 32, y + 32, 10 + tile.detailVar * 20, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // Objetos (Flores e Brasas)
                if (tile.object === 'flower' && this.assets['flower']) {
                    this.ctx.drawImage(this.assets['flower'], x+8, y+8, 48, 48);
                } else if (tile.object === 'ember') {
                    const pulse = (Math.sin((timestamp / 450) + (tile.detailVar * 20)) + 1) / 2;
                    this.ctx.fillStyle = `rgba(255, ${60 + pulse * 140}, 0, ${0.3 + pulse * 0.7})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x + 10 + tile.offsetX * 44, y + 10 + tile.offsetY * 44, 1.5 + pulse * 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        this.drawParticles();
        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawParticles() {
        this.ctx.save();
        this.particles.forEach(p => {
            if (p.life > 0) {
                const alpha = Math.min(p.life, 0.4);
                this.ctx.fillStyle = p.type === 'smoke' ? `rgba(100, 100, 100, ${alpha * 0.3})` : `rgba(0, 0, 0, ${alpha * 0.8})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x - this.camera.x, p.y - this.camera.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();
    }

    drawPlayer(player, color) {
        const sx = player.x - this.camera.x;
        const sy = player.y - this.camera.y;
        let sprite = this.assets[`bee_${player.facing}`] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, sx, sy, 64, 64);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(sx, sy, 64, 64);
        }

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 13px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.nickname || '?', sx + 32, sy - 8);
    }

    getTileData(col, row) {
        const seedStr = `${this.seed}_${col}_${row}`;
        const rng = createSeededRandom(seedStr);
        
        // NOVO: Motor de bioma Fractal (Oitavas de Ruído)
        // Isso cria massas orgânicas em vez de um círculo
        const biomeNoise = fractalNoise(col, row, 3, 0.5, 0.08, this.seed);
        
        // Centro do mapa ainda é o ponto seguro principal
        const dist = Math.sqrt(col*col + row*row);
        const centerInfluence = Math.max(0, 1 - dist / 5);
        
        // Combina o ruído com a influência do centro
        const finalValue = biomeNoise + centerInfluence * 0.8;

        let biome = finalValue > 0.65 ? 'safe' : 'burned';

        const detailVar = rng();
        const offsetX = rng();
        const offsetY = rng();

        let object = null;
        if (biome === 'safe') {
            if (rng() > 0.93) object = 'flower';
        } else {
            if (rng() > 0.982) object = 'ember';
        }

        return { biome, object, detailVar, offsetX, offsetY };
    }
}
