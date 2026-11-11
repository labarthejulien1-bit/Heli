// Petites fonctions utilitaires partagées (aucune dépendance au DOM).
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(n, seed = 0) {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u);
}
export function fbm(x, seed = 0, oct = 3) {
  let a = 0, amp = 0.5, fr = 1, s = 0;
  for (let i = 0; i < oct; i++) { a += noise1(x * fr, seed + i * 17) * amp; s += amp; amp *= 0.5; fr *= 2; }
  return a / s;
}

// Couleurs
const cache = new Map();
export function rgb(hex) {
  let c = cache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, c);
  }
  return c;
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
export function rgba(hex, a) { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
export function fmtTime(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m + ':' + String(r).padStart(2, '0');
}
