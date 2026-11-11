// Génération procédurale déterministe des niveaux.
// Principe : on trace d'abord un couloir de vol garanti (trajectoire + largeur),
// puis le relief et les obstacles sont posés autour, jamais dedans.
import { rng, clamp, lerp, fbm, TAU } from './util.js';

export const WORLD_H = 800;
export const STEP = 8;

const SPEC = {
  open: { dx: 420, lo: 380, hi: 520, dy: 90, hug: 0, gap: 240 },
  fuel: { hug: 0, gap: 250 },
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
  lamp: { h: [60, 110], wr: 0.1, sh: 'col', wmin: 8, wmax: 10 },
  totem: { h: [60, 130], wr: 0.2, sh: 'col', wmin: 16, wmax: 22 },
  cypress: { h: [80, 200], wr: 0.2, sh: 'tri' },
  coral: { h: [40, 120], wr: 0.42, sh: 'tri' },
  mushroom: { h: [60, 170], wr: 0.62, sh: 'lol', wmax: 84 },
  baobab: { h: [90, 170], wr: 0.55, sh: 'lol', wmax: 76 },
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
  const add = (type, d, len, variant) => { secs.push({ type, d, x0: X, x1: X + len, kp: [], variant }); X += len; };
  add('start', 1, 520);
  const list = def.sections.trim().split(/\s+/).map((s) => { const [a, b] = s.split(':'); return [a, +b || 1]; });
  // Arrêts de ravitaillement répartis régulièrement entre les sections.
  const stops = (def.fuel || 'easy easy').split(/\s+/);
  const stopAt = stops.map((_, k) => Math.round(((k + 1) * list.length) / (stops.length + 1)));
  list.forEach(([ty, d], i) => {
    stopAt.forEach((at, k) => { if (at === i) add('fuel', 1, 520, stops[k]); });
    add(ty, d, 1000 * (def.lenScale || 1) * rand(0.92, 1.08));
  });
  add('end', 1, 780);
  const LEN = X, N = Math.ceil(LEN / STEP) + 2;
  // Héliports : de plus en plus petits et haut perchés au fil des niveaux.
  const eid = Math.min(def.id, 11), lv = eid - 1, shrink = 1 - 0.045 * lv, roofH = 120 + 18 * eid, peakH = 170 + 12 * eid; // difficulté plafonnée après le niveau 11
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
    if (s.type === 'fuel') {
      const x = (s.x0 + s.x1) / 2, want = s.variant === 'easy' ? 560 : s.variant === 'roof' ? 640 - roofH : s.variant === 'peak' ? 640 - peakH : 400;
      const md = 0.62 * (x - px), y = clamp(want, py - md, py + md);
      kp.push({ x, y }); py = y; px = x;
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
    flat[i] = x < 420 || x > LEN - 640 || s.type === 'fuel' ? 1 : 0;
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
  // Sommets aménagés : une montagne à 45° avec un replat pour l'héliport.
  for (const s of secs) {
    if (s.type !== 'fuel' || s.variant !== 'peak') continue;
    const cx = (s.x0 + s.x1) / 2, half = (80 * shrink) / 2 + 6;
    for (let i = Math.floor(s.x0 / STEP); i <= Math.ceil(s.x1 / STEP); i++) {
      ground[i] = Math.min(ground[i], 700 - peakH + Math.max(0, Math.abs(i * STEP - cx) - half));
    }
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
  const obs = [], items = [], zones = [], pads = [{ x: 170, y: groundAt(170), w: 120, kind: 'start' }];
  const th = def.theme, slow = 1 / Math.sqrt((def.mod || {}).grav || 1); // en faible gravité, tout bouge plus lentement
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
      case 'fuel': {
        const x = (s.x0 + s.x1) / 2, gy = groundAt(x), v = s.variant;
        let pad;
        if (v === 'roof') {
          const pw = 86 * shrink, w = pw + 6, top = gy - roofH;
          push({ kind: 'pillar', st: pick(th.pillar), x, y: top, w, h: gy + 24 - top, shapes: [{ p: rectPoly(x - w / 2, top, w, gy + 24 - top) }], minX: x - w / 2, maxX: x + w / 2 });
          pad = { x, y: top, w: pw };
        } else if (v === 'peak') pad = { x, y: gy, w: 80 * shrink };
        else if (v === 'trees') {
          // clairière étroite entre deux grands arbres : descente verticale
          const off = Math.max(52, 70 - 2 * lv);
          tree(x - off, 3, 0); tree(x + off, 3, 0);
          items.push({ type: 'star', x, y: gy - 30 });
          pad = { x, y: gy, w: Math.max(50, 66 * shrink) };
        } else if (v === 'cave') {
          // abri ouvert à gauche : entrer sous la dalle, se poser, ressortir en marche arrière
          const clr = 88 - 2 * eid, top = gy - clr - 62;
          const built = ['building', 'neon', 'pagoda', 'lighthouse', 'castle', 'container', 'chimney', 'monolith'].includes(th.pillar[0]);
          push({ kind: 'shelter', st: built ? 'building' : 'rock', x, y: top, clr, w: 200, g: gy, minX: x - 100, maxX: x + 100,
            shapes: [{ p: rectPoly(x - 100, top, 200, 62) }, { p: rectPoly(x + 76, top, 24, gy + 24 - top) }] });
          items.push({ type: 'star', x: x + 48, y: gy - 30 });
          pad = { x: x + 4, y: gy, w: 84 * shrink };
        } else pad = { x, y: gy, w: 130 * shrink };
        pads.push({ ...pad, kind: 'fuel', variant: v, main: v === 'easy' || v === 'roof' || v === 'peak' });
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
          push({ kind: 'mover', st: th.mover, x, y0: pathAt(x), amp: 120 + d * 10, per: (4.4 - d * 0.35) * slow, ph: R(), r: 20, dyn: 1, minX: x - 24, maxX: x + 24 });
        });
        every(170, 320, (x) => tree(x, 0.7, 70));
        break;
      case 'mills':
        every(340, 420, (x) => {
          const len = 72 + d * 9, hub = bAt(x) + len * 0.42;
          push({ kind: 'mill', x, y: hub, len, per: (4.2 - d * 0.35) * slow, ph: R(), g: groundAt(x) + 20, dyn: 1, minX: x - len - 6, maxX: x + len + 6 });
          if (d >= 4) hang(x, rand(44, 60), 6);
        });
        break;
      case 'geysers':
        every(400, 500, (x) => {
          push({ kind: 'geyser', st: th.geyser, x, w: 44, g: groundAt(x), per: (3.3 - d * 0.2) * slow, on: 0.42, ph: R(), dyn: 1, minX: x - 22, maxX: x + 22 });
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
  // --- 4. Étoiles : 3 par niveau, une par héliport bonus, le reste au fond de recoins entre deux arbres.
  const nooks = secs.filter((q) => ['hills', 'forest', 'towers', 'gates', 'open', 'wind', 'movers', 'mills'].includes(q.type));
  const need = 3 - items.filter((i) => i.type === 'star').length;
  for (let k = 0; k < need; k++) {
    const q = nooks[Math.floor(((k + 0.5) * nooks.length) / need)];
    let bx = (q.x0 + q.x1) / 2, bd = -1;
    for (let x = q.x0 + 120; x < q.x1 - 120; x += 20) { const dp = groundAt(x) - bAt(x); if (dp > bd) { bd = dp; bx = x; } }
    tree(bx - 46, 3, 0); tree(bx + 46, 3, 0);
    items.push({ type: 'star', x: bx, y: groundAt(bx) - 24 });
  }
  obs.sort((p, q) => p.minX - q.minX);

  // --- 5. Pièces : exactement 100, hors de la trajectoire sûre (au ras du sol, des obstacles ou du plafond).
  const ptDist = (sh, x, y) => {
    if (sh.c) return Math.hypot(x - sh.c[0], y - sh.c[1]) - sh.c[2];
    const P = sh.p, n = P.length / 2;
    let best = 1e9, inside = n > 2;
    for (let i = 0; i < n; i++) {
      const x1 = P[i * 2], y1 = P[i * 2 + 1], k = ((i + 1) % n) * 2, ex = P[k] - x1, ey = P[k + 1] - y1;
      const t = clamp(((x - x1) * ex + (y - y1) * ey) / (ex * ex + ey * ey || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - x1 - ex * t, y - y1 - ey * t));
      if (inside && ex * (y - y1) - ey * (x - x1) < 0) inside = false;
    }
    return inside ? -best : best;
  };
  const inFuel = (x) => secs.some((q) => q.type === 'fuel' && x > q.x0 - 40 && x < q.x1 + 40);
  const free = (x, y) => {
    if (y < 44 || y > groundAt(x) - 15 || y < ceilAt(x) + 15 || inFuel(x)) return false;
    for (const o of obs) {
      if (o.minX > x + 110) break;
      if (o.maxX < x - 110) continue;
      if (o.dyn) { if (Math.abs(o.x - x) < (o.kind === 'mill' ? o.len + 14 : 44)) return false; continue; }
      for (const sh of o.shapes) if (ptDist(sh, x, y) < 17) return false;
    }
    return true;
  };
  let coins = [];
  for (let pass = 0; pass < 4 && coins.length < 100; pass++) {
    coins = [];
    for (let x = 600 + pass * 17; x < LEN - 820; x += rand(90, 200) / (1 + pass * 0.5)) {
      const m = R(), deep = groundAt(x) - bAt(x) > 50;
      for (let i = 0; i < 5; i++, x += 34) {
        const y = deep && m < 0.6 ? groundAt(x) - 21 : m < 0.8 || tAt(x) < 80 ? bAt(x) - 10 : tAt(x) + 10;
        if (x < LEN - 820 && free(x, y)) coins.push({ type: 'orb', x, y });
      }
    }
  }
  for (let i = 0; i < 100 && coins.length; i++) items.push(coins[Math.floor((i * coins.length) / Math.max(100, coins.length))] );
  items.sort((p, q) => p.x - q.x);
  const endPad = { x: LEN - 300, y: groundAt(LEN - 300), w: 150, kind: 'end' };
  pads.push(endPad);
  pads.forEach((p, i) => { p.i = i; });
  // Réservoir : dimensionné sur le plus long trajet entre deux ravitaillements principaux.
  let maxGap = 0, lastX = 170;
  for (const p of pads) if (p.kind !== 'fuel' || p.main) { maxGap = Math.max(maxGap, p.x - lastX); lastX = p.x; }
  const mod = def.mod || {};
  const tank = ((maxGap / 200) * (def.id <= 2 ? 1.8 : 1.6)) / Math.sqrt(mod.grav || 1) * (mod.windX < 0 ? 1.25 : 1); // secondes de rotor à pleine puissance

  return {
    def, length: LEN, secs, obs, items, zones, pads, tank,
    ground, ceil, groundAt, ceilAt, pathAt, gapAt, groundSlope: slope(ground), ceilSlope: slope(ceil),
    startX: 170, pad: endPad,
    orbTotal: items.filter((i) => i.type === 'orb').length,
    starTotal: items.filter((i) => i.type === 'star').length,
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
