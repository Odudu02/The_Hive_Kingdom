export default class InputHandler {
    constructor() {
        this.direction = { x: 0, y: 0, facing: 'down', isMoving: false };
        
        // Estado interno
        this.keys = {};
        this.touchData = { active: false, x: 0, y: 0, startX: 0, startY: 0 };
        
        // Elementos DOM Mobile
        this.joyZone = document.getElementById('joystick-zone');
        this.joyKnob = document.getElementById('joystick-knob');
        
        // Configuração Joystick
        this.maxRadius = 35; // Raio máximo que o botão se move

        this.initKeyboard();
        this.initTouch();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    initTouch() {
        if (!this.joyZone) return;

        // Início do Toque
        this.joyZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = this.joyZone.getBoundingClientRect();
            
            // Centro do joystick
            this.touchData.startX = rect.left + rect.width / 2;
            this.touchData.startY = rect.top + rect.height / 2;
            this.touchData.active = true;
            
            this.updateJoystickVisual(touch.clientX, touch.clientY);
        }, { passive: false });

        // Movimento
        this.joyZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchData.active) return;
            const touch = e.changedTouches[0];
            this.updateJoystickVisual(touch.clientX, touch.clientY);
        }, { passive: false });

        // Fim
        this.joyZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.resetJoystick();
        });
    }

    updateJoystickVisual(clientX, clientY) {
        // Cálculo do vetor (Mouse - Centro)
        let dx = clientX - this.touchData.startX;
        let dy = clientY - this.touchData.startY;
        
        // Distância
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // Normalização se passar do raio máximo
        if (distance > this.maxRadius) {
            const ratio = this.maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        // Move o Knob visualmente
        this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Calcula vetor normalizado para o jogo (-1 a 1)
        this.touchData.x = dx / this.maxRadius;
        this.touchData.y = dy / this.maxRadius;
    }

    resetJoystick() {
        this.touchData.active = false;
        this.touchData.x = 0;
        this.touchData.y = 0;
        // Reseta visual
        this.joyKnob.style.transform = `translate(-50%, -50%)`;
    }

    // Função principal chamada pelo Game Loop
    getDirection() {
        let x = 0;
        let y = 0;

        // 1. Verifica Joystick Virtual (Prioridade se estiver ativo)
        if (this.touchData.active) {
            x = this.touchData.x;
            y = this.touchData.y;
        } 
        // 2. Verifica Teclado (Fallback)
        else {
            if (this.keys['ArrowLeft'] || this.keys['a']) x -= 1;
            if (this.keys['ArrowRight'] || this.keys['d']) x += 1;
            if (this.keys['ArrowUp'] || this.keys['w']) y -= 1;
            if (this.keys['ArrowDown'] || this.keys['s']) y += 1;

            // Normaliza teclado
            if (x !== 0 || y !== 0) {
                const len = Math.sqrt(x*x + y*y);
                x /= len;
                y /= len;
            }
        }

        const isMoving = Math.abs(x) > 0.1 || Math.abs(y) > 0.1;

        // Define para onde está olhando
        if (Math.abs(x) > Math.abs(y)) {
            if (x > 0) this.direction.facing = 'right';
            else if (x < 0) this.direction.facing = 'left';
        } else if (isMoving) {
            if (y > 0) this.direction.facing = 'down';
            else if (y < 0) this.direction.facing = 'up';
        }

        this.direction.x = x;
        this.direction.y = y;
        this.direction.isMoving = isMoving;

        return this.direction;
    }
}
