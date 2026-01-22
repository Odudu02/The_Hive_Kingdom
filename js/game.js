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

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async loadAssets() {
        const list = {
            'bee_idle': 'assets/BeeIdle.png',
            'bee_up': 'assets/BeeUp.png',
            'bee_down': 'assets/BeeDown.png',
            'bee_left': 'assets/BeeLeft.png',
            'bee_right': 'assets/BeeRight.png',
            'flower': 'assets/Flower.png'
        };

        const promises = Object.keys(list).map(k => new Promise(resolve => {
            const img = new Image();
            img.src = list[k];
            img.onload = () => { this.assets[k] = img; resolve(); };
            img.onerror = () => { console.warn(`Asset faltante: ${k}`); resolve(); };
        }));

        await Promise.all(promises);
    }

    init(seed, myId, nick) {
        this.seed = seed;
        this.localPlayer.nickname = nick;
        this.rng = createSeededRandom(seed);
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    updateRemotePlayer(id, data) {
        if (id === this.myId) return;
        this.remotePlayers.set(id, data);
    }
    removePlayer(id) { this.remotePlayers.delete(id); }

    loop(t) {
        if (!this.isRunning) return;
        const dt = (t - this.lastTime) / 1000;
        this.lastTime = t;
        
        this.update(dt);
        this.draw();
        requestAnimationFrame(time => this.loop(time));
    }

    update(dt) {
        const input = this.input.getState();

        if (input.isMoving) {
            this.localPlayer.x += input.x * this.localPlayer.speed * dt;
            this.localPlayer.y += input.y * this.localPlayer.speed * dt;
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

        // Câmera segue player
        const tx = this.localPlayer.x - this.canvas.width / 2;
        const ty = this.localPlayer.y - this.canvas.height / 2;
        this.camera.x += (tx - this.camera.x) * 0.1;
        this.camera.y += (ty - this.camera.y) * 0.1;
    }

    draw() {
        // Fundo
        this.ctx.fillStyle = '#2ea44f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Mapa Procedural (Culling)
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;
        const ox = -this.camera.x + startCol * this.tileSize;
        const oy = -this.camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = (c - startCol) * this.tileSize + ox;
                const y = (r - startRow) * this.tileSize + oy;
                
                const seed = `${this.seed}_${c}_${r}`;
                const val = createSeededRandom(seed)();
                
                if (val > 0.90) {
                    if (this.assets['flower']) this.ctx.drawImage(this.assets['flower'], x, y, 64, 64);
                    else {
                        this.ctx.fillStyle = 'pink';
                        this.ctx.beginPath(); this.ctx.arc(x+32, y+32, 16, 0, 6.28); this.ctx.fill();
                    }
                }
            }
        }

        // Players Remotos
        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        // Player Local
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(p, color) {
        const sx = p.x - this.camera.x;
        const sy = p.y - this.camera.y;
        
        const k = `bee_${p.facing}`;
        const sprite = this.assets[k] || this.assets['bee_idle'];

        if (sprite) this.ctx.drawImage(sprite, sx, sy, 64, 64);
        else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(sx, sy, 64, 64);
        }

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.nickname || '?', sx+32, sy-10);
    }
}
