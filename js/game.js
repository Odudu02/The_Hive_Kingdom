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
            img.onerror = () => resolve();
        }));
        await Promise.all(promises);
    }

    init(seed, myId, nick) {
        this.seed = seed;
        this.localPlayer.nickname = nick;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    updateRemotePlayer(id, data) { this.remotePlayers.set(id, data); }
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
            if (this.onPlayerMove) this.onPlayerMove({
                x: Math.round(this.localPlayer.x),
                y: Math.round(this.localPlayer.y),
                facing: this.localPlayer.facing,
                nickname: this.localPlayer.nickname
            });
        }
        const tx = this.localPlayer.x - this.canvas.width / 2;
        const ty = this.localPlayer.y - this.canvas.height / 2;
        this.camera.x += (tx - this.camera.x) * 0.1;
        this.camera.y += (ty - this.camera.y) * 0.1;
    }

    draw() {
        // Efeito de pulsação para as brasas (varia entre 0.4 e 1.0)
        const emberPulse = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;

        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = c * this.tileSize - this.camera.x;
                const y = r * this.tileSize - this.camera.y;
                
                const tile = this.getTileData(c, r);

                // 1. CHÃO
                this.ctx.fillStyle = tile.biome === 'safe' ? '#2ea44f' : '#222';
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                // 2. DETALHES ORGÂNICOS DO CHÃO
                this.ctx.globalAlpha = 0.3;
                if (tile.biome === 'safe') {
                    this.ctx.fillStyle = '#1e7a3a';
                    // Simula fios de grama
                    this.ctx.fillRect(x + tile.noiseA * 40, y + tile.noiseB * 40, 2, 6);
                } else {
                    this.ctx.fillStyle = '#000';
                    // Simula manchas de cinza
                    this.ctx.beginPath();
                    this.ctx.arc(x + tile.noiseA * 50, y + tile.noiseB * 50, tile.noiseC * 5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1.0;

                // 3. OBJETOS (Flores ou Brasas)
                if (tile.object === 'flower') {
                    if (this.assets['flower']) this.ctx.drawImage(this.assets['flower'], x + 8, y + 8, 48, 48);
                } else if (tile.object === 'ember') {
                    // Render da brasa com pulsação
                    const size = 2 + tile.noiseC * 4;
                    this.ctx.shadowBlur = 15 * emberPulse;
                    this.ctx.shadowColor = `rgba(255, 69, 0, ${emberPulse})`;
                    this.ctx.fillStyle = `rgba(255, 140, 0, ${emberPulse})`;
                    this.ctx.fillRect(x + tile.noiseA * 50, y + tile.noiseB * 50, size, size);
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(p, color) {
        const sx = p.x - this.camera.x;
        const sy = p.y - this.camera.y;
        const k = `bee_${p.facing}`;
        const sprite = this.assets[k] || this.assets['bee_idle'];
        if (sprite) this.ctx.drawImage(sprite, sx, sy, 64, 64);
        else { this.ctx.fillStyle = color; this.ctx.fillRect(sx, sy, 64, 64); }
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.nickname || '?', sx + 32, sy - 10);
    }

    getTileData(c, r) {
        const rng = createSeededRandom(`${this.seed}_${c}_${r}`);
        const nA = rng(), nB = rng(), nC = rng();
        
        // Borda orgânica: Distância + ruído
        const dist = Math.sqrt(c * c + r * r);
        const borderNoise = (nA - 0.5) * 2.5; // Variação na borda
        const biome = (dist + borderNoise < 4) ? 'safe' : 'burned';

        let object = null;
        if (biome === 'safe' && nC > 0.92) object = 'flower';
        else if (biome === 'burned' && nC > 0.98) object = 'ember'; // Menos brasas (2% de chance)

        return { biome, object, noiseA: nA, noiseB: nB, noiseC: nC };
    }
}
