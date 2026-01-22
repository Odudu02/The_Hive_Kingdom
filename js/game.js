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
        this.localPlayer = { x: 0, y: 0, speed: 300, facing: 'down', nickname: 'Eu' };
        this.remotePlayers = new Map();
        
        // Estado do Mundo
        this.seed = null;
        this.rng = null;
        this.isRunning = false;
        
        // Callbacks
        this.onPlayerMove = null; 

        // Configuração visual
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
                img.onerror = () => { 
                    // Se não tiver imagem, não trava, usamos fallback de cores
                    resolve(); 
                };
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
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        // Input e Movimento
        const input = this.input.getState();

        if (input.isMoving) {
            this.localPlayer.x += input.x * this.localPlayer.speed * deltaTime;
            this.localPlayer.y += input.y * this.localPlayer.speed * deltaTime;
            this.localPlayer.facing = input.facing;

            // Envia dados para rede
            if (this.onPlayerMove) {
                this.onPlayerMove({
                    x: Math.round(this.localPlayer.x),
                    y: Math.round(this.localPlayer.y),
                    facing: this.localPlayer.facing,
                    nickname: this.localPlayer.nickname
                });
            }
        }

        // Câmera Suave
        const targetCamX = this.localPlayer.x - this.canvas.width / 2;
        const targetCamY = this.localPlayer.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
    }

    draw() {
        // Limpa a tela com uma cor base escura (caso algo falhe no render)
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- RENDER DO MAPA ---
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                // Posição na tela
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;

                // Determina o Bioma e o Objeto
                const tileData = this.getTileData(c, r);

                // 1. Desenha o Chão (Fundo)
                if (tileData.biome === 'safe') {
                    // Verde Grama
                    this.ctx.fillStyle = '#2ea44f'; 
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Detalhe de grama (pequenos riscos)
                    if (tileData.detailVar > 0.5) {
                        this.ctx.fillStyle = '#3Tb95e';
                        this.ctx.fillRect(x + 10, y + 10, 4, 4);
                        this.ctx.fillRect(x + 40, y + 30, 4, 4);
                    }

                } else {
                    // Cinza Queimado
                    this.ctx.fillStyle = '#2b2b2b'; 
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    
                    // Detalhe de cinzas/fuligem
                    this.ctx.fillStyle = '#1f1f1f';
                    this.ctx.fillRect(x + (tileData.detailVar * 50), y + (tileData.detailVar * 20), 8, 8);
                }

                // 2. Desenha o Objeto (Flor, Brasa, Pedra)
                if (tileData.object === 'flower') {
                    if (this.assets['flower']) {
                        this.ctx.drawImage(this.assets['flower'], x + 8, y + 8, 48, 48);
                    } else {
                        // Fallback Flor
                        this.ctx.fillStyle = '#ff69b4';
                        this.ctx.beginPath(); this.ctx.arc(x+32, y+32, 12, 0, Math.PI*2); this.ctx.fill();
                    }
                } 
                else if (tileData.object === 'ember') {
                    // Brasa brilhante
                    this.ctx.fillStyle = '#ff4500'; // Laranja avermelhado
                    this.ctx.shadowColor = '#ff4500';
                    this.ctx.shadowBlur = 10;
                    // Pequeno quadrado brilhante
                    this.ctx.fillRect(x + 20, y + 40, 6, 6);
                    this.ctx.shadowBlur = 0; // Reseta glow
                }
                else if (tileData.object === 'charcoal') {
                    // Pedra de carvão
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(x+32, y+40, 8, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }

        // --- RENDER DOS PLAYERS ---
        this.remotePlayers.forEach(p => this.drawPlayer(p, 'yellow'));
        this.drawPlayer(this.localPlayer, 'white');
    }

    drawPlayer(player, color) {
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;

        // Sprite
        let spriteKey = `bee_${player.facing}`;
        const sprite = this.assets[spriteKey] || this.assets['bee_idle'];

        if (sprite) {
            this.ctx.drawImage(sprite, screenX, screenY, 64, 64);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, 64, 64);
        }

        // Nickname
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(player.nickname || '?', screenX + 32, screenY - 10);
        this.ctx.shadowBlur = 0;
    }

    // --- LÓGICA DE GERAÇÃO PROCEDURAL ---
    
    getTileData(col, row) {
        // Gera seed única para este tile
        const localSeed = `${this.seed}_${col}_${row}`;
        const rng = createSeededRandom(localSeed);
        const val1 = rng(); // Para bioma/ruído
        const val2 = rng(); // Para objetos

        // 1. Definição do Bioma (Safe vs Burned)
        // Distância do centro (0,0) em coordenadas de Grid
        const dist = Math.sqrt(col*col + row*row);
        
        // Raio base de ~3.5 tiles (aprox 7 de diametro = area 6x6 com borda)
        // Adicionamos 'val1' como ruído (-1 a +1 virtualmente) para deixar a borda irregular
        const noise = (val1 * 2); 
        const maxRadius = 3.5 + noise; 

        let biome = 'burned';
        if (dist < maxRadius) {
            biome = 'safe';
        }

        // 2. Definição do Objeto baseada no Bioma
        let object = null;
        const detailVar = val1; // Usado para desenhar variações no chão

        if (biome === 'safe') {
            // No bioma seguro, nascem flores (15% chance)
            if (val2 > 0.85) object = 'flower';
        } else {
            // No bioma queimado
            // 5% chance de brasa
            if (val2 > 0.95) object = 'ember';
            // 10% chance de carvão
            else if (val2 > 0.85) object = 'charcoal';
        }

        return { biome, object, detailVar };
    }
}
