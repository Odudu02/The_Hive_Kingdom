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
        this.localPlayer = { x: 0, y: 0, speed: 300, facing: 'down', nickname: 'Abelha' };
        this.remotePlayers = new Map();
        this.particles = [];
        this.maxParticles = 120;
        this.isRunning = false;
        this.onPlayerMove = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async loadAssets() {
        const list = {
            'bee_idle': 'assets/BeeIdle.png', 'bee_up': 'assets/BeeUp.png',
            'bee_down': 'assets/BeeDown.png', 'bee_left': 'assets/BeeLeft.png',
            'bee_right': 'assets/BeeRight.png', 'flower': 'assets/Flower.png'
        };
        const promises = Object.keys(list).map(k => new Promise(res => {
            const img = new Image(); img.src = list[k];
            img.onload = () => { this.assets[k] = img; res(); };
            img.onerror = () => res();
        }));
        await Promise.all(promises);
    }

    init(seed, myId, nick) {
        this.seed = seed;
        this.myId = myId;
        this.localPlayer.nickname = nick;
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0, type: 'smoke' });
        }
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.update(dt, timestamp);
        this.draw(timestamp);
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, time) {
        const input = this.input.getState();
        if (input.isMoving) {
            this.localPlayer.x += input.x * this.localPlayer.speed * dt;
            this.localPlayer.y += input.y * this.localPlayer.speed * dt;
            this.localPlayer.facing = input.facing;
            if (this.onPlayerMove) this.onPlayerMove({
                x: Math.round(this.localPlayer.x), y: Math.round(this.localPlayer.y),
                facing: this.localPlayer.facing, nickname: this.localPlayer.nickname
            });
        }
        this.camera.x += (this.localPlayer.x - this.canvas.width/2 - this.camera.x) * 0.1;
        this.camera.y += (this.localPlayer.y - this.canvas.height/2 - this.camera.y) * 0.1;
        
        // Update Partículas
        this.particles.forEach(p => {
            if (p.life > 0) {
                p.life -= dt; p.y += p.vy * dt;
                p.x += Math.sin(time / 600 + p.size) * 0.4;
                if (p.type === 'smoke') p.size += dt * 4;
            } else { this.respawnParticle(p); }
        });
    }

    respawnParticle(p) {
        const rx = this.camera.x + Math.random() * this.canvas.width;
        const ry = this.camera.y + Math.random() * this.canvas.height;
        const tile = this.getTileData(Math.floor(rx/64), Math.floor(ry/64));
        if (tile.biome === 'burned') {
            p.x = rx; p.y = ry; p.life = 1 + Math.random();
            p.type = Math.random() > 0.8 ? 'soot' : 'smoke';
            p.vy = -20 - Math.random() * 20; p.size = 1.5;
        } else { p.life = 0; }
    }

    draw(timestamp) {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startCol = Math.floor(this.camera.x / 64);
        const endCol = startCol + (this.canvas.width / 64) + 1;
        const startRow = Math.floor(this.camera.y / 64);
        const endRow = startRow + (this.canvas.height / 64) + 1;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = c * 64 - this.camera.x;
                const y = r * 64 - this.camera.y;
                const tile = this.getTileData(c, r);

                if (tile.biome === 'safe') {
                    this.ctx.fillStyle = `rgb(40, ${110 + tile.detailVar * 30}, 60)`;
                } else {
                    const b = 20 + tile.detailVar * 20;
                    this.ctx.fillStyle = `rgb(${b}, ${b-2}, ${b-2})`;
                }
                this.ctx.fillRect(x, y, 65, 65); // 65 para evitar frestas

                if (tile.object === 'flower' && this.assets['flower']) {
                    this.ctx.drawImage(this.assets['flower'], x+8, y+8, 48, 48);
                } else if (tile.object === 'ember') {
                    const pulse = (Math.sin(timestamp/450 + tile.detailVar*20) + 1) / 2;
                    this.ctx.fillStyle = `rgba(255, ${100 + pulse*100}, 0, ${0.4 + pulse*0.6})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x + 10 + tile.offsetX*44, y + 10 + tile.offsetY*44, 2 + pulse*2, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }

        // Desenha Fumaça
        this.particles.forEach(p => {
            if (p.life > 0) {
                this.ctx.fillStyle = p.type === 'smoke' ? `rgba(100,100,100,${p.life*0.2})` : `rgba(0,0,0,${p.life*0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x - this.camera.x, p.y - this.camera.y, p.size, 0, Math.PI*2);
                this.ctx.fill();
            }
        });

        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(p, color) {
        const sx = p.x - this.camera.x, sy = p.y - this.camera.y;
        const sprite = this.assets[`bee_${p.facing}`] || this.assets['bee_idle'];
        if (sprite) this.ctx.drawImage(sprite, sx, sy, 64, 64);
        else { this.ctx.fillStyle = color; this.ctx.fillRect(sx, sy, 64, 64); }
        this.ctx.fillStyle = 'white'; this.ctx.font = 'bold 13px Arial';
        this.ctx.textAlign = 'center'; this.ctx.fillText(p.nickname, sx+32, sy-10);
    }

    getTileData(col, row) {
        const rng = createSeededRandom(`${this.seed}_${col}_${row}`);
        const noise = fractalNoise(col, row, 3, 0.5, 0.08, this.seed);
        const dist = Math.sqrt(col*col + row*row);
        const centerInf = Math.max(0, 1 - dist / 5);
        
        let biome = (noise + centerInf * 0.8) > 0.65 ? 'safe' : 'burned';
        let object = null;
        if (biome === 'safe' && rng() > 0.94) object = 'flower';
        else if (biome === 'burned' && rng() > 0.98) object = 'ember';

        return { biome, object, detailVar: rng(), offsetX: rng(), offsetY: rng() };
    }

    updateRemotePlayer(id, data) { this.remotePlayers.set(id, data); }
    removePlayer(id) { this.remotePlayers.delete(id); }
}
