// RNG determinístico (Mesma seed = Mesmos números)
export function createSeededRandom(seed) {
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) {
        seedNum = (seedNum + seed.charCodeAt(i)) | 0;
    }
    return function() {
        var t = seedNum += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
