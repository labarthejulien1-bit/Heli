// Construit un niveau Heli Rescue à partir de sa description (js/rescuelevels.js).
// Le résultat a la même forme qu'un niveau Aventure (js/levelgen.js) : le moteur de vol, les collisions
// et le rendu existants s'en servent sans modification.
import { rng, clamp, lerp, fbm } from './util.js';
import { STEP, TREE } from './levelgen.js';
import { makeHazard, makeFloe } from './rescuehazards.js';

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
  const flats = [{ x: cfg.base.x, w: 150 }, ...cfg.victims.filter((v) => !v.floe && !v.dock && !v.onWater).map((v) => ({ x: v.x, w: v.zoneWidth })), ...(cfg.props || []).filter((p) => p.w).map((p) => ({ x: p.x, w: p.w }))];
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
  // Eau : niveau qui peut monter avec le temps
  const W = cfg.water, waterAt = W ? (t) => Math.max(W.max ?? W.y, W.y - (W.rise || 0) * t) : null;
  const docks = [];
  const builds = (cfg.props || []).filter((p) => p.type === 'house').map((p) => ({ x: p.x, w: p.w, h: p.h }));
  const pads = [{ x: cfg.base.x, y: groundAt(cfg.base.x), w: 150, kind: 'fuel', base: true, main: true }];
  const victims = cfg.victims.map((v) => {
    let zone = pads.findIndex((p) => p.kind === 'zone' && Math.abs(p.x - v.x) < 1);
    if (zone < 0) {
      // v.roof : la zone est le toit d'une maison de cette hauteur (sinon elle est à même le sol)
      // v.floe : la zone est une plaque de glace qui dérive sur l'eau entre x0 et x1
      // v.dock : ponton posé sur l'eau ; v.onWater : zone à la surface même de l'eau (amphibies seulement)
      const y = v.floe ? cfg.water.y - 12 : v.dock ? cfg.water.y - 9 : v.onWater ? cfg.water.y : groundAt(v.x) - (v.roof || 0);
      if (v.roof) builds.push({ x: v.x, w: v.zoneWidth + 8, h: v.roof });
      const pad = { x: v.x, y, w: v.zoneWidth, kind: 'zone', water: !!v.onWater };
      if (v.dock) docks.push(pad);
      if (v.floe && v.floe.bob) { const y0 = y, f = v.floe; pad.bob = (t) => y0 + Math.sin(t * 1.7) * f.bob; } // radeau soulevé par les vagues
      if (v.floe) { const f = v.floe, span = f.x1 - f.x0; pad.floe = f; pad.x0 = v.x; pad.move = (t) => { const u = ((t * f.speed) / span + (v.x - f.x0) / span) % 2; return f.x0 + span * (u < 1 ? u : 2 - u); }; }
      pads.push(pad); zone = pads.length - 1;
    }
    // la victime attend sur le bord de la zone, à l'intérieur (plusieurs victimes s'y alignent)
    const side = v.side || 1, n = cfg.victims.filter((o) => o.x === v.x && cfg.victims.indexOf(o) < cfg.victims.indexOf(v)).length;
    const sx = v.x + side * (v.zoneWidth / 2 - 9 - n * 15);
    return { ...v, zone, x: sx, off: sx - v.x, y: pads[zone].y, size: v.size || (v.type === 'person' ? 'person' : 'small') };
  });
  pads.forEach((p, i) => { p.i = i; });

  // --- Maisons (décor ou toit servant de zone de pose), puis arbres clairsemés, jamais sur un replat
  const obs = [];
  for (const p of cfg.props || []) if (p.type === 'lighthouse') { const g = groundAt(p.x), top = g - p.h; obs.push({ kind: 'pillar', st: 'lighthouse', x: p.x, y: top, w: p.w, h: p.h + 24, shapes: [{ p: rectPoly(p.x - p.w / 2, top, p.w, p.h + 24) }], minX: p.x - p.w / 2, maxX: p.x + p.w / 2, v: R() }); }
  for (const b of builds) { const g = groundAt(b.x), top = g - b.h; obs.push({ kind: 'pillar', st: 'house', x: b.x, y: top, w: b.w, h: b.h + 24, shapes: [{ p: rectPoly(b.x - b.w / 2, top, b.w, b.h + 24) }], minX: b.x - b.w / 2, maxX: b.x + b.w / 2, v: R() }); }
  if (cfg.trees) {
    for (let x = 120 + rand(0, 80); x < LEN - 80; x += rand(cfg.trees.every[0], cfg.trees.every[1])) {
      if (flats.some((f) => Math.abs(x - f.x) < f.w / 2 + 70) || (cfg.props || []).some((p) => p.type === 'vine' && Math.abs(x - p.x) < 130)) continue;
      if (waterAt && groundAt(x) > waterAt(0) - 6) continue; // pas d'arbre dans l'eau
      const st = pick(cfg.look.theme.tree), K = TREE[st], g = groundAt(x), h = rand(K.h[0], K.h[1]) * (cfg.trees.scale || 1);
      const w = clamp(h * K.wr, K.wmin || 10, K.wmax || 90), top = g - h;
      const shapes = K.sh === 'tri' ? [{ p: [x - w / 2, g + 30, x, top, x + w / 2, g + 30] }]
        : K.sh === 'lol' ? [{ p: rectPoly(x - 3, top + w / 2, 6, h) }, { c: [x, top + w / 2, w / 2] }] : [{ p: rectPoly(x - w / 2, top, w, h + 30) }];
      obs.push({ kind: 'tree', st, x, y: top, w, h, g, shapes, minX: x - w / 2, maxX: x + w / 2, v: R() });
    }
  }
  // --- Eau (niveau qui peut monter avec le temps), rafales périodiques, dangers animés
  const gusts = (cfg.hazards || []).filter((h) => h.type === 'gust');
  const shell = { groundAt, waterAt };
  for (const hz of cfg.hazards || []) { const o = makeHazard(hz, shell); if (o) { o.v = R(); obs.push(o); } }
  for (const p of pads) if (p.floe) obs.push(makeFloe(p, shell));
  for (const p of docks) { // ponton : un platelage sur pilotis, sur lequel tout appareil peut se poser
    const w = p.w + 20;
    obs.push({ kind: 'hazard', x: p.x, shapes: [{ p: rectPoly(p.x - w / 2, p.y, w, 9) }], minX: p.x - w / 2, maxX: p.x + w / 2,
      draw(c) { c.fillStyle = '#5f4329'; for (const q of [-w / 2 + 6, 0, w / 2 - 8]) c.fillRect(p.x + q, p.y + 6, 4, 46); c.fillStyle = '#8a6a4a'; c.fillRect(p.x - w / 2, p.y, w, 8); c.fillStyle = '#6f5238'; for (let k = 0; k < w; k += 13) c.fillRect(p.x - w / 2 + k, p.y, 1.5, 8); } });
  }
  // lianes pendantes (décor qui gêne : il faut passer dessous)
  for (const p of cfg.props || []) if (p.type === 'vine') obs.push({ kind: 'hang', st: 'vine', x: p.x, y: p.len, w: 16, shapes: [{ p: rectPoly(p.x - 8, -80, 16, p.len + 80) }], minX: p.x - 8, maxX: p.x + 8, v: R() });
  // ascendances thermiques, front de feu, répliques
  const zones = (cfg.hazards || []).filter((h) => h.type === 'thermal').map((h) => ({ x: h.x, w: h.w, y0: 30, y1: 760, fx: 0, fy: h.fy }));
  const fire = (cfg.hazards || []).find((h) => h.type === 'firefront') || null, quake = (cfg.hazards || []).find((h) => h.type === 'quake') || null;
  const smoke = (cfg.hazards || []).find((h) => h.type === 'smoke') || null;
  obs.sort((p, q) => p.minX - q.minX);

  // --- Altitude de croisière (pour le pilote automatique) : au-dessus du relief et des arbres alentour
  const cruise = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let m = 1e9;
    for (let k = Math.max(0, i - 18); k <= Math.min(N - 1, i + 18); k++) m = Math.min(m, ground[k]);
    for (const o of obs) if (o.kind !== 'hang' && o.y != null && Math.abs(o.x - i * STEP) < 110) m = Math.min(m, o.y);
    if (waterAt) m = Math.min(m, waterAt(0));
    cruise[i] = Math.max(70, m - 105);
    for (const o of obs) if (o.kind === 'hang' && Math.abs(o.x - i * STEP) < 70) cruise[i] = Math.max(cruise[i], o.y + 48); // passer sous les lianes
  }

  const look = cfg.look;
  return {
    def: { ...look, id: 100 + cfg.n, seed: cfg.seed, mod: cfg.mod || {}, objectives: [] },
    rescue: { cfg, victims, base: pads[0] }, twoWay: true, decor: (cfg.props || []).filter((p) => p.type === 'cow'), waterAt, gusts,
    length: LEN, secs: [], obs, items: [], zones, fire, quake, smoke, pads, tank: cfg.tank, tunnels: [], traffic: [],
    ground, ceil, groundAt, ceilAt: samp(ceil), pathAt: samp(cruise), gapAt: () => 240, groundSlope: slope(ground), ceilSlope: slope(ceil),
    startX: cfg.base.x, pad: pads[0], orbTotal: 0, starTotal: 0,
  };
}
