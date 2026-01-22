import { createSeededRandom } from './utils.js';

export default class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurações do Mundo
        this.tileSize = 64; // Tamanho de cada quadrado do grid (px)
        this.seed = null;
        this.rng = null; // Random Number Generator

        // Câmera (Focada no 0,0 inicial)
        this.camera = { x: 0, y: 0 };
        
        // Estado do Jogo
        this.isRunning = false;
        this.assets = {};
        
        // Loop de animação
        this.lastTime = 0;

        // Ajusta o canvas para tela cheia
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
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = imageList[key];
                img.onload = () => {
                    this.assets[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Erro ao carregar imagem: ${imageList[key]}`);
                    // Resolve mesmo com erro para não travar o jogo (usa placeholder dps se precisar)
                    resolve(); 
                };
            });
        });

        await Promise.all(promises);
        console.log('[GAME] Todos os assets carregados.');
    }

    init(seed) {
        this.seed = seed;
        // Inicializa o gerador aleatório com a seed recebida do Host
        this.rng = createSeededRandom(this.seed);
        
        console.log(`[GAME] Mundo inicializado com Seed: ${this.seed}`);
        
        this.isRunning = true;
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        // Futuro: Lógica de movimento da abelha e inputs
        // Por enquanto a câmera está fixa em 0,0
    }

    draw() {
        // Limpa a tela
        this.ctx.fillStyle = '#2ea44f'; // Cor base de grama
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- RENDERIZAÇÃO DO MAPA (Procedural) ---
        // Calcula quais tiles estão visíveis na tela baseada na câmera
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        // Offset para rolagem suave
        const offsetX = -this.camera.x + startCol * this.tileSize;
        const offsetY = -this.camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                // Posição determinística baseada na coordenada (X, Y)
                // Isso garante que o tile (10,10) seja sempre o mesmo
                const tileType = this.getTileType(c, r);
                
                const x = (c - startCol) * this.tileSize + offsetX;
                const y = (r - startRow) * this.tileSize + offsetY;

                this.drawTile(tileType, x, y);
            }
        }

        // Desenha o Player (Centro da tela por enquanto)
        const centerX = this.canvas.width / 2 - 32; // 32 é metade do tile (64)
        const centerY = this.canvas.height / 2 - 32;
        if (this.assets['bee_idle']) {
            this.ctx.drawImage(this.assets['bee_idle'], centerX, centerY, 64, 64);
        }
    }

    // Decide o que existe na coordenada X, Y do mundo usando a SEED
    getTileType(x, y) {
        // Criamos um "hash" da posição combinado com a seed global
        // Isso é um truque para gerar aleatoriedade local sem mudar o estado global do RNG
        // Se usássemos this.rng() direto, a ordem de renderização afetaria o mapa
        
        const localSeed = `${this.seed}_${x}_${y}`;
        const randomValue = createSeededRandom(localSeed)();

        if (randomValue > 0.90) return 'flower'; // 10% de chance de flor
        if (randomValue > 0.85) return 'stone';  // 5% de chance de pedra (futuro)
        return 'grass';
    }

    drawTile(type, x, y) {
        // Desenha borda do grid (debug/estilo tático)
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);

        if (type === 'flower' && this.assets['flower']) {
            this.ctx.drawImage(this.assets['flower'], x + 8, y + 8, 48, 48);
        }
        // Se for grass, já pintamos o fundo de verde
    }
}
