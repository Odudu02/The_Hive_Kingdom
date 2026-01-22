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
        this.draw(timestamp);

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
        this.ctx.fillStyle = '#111'; // Fundo mais profundo para destacar brasas
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
                
                // Dados únicos por tile usando a seed
                const tileData = this.getTileData(c, r);

                if (tileData.biome === 'safe') {
                    // Solo Verde com variação sutil de tom
                    this.ctx.fillStyle = tileData.detailVar > 0.7 ? '#2a7a3f' : '#2d8544';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Detalhes de Grama (Posição Aleatória dentro do tile)
                    if (tileData.detailVar > 0.4) {
                        const grassX = x + (tileData.offsetX * 40) + 10;
                        const grassY = y + (tileData.offsetY * 40) + 10;
                        
                        this.ctx.strokeStyle = '#3eb05d';
                        this.ctx.lineWidth = 1.5;
                        this.ctx.beginPath();
                        this.ctx.moveTo(grassX, grassY);
                        this.ctx.lineTo(grassX + 2, grassY - 5);
                        this.ctx.moveTo(grassX + 3, grassY);
                        this.ctx.lineTo(grassX + 5, grassY - 4);
                        this.ctx.stroke();
                    }
                } else {
                    // Solo Queimado com manchas de cinza e fuligem
                    const grayBase = 25 + (tileData.detailVar * 20);
                    this.ctx.fillStyle = `rgb(${grayBase}, ${grayBase}, ${grayBase})`;
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Manchas de fuligem orgânicas
                    if (tileData.detailVar < 0.4) {
                        const sootX = x + (tileData.offsetX * 30) + 15;
                        const sootY = y + (tileData.offsetY * 30) + 15;
                        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        this.ctx.beginPath();
                        this.ctx.arc(sootX, sootY, 8 + (tileData.detailVar * 10), 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // Objetos
                if (tileData.object === 'flower') {
                    if (this.assets['flower']) {
                        const fX = x + 8 + (tileData.offsetX * 8);
                        const fY = y + 8 + (tileData.offsetY * 8);
                        this.ctx.drawImage(this.assets['flower'], fX, fY, 48, 48);
                    }
                } 
                else if (tileData.object === 'ember') {
                    // Brasa pulsante independente baseada na seed e tempo
                    const individualPulse = (Math.sin((timestamp / 400) + (tileData.detailVar * 10)) + 1) / 2;
                    const glowSize = 3 + (individualPulse * 12);
                    const alpha = 0.4 + (individualPulse * 0.6);
                    
                    const emberX = x + 12 + (tileData.offsetX * 40);
                    const emberY = y + 12 + (tileData.offsetY * 40);

                    this.ctx.shadowColor = `rgba(255, 50, 0, ${alpha})`;
                    this.ctx.shadowBlur = glowSize;
                    this.ctx.fillStyle = `rgba(255, ${80 + (individualPulse * 120)}, 20, ${alpha})`;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(emberX, emberY, 2 + (individualPulse * 2), 0, Math.PI * 2);
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
        const val1 = rng(); // Variação de Bioma
        const val2 = rng(); // Escolha de Objeto
        const offsetX = rng(); // Posição X aleatória dentro do tile
        const offsetY = rng(); // Posição Y aleatória dentro do tile

        const dist = Math.sqrt(col*col + row*row);
        const noise = (val1 * 2.8); 
        const safeZoneRadius = 3.2;

        let biome = (dist < safeZoneRadius + noise) ? 'safe' : 'burned';

        let object = null;
        if (biome === 'safe') {
            if (val2 > 0.94) object = 'flower'; 
        } else {
            // Brasas raras para parecerem carvões quentes naturais
            if (val2 > 0.985) object = 'ember'; 
        }

        return { biome, object, detailVar: val1, offsetX, offsetY };
    }
}
