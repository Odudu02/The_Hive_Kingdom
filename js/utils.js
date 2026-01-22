/**
 * Algoritmo PRNG (Pseudo-Random Number Generator) determinístico.
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
 */
export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

/**
 * Hash 2D determinístico
 */
export function hash2d(x, y, seed) {
    // Transformamos a seed string em número caso necessário
    const s = typeof seed === 'string' ? seed.length : seed;
    const val = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453123;
    return val - Math.floor(val);
}

/**
 * Ruído Suave (Smooth Noise)
 * Analisa os vizinhos para criar transições naturais entre os detalhes do solo.
 */
export function smoothNoise(x, y, seed) {
    const corners = (hash2d(x-1, y-1, seed) + hash2d(x+1, y-1, seed) + hash2d(x-1, y+1, seed) + hash2d(x+1, y+1, seed)) / 16;
    const sides   = (hash2d(x-1, y, seed) + hash2d(x+1, y, seed) + hash2d(x, y-1, seed) + hash2d(x, y+1, seed)) /  8;
    const center  =  hash2d(x, y, seed) / 4;
    return corners + sides + center;
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
