// Algoritmo Mulberry32 - Simples, rápido e determinístico para seeds
export function createSeededRandom(seed) {
    // Transforma a string da seed em um número inteiro (hash simples)
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) {
        seedNum = (seedNum + seed.charCodeAt(i)) | 0; // Bitwise OR 0 para garantir inteiro
    }

    // Retorna uma função que gera números entre 0 e 1 baseados na seed
    return function() {
        var t = seedNum += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// Função para gerar ID único (UUID simples) para entidades
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
