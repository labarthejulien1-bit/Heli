// Construit un niveau Heli Rescue à partir de sa description (js/rescuelevels.js).
// Le résultat a la même forme qu'un niveau Aventure (js/levelgen.js) : le moteur de vol, les collisions
// et le rendu existants s'en servent sans modification.
import { rng, clamp, lerp, fbm } from './util.js';
import { STEP, TREE } from './levelgen.js';

const rectPoly = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];

export function buildRescueLevel(cfg) {
  const R = rng(cfg.seed), rand = (a, b) => a + (b - a) * R(), pick = (a) => a[(R() * a.length) | 0];
  const LEN = cfg.worldLength, N = Math.ceil(LEN / STEP) + 2;

  // --- Relief : courbe passant par les points donnés, plus une légère irrégularité
  const ground = new Float32Array(N), ceil = new Float32Array(N).fill(-320), T = cfg.terrain;
  let j = 0;
  for (let i = 0; i < N; i++) {
    const x = i * STEP;
    while (j < T.length - 2 && x > T[j + 1][0]) j++;
    const a = T[j], b = T[j + 1], t = clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
    ground[i] = lerp(a[1], b[1], (1 - Math.cos(Math.PI * t)) / 2) + (fbm(x / 60, cfg.seed) - 0.5) * 2 * (cfg.rough || 0);
  }
  // Replats : la base et chaque zone de pose sont aplanies (raccord progressif sur 40 unités)
  const flats = [{ x: cfg.base.x, w: 150 }, ...cfg.victims.map((v) => ({ x: v.x, w: v.zoneWidth }))];
  for (const f of flats) {
    const yc = ground[Math.round(f.x / STEP)], half = f.w / 2 + 14;
    for (let i = Math.max(0, Math.floor((f.x - half - 40) / STEP)); i <= Math.min(N - 1, Math.ceil((f.x + half + 40) / STEP)); i++) {
      const d = Math.abs(i * STEP - f.x), k = clamp((half + 40 - d) / 40, 0, 1);
      ground[i] = lerp(ground[i], yc, k * k * (3 - 2 * k));
    }
  }
  const samp = (arr) => (x) => { const f = clamp(x / STEP, 0, N - 1.001), i = f | 0; return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
  const slope = (arr) => (x) => { const i = clamp((x / STEP) | 0, 0, N - 2); return (arr[i + 1] - arr[i]) / STEP; };
  const groundAt = samp(ground);

  // --- Héliports : la base (plein, réparation, débarquement), puis une zone de pose par victime
  const pads = [{ x: cfg.base.x, y: groundAt(cfg.base.x), w: 150, kind: 'fuel', base: true, main: true }];
  const victims = cfg.victims.map((v) => {
    let zone = pads.findIndex((p) => p.kind === 'zone' && Math.abs(p.x - v.x) < 1);
    if (zone < 0) { pads.push({ x: v.x, y: groundAt(v.x), w: v.zoneWidth, kind: 'zone' }); zone = pads.length - 1; }
    const side = v.side || 1, n = cfg.victims.filter((o) => o.x === v.x && cfg.victims.indexOf(o) < cfg.victims.indexOf(v)).length;
    const sx = v.x + side * (v.zoneWidth / 2 + 16 + n * 16);
    return { ...v, zone, x: sx, y: groundAt(sx), size: v.size || (v.type === 'person' ? 'person' : 'small') };
  });
  pads.forEach((p, i) => { p.i = i; });

  // --- Arbres clairsemés, jamais sur un replat
  const obs = [];
  if (cfg.trees) {
    for (let x = 120 + rand(0, 80); x < LEN - 80; x += rand(cfg.trees.every[0], cfg.trees.every[1])) {
      if (flats.some((f) => Math.abs(x - f.x) < f.w / 2 + 70)) continue;
      const st = pick(cfg.look.theme.tree), K = TREE[st], g = groundAt(x), h = rand(K.h[0], K.h[1]) * (cfg.trees.scale || 1);
      const w = clamp(h * K.wr, K.wmin || 10, K.wmax || 90), top = g - h;
      const shapes = K.sh === 'tri' ? [{ p: [x - w / 2, g + 30, x, top, x + w / 2, g + 30] }]
        : K.sh === 'lol' ? [{ p: rectPoly(x - 3, top + w / 2, 6, h) }, { c: [x, top + w / 2, w / 2] }] : [{ p: rectPoly(x - w / 2, top, w, h + 30) }];
      obs.push({ kind: 'tree', st, x, y: top, w, h, g, shapes, minX: x - w / 2, maxX: x + w / 2, v: R() });
    }
  }
  obs.sort((p, q) => p.minX - q.minX);

  // --- Altitude de croisière (pour le pilote automatique) : au-dessus du relief et des arbres alentour
  const cruise = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let m = 1e9;
    for (let k = Math.max(0, i - 18); k <= Math.min(N - 1, i + 18); k++) m = Math.min(m, ground[k]);
    for (const o of obs) if (Math.abs(o.x - i * STEP) < 110) m = Math.min(m, o.y);
    cruise[i] = Math.max(70, m - 105);
  }

  const look = cfg.look;
  return {
    def: { ...look, id: 100 + cfg.n, seed: cfg.seed, mod: cfg.mod || {}, objectives: [] },
    rescue: { cfg, victims, base: pads[0] }, twoWay: true,
    length: LEN, secs: [], obs, items: [], zones: [], pads, tank: cfg.tank, tunnels: [], traffic: [],
    ground, ceil, groundAt, ceilAt: samp(ceil), pathAt: samp(cruise), gapAt: () => 240, groundSlope: slope(ground), ceilSlope: slope(ceil),
    startX: cfg.base.x, pad: pads[0], orbTotal: 0, starTotal: 0,
  };
}
