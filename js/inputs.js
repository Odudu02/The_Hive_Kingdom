export default class InputHandler {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    getDirection() {
        let x = 0;
        let y = 0;
        let facing = null; // 'up', 'down', 'left', 'right'

        if (this.keys.ArrowLeft || this.keys.a) {
            x = -1;
            facing = 'left';
        }
        if (this.keys.ArrowRight || this.keys.d) {
            x = 1;
            facing = 'right';
        }
        if (this.keys.ArrowUp || this.keys.w) {
            y = -1;
            facing = 'up';
        }
        if (this.keys.ArrowDown || this.keys.s) {
            y = 1;
            facing = 'down';
        }

        // Normalização de vetor (evita andar mais rápido na diagonal)
        if (x !== 0 && y !== 0) {
            const factor = 1 / Math.sqrt(2);
            x *= factor;
            y *= factor;
        }

        return { x, y, facing, isMoving: x !== 0 || y !== 0 };
    }
}
