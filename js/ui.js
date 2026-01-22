export default class UI {
    constructor() {
        // Elementos de Tela
        this.screens = {
            login: document.getElementById('screen-login'),
            host: document.getElementById('screen-host'),
            join: document.getElementById('screen-join'),
            game: document.getElementById('screen-game')
        };

        // Inputs
        this.inputs = {
            nickname: document.getElementById('nickname'),
            hostId: document.getElementById('host-id'),
            hostPassword: document.getElementById('host-password'),
            hostSeed: document.getElementById('host-seed'),
            joinId: document.getElementById('join-id'),
            joinPassword: document.getElementById('join-password')
        };

        // Botões
        this.buttons = {
            toHost: document.getElementById('btn-goto-host'),
            toJoin: document.getElementById('btn-goto-join'),
            startHost: document.getElementById('btn-start-host'),
            backHost: document.getElementById('btn-back-host'),
            startJoin: document.getElementById('btn-start-join'),
            backJoin: document.getElementById('btn-back-join'),
            randomSeed: document.getElementById('btn-random-seed')
        };

        this.bindEvents();
    }

    // Gerenciador de Transição de Telas
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
            screen.classList.add('hidden');
        });

        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
            this.screens[screenName].classList.add('active');
        } else {
            console.error(`Tela ${screenName} não encontrada.`);
        }
    }

    bindEvents() {
        // Navegação Básica
        this.buttons.toHost.addEventListener('click', () => {
            if (!this.validateNickname()) return;
            this.showScreen('host');
        });

        this.buttons.toJoin.addEventListener('click', () => {
            if (!this.validateNickname()) return;
            this.showScreen('join');
        });

        this.buttons.backHost.addEventListener('click', () => this.showScreen('login'));
        this.buttons.backJoin.addEventListener('click', () => this.showScreen('login'));

        // Gerar Seed Aleatória
        this.buttons.randomSeed.addEventListener('click', () => {
            const randomSeed = Math.floor(Math.random() * 999999).toString();
            this.inputs.hostSeed.value = randomSeed;
        });
    }

    validateNickname() {
        const nick = this.inputs.nickname.value.trim();
        if (nick.length < 3) {
            alert("Por favor, escolha um nickname com pelo menos 3 caracteres.");
            return false;
        }
        return true;
    }

    // Getters para recuperar dados dos formulários
    getHostData() {
        return {
            nickname: this.inputs.nickname.value.trim(),
            sessionId: this.inputs.hostId.value.trim(),
            password: this.inputs.hostPassword.value.trim(),
            seed: this.inputs.hostSeed.value.trim() || Math.floor(Math.random() * 999999).toString()
        };
    }

    getJoinData() {
        return {
            nickname: this.inputs.nickname.value.trim(),
            targetSessionId: this.inputs.joinId.value.trim(),
            password: this.inputs.joinPassword.value.trim()
        };
    }
}
