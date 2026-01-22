export default class InputHandler {
    constructor() {
        this.direction = { x: 0, y: 0, facing: 'down', isMoving: false };
        
        // Estado interno
        this.keys = {};
        this.touchData = { active: false, x: 0, y: 0, startX: 0, startY: 0 };
        
        // Elementos DOM Mobile
        this.joyZone = document.getElementById('joystick-zone');
        this.joyKnob = document.getElementById('joystick-knob');
        this.actionBtn = document.getElementById('action-button');
        
        // Configuração Joystick
        this.maxRadius = 35; 

        // Estado do botão de ação
        this.actionPressed = false;

        this.initKeyboard();
        this.initTouch();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.code === 'Space') this.actionPressed = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            if (e.code === 'Space') this.actionPressed = false;
        });
    }

    initTouch() {
        if (!this.joyZone) return;

        // --- Joystick ---
        this.joyZone.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Impede scroll
            const touch = e.changedTouches[0];
            const rect = this.joyZone.getBoundingClientRect();
            
            this.touchData.startX = rect.left + rect.width / 2;
            this.touchData.startY = rect.top + rect.height / 2;
            this.touchData.active = true;
            
            this.updateJoystickVisual(touch.clientX, touch.clientY);
        }, { passive: false });

        this.joyZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchData.active) return;
            const touch = e.changedTouches[0];
            this.updateJoystickVisual(touch.clientX, touch.clientY);
        }, { passive: false });

        this.joyZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.resetJoystick();
        });

        // --- Botão de Ação ---
        if (this.actionBtn) {
            this.actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.actionPressed = true;
                this.actionBtn.style.background = 'white';
                this.actionBtn.style.color = 'black';
            }, { passive: false });

            this.actionBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.actionPressed = false;
                this.actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                this.actionBtn.style.color = 'white';
            });
        }
    }

    updateJoystickVisual(clientX, clientY) {
        let dx = clientX - this.touchData.startX;
        let dy = clientY - this.touchData.startY;
        
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance > this.maxRadius) {
            const ratio = this.maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        this.touchData.x = dx / this.maxRadius;
        this.touchData.y = dy / this.maxRadius;
    }

    resetJoystick() {
        this.touchData.active = false;
        this.touchData.x = 0;
        this.touchData.y = 0;
        this.joyKnob.style.transform = `translate(-50%, -50%)`;
    }

    getState() {
        let x = 0;
        let y = 0;

        // 1. Joystick (Prioridade)
        if (this.touchData.active) {
            x = this.touchData.x;
            y = this.touchData.y;
        } 
        // 2. Teclado
        else {
            if (this.keys['ArrowLeft'] || this.keys['a']) x -= 1;
            if (this.keys['ArrowRight'] || this.keys['d']) x += 1;
            if (this.keys['ArrowUp'] || this.keys['w']) y -= 1;
            if (this.keys['ArrowDown'] || this.keys['s']) y += 1;

            if (x !== 0 || y !== 0) {
                const len = Math.sqrt(x*x + y*y);
                x /= len;
                y /= len;
            }
        }

        const isMoving = Math.abs(x) > 0.1 || Math.abs(y) > 0.1;

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
        this.direction.action = this.actionPressed;

        return this.direction;
    }
}
