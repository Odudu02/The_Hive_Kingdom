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
 * Interpolação Linear (LERP) e Bilinear
 */
export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

/**
 * biLerp: Interpolação entre 4 pontos em uma grade 2D.
 */
export function biLerp(v00, v10, v01, v11, tx, ty) {
    return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
}

/**
 * Hash 2D determinístico para Ruído
 */
export function hash2d(x, y, seed) {
    const s = typeof seed === 'string' ? seed.length : seed;
    const val = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453123;
    return val - Math.floor(val);
}

/**
 * Value Noise 2D
 * Gera um ruído suave baseado em uma grade de pontos.
 */
export function valueNoise(x, y, seed) {
    const iX = Math.floor(x);
    const iY = Math.floor(y);
    const fX = x - iX;
    const fY = y - iY;

    // Suavização da curva (Smoothstep) para evitar transições lineares "quebradas"
    const sx = fX * fX * (3 - 2 * fX);
    const sy = fY * fY * (3 - 2 * fY);

    // Valores nos cantos da célula da grade
    const v00 = hash2d(iX, iY, seed);
    const v10 = hash2d(iX + 1, iY, seed);
    const v01 = hash2d(iX, iY + 1, seed);
    const v11 = hash2d(iX + 1, iY + 1, seed);

    return biLerp(v00, v10, v01, v11, sx, sy);
}

/**
 * Fractal Noise (FBM - Fractal Brownian Motion)
 * Combina várias "oitavas" de ruído para criar detalhes naturais (nuvens, terrenos).
 */
export function fractalNoise(x, y, octaves, persistence, scale, seed) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        total += valueNoise(x * frequency, y * frequency, seed + i) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return total / maxValue;
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
