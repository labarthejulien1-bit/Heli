// Génération procédurale déterministe des niveaux.
// Principe : on trace d'abord un couloir de vol garanti (trajectoire + largeur),
// puis le relief et les obstacles sont posés autour, jamais dedans.
import { rng, clamp, lerp, fbm, TAU } from './util.js';

export const WORLD_H = 800;
export const STEP = 8;

const SPEC = {
  open: { dx: 420, lo: 380, hi: 520, dy: 90, hug: 0, gap: 240 },
  cp: { dx: 420, lo: 400, hi: 480, dy: 40, hug: 0, gap: 250, len: 440 },
  hills: { dx: 330, lo: 230, hi: 560, dy: 210, hug: 1 },
  peaks: { dx: 310, alt: 1, hi: 560, hug: 1 },
  forest: { dx: 300, lo: 330, hi: 540, dy: 150, hug: 0.5 },
  towers: { dx: 260, lo: 220, hi: 540, dy: 170, hug: 0 },
  gates: { dx: 290, lo: 190, hi: 560, dy: 150, hug: 0 },
  cave: { dx: 270, lo: 230, hi: 560, dy: 140, hug: 1, ceil: 1, gapAdd: 16 },
  movers: { dx: 450, lo: 340, hi: 470, dy: 60, hug: 0, gap: 210 },
  mills: { dx: 420, lo: 260, hi: 400, dy: 80, hug: 0 },
  geysers: { dx: 450, lo: 350, hi: 500, dy: 60, hug: 0.15, gap: 210 },
  wind: { dx: 340, lo: 250, hi: 550, dy: 170, hug: 0.7 },
};
const TREE = {
  pine: { h: [70, 190], wr: 0.42, sh: 'tri' },
  round: { h: [70, 160], wr: 0.5, sh: 'lol', wmax: 70 },
  cactus: { h: [45, 120], wr: 0.22, sh: 'col', wmin: 12, wmax: 22 },
  palm: { h: [90, 170], wr: 0.45, sh: 'lol', wmax: 64 },
  bamboo: { h: [110, 260], wr: 0.1, sh: 'col', wmin: 14, wmax: 22 },
  dead: { h: [50, 140], wr: 0.3, sh: 'tri' },
  crystal: { h: [45, 160], wr: 0.36, sh: 'tri' },
  antenna: { h: [70, 200], wr: 0.06, sh: 'col', wmin: 8, wmax: 10 },
};

function blur(a, r) {
  const n = a.length, out = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    let s = 0;
    for (let i = -r; i <= r; i++) s += a[clamp(i, 0, n - 1)];
    for (let i = 0; i < n; i++) {
      out[i] = s / (2 * r + 1);
      s += a[clamp(i + r + 1, 0, n - 1)] - a[clamp(i - r, 0, n - 1)];
    }
    a.set(out);
  }
}
const rectPoly = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];

export function generateLevel(def) {
  const R = rng(def.seed), rand = (a, b) => a + (b - a) * R(), pick = (a) => a[(R() * a.length) | 0];
  const secs = [];
  let X = 0;
  const add = (type, d, len) => { secs.push({ type, d, x0: X, x1: X + len, kp: [] }); X += len; };
  add('start', 1, 520);
  const list = def.sections.trim().split(/\s+/).map((s) => { const [a, b] = s.split(':'); return [a, +b || 1]; });
  const cpAt = [Math.round(list.length / 3), Math.round((list.length * 2) / 3)];
  list.forEach(([ty, d], i) => {
    if (cpAt.includes(i)) add('cp', 1, 440);
    add(ty, d, 1100 * (def.lenScale || 1) * rand(0.92, 1.08));
  });
  add('end', 1, 780);
  const LEN = X, N = Math.ceil(LEN / STEP) + 2;
  const gapOf = (s) => {
    const sp = SPEC[s.type];
    if (!sp) return 250;
    return sp.gap || 236 - 22 * s.d + (sp.gapAdd || 0);
  };

  // --- 1. Points clés de la trajectoire
  const kp = [{ x: -60, y: 600 }, { x: 260, y: 590 }, { x: 500, y: 470 }];
  let py = 470, px = 500, up = false;
  for (const s of secs) {
    if (s.type === 'start') continue;
    if (s.type === 'end') {
      kp.push({ x: s.x0 + 130, y: 440 }, { x: s.x1 - 470, y: 560 }, { x: s.x1 - 300, y: 640 }, { x: LEN + 60, y: 640 });
      continue;
    }
    const sp = SPEC[s.type], g = gapOf(s);
    const lo = Math.max(sp.lo || 0, g / 2 + 56), hi = Math.min(sp.hi || 999, 655 - g / 2);
    let x = s.x0 + sp.dx * 0.5;
    while (x < s.x1 - sp.dx * 0.35) {
      let y;
      if (sp.alt) { up = !up; y = up ? rand(lo, lo + 70) : rand(hi - 110, hi); }
      else {
        const dy = sp.dy * (0.7 + 0.1 * s.d);
        y = py + (R() < 0.5 ? -1 : 1) * rand(dy * 0.4, dy);
        if (y < lo || y > hi) y = py - (y - py);
        y = clamp(y, lo, hi);
      }
      const md = (s.d >= 4 ? 0.5 : 0.62) * (x - px);
      y = clamp(y, py - md, py + md);
      const k = { x, y, low: sp.alt && !up };
      kp.push(k); s.kp.push(k);
      py = y; px = x;
      x += sp.dx * rand(0.88, 1.14);
    }
  }

  // --- 2. Échantillonnage : trajectoire, largeur du couloir, poids du relief
  const path = new Float32Array(N), gap = new Float32Array(N), hug = new Float32Array(N), cw = new Float32Array(N), flat = new Float32Array(N);
  let j = 0, si = 0;
  for (let i = 0; i < N; i++) {
    const x = i * STEP;
    while (j < kp.length - 2 && x > kp[j + 1].x) j++;
    const a = kp[j], b = kp[j + 1], t = clamp((x - a.x) / (b.x - a.x), 0, 1);
    path[i] = lerp(a.y, b.y, (1 - Math.cos(Math.PI * t)) / 2);
    while (si < secs.length - 1 && x >= secs[si].x1) si++;
    const s = secs[si], sp = SPEC[s.type] || {};
    gap[i] = gapOf(s);
    hug[i] = sp.hug || 0;
    cw[i] = sp.ceil || 0;
    flat[i] = x < 420 || x > LEN - 640 ? 1 : 0;
  }
  blur(gap, 12); blur(hug, 16); blur(cw, 14); blur(flat, 10);

  const ground = new Float32Array(N), ceil = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = i * STEP, b = path[i] + gap[i] / 2, t = path[i] - gap[i] / 2;
    const base = 700 + (fbm(x / 260, def.seed) - 0.5) * 110;
    const n1 = fbm(x / 90, def.seed + 5), n2 = fbm(x / 38, def.seed + 9, 2);
    const m = 8 + 95 * n1 * n1 + 14 * n2;
    let g = lerp(Math.max(base, b + 34), b + m, hug[i]);
    g = lerp(g, 700, flat[i]);
    ground[i] = Math.max(g, b + 6);
    const mc = 6 + 46 * fbm(x / 70, def.seed + 23) + 16 * fbm(x / 26, def.seed + 31, 2);
    ceil[i] = lerp(-320, t - mc, cw[i]);
  }

  const samp = (arr) => (x) => {
    const f = clamp(x / STEP, 0, N - 1.001), i = f | 0;
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  };
  const groundAt = samp(ground), ceilAt = samp(ceil), pathAt = samp(path), gapAt = samp(gap);
  const slope = (arr) => (x) => {
    const i = clamp((x / STEP) | 0, 0, N - 2);
    return (arr[i + 1] - arr[i]) / STEP;
  };
  const bAt = (x) => pathAt(x) + gapAt(x) / 2, tAt = (x) => pathAt(x) - gapAt(x) / 2;
  const bMin = (x, w) => Math.min(bAt(x - w / 2), bAt(x), bAt(x + w / 2));
  const tMax = (x, w) => Math.max(tAt(x - w / 2), tAt(x), tAt(x + w / 2));

  // --- 3. Obstacles
  const obs = [], items = [], zones = [], cps = [];
  const th = def.theme;
  const push = (o) => { o.v = R(); obs.push(o); return o; };

  function tree(x, scale = 1, extra = 30) {
    const st = pick(th.tree), T = TREE[st], g = groundAt(x);
    let h = rand(T.h[0], T.h[1]) * scale;
    let w = clamp(h * T.wr, T.wmin || 10, T.wmax || 90);
    const top = Math.max(g - h, bMin(x, w) + 5 + rand(0, extra));
    h = g - top;
    if (h < 30) return;
    w = clamp(h * T.wr, T.wmin || 10, T.wmax || 90);
    let shapes;
    if (T.sh === 'tri') shapes = [{ p: [x - w / 2, g + 30, x, top, x + w / 2, g + 30] }];
    else if (T.sh === 'lol') shapes = [{ p: rectPoly(x - 3, top + w / 2, 6, h) }, { c: [x, top + w / 2, w / 2] }];
    else shapes = [{ p: rectPoly(x - w / 2, top, w, h + 30) }];
    push({ kind: 'tree', st, x, y: top, w, h, g, shapes, minX: x - w / 2, maxX: x + w / 2 });
  }
  function pillar(x, w, extra) {
    const top = bMin(x, w + 12) + 4 + rand(0, extra);
    const g = Math.max(groundAt(x - w / 2), groundAt(x + w / 2)) + 24;
    if (g - top < 44) return;
    push({ kind: 'pillar', st: pick(th.pillar), x, y: top, w, h: g - top, shapes: [{ p: rectPoly(x - w / 2, top, w, g - top) }], minX: x - w / 2, maxX: x + w / 2 });
  }
  function hang(x, w, extra) {
    const st = pick(th.hang);
    if (st === 'cloud') w *= 1.7;
    const bot = tMax(x, w + 12) - 4 - rand(0, extra);
    if (bot < 64) return;
    let shapes;
    if (st === 'stalactite' || st === 'icicle') shapes = [{ p: [x - w / 2, -80, x + w / 2, -80, x, bot] }];
    else if (st === 'rock') shapes = [{ p: [x - w / 2, -80, x + w / 2, -80, x + w * 0.3, bot, x - w * 0.3, bot] }];
    else if (st === 'vine') { w = 16; shapes = [{ p: rectPoly(x - 8, -80, 16, bot + 80) }]; }
    else if (st === 'cloud') {
      const r = w * 0.3;
      shapes = [{ p: rectPoly(x - w * 0.42, -80, w * 0.84, bot - r + 80), hz: 10 }, { c: [x - w * 0.24, bot - r, r], hz: 10 }, { c: [x + w * 0.24, bot - r, r], hz: 10 }, { c: [x, bot - r * 1.05, r * 1.05], hz: 10 }];
    } else shapes = [{ p: rectPoly(x - 2, -80, 4, bot + 40) }, { p: rectPoly(x - w / 2, bot - 44, w, 44) }]; // grue / enseigne
    push({ kind: 'hang', st, x, y: bot, w, shapes, minX: x - w / 2, maxX: x + w / 2 });
  }

  for (const s of secs) {
    const d = s.d, a = s.x0 + 40, b = s.x1 - 40;
    const every = (lo, hi, fn) => { for (let x = a + rand(0, lo); x < b; x += rand(lo, hi)) fn(x); };
    switch (s.type) {
      case 'open': every(150, 300, (x) => tree(x, 0.7, 60)); break;
      case 'cp': {
        const x = (s.x0 + s.x1) / 2;
        cps.push({ x, y: pathAt(x), g: groundAt(x) });
        items.push({ type: 'repair', x: x + 150, y: pathAt(x + 150) });
        break;
      }
      case 'hills':
        every(90, 200, (x) => tree(x, 0.75, 40));
        if (d >= 2) every(430, 620, (x) => hang(x, rand(44, 70), 26));
        break;
      case 'peaks':
        every(120, 260, (x) => tree(x, 0.6, 20));
        if (d >= 2) for (const k of s.kp) if (k.low) hang(k.x, rand(46, 76), 20);
        break;
      case 'forest':
        every(55, 110, (x) => tree(x, 1.9, 46));
        if (d >= 2) every(360, 520, (x) => hang(x, rand(44, 70), 22));
        break;
      case 'towers': {
        let n = 0;
        every(150, 225, (x) => { pillar(x, rand(46, 88), 12 + (5 - d) * 10); if (d >= 3 && n++ % 2) hang(x + 95, rand(40, 60), 20); });
        break;
      }
      case 'gates':
        for (const k of s.kp) { const w = d >= 4 ? rand(70, 96) : rand(48, 70); pillar(k.x, w, 2); hang(k.x, w, 2); }
        every(160, 320, (x) => tree(x, 0.6, 60));
        break;
      case 'cave': break;
      case 'movers':
        every(250, 330, (x) => {
          push({ kind: 'mover', st: th.mover, x, y0: pathAt(x), amp: 120 + d * 10, per: 4.4 - d * 0.35, ph: R(), r: 20, dyn: 1, minX: x - 24, maxX: x + 24 });
        });
        every(170, 320, (x) => tree(x, 0.7, 70));
        break;
      case 'mills':
        every(340, 420, (x) => {
          const len = 72 + d * 9, hub = bAt(x) + len * 0.42;
          push({ kind: 'mill', x, y: hub, len, per: 4.2 - d * 0.35, ph: R(), g: groundAt(x) + 20, dyn: 1, minX: x - len - 6, maxX: x + len + 6 });
          if (d >= 4) hang(x, rand(44, 60), 6);
        });
        break;
      case 'geysers':
        every(400, 500, (x) => {
          push({ kind: 'geyser', st: th.geyser, x, w: 44, g: groundAt(x), per: 3.3 - d * 0.2, on: 0.42, ph: R(), dyn: 1, minX: x - 22, maxX: x + 22 });
        });
        every(170, 320, (x) => tree(x, 0.6, 70));
        break;
      case 'wind': {
        let upw = R() < 0.5;
        every(330, 420, (x) => {
          upw = !upw;
          zones.push({ x, w: 250, y0: 30, y1: groundAt(x + 125), fy: (upw ? -1 : 1) * (110 + 25 * d), fx: 0 });
        });
        every(100, 220, (x) => tree(x, 0.75, 36));
        if (d >= 3) every(450, 600, (x) => hang(x, rand(44, 66), 22));
        break;
      }
    }
  }
  obs.sort((p, q) => p.minX - q.minX);

  // --- 4. Orbes, anneaux
  const geys = obs.filter((o) => o.kind === 'geyser');
  let x = 620;
  while (x < LEN - 760) {
    const n = 5 + ((R() * 5) | 0), m = R(), off = m < 0.45 ? 0 : m < 0.75 ? 0.75 : -0.75;
    for (let i = 0; i < n && x < LEN - 760; i++, x += 62) {
      if (geys.some((g) => Math.abs(g.x - x) < 46)) continue;
      const e = Math.sin((Math.PI * (i + 0.5)) / n);
      items.push({ type: 'orb', x, y: pathAt(x) + off * e * (gapAt(x) / 2 - 40) });
    }
    x += rand(170, 380);
  }
  for (const s of secs) {
    if (!['hills', 'peaks', 'forest', 'towers', 'cave', 'wind', 'gates'].includes(s.type) || s.kp.length < 2) continue;
    if (R() < 0.3) continue;
    const k = s.kp[(s.kp.length / 2) | 0];
    const rx = s.type === 'gates' ? k.x + 140 : k.x;
    items.push({ type: 'ring', x: rx, y: pathAt(rx) });
  }
  items.sort((p, q) => p.x - q.x);

  return {
    def, length: LEN, secs, obs, items, zones, checkpoints: cps,
    ground, ceil, groundAt, ceilAt, pathAt, gapAt, groundSlope: slope(ground), ceilSlope: slope(ceil),
    startX: 170, pad: { x: LEN - 300, w: 150 }, startPad: { x: 170, w: 120 },
    orbTotal: items.filter((i) => i.type === 'orb').length,
    ringTotal: items.filter((i) => i.type === 'ring').length,
  };
}

// --- État des obstacles animés (fonctions pures du temps de jeu)
export const moverY = (o, t) => o.y0 + o.amp * Math.sin(TAU * (t / o.per + o.ph));
export const millAngle = (o, t) => TAU * (t / o.per + o.ph);
export function geyserState(o, t) {
  const u = (t / o.per + o.ph) % 1;
  const active = u < o.on;
  const h = active ? Math.min(1, u / 0.07, (o.on - u) / 0.05) : 0;
  return { active, h: clamp(h, 0, 1), warn: u > 0.78 ? (u - 0.78) / 0.22 : 0 };
}
export function dynShapes(o, t) {
  if (o.kind === 'mover') return [{ c: [o.x, moverY(o, t), o.r], hz: 16 }];
  if (o.kind === 'mill') {
    const a = millAngle(o, t), out = [{ p: rectPoly(o.x - 5, o.y, 10, o.g - o.y) }];
    for (let i = 0; i < 3; i++) {
      const b = a + (i * TAU) / 3;
      out.push({ p: [o.x, o.y, o.x + Math.cos(b) * o.len, o.y + Math.sin(b) * o.len], r: 4, hz: 16 });
    }
    return out;
  }
  if (o.kind === 'geyser') {
    const s = geyserState(o, t);
    if (s.h < 0.3) return [];
    const top = lerp(o.g, -80, s.h);
    return [{ p: rectPoly(o.x - o.w / 2 + 6, top, o.w - 12, o.g - top), hz: 18 }];
  }
  return o.shapes;
}
