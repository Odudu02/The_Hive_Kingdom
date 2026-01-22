/**
 * PRNG Determinístico para garantir que a mesma SEED gere o mesmo mapa para todos.
 */
export function createSeededRandom(seed) {
    let seedNum = 0;
    if (typeof seed === 'string') {
        for (let i = 0; i < seed.length; i++) {
            seedNum = (seedNum + seed.charCodeAt(i)) | 0;
        }
    } else { seedNum = seed; }
    
    return function() {
        var t = seedNum += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

export function biLerp(v00, v10, v01, v11, tx, ty) {
    return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
}

export function hash2d(x, y, seed) {
    const s = typeof seed === 'string' ? seed.length : seed;
    const val = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453123;
    return val - Math.floor(val);
}

/**
 * Gera um ruído suave interpolado.
 */
export function valueNoise(x, y, seed) {
    const iX = Math.floor(x);
    const iY = Math.floor(y);
    const fX = x - iX;
    const fY = y - iY;
    const sx = fX * fX * (3 - 2 * fX); // Smoothstep
    const sy = fY * fY * (3 - 2 * fY);

    const v00 = hash2d(iX, iY, seed);
    const v10 = hash2d(iX + 1, iY, seed);
    const v01 = hash2d(iX, iY + 1, seed);
    const v11 = hash2d(iX + 1, iY + 1, seed);

    return biLerp(v00, v10, v01, v11, sx, sy);
}

/**
 * Combina várias camadas de ruído (oitavas) para um visual orgânico.
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
