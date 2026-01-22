/**
 * Algoritmo PRNG (Pseudo-Random Number Generator) determinístico.
 * Mantido para garantir que a seed gere o mesmo mundo para todos.
 */
export function createSeededRandom(seed) {
    let seedNum = 0;
    if (typeof seed === 'string') {
        for (let i = 0; i < seed.length; i++) {
            seedNum = (seedNum + seed.charCodeAt(i)) | 0;
        }
    } else {
        seedNum = seed;
    }
    
    return function() {
        var t = seedNum += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

/**
 * Interpolação Linear (LERP)
 * Ajuda a suavizar transições de cores e posições.
 */
export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

/**
 * Função de Hash 2D para ruído orgânico.
 * Retorna um valor determinístico baseado em coordenadas X e Y.
 * Útil para criar bordas de biomas que não pareçam blocos.
 */
export function hash2d(x, y, seed) {
    const val = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return val - Math.floor(val);
}

/**
 * Função auxiliar para gerar IDs únicos (UUID)
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
