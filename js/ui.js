export default class UI {
    constructor() {
        this.screens = {
            login: document.getElementById('screen-login'),
            host: document.getElementById('screen-host'),
            join: document.getElementById('screen-join'),
            game: document.getElementById('screen-game')
        };

        this.inputs = {
            nickname: document.getElementById('nickname'),
            hostId: document.getElementById('host-id'),
            hostPassword: document.getElementById('host-password'),
            hostSeed: document.getElementById('host-seed'),
            joinId: document.getElementById('join-id'),
            joinPassword: document.getElementById('join-password')
        };

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

    showScreen(name) {
        Object.values(this.screens).forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        if (this.screens[name]) {
            this.screens[name].classList.remove('hidden');
            this.screens[name].classList.add('active');
        }
    }

    bindEvents() {
        this.buttons.toHost.addEventListener('click', () => {
            if (this.validateNick()) this.showScreen('host');
        });
        this.buttons.toJoin.addEventListener('click', () => {
            if (this.validateNick()) this.showScreen('join');
        });

        this.buttons.backHost.addEventListener('click', () => this.showScreen('login'));
        this.buttons.backJoin.addEventListener('click', () => this.showScreen('login'));

        this.buttons.randomSeed.addEventListener('click', () => {
            this.inputs.hostSeed.value = Math.random().toString(36).substring(7);
        });
    }

    validateNick() {
        if (this.inputs.nickname.value.trim().length < 3) {
            alert("Nickname deve ter pelo menos 3 letras.");
            return false;
        }
        return true;
    }

    getHostData() {
        return {
            nickname: this.inputs.nickname.value.trim(),
            sessionId: this.inputs.hostId.value.trim(),
            // Proteção contra campo nulo
            password: this.inputs.hostPassword ? this.inputs.hostPassword.value : "",
            seed: this.inputs.hostSeed.value.trim() || "mundo1"
        };
    }

    getJoinData() {
        return {
            nickname: this.inputs.nickname.value.trim(),
            targetSessionId: this.inputs.joinId.value.trim(),
            password: this.inputs.joinPassword ? this.inputs.joinPassword.value : ""
        };
    }
}
