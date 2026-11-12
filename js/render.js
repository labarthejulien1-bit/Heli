// Rendu Canvas 2D : ciel, parallaxe, relief, obstacles, objets, particules.
import { clamp, lerp, hash, noise1, fbm, mix, rgba, TAU, DEG } from './util.js';
import { WORLD_H, STEP, moverY, millAngle, geyserState } from './levelgen.js';
import { drawHeli } from './helidraw.js';
import { HELIS } from './data.js';

export const VW = 400; // largeur visible en unités de jeu
const GEYSER_COL = { steam: '#ffffff', water: '#c9f6ff', lava: '#ff8a2a', laser: '#22e6ff', bolt: '#fff7c9', sand: '#e8c890', acid: '#a8ff5a', plasma: '#c58bff' };
const TREE_ALIAS = { cypress: 'pine', coral: 'dead' };

export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.parts = []; this.amb = [];
    this.camX = 0; this.camY = 0; this.shake = 0; this.flash = 0; this.bolt = 0; this.nextBolt = 4;
    this.quality = 'high'; this.vh = 800; this.s = 1;
  }
  resize(quality = this.quality) {
    this.quality = quality;
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : quality === 'med' ? 1.5 : 2.5);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.s = this.cv.width / VW; this.vh = this.cv.height / this.s;
  }
  setLevel(L) {
    this.L = L; this.def = L.def; this.parts.length = 0; this.camX = 0; this.snap = true;
    const n = this.def.weather ? (this.quality === 'low' ? 24 : 60) : 0;
    this.amb = Array.from({ length: n }, (_, i) => ({ x: hash(i, 1) * 440 - 20, y: hash(i, 2) * 900, z: 0.5 + hash(i, 3), ph: hash(i, 4) * 7 }));
  }
  spawn(x, y, n, o) {
    if (this.parts.length > 260) return;
    for (let i = 0; i < n; i++) {
      const a = (o.a ?? 0) + (Math.random() - 0.5) * (o.spread ?? TAU), v = (o.v || 60) * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0), life: 0, max: (o.life || 0.6) * (0.6 + Math.random() * 0.6), size: o.size || 2, col: o.col || '#fff', g: o.g ?? 0, grow: o.grow || 0 });
    }
  }

  draw(g, look, time, dt, opts = {}) {
    const c = this.c, L = this.L, def = this.def, s = this.s, vh = this.vh, h = g.heli;
    const p = clamp(h.x / L.length, 0, 1);
    // caméra
    // l'appareil est décalé du côté opposé à son nez, pour voir devant lui (dans les deux sens en Heli Rescue)
    const tx = clamp(h.x - VW * (0.5 - 0.2 * h.dir) + clamp(h.vx * 0.22, h.dir > 0 ? -40 : -70, h.dir > 0 ? 70 : 40), 0, L.length - VW);
    // Sur les écrans hauts, on montre jusqu'à 110 unités de terre sous le monde : le sol paraît plus haut et le bas de l'écran reste libre pour le pouce.
    const ty = vh >= WORLD_H - 10 ? WORLD_H - vh + clamp(vh - 790, 0, 110) : clamp(h.y - vh * 0.45, 0, WORLD_H - vh);
    const ocx = this.camX;
    if (this.snap) { this.camX = tx; this.camY = ty; this.snap = false; }
    else { this.camX += (tx - this.camX) * Math.min(1, dt * 5); this.camY += (ty - this.camY) * Math.min(1, dt * 4); }
    const camX = this.camX, camY = this.camY, camDX = camX - ocx;
    this.shake *= Math.pow(0.002, dt);
    const shx = opts.shake === false ? 0 : (Math.random() - 0.5) * this.shake, shy = opts.shake === false ? 0 : (Math.random() - 0.5) * this.shake;

    const skyT = mix(def.sky[0][0], def.sky[1][0], p), skyB = mix(def.sky[0][1], def.sky[1][1], p);
    c.setTransform(s, 0, 0, s, 0, 0);
    let gr = c.createLinearGradient(0, 0, 0, vh);
    gr.addColorStop(0, skyT); gr.addColorStop(0.75, skyB); gr.addColorStop(1, skyB);
    c.fillStyle = gr; c.fillRect(0, 0, VW, vh);
    const ex = def.extras, hi = this.quality !== 'low';

    if (ex.includes('stars')) {
      c.fillStyle = '#fff';
      for (let i = 0; i < 50; i++) {
        c.globalAlpha = (0.25 + 0.5 * hash(i, 7)) * (0.6 + 0.4 * Math.sin(time * 2 + i));
        c.fillRect(hash(i, 5) * VW, hash(i, 6) * vh * 0.6, 1.3, 1.3);
      }
      c.globalAlpha = 1;
    }
    if (ex.includes('aurora')) {
      for (let k = 0; k < 3; k++) {
        gr = c.createLinearGradient(0, 60 + k * 50, 0, 260 + k * 50);
        gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.5, k === 1 ? 'rgba(170,140,255,.22)' : 'rgba(120,255,200,.22)'); gr.addColorStop(1, 'rgba(120,255,200,0)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(0, 300 + k * 50);
        for (let x = 0; x <= VW; x += 20) c.lineTo(x, 110 + k * 50 + Math.sin(x / 70 + time * 0.3 + k * 2) * 34);
        for (let x = VW; x >= 0; x -= 20) c.lineTo(x, 250 + k * 50 + Math.sin(x / 90 - time * 0.2 + k) * 30);
        c.fill();
      }
    }
    // soleil / lune
    const sun = def.sun, sx = sun.x * VW - camX * 0.01, sy = lerp(sun.y[0], sun.y[1], p) * vh * 0.8;
    gr = c.createRadialGradient(sx, sy, sun.r * 0.6, sx, sy, sun.r * 4.5);
    gr.addColorStop(0, rgba(sun.c, 0.4)); gr.addColorStop(1, rgba(sun.c, 0));
    c.fillStyle = gr; c.fillRect(sx - sun.r * 5, sy - sun.r * 5, sun.r * 10, sun.r * 10);
    c.fillStyle = sun.c; c.beginPath(); c.arc(sx, sy, sun.r, 0, 7); c.fill();

    if (ex.includes('planet')) {
      const px = VW * 0.74 - camX * 0.004, py = vh * 0.2, pc = mix(skyB, def.rim, 0.45);
      c.fillStyle = pc; c.beginPath(); c.arc(px, py, 44, 0, 7); c.fill();
      c.fillStyle = rgba('#000000', 0.18); c.beginPath(); c.arc(px + 12, py + 8, 44, 0, 7); c.arc(px, py, 44, 0, 7, true); c.fill('evenodd');
      c.fillStyle = rgba(def.accent, 0.25); c.fillRect(px - 40, py - 12, 76, 5); c.fillRect(px - 36, py + 10, 70, 4);
      c.strokeStyle = rgba(def.rim, 0.6); c.lineWidth = 3; c.beginPath(); c.ellipse(px, py, 74, 13, -0.35, 0, 7); c.stroke();
    }
    if (ex.includes('godrays')) {
      c.fillStyle = rgba('#ffffff', 0.07);
      for (let i = 0; i < 4; i++) { const gx = 40 + i * 105 + Math.sin(time * 0.2 + i) * 14; c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx + 46, 0); c.lineTo(gx - 90, vh); c.lineTo(gx - 190, vh); c.fill(); }
    }
    if (ex.includes('lightning')) {
      this.nextBolt -= dt;
      if (this.nextBolt < 0) { this.nextBolt = 3 + Math.random() * 6; this.bolt = 0.35; this.boltX = 40 + Math.random() * 320; opts.onThunder?.(); }
      if (this.bolt > 0) {
        this.bolt -= dt;
        c.strokeStyle = rgba('#ffffff', Math.min(1, this.bolt * 5)); c.lineWidth = 2; c.beginPath();
        let bx = this.boltX, by = 0; c.moveTo(bx, by);
        for (let i = 0; i < 9; i++) { bx += (hash(i, this.boltX) - 0.5) * 50; by += vh * 0.07; c.lineTo(bx, by); }
        c.stroke();
        c.fillStyle = rgba('#dfe6ff', this.bolt * 0.5); c.fillRect(0, 0, VW, vh);
      }
    }
    if (ex.includes('clouds') || ex.includes('smoke')) {
      c.fillStyle = ex.includes('smoke') ? rgba('#000000', 0.28) : rgba(mix(skyB, '#ffffff', 0.7), 0.3);
      for (let i = 0; i < 6; i++) {
        const cx = ((((hash(i, 11) * 700 - camX * 0.04 - time * (3 + i)) % 700) + 700) % 700) - 150, cy = 80 + hash(i, 12) * vh * 0.4, w = 50 + hash(i, 13) * 50;
        c.beginPath(); c.ellipse(cx, cy, w, w * 0.22, 0, 0, 7); c.ellipse(cx - w * 0.4, cy + 6, w * 0.6, w * 0.18, 0, 0, 7); c.ellipse(cx + w * 0.35, cy - 7, w * 0.5, w * 0.2, 0, 0, 7); c.fill();
      }
    }
    if (ex.includes('birds')) {
      c.strokeStyle = rgba(def.ground, 0.6); c.lineWidth = 1.3; c.beginPath();
      for (let i = 0; i < 6; i++) {
        const bx = ((((time * 16 + i * 23 - camX * 0.06) % 560) + 560) % 560) - 80, by = 150 + (i % 3) * 13 + Math.sin(time + i) * 6 + (i > 2 ? 60 : 0), f = Math.sin(time * 7 + i) * 3;
        c.moveTo(bx - 5, by - f); c.lineTo(bx, by); c.lineTo(bx + 5, by - f);
      }
      c.stroke();
    }

    // couches de parallaxe
    const bottom = WORLD_H - camY;
    for (let i = 0; i < 3; i++) {
      const f = [0.3, 0.55, 0.8][i], col = f < 0.5 ? mix(skyB, def.mid, f * 2) : mix(def.mid, def.ground === '#dcebf8' ? '#7ba2cf' : def.ground, (f - 0.5) * 2);
      const par = [0.1, 0.22, 0.4][i], base = bottom - [330, 235, 140][i], amp = [160, 135, 105][i];
      if (i === 2 && ex.includes('sea')) this.sea(c, bottom - 215, vh, time, skyB, def);
      this.layer(c, def.layers[i], camX * par + i * 913, base, amp, col, vh, def, i, time, hi);
      if (i === 1 && ex.includes('mist')) {
        gr = c.createLinearGradient(0, base - 60, 0, base + 150);
        gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(0.5, rgba('#eafff2', 0.28 + 0.06 * Math.sin(time * 0.4))); gr.addColorStop(1, rgba('#ffffff', 0));
        c.fillStyle = gr; c.fillRect(0, base - 60, VW, 210);
      }
    }
    if (ex.includes('lava')) {
      gr = c.createLinearGradient(0, bottom - 260, 0, bottom);
      gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(1, `rgba(255,110,30,${0.45 + 0.08 * Math.sin(time * 2)})`);
      c.fillStyle = gr; c.fillRect(0, bottom - 260, VW, 260);
    }

    // --- monde
    c.setTransform(s, 0, 0, s, (-camX + shx) * s, (-camY + shy) * s);
    const x0 = camX - 20, x1 = camX + VW + 20;
    for (const z of L.zones) {
      if (z.x > x1 || z.x + z.w < x0) continue;
      c.strokeStyle = rgba('#ffffff', 0.32); c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
      const span = z.y1 - z.y0;
      for (let i = 0; i < 16; i++) {
        const wx = z.x + 12 + hash(i, z.x) * (z.w - 24), wy = z.y0 + ((((hash(i, 3) * span + time * z.fy * 0.9) % span) + span) % span);
        c.moveTo(wx, wy); c.lineTo(wx, wy - Math.sign(z.fy) * 26);
      }
      c.stroke();
    }
    for (const o of L.obs) {
      if (o.minX > x1 + 60) break;
      if (o.maxX < x0 - 60) continue;
      this.obstacle(c, o, g.t, time, def, hi);
    }
    this.terrain(c, L, def, x0, x1, camY, vh);
    this.pads(c, L, def, g, time, x0, x1);
    if (L.rescue) this.rescue(c, L, def, g, time, x0, x1);
    this.items(c, L, def, g, time, x0, x1);
    this.traffic(c, L, def, g, time, camX);

    // particules monde
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; q.life += dt;
      if (q.life > q.max) { P[i] = P[P.length - 1]; P.pop(); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const k = 1 - q.life / q.max;
      c.globalAlpha = k; c.fillStyle = q.col;
      const sz = q.size + q.grow * q.life;
      c.beginPath(); c.arc(q.x, q.y, sz, 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    // hélicoptère
    if (!opts.hideHeli) {
      const gy = L.groundAt(h.x);
      if (h.power > 0.3 && gy - h.y < 70 && Math.random() < 0.5) this.spawn(h.x + (Math.random() - 0.5) * 40, gy - 2, 1, { a: -Math.PI / 2, spread: 2.4, v: 50, col: rgba(def.rim, 0.5), life: 0.5, size: 1.6 });
      if (look.trail && h.power > 0.4 && Math.random() < 0.6) this.spawn(h.x - 26 * h.dir, h.y, 1, { v: 8, vx: -30 * h.dir, col: look.flame ? (Math.random() < 0.5 ? '#ffb703' : '#ff5a1f') : look.trail, life: 0.6, size: 2.4 });
      // État de l'appareil : intact, fumée légère (choc doux), fumée noire et étincelles (gros choc), flammes (dernier point).
      const mh = g.maxHp, lost = mh - h.hp;
      if (g.state === 'fly' && lost > 0) {
        const heavy = lost / mh >= 0.45;
        if (Math.random() < (heavy ? 0.7 : 0.16 + 0.5 * (lost / mh))) this.spawn(h.x - 8, h.y - 8, 1, { a: -Math.PI / 2, spread: 0.8, v: 30, vx: -h.vx * 0.2, col: heavy ? 'rgba(25,25,32,.75)' : 'rgba(200,200,210,.45)', life: heavy ? 1.1 : 0.7, size: heavy ? 3.5 : 2.2, grow: heavy ? 8 : 4 });
        if (heavy && Math.random() < 0.12) this.spawn(h.x - 6, h.y - 4, 2, { v: 110, col: '#ffd34d', life: 0.3, size: 1.2, g: 300 });
        if (h.hp / mh <= 0.2 && Math.random() < 0.6) this.spawn(h.x - 10, h.y - 6, 1, { a: -Math.PI / 2, spread: 1, v: 40, col: Math.random() < 0.5 ? '#ff5a1f' : '#ffb703', life: 0.4, size: 2.6 });
      }
      c.save();
      c.translate(h.x, h.y);
      c.scale(h.dir, 1);
      c.rotate(h.tilt * DEG + (g.state === 'dead' ? h.spin : 0));
      if (h.inv > 0 && g.state === 'fly' && Math.sin(time * 40) > 0) c.globalAlpha = 0.45;
      drawHeli(c, look, time, g.state === 'ready' ? 0.8 : h.power, g.vs ? this.pax(g, look) : null);
      c.restore();
    }

    // --- premier plan (écran)
    c.setTransform(s, 0, 0, s, 0, 0);
    this.weather(c, def, vh, time, dt, camDX);
    gr = c.createRadialGradient(VW / 2, vh / 2, vh * 0.35, VW / 2, vh / 2, vh * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,10,.28)');
    c.fillStyle = gr; c.fillRect(0, 0, VW, vh);
    if ((def.mod || {}).dark && !opts.hideHeli) {
      const hx = h.x - camX, hy = h.y - camY;
      gr = c.createRadialGradient(hx + 40, hy, 80, hx + 40, hy, 300);
      gr.addColorStop(0, 'rgba(0,0,8,0)'); gr.addColorStop(1, 'rgba(0,0,8,.78)');
      c.fillStyle = gr; c.fillRect(0, 0, VW, vh);
    }
    if (this.flash > 0) { c.fillStyle = `rgba(255,60,60,${this.flash * 0.35})`; c.fillRect(0, 0, VW, vh); this.flash -= dt * 2.5; }
    const t = opts.touch;
    if (t) {
      const k = VW / this.cv.clientWidth;
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2; c.beginPath(); c.arc(t.ax * k, t.y * k, 26, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(clamp(t.x, t.ax - 60, t.ax + 60) * k, t.y * k, 11, 0, 7); c.fill();
    }
  }

  layer(c, st, u0, base, amp, col, vh, def, idx, time, hi) {
    c.fillStyle = col;
    const seed = def.seed + idx * 7;
    if (st === 'city') {
      const bw = 30 + idx * 6, b0 = Math.floor(u0 / bw) - 1;
      c.fillRect(0, base + amp * 0.2, VW, vh);
      for (let b = b0; b * bw < u0 + VW + bw; b++) {
        const hh = amp * (0.15 + 1.1 * hash(b, seed) * hash(b, seed + 2)) + 30, x = b * bw - u0, w = bw - 3;
        c.fillStyle = col; c.fillRect(x, base + amp * 0.2 - hh, w, hh + 2);
        if (hi && idx > 0) {
          const neon = def.extras.includes('neon');
          for (let r = 0; r < hh / 11 - 1 && r < 14; r++) for (let k = 0; k < 3; k++) {
            const hv = hash(b * 31 + r * 7 + k, seed);
            if (hv > 0.62) { c.fillStyle = rgba(neon ? (hv > 0.82 ? def.rim : def.accent) : def.accent, 0.5 + 0.2 * idx); c.fillRect(x + 4 + k * (w - 8) / 3, base + amp * 0.2 - hh + 6 + r * 11, (w - 14) / 3, 4); }
          }
        }
      }
      return;
    }
    if (st === 'isle') {
      for (let k = Math.floor(u0 / 240) - 1; k * 240 < u0 + VW + 240; k++) {
        const x = k * 240 + hash(k, seed) * 120 - u0, y = base - 40 - hash(k, seed + 1) * 220 + Math.sin(time * 0.4 + k) * 5, w = 50 + hash(k, seed + 2) * 60;
        c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.5, y - 14, x, y - 8); c.quadraticCurveTo(x + w * 0.6, y - 16, x + w, y);
        c.quadraticCurveTo(x + w * 0.3, y + w * 0.9, x, y + w * 1.1); c.quadraticCurveTo(x - w * 0.5, y + w * 0.5, x - w, y); c.fill();
      }
      c.beginPath(); c.moveTo(0, vh);
      for (let x = 0; x <= VW + 10; x += 10) c.lineTo(x, base + 60 - 50 * fbm((u0 + x) / 160 + time * 0.02, seed, 2));
      c.lineTo(VW, vh); c.fill();
      return;
    }
    c.beginPath(); c.moveTo(0, vh);
    const step = st === 'mesa' || st === 'pines' || st === 'spires' ? 4 : 8;
    // Les points sont calés sur des positions fixes du décor : la silhouette glisse sans se déformer.
    for (let x = -(((u0 % step) + step) % step); x <= VW + step; x += step) {
      const u = u0 + x;
      let hh;
      if (st === 'jag') hh = amp * (0.35 * fbm(u / 230, seed) + 0.75 * (1 - Math.abs(2 * noise1(u / 170, seed + 3) - 1)));
      else if (st === 'hill') hh = amp * fbm(u / 260, seed, 2);
      else if (st === 'pines') { const k = Math.round(u / 4), tooth = [0, 0.55, 1, 0.45][((k % 4) + 4) % 4]; hh = amp * 0.7 * fbm(u / 240, seed, 2) + tooth * (9 + 9 * hash(Math.floor((k + 1) / 4), seed)); }
      else if (st === 'dunes') hh = amp * (0.12 + 0.8 * Math.abs(Math.sin(u / 200 + seed * 1.3)) * (0.45 + 0.55 * noise1(u / 520, seed)));
      else if (st === 'spires') hh = amp * (0.25 * fbm(u / 200, seed) + 1.15 * Math.pow(noise1(u / 46, seed + 3), 3));
      else { const n = fbm(u / 210, seed, 2); hh = amp * (Math.floor(n * 6) / 6 * 1.1 + 0.15 * n); }
      c.lineTo(x, base - hh + amp * 0.3);
    }
    c.lineTo(VW + 8, vh); c.fill();
  }

  sea(c, y, vh, time, skyB, def) {
    c.fillStyle = mix(skyB, def.mid, 0.6); c.fillRect(0, y, VW, vh - y);
    c.strokeStyle = rgba('#ffffff', 0.35); c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 14; i++) {
      const yy = y + 6 + i * i * 1.1, xx = ((hash(i, 2) * VW + time * (6 + i * 2)) % (VW + 60)) - 30, w = 10 + i * 3;
      c.moveTo(xx, yy); c.lineTo(xx + w, yy);
    }
    c.stroke();
  }

  terrain(c, L, def, x0, x1, camY, vh) {
    const i0 = Math.max(0, Math.floor(x0 / STEP)), i1 = Math.min(L.ground.length - 1, Math.ceil(x1 / STEP));
    const bot = camY + vh + 10;
    let gr = c.createLinearGradient(0, 380, 0, 820);
    gr.addColorStop(0, def.ground); gr.addColorStop(1, def.groundDeep || mix(def.ground, '#000000', 0.35));
    c.beginPath(); c.moveTo(i0 * STEP, bot);
    for (let i = i0; i <= i1; i++) c.lineTo(i * STEP, L.ground[i]);
    c.lineTo(i1 * STEP, bot); c.closePath();
    c.fillStyle = gr; c.fill();
    c.beginPath();
    for (let i = i0; i <= i1; i++) c.lineTo(i * STEP, L.ground[i] + 1);
    c.strokeStyle = rgba(def.rim, 0.75); c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
    // passages secrets : pénombre de la galerie, puis la voûte dans la matière du sol
    for (const q of L.tunnels) {
      if (q.x1 < x0 || q.x0 > x1) continue;
      const n = q.top.length, X = (i) => q.x0 + i * STEP, has = (i) => q.top[i] < q.roof[i] - 10;
      c.beginPath();
      for (let i = 0; i < n; i++) c.lineTo(X(i), Math.max(q.top[i], q.roof[i]));
      for (let i = n - 1; i >= 0; i--) c.lineTo(X(i), L.ground[Math.round(q.x0 / STEP) + i] + 1);
      c.closePath(); c.fillStyle = 'rgba(0,0,10,.36)'; c.fill();
      c.beginPath();
      for (let i = 0; i < n; i++) c.lineTo(X(i), q.top[i]);
      for (let i = n - 1; i >= 0; i--) c.lineTo(X(i), has(i) ? q.roof[i] : q.top[i]);
      c.closePath(); c.fillStyle = gr; c.fill();
      c.beginPath(); for (let i = 0; i < n; i++) c.lineTo(X(i), q.top[i] + 1);
      c.strokeStyle = rgba(def.rim, 0.75); c.lineWidth = 2.2; c.stroke();
      c.beginPath(); let pen = false;
      for (let i = 0; i < n; i++) { if (has(i)) { c[pen ? 'lineTo' : 'moveTo'](X(i), q.roof[i]); pen = true; } else pen = false; }
      c.strokeStyle = rgba(def.rim, 0.35); c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke();
    }
    // plafond (grottes)
    let open = false;
    c.fillStyle = def.groundDeep ? def.obs : mix(def.ground, '#000000', 0.2);
    for (let i = i0; i <= i1; i++) {
      const y = L.ceil[i];
      if (y > camY - 40) {
        if (!open) { c.beginPath(); c.moveTo(i * STEP, camY - 20); open = true; }
        c.lineTo(i * STEP, y);
      }
      if (open && (y <= camY - 40 || i === i1)) { c.lineTo(i * STEP, camY - 20); c.closePath(); c.fill(); c.strokeStyle = rgba(def.rim, 0.4); c.lineWidth = 1.5; c.stroke(); open = false; }
    }
  }

  pads(c, L, def, g, time, x0, x1) {
    const GREEN = '#6ee7a0';
    for (const pad of L.pads) {
      if (pad.kind === 'zone') { // zone de pose d'une victime : cercle « H » en pointillés, à même le sol
        if (pad.x + pad.w < x0 || pad.x - pad.w > x1) continue;
        const here = g.onPad === pad.i, left = g.vs && g.vs.some((v) => v.zone === pad.i && (v.state === 'wait' || v.state === 'walk'));
        if (!left) continue;
        c.strokeStyle = rgba(here ? '#6ee7a0' : '#ffffff', 0.85); c.lineWidth = 2; c.setLineDash([7, 6]); c.lineDashOffset = -time * 14;
        c.beginPath(); c.ellipse(pad.x, pad.y + 1, pad.w / 2, 7, 0, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = rgba('#ffffff', 0.85); c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('H', pad.x, pad.y + 5);
        const gr = c.createLinearGradient(0, pad.y - 120, 0, pad.y); gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(1, rgba('#ffffff', 0.12 + 0.05 * Math.sin(time * 3)));
        c.fillStyle = gr; c.fillRect(pad.x - pad.w / 2, pad.y - 120, pad.w, 120);
        continue;
      }
      if (pad.x + pad.w < x0 || pad.x - pad.w > x1) continue;
      const y = pad.y, end = pad.kind === 'end', fuel = pad.kind === 'fuel', hw = pad.w / 2;
      const col = end ? def.accent : fuel ? GREEN : def.rim, here = g.onPad === pad.i;
      if (end || fuel) {
        const hgt = end ? 420 : 150, gr = c.createLinearGradient(0, y - hgt, 0, y);
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, (end ? 0.28 : 0.2) + 0.08 * Math.sin(time * 3)));
        c.fillStyle = gr; c.fillRect(pad.x - hw, y - hgt, pad.w, hgt);
      }
      c.fillStyle = mix(def.obs, '#ffffff', 0.25); c.fillRect(pad.x - hw, y - 3, pad.w, 7);
      c.fillStyle = col; c.fillRect(pad.x - hw, y - 3, pad.w, 2.2);
      for (const sx of [-1, 1]) {
        c.fillStyle = Math.sin(time * 5) * sx > 0 || here ? col : rgba(col, 0.3);
        c.beginPath(); c.arc(pad.x + sx * (hw - 4), y - 6, 2.4, 0, 7); c.fill();
      }
      if (fuel) {
        // Passerelles de service solidaires de la plateforme : la pompe à droite, l'atelier à gauche.
        const deck = mix(def.obs, '#ffffff', 0.25);
        for (const sd of [-1, 1]) {
          const ex = pad.x + sd * hw, ox = ex + sd * 22;
          c.fillStyle = deck; c.fillRect(Math.min(ex, ox), y - 3, 22, 5);
          c.strokeStyle = deck; c.lineWidth = 2; c.lineCap = 'round';
          c.beginPath(); c.moveTo(ox - sd * 2, y + 1); c.lineTo(ex - sd * 2, y + 14); c.stroke(); // jambe de force
          c.strokeStyle = rgba(col, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(ox, y - 3); c.lineTo(ox, y - 9); c.lineTo(ex + sd * 3, y - 9); c.stroke(); // garde-corps
        }
        const bx = pad.x + hw + 12;
        c.fillStyle = def.obs; c.fillRect(bx - 5, y - 23, 10, 20);
        c.fillStyle = here && g.fuel < 1 ? '#ffffff' : GREEN; c.fillRect(bx - 3.5, y - 21, 7, 6);
        c.strokeStyle = def.obs; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx - 5, y - 11); c.quadraticCurveTo(bx - 11, y - 9, bx - 10, y - 16); c.stroke();
        // panneau atelier : une clé, pour montrer que l'arrêt répare aussi
        const sx = pad.x - hw - 12, sy = y - 26;
        c.fillStyle = def.obs; c.fillRect(sx - 1.5, sy, 3, 23);
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(sx, sy, 9, 0, TAU); c.fill();
        c.strokeStyle = GREEN; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 9, 0, TAU); c.stroke();
        c.strokeStyle = '#1f8a55'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx - 4, sy + 4); c.lineTo(sx + 1.5, sy - 1.5); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.arc(sx + 3, sy - 3, 2.8, 0.2, 4.2); c.stroke();
      } else {
        c.fillStyle = col; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('H', pad.x, y + 14);
      }
    }
  }

  // Passagers à dessiner derrière les hublots (appareils de secours).
  pax(g, look) {
    const sway = clamp(-(g.heli.vx - (this._pvx ?? g.heli.vx)) * 0.2 * g.heli.dir, -1, 1); this._pvx = g.heli.vx;
    this._sway = lerp(this._sway || 0, sway, 0.15);
    const as = (v) => ({ type: v.type, variant: v.variant, col: v.col, hat: v.hat, seed: v.zone + v.x, sway: this._sway });
    const seats = look.seats.map(() => null); let cargo = null;
    for (const v of g.vs) if (v.state === 'aboard') { if (v.seat === 'cargo') cargo = as(v); else if (v.seat >= 0) seats[v.seat] = as(v); }
    return { seats, cargo };
  }

  // Monde Heli Rescue : poste de secours à la base, victimes au sol, jauge d'embarquement, remerciements.
  rescue(c, L, def, g, time, x0, x1) {
    const b = L.rescue.base;
    if (b.x + 200 > x0 && b.x - 200 < x1) {
      const bx = b.x + 112, by = b.y;
      c.fillStyle = '#f4f1de'; c.fillRect(bx - 26, by - 34, 58, 34); c.fillStyle = '#d62828'; c.fillRect(bx - 30, by - 40, 66, 8);
      c.fillStyle = '#9ad1e6'; c.fillRect(bx - 20, by - 26, 12, 10); c.fillRect(bx + 14, by - 26, 12, 10); c.fillStyle = '#7a5a3c'; c.fillRect(bx - 3, by - 20, 10, 20);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(bx + 3, by - 36, 5.5, 0, TAU); c.fill(); c.fillStyle = '#d62828'; c.fillRect(bx + 2, by - 39.5, 2, 7); c.fillRect(bx - 0.5, by - 37, 7, 2);
      c.fillStyle = def.obs; c.fillRect(bx + 40, by - 60, 2.5, 60); // manche à air
      c.fillStyle = '#ff7b2e'; c.beginPath(); c.moveTo(bx + 42, by - 60); c.lineTo(bx + 62, by - 55 + Math.sin(time * 4) * 2); c.lineTo(bx + 42, by - 50); c.fill();
    }
    for (const v of g.vs) {
      if (v.state === 'aboard' || v.state === 'saved' || v.px < x0 - 30 || v.px > x1 + 30) continue;
      const gy = L.groundAt(v.px), moving = v.state === 'walk' && Math.abs(g.heli.x - v.px) > 9 || v.state === 'out' || (v.state === 'wait' && Math.abs(v.px - v.x) > 1);
      const face = v.state === 'out' ? 1 : Math.sign(g.heli.x - v.px) || 1;
      this.figure(c, v, v.px, gy, time, moving, face, v.state === 'wait' && Math.abs(g.heli.x - v.px) < 420);
      if (v.state === 'walk' && v.board > 0) { // jauge circulaire au-dessus de la porte
        const hx = g.heli.x, hy = g.heli.y - 34;
        c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(hx, hy, 9, 0, TAU); c.stroke();
        c.strokeStyle = '#6ee7a0'; c.beginPath(); c.arc(hx, hy, 9, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, v.board)); c.stroke();
      }
      if (v.state === 'out' && v.t < 1.6) { // petit cœur de remerciement
        const k = v.t / 1.6, hx = v.px, hy = gy - 30 - k * 16;
        c.globalAlpha = 1 - k; c.fillStyle = '#ff5d73';
        c.beginPath(); c.moveTo(hx, hy + 4); c.bezierCurveTo(hx - 8, hy - 2, hx - 4, hy - 8, hx, hy - 3); c.bezierCurveTo(hx + 4, hy - 8, hx + 8, hy - 2, hx, hy + 4); c.fill(); c.globalAlpha = 1;
      }
    }
  }

  // Petite silhouette au sol : personne (veste colorée, bonnet) ou animal à quatre pattes.
  figure(c, v, x, gy, time, moving, face, wave) {
    const ph = moving ? time * (v.limp ? 7 : 11) : 0, bob = moving ? Math.abs(Math.sin(ph)) * (v.limp ? 2.2 : 1.2) : 0;
    c.save(); c.translate(x, gy - bob); c.scale(face, 1); c.lineCap = 'round';
    if (v.type === 'person') {
      const leg = moving ? Math.sin(ph) * 4 : 0;
      c.strokeStyle = '#2b2d42'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-1, -8); c.lineTo(-1 - leg, 0); c.moveTo(1, -8); c.lineTo(1 + leg * (v.limp ? 0.3 : 1), 0); c.stroke();
      c.strokeStyle = v.col || '#2a9d8f'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -16); c.stroke();
      c.lineWidth = 2.2; c.beginPath();
      if (wave) { const a = Math.sin(time * 9) * 0.5; c.moveTo(0, -16); c.lineTo(5 + a * 3, -24); c.moveTo(0, -16); c.lineTo(-5 + a * 3, -24); } // fait signe
      else { c.moveTo(0, -15); c.lineTo(4, -10 + leg * 0.4); c.moveTo(0, -15); c.lineTo(-4, -10 - leg * 0.4); }
      c.stroke();
      c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(0, -21, 3.6, 0, TAU); c.fill();
      c.fillStyle = v.hat || '#e76f51'; c.beginPath(); c.arc(0, -22, 3.8, Math.PI, 0); c.fill();
      if (v.variant === 'hiker') { c.fillStyle = '#6b4f2a'; c.fillRect(-5.5, -17, 3.4, 7); } // sac à dos
    } else {
      const s = v.size === 'big' ? 1.9 : v.size === 'medium' ? 1.3 : 0.8, leg = moving ? Math.sin(ph) * 2.2 : 0, fur = v.col || '#b5835a';
      c.scale(s, s);
      c.strokeStyle = fur; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-5, -5); c.lineTo(-5 - leg, 0); c.moveTo(-2, -5); c.lineTo(-2 + leg, 0); c.moveTo(3, -5); c.lineTo(3 - leg, 0); c.moveTo(6, -5); c.lineTo(6 + leg, 0); c.stroke();
      c.fillStyle = fur; c.beginPath(); c.ellipse(0.5, -7.5, 7.5, 3.6, 0, 0, TAU); c.fill();
      c.beginPath(); c.arc(8.5, -10.5, 3.2, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(7, -13.5, 1.2, 2.4, -0.4, 0, TAU); c.fill();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(-7, -8); c.quadraticCurveTo(-11, -10 + Math.sin(time * 9) * 2, -10, -14); c.stroke(); // queue qui remue
      c.fillStyle = '#1b1b26'; c.beginPath(); c.arc(9.6, -11, 0.6, 0, TAU); c.fill();
    }
    c.restore();
  }

  // Trafic à contresens : avion, hélicoptère ou soucoupe, avec un chevron d'alerte tant qu'il est hors champ.
  traffic(c, L, def, g, time, camX) {
    for (let i = 0; i < L.traffic.length; i++) {
      const q = L.traffic[i], x = g.trafficX(i);
      if (!(x > camX - 70)) continue;
      if (x > camX + VW + 30) {
        if (Math.sin(time * 14) > -0.2) {
          const wy = q.y, wx = camX + VW - 14;
          c.fillStyle = '#ff5a5a'; c.beginPath(); c.moveTo(wx - 9, wy); c.lineTo(wx + 5, wy - 10); c.lineTo(wx + 5, wy + 10); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(wx - 4, wy); c.lineTo(wx + 2.5, wy - 5); c.lineTo(wx + 2.5, wy + 5); c.fill();
        }
        continue;
      }
      const y = q.y;
      c.save(); c.translate(x, y); c.scale(-1, 1);
      if (q.kind === 'plane') {
        const col = mix(def.obs, def.rim, 0.22);
        c.fillStyle = col;
        c.beginPath(); c.moveTo(22, 1); c.quadraticCurveTo(18, -6, 6, -6); c.lineTo(-22, -3); c.lineTo(-30, -14); c.lineTo(-26, -1); c.lineTo(-8, 5); c.quadraticCurveTo(14, 7, 22, 1); c.fill();
        c.beginPath(); c.moveTo(6, 0); c.lineTo(-10, 9); c.lineTo(-14, 9); c.lineTo(-6, 0); c.fill();
        c.fillStyle = rgba(def.accent, 0.85); c.beginPath(); c.moveTo(18, -1); c.quadraticCurveTo(15, -5, 8, -5); c.lineTo(8, -1); c.fill();
        c.fillStyle = rgba('#ffffff', 0.25); c.beginPath(); c.ellipse(23, 0.5, 1.5, 10, 0, 0, TAU); c.fill();
        c.fillStyle = Math.sin(time * 9) > 0 ? '#ff4d6d' : rgba('#ff4d6d', 0.3); c.beginPath(); c.arc(-28, -13, 1.6, 0, TAU); c.fill();
      } else drawHeli(c, q.kind === 'ufo' ? HELIS[HELIS.length - 1].look : HELIS[2 + Math.floor(q.seed * 12)].look, time, 0.8);
      c.restore();
    }
  }

  items(c, L, def, g, time, x0, x1) {
    for (let i = 0; i < L.items.length; i++) {
      const it = L.items[i];
      if (it.x > x1) break;
      if (it.x < x0 || g.taken[i]) continue;
      const y = it.y + Math.sin(time * 3 + it.x * 0.05) * 2.5;
      if (it.type === 'orb') {
        const sq = Math.abs(Math.cos(time * 2.4 + it.x * 0.03)) * 0.75 + 0.25;
        c.fillStyle = 'rgba(255,200,60,.2)'; c.beginPath(); c.arc(it.x, y, 10, 0, 7); c.fill();
        c.fillStyle = '#f2a900'; c.beginPath(); c.ellipse(it.x, y, 6.2 * sq, 6.2, 0, 0, 7); c.fill();
        c.fillStyle = '#ffd34d'; c.beginPath(); c.ellipse(it.x, y, 4.4 * sq, 4.4, 0, 0, 7); c.fill();
      } else if (it.type === 'ring') {
        c.lineWidth = 7; c.strokeStyle = rgba(def.accent, 0.22); c.beginPath(); c.ellipse(it.x, it.y, 11, 32, 0, 0, 7); c.stroke();
        c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke();
        c.lineWidth = 1.5; c.strokeStyle = def.accent; c.beginPath(); c.ellipse(it.x, it.y, 11 + 3 * Math.sin(time * 4), 32 + 3 * Math.sin(time * 4), 0, 0, 7); c.stroke();
      } else {
        c.fillStyle = 'rgba(255,211,77,.22)'; c.beginPath(); c.arc(it.x, y, 17, 0, 7); c.fill();
        c.fillStyle = '#ffd34d'; c.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5 + Math.sin(time * 2 + it.x) * 0.15, r = k % 2 ? 5 : 11.5; c.lineTo(it.x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.fill();
        c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(it.x - 2, y - 2.500, 2.2, 0, 7); c.fill();
      }
    }
  }

  obstacle(c, o, t, time, def, hi) {
    const col = def.obs, x = o.x;
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.kind === 'tunnel') return; // dessiné avec le relief
    if (o.kind === 'tree') {
      const top = o.y, b = o.g + 30, w = o.w, h = o.h;
      switch (TREE_ALIAS[o.st] || o.st) {
        case 'pine':
          for (let i = 0; i < 3; i++) {
            const ay = top + i * h * 0.22, by = top + (i + 1) * h * 0.36 + (i === 2 ? h : 0), hw = ((w / 2) * (Math.min(by, b) - top)) / (b - top) * 1.2;
            c.beginPath(); c.moveTo(x, ay); c.lineTo(x + hw, Math.min(by, b)); c.lineTo(x - hw, Math.min(by, b)); c.fill();
          }
          if (def.weather === 'snow') { c.fillStyle = def.rim; c.beginPath(); c.moveTo(x, top); c.lineTo(x + w * 0.12, top + h * 0.16); c.lineTo(x, top + h * 0.12); c.lineTo(x - w * 0.12, top + h * 0.16); c.fill(); }
          break;
        case 'round': {
          const r = w / 2;
          c.fillRect(x - 3, top + r, 6, h);
          for (const [dx, dy, k] of [[0, 1, 1], [-0.55, 1.35, 0.6], [0.5, 1.4, 0.55]]) { c.beginPath(); c.arc(x + r * dx, top + r * dy, r * k, 0, TAU); c.fill(); }
          c.fillStyle = rgba(def.rim, 0.14); c.beginPath(); c.arc(x - r * 0.25, top + r * 0.7, r * 0.55, 0, 7); c.fill();
          break;
        }
        case 'cactus':
          c.lineWidth = w; c.beginPath(); c.moveTo(x, b); c.lineTo(x, top + w / 2); c.stroke();
          c.lineWidth = w * 0.6; c.beginPath(); c.moveTo(x, top + h * 0.55); c.lineTo(x - w * 0.9, top + h * 0.55); c.lineTo(x - w * 0.9, top + h * 0.3);
          c.moveTo(x, top + h * 0.7); c.lineTo(x + w * 0.9, top + h * 0.7); c.lineTo(x + w * 0.9, top + h * 0.42); c.stroke();
          break;
        case 'palm': {
          const r = w / 2, cy = top + r, sway = Math.sin(time * 1.5 + x) * 2;
          c.lineWidth = 5; c.beginPath(); c.moveTo(x + 4, b); c.quadraticCurveTo(x + 8, cy + h * 0.4, x, cy); c.stroke();
          c.lineWidth = 3.4; c.beginPath();
          for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI; c.moveTo(x, cy); c.quadraticCurveTo(x + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.9 - 6, x + Math.cos(a) * r + sway, cy + Math.sin(a) * r * 0.5 + r * 0.45); }
          c.stroke();
          break;
        }
        case 'bamboo':
          for (let i = -1; i <= 1; i++) {
            const bx = x + i * w * 0.32, bt = top + Math.abs(i) * 14;
            c.lineWidth = 3.4; c.beginPath(); c.moveTo(bx, b); c.lineTo(bx + Math.sin(time + x + i) * 1.5, bt); c.stroke();
            c.lineWidth = 1.6; c.beginPath();
            for (let y = bt + 10; y < o.g; y += 34) { c.moveTo(bx, y); c.lineTo(bx + (i || 1) * 9, y - 7); }
            c.stroke();
          }
          break;
        case 'dead':
          c.beginPath(); c.moveTo(x - w * 0.12, b); c.lineTo(x, top); c.lineTo(x + w * 0.12, b); c.fill();
          c.lineWidth = 2.4; c.beginPath();
          for (let i = 1; i < 4; i++) { const y = top + h * i * 0.22, sgn = i % 2 ? 1 : -1, l = w * 0.1 * (i + 1); c.moveTo(x, y + 8); c.lineTo(x + sgn * l, y - 4); }
          c.stroke();
          break;
        case 'crystal':
          c.beginPath(); c.moveTo(x - w / 2, b); c.lineTo(x, top); c.lineTo(x + w / 2, b); c.fill();
          c.fillStyle = rgba(def.accent, 0.35); c.beginPath(); c.moveTo(x, top); c.lineTo(x + w / 2, b); c.lineTo(x + w * 0.12, b); c.fill();
          break;
        case 'mushroom': {
          const r = w / 2;
          c.fillStyle = mix(col, def.rim, 0.25); c.fillRect(x - Math.max(4, r * 0.16), top + r * 0.5, Math.max(8, r * 0.32), h + 30);
          c.fillStyle = col; c.beginPath(); c.arc(x, top + r, r, Math.PI, 0); c.quadraticCurveTo(x, top + r * 1.35, x - r, top + r); c.fill();
          c.fillStyle = rgba(def.accent, 0.75);
          for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (hash(i, o.v * 9) - 0.5) * r * 1.3, top + r * (0.35 + 0.4 * hash(i, o.v * 5)), r * 0.11 + 1, 0, 7); c.fill(); }
          c.fillStyle = rgba(def.accent, 0.12); c.beginPath(); c.arc(x, top + r, r * 1.5, 0, 7); c.fill();
          break;
        }
        case 'baobab': {
          const r = w / 2, tw = Math.max(9, w * 0.3);
          c.beginPath(); c.moveTo(x - tw * 0.8, b); c.quadraticCurveTo(x - tw * 0.4, top + h * 0.5, x - tw * 0.5, top + r); c.lineTo(x + tw * 0.5, top + r); c.quadraticCurveTo(x + tw * 0.4, top + h * 0.5, x + tw * 0.8, b); c.fill();
          c.beginPath(); c.ellipse(x, top + r * 0.7, r, r * 0.55, 0, 0, 7); c.ellipse(x - r * 0.5, top + r * 1.0, r * 0.5, r * 0.3, 0, 0, 7); c.ellipse(x + r * 0.55, top + r * 1.05, r * 0.45, r * 0.28, 0, 0, 7); c.fill();
          break;
        }
        case 'totem':
          c.fillRect(x - w / 2, top, w, h + 30);
          c.fillStyle = rgba(def.accent, 0.7);
          for (let y = top + 8; y < top + h - 10; y += 26) { c.fillRect(x - w / 2 + 3, y, 4, 4); c.fillRect(x + w / 2 - 7, y, 4, 4); c.fillRect(x - 3, y + 9, 6, 3); }
          c.fillStyle = col; c.fillRect(x - w / 2 - 5, top + 4, w + 10, 5);
          break;
        case 'lamp': {
          c.fillRect(x - 1.5, top + 4, 3, h + 26); c.fillRect(x - 1.5, top + 4, 12, 2.5);
          const gl = c.createRadialGradient(x + 10, top + 9, 1, x + 10, top + 9, 34);
          gl.addColorStop(0, rgba(def.accent, 0.6)); gl.addColorStop(1, rgba(def.accent, 0));
          c.fillStyle = gl; c.fillRect(x - 24, top - 25, 68, 68);
          c.fillStyle = def.accent; c.beginPath(); c.arc(x + 10, top + 9, 3.2, 0, 7); c.fill();
          break;
        }
        default: // antenne
          c.fillRect(x - 2, top, 4, h + 30);
          c.fillRect(x - w / 2, top + 16, w, 2); c.fillRect(x - w / 2, top + 30, w, 2);
          c.fillStyle = Math.sin(time * 4 + x) > 0 ? '#ff4d6d' : rgba('#ff4d6d', 0.25); c.beginPath(); c.arc(x, top, 3, 0, 7); c.fill();
      }
      return;
    }
    if (o.kind === 'pillar') {
      const l = x - o.w / 2, top = o.y, w = o.w, h = o.h;
      if (o.st !== 'rock') c.fillRect(l, top, w, h);
      switch (o.st) {
        case 'building': case 'neon': {
          const neon = o.st === 'neon';
          c.fillRect(x - 1.5, top - 14, 3, 14);
          if (hi) for (let r = 0; r < Math.min(26, h / 13 - 1); r++) for (let k = 0; k < 3; k++) {
            const hv = hash(r * 5 + k, o.v * 99);
            if (hv > 0.5) { c.fillStyle = rgba(neon ? (hv > 0.78 ? def.rim : def.accent) : def.accent, neon ? 0.85 : 0.7); c.fillRect(l + 6 + (k * (w - 10)) / 3, top + 8 + r * 13, (w - 22) / 3, 6); }
          }
          c.fillStyle = neon ? def.rim : rgba(def.rim, 0.5); c.fillRect(l, top, w, 2);
          if (neon) { c.fillStyle = rgba(def.accent, 0.9); c.fillRect(l, top, 2, h); }
          break;
        }
        case 'lighthouse': {
          c.fillStyle = rgba('#ffffff', 0.2);
          for (let y = top + 34; y < top + h; y += 44) c.fillRect(l, y, w, 16);
          c.fillStyle = def.accent; c.fillRect(l + 5, top + 6, w - 10, 12);
          const a = time * 1.2 + o.v * 6, d = Math.cos(a);
          c.fillStyle = rgba(def.accent, 0.16); c.beginPath(); c.moveTo(x, top + 12); c.lineTo(x + d * 220, top - 16); c.lineTo(x + d * 220, top + 44); c.fill();
          break;
        }
        case 'pagoda':
          for (let y = top, i = 0; y < top + h - 20 && i < 9; y += 48, i++) {
            c.fillStyle = col; c.beginPath(); c.moveTo(l - 13, y + 9); c.quadraticCurveTo(x, y + 2, x, y - (i ? 0 : 12)); c.quadraticCurveTo(x, y + 2, l + w + 13, y + 9); c.lineTo(l + w, y + 12); c.lineTo(l, y + 12); c.fill();
            c.fillStyle = rgba(def.accent, 0.75); c.fillRect(x - 5, y + 22, 10, 12);
          }
          break;
        case 'ice':
          c.fillStyle = rgba('#ffffff', 0.4); c.beginPath(); c.moveTo(l, top); c.lineTo(l + w * 0.35, top); c.lineTo(l + w * 0.15, top + h); c.lineTo(l, top + h); c.fill();
          c.fillStyle = def.rim; c.fillRect(l, top, w, 3);
          break;
        case 'basalt':
          c.strokeStyle = rgba(def.rim, 0.22); c.lineWidth = 1; c.beginPath();
          for (let k = 1; k < 4; k++) { c.moveTo(l + (k * w) / 4, top); c.lineTo(l + (k * w) / 4, top + h); }
          c.stroke();
          c.fillStyle = rgba(def.rim, 0.6); c.fillRect(l, top, w, 2);
          break;
        case 'mesa':
          c.fillStyle = rgba(def.rim, 0.16);
          for (let y = top + 10; y < top + h; y += 30) c.fillRect(l, y, w, 5 + 6 * hash(y, o.v));
          c.fillStyle = rgba(def.rim, 0.5); c.fillRect(l, top, w, 2.5);
          break;
        case 'castle':
          for (let k = 0; k < 4; k++) c.fillRect(l - 4 + (k * (w + 8)) / 4 + 1, top - 9, (w + 8) / 4 - 4, 10);
          c.fillRect(l - 4, top, w + 8, 12);
          c.fillStyle = rgba(def.accent, 0.8);
          for (let y = top + 34; y < top + h - 30; y += 62) { c.beginPath(); c.arc(x, y, 4, Math.PI, 0); c.lineTo(x + 4, y + 10); c.lineTo(x - 4, y + 10); c.fill(); }
          c.fillStyle = rgba(def.rim, 0.1); c.fillRect(l, top, w * 0.3, h);
          break;
        case 'chimney':
          c.fillStyle = rgba('#ffffff', 0.22); c.fillRect(l, top + 8, w, 12); c.fillStyle = rgba('#ff3b3b', 0.55); c.fillRect(l, top + 30, w, 12);
          c.fillStyle = Math.sin(time * 3 + o.v * 9) > 0 ? '#ff4d6d' : rgba('#ff4d6d', 0.3); c.beginPath(); c.arc(x, top - 3, 3, 0, 7); c.fill();
          if (Math.random() < 0.06 && this.parts.length < 200) this.spawn(x, top - 4, 1, { a: -Math.PI / 2, spread: 0.5, v: 26, col: 'rgba(60,60,70,.35)', life: 2.2, size: 5, grow: 9 });
          break;
        case 'ruin':
          c.fillRect(l - 6, top, w + 12, 9); c.fillRect(l - 3, top + 9, w + 6, 5);
          c.strokeStyle = rgba(def.rim, 0.2); c.lineWidth = 1.4; c.beginPath();
          for (let k = 1; k < 5; k++) { c.moveTo(l + (k * w) / 5, top + 16); c.lineTo(l + (k * w) / 5, top + h); }
          c.stroke();
          c.fillStyle = rgba(def.rim, 0.5); c.fillRect(l - 6, top, w + 12, 2);
          break;
        case 'container':
          for (let y = top, k = 0; y < top + h; y += 30, k++) {
            c.fillStyle = [rgba(def.accent, 0.5), rgba(def.rim, 0.28), rgba('#e05a4a', 0.5), rgba('#4aa0e0', 0.45)][(k + ((o.v * 7) | 0)) % 4]; c.fillRect(l + 1, y + 1, w - 2, 28);
            c.strokeStyle = rgba('#000000', 0.25); c.lineWidth = 1; c.beginPath(); for (let q = 1; q < 6; q++) { c.moveTo(l + (q * w) / 6, y + 3); c.lineTo(l + (q * w) / 6, y + 27); } c.stroke();
          }
          break;
        case 'monolith':
          c.strokeStyle = rgba(def.accent, 0.55 + 0.3 * Math.sin(time * 2 + o.v * 20)); c.lineWidth = 1.6; c.beginPath();
          c.moveTo(x, top + 8); c.lineTo(x, top + h * 0.3); c.lineTo(x - w * 0.25, top + h * 0.38); c.lineTo(x - w * 0.25, top + h * 0.6);
          c.moveTo(x, top + h * 0.3); c.lineTo(x + w * 0.25, top + h * 0.45); c.lineTo(x + w * 0.25, top + h * 0.8); c.stroke();
          c.fillStyle = rgba(def.accent, 0.8); c.fillRect(l, top, w, 2);
          break;
        default: { // rocher : sommet irrégulier, flancs légèrement évasés
          const j = (k) => hash(k, o.v * 77) * 9;
          c.beginPath(); c.moveTo(l - 4, top + h); c.lineTo(l, top + 16); c.lineTo(l + 2, top + 5 + j(1)); c.lineTo(l + w * 0.25, top + j(2) * 0.4); c.lineTo(l + w * 0.5, top); c.lineTo(l + w * 0.75, top + j(3) * 0.5); c.lineTo(l + w - 2, top + 4 + j(4)); c.lineTo(l + w, top + 18); c.lineTo(l + w + 4, top + h); c.fill();
          c.fillStyle = rgba(def.rim, 0.13); c.beginPath(); c.moveTo(l - 4, top + h); c.lineTo(l, top + 16); c.lineTo(l + 2, top + 5 + j(1)); c.lineTo(l + w * 0.25, top + j(2) * 0.4); c.lineTo(l + w * 0.34, top + h); c.fill();
          c.strokeStyle = rgba(def.rim, 0.55); c.lineWidth = 2; c.beginPath(); c.moveTo(l + 2, top + 5 + j(1)); c.lineTo(l + w * 0.25, top + j(2) * 0.4); c.lineTo(l + w * 0.5, top); c.lineTo(l + w * 0.75, top + j(3) * 0.5); c.lineTo(l + w - 2, top + 4 + j(4)); c.stroke();
        }
      }
      return;
    }
    if (o.kind === 'shelter') { // abri traversant : une dalle portée par deux piliers d'arrière-plan (on passe devant)
      const l = x - 100, top = o.y, built = o.st === 'building', neon = def.extras.includes('neon');
      c.fillStyle = mix(def.obs, '#000000', 0.35);
      for (const px of [l + 4, l + 182]) c.fillRect(px, top + 60, 14, o.g + 24 - top - 60); // piliers (décor, sans collision)
      c.fillStyle = rgba('#000000', 0.2); c.fillRect(l + 18, top + 62, 164, o.g - top - 62);
      c.fillStyle = col;
      if (built) {
        c.fillRect(l, top, 200, 62); c.fillRect(l + 60, top - 12, 3, 12);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) {
          const hv = hash(r * 11 + k, o.v * 60);
          if (hv > 0.4) { c.fillStyle = rgba(neon && hv > 0.75 ? def.rim : def.accent, 0.75); c.fillRect(l + 8 + k * 21, top + 9 + r * 17, 13, 7); }
        }
        c.fillStyle = neon ? def.rim : rgba(def.rim, 0.5); c.fillRect(l, top, 200, 2); c.fillRect(l, top + 60, 200, 2);
      } else {
        const j = (k) => hash(k, o.v * 91) * 8;
        c.beginPath(); c.moveTo(l - 5, top + 46); c.lineTo(l, top + 8 + j(1)); c.lineTo(l + 50, top - 4 + j(2)); c.lineTo(l + 120, top - 6); c.lineTo(l + 196, top + 2 + j(3)); c.lineTo(l + 205, top + 44);
        c.quadraticCurveTo(l + 196, top + 62, l + 180, top + 62); c.lineTo(l + 20, top + 62); c.quadraticCurveTo(l + 2, top + 62, l - 5, top + 46); c.fill();
        c.strokeStyle = rgba(def.rim, 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(l, top + 8 + j(1)); c.lineTo(l + 50, top - 4 + j(2)); c.lineTo(l + 120, top - 6); c.lineTo(l + 196, top + 2 + j(3)); c.stroke();
        c.strokeStyle = rgba(def.rim, 0.25); c.lineWidth = 1.5; c.beginPath(); c.moveTo(l + 20, top + 62); c.lineTo(l + 180, top + 62); c.stroke();
      }
      return;
    }
    if (o.kind === 'hang') {
      const bot = o.y, w = o.w;
      switch (o.st) {
        case 'stalactite': case 'icicle':
          c.beginPath(); c.moveTo(x - w / 2, -80); c.lineTo(x + w / 2, -80); c.lineTo(x, bot); c.fill();
          if (o.st === 'icicle') { c.fillStyle = rgba('#ffffff', 0.45); c.beginPath(); c.moveTo(x - w / 2, -80); c.lineTo(x - w * 0.2, -80); c.lineTo(x, bot); c.fill(); }
          break;
        case 'rock':
          c.beginPath(); c.moveTo(x - w / 2, -80); c.lineTo(x + w / 2, -80); c.lineTo(x + w * 0.3, bot); c.lineTo(x - w * 0.3, bot); c.fill();
          c.fillStyle = rgba(def.rim, 0.45); c.fillRect(x - w * 0.3, bot - 2.5, w * 0.6, 2.5);
          break;
        case 'vine':
          c.lineWidth = 7; c.beginPath(); c.moveTo(x, -80);
          for (let y = -40; y < bot; y += 40) c.quadraticCurveTo(x + (((y / 40) & 1) ? 6 : -6), y - 20, x, Math.min(y + 0, bot));
          c.lineTo(x, bot - 4); c.stroke();
          c.fillStyle = mix(col, def.rim, 0.3);
          for (let y = 30; y < bot; y += 46) { const sg = ((y / 46) & 1) ? 1 : -1; c.beginPath(); c.ellipse(x + sg * 7, y, 7, 3.4, sg * 0.6, 0, 7); c.fill(); }
          break;
        case 'cloud': { // masse nuageuse sombre : s'élargit vers le haut, volutes éclairées, base plate
          const r = w * 0.3, cc = mix(def.ground, '#5d6478', 0.6), hl = mix(cc, '#ffffff', 0.3), dk = mix(cc, '#000000', 0.3);
          const puff = (px, py, pr) => { c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill(); };
          c.fillStyle = cc; c.fillRect(x - w * 0.36, -80, w * 0.72, bot - r + 80);
          for (let y = bot - r * 1.6, k = 0; y > -60; y -= r * 0.85, k++) {
            const grow = 1 + 0.5 * Math.min(1, (bot - y) / 260), pr = r * (0.62 + 0.2 * hash(k, o.v * 31)) * grow;
            c.fillStyle = cc; puff(x - w * 0.34 * grow, y, pr); puff(x + w * 0.34 * grow, y - r * 0.4, pr);
            c.fillStyle = hl; puff(x - w * 0.34 * grow - pr * 0.2, y - pr * 0.25, pr * 0.62);
          }
          c.fillStyle = cc; puff(x - w * 0.24, bot - r, r); puff(x + w * 0.24, bot - r, r); puff(x, bot - r * 1.05, r * 1.05);
          c.fillStyle = hl; puff(x - w * 0.3, bot - r * 1.35, r * 0.55); puff(x + w * 0.12, bot - r * 1.7, r * 0.5);
          c.fillStyle = dk; c.beginPath(); c.ellipse(x, bot - r * 0.28, w * 0.46, r * 0.42, 0, 0, Math.PI); c.fill(); // base plate et sombre
          break;
        }
        default: { // grue, enseigne
          c.fillRect(x - 1.5, -80, 3, bot + 40);
          const sign = o.st === 'sign';
          c.fillStyle = col; c.fillRect(x - w / 2, bot - 44, w, 44);
          if (sign) { c.strokeStyle = Math.sin(time * 6 + o.v * 30) > -0.8 ? def.rim : rgba(def.rim, 0.3); c.lineWidth = 2; c.strokeRect(x - w / 2 + 4, bot - 40, w - 8, 36); c.fillStyle = def.accent; c.fillRect(x - w / 4, bot - 26, w / 2, 3); c.fillRect(x - w / 4, bot - 18, w / 3, 3); }
          else { c.fillStyle = def.accent; for (let k = 0; k < w - 8; k += 16) { c.beginPath(); c.moveTo(x - w / 2 + k, bot); c.lineTo(x - w / 2 + k + 8, bot); c.lineTo(x - w / 2 + k + 16, bot - 8); c.lineTo(x - w / 2 + k + 8, bot - 8); c.fill(); } }
        }
      }
      return;
    }
    if (o.kind === 'mover') {
      const y = moverY(o, t);
      switch (o.st === 'bat' ? 'bird' : o.st) {
        case 'balloon':
          c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 9, y + 16); c.lineTo(x - 4, y + 27); c.moveTo(x + 9, y + 16); c.lineTo(x + 4, y + 27); c.stroke();
          c.fillStyle = col; c.fillRect(x - 5, y + 26, 10, 7);
          c.fillStyle = def.rim; c.beginPath(); c.arc(x, y, 20, 0, 7); c.fill();
          c.fillStyle = def.accent; c.beginPath(); c.ellipse(x, y, 8, 20, 0, 0, 7); c.fill();
          break;
        case 'bird': {
          const f = Math.sin(time * 9 + o.v * 9) * 12;
          c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 13, 6, 0, 0, 7); c.fill();
          c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 2, y - 8 - f); c.lineTo(x + 20, y - f * 1.3 - 6); c.lineTo(x + 6, y); c.fill();
          c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x - 22, y - 4); c.lineTo(x - 21, y + 4); c.fill();
          c.fillStyle = def.accent; c.beginPath(); c.moveTo(x + 12, y - 2); c.lineTo(x + 19, y + 1); c.lineTo(x + 12, y + 2); c.fill();
          break;
        }
        case 'lantern': {
          const gr = c.createRadialGradient(x, y, 4, x, y, 40);
          gr.addColorStop(0, 'rgba(255,170,60,.55)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
          c.fillStyle = gr; c.fillRect(x - 40, y - 40, 80, 80);
          c.fillStyle = '#ff9a3c'; c.beginPath(); c.ellipse(x, y, 15, 19, 0, 0, 7); c.fill();
          c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(x, y + 2, 8, 11, 0, 0, 7); c.fill();
          c.fillStyle = col; c.fillRect(x - 8, y - 21, 16, 4); c.fillRect(x - 8, y + 17, 16, 4);
          break;
        }
        case 'rock': {
          const gr = c.createRadialGradient(x, y, 6, x, y, 38);
          gr.addColorStop(0, 'rgba(255,120,30,.6)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
          c.fillStyle = gr; c.fillRect(x - 38, y - 38, 76, 76);
          c.fillStyle = '#2a0d0d'; c.beginPath();
          for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + time, r = 16 + 5 * hash(i, o.v * 50); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
          c.fill();
          c.strokeStyle = '#ff7a2a'; c.lineWidth = 1.5; c.stroke();
          break;
        }
        case 'jelly': {
          const pu = Math.sin(time * 3 + o.v * 9) * 2;
          c.fillStyle = rgba(def.accent, 0.2); c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill();
          c.strokeStyle = rgba(def.accent, 0.7); c.lineWidth = 2; c.beginPath();
          for (let k = -2; k <= 2; k++) { c.moveTo(x + k * 6, y + 4); c.quadraticCurveTo(x + k * 6 + Math.sin(time * 4 + k) * 5, y + 16, x + k * 7, y + 26 + pu); }
          c.stroke();
          c.fillStyle = def.accent; c.beginPath(); c.arc(x, y + 2, 19 + pu, Math.PI, 0); c.quadraticCurveTo(x, y + 9, x - 19 - pu, y + 2); c.fill();
          c.fillStyle = rgba('#ffffff', 0.45); c.beginPath(); c.arc(x - 6, y - 7, 5, 0, 7); c.fill();
          break;
        }
        case 'mine': {
          c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
          for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + time * 0.6; c.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); c.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); }
          c.stroke();
          c.fillStyle = col; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill();
          c.strokeStyle = rgba(def.rim, 0.6); c.lineWidth = 1.5; c.stroke();
          c.fillStyle = Math.sin(time * 7 + o.v * 9) > 0 ? '#ff3b5c' : rgba('#ff3b5c', 0.3); c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
          break;
        }
        default: // drone
          c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 13, 8, 0, 0, 7); c.fill();
          c.lineWidth = 3; c.strokeStyle = col; c.beginPath(); c.moveTo(x - 20, y - 8); c.lineTo(x + 20, y - 8); c.stroke();
          c.fillStyle = rgba(def.accent, 0.4); c.beginPath(); c.ellipse(x - 17, y - 11, 9 * Math.abs(Math.sin(time * 30)) + 2, 2, 0, 0, 7); c.ellipse(x + 17, y - 11, 9 * Math.abs(Math.cos(time * 30)) + 2, 2, 0, 0, 7); c.fill();
          c.fillStyle = Math.sin(time * 8) > 0 ? '#ff3b5c' : def.accent; c.beginPath(); c.arc(x, y + 2, 3.5, 0, 7); c.fill();
      }
      return;
    }
    if (o.kind === 'mill') {
      const a = millAngle(o, t);
      c.beginPath(); c.moveTo(x - 6, o.g); c.lineTo(x - 3.5, o.y); c.lineTo(x + 3.5, o.y); c.lineTo(x + 6, o.g); c.fill();
      const neon = def.extras.includes('neon');
      c.strokeStyle = neon ? def.rim : mix(col, def.rim, 0.35); c.lineWidth = 8;
      c.beginPath();
      for (let i = 0; i < 3; i++) { const b = a + (i * TAU) / 3; c.moveTo(x, o.y); c.lineTo(x + Math.cos(b) * o.len, o.y + Math.sin(b) * o.len); }
      c.stroke();
      c.fillStyle = def.accent; c.beginPath(); c.arc(x, o.y, 5, 0, 7); c.fill();
      return;
    }
    if (o.kind === 'geyser') {
      const st = geyserState(o, t), gc = GEYSER_COL[o.st] || '#fff', hw = o.w / 2 - 6;
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 26, o.g + 6); c.lineTo(x - 13, o.g - 9); c.lineTo(x + 13, o.g - 9); c.lineTo(x + 26, o.g + 6); c.fill();
      if (st.warn > 0) {
        c.fillStyle = rgba(gc, 0.3 + 0.5 * st.warn * Math.abs(Math.sin(time * 18)));
        c.beginPath(); c.arc(x, o.g - 10, 5 + st.warn * 9, 0, 7); c.fill();
        c.fillStyle = rgba(gc, 0.12 * st.warn); c.fillRect(x - hw, -80, hw * 2, o.g + 70);
      }
      if (st.h > 0) {
        const top = lerp(o.g, -80, st.h);
        c.fillStyle = rgba(gc, 0.3); c.fillRect(x - hw - 6, top, hw * 2 + 12, o.g - top);
        c.fillStyle = rgba(gc, o.st === 'steam' ? 0.6 : 0.9);
        c.beginPath(); c.moveTo(x - hw, o.g - 8);
        for (let y = o.g - 8; y > top; y -= 24) c.lineTo(x - hw + Math.sin(y * 0.09 + time * 22) * 4, y);
        for (let y = top; y < o.g - 8; y += 24) c.lineTo(x + hw + Math.sin(y * 0.09 - time * 22) * 4, y);
        c.lineTo(x + hw, o.g - 8); c.fill();
        c.fillStyle = rgba('#ffffff', 0.7); c.fillRect(x - hw * 0.3, top, hw * 0.6, o.g - top - 8);
      }
    }
  }

  weather(c, def, vh, time, dt, camDX) {
    const w = def.weather;
    if (!w) return;
    const A = this.amb;
    c.lineCap = 'round';
    for (const q of A) {
      let vx = 0, vy = 0;
      if (w === 'snow') { vx = -20 + Math.sin(time + q.ph) * 16; vy = 50 * q.z; }
      else if (w === 'rain') { vx = -120; vy = 620 * q.z; }
      else if (w === 'embers') { vx = Math.sin(time * 2 + q.ph) * 20; vy = -50 * q.z; }
      else if (w === 'fireflies') { vx = Math.sin(time * 0.8 + q.ph) * 14; vy = Math.cos(time * 0.6 + q.ph * 2) * 12; }
      else if (w === 'petals') { vx = -26 + Math.sin(time * 1.4 + q.ph) * 22; vy = 34 * q.z; }
      else if (w === 'dust') { vx = -170 * q.z; vy = Math.sin(time + q.ph) * 8; }
      else if (w === 'bubbles') { vx = Math.sin(time * 1.5 + q.ph) * 12; vy = -38 * q.z; }
      q.x += (vx - (camDX / Math.max(dt, 1e-3)) * 0.5 * q.z) * dt; q.y += vy * dt;
      if (q.x < -20) q.x += 440; else if (q.x > 420) q.x -= 440;
      if (q.y > vh + 20) q.y -= vh + 40; else if (q.y < -20) q.y += vh + 40;
      if (w === 'bubbles') { c.strokeStyle = 'rgba(220,250,255,.5)'; c.lineWidth = 1; c.beginPath(); c.arc(q.x, q.y, 2 + 2.5 * q.z, 0, 7); c.stroke(); }
      else if (w === 'snow') { c.fillStyle = `rgba(255,255,255,${0.5 + 0.3 * q.z})`; c.beginPath(); c.arc(q.x, q.y, 1.1 * q.z + 0.4, 0, 7); c.fill(); }
      else if (w === 'rain') { c.strokeStyle = 'rgba(200,215,255,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - 3, q.y + 15 * q.z); c.stroke(); }
      else if (w === 'embers') { c.fillStyle = `rgba(255,${(140 + 80 * Math.sin(time * 5 + q.ph)) | 0},40,${0.5 + 0.4 * Math.sin(time * 3 + q.ph)})`; c.beginPath(); c.arc(q.x, q.y, 1.3 * q.z, 0, 7); c.fill(); }
      else if (w === 'fireflies') { const a = 0.5 + 0.5 * Math.sin(time * 2.4 + q.ph * 3); c.fillStyle = rgba(def.wcol || '#ebff96', a * 0.25); c.beginPath(); c.arc(q.x, q.y, 5, 0, 7); c.fill(); c.fillStyle = rgba(def.wcol || '#f5ffbe', a); c.beginPath(); c.arc(q.x, q.y, 1.4, 0, 7); c.fill(); }
      else if (w === 'petals') { c.fillStyle = rgba(def.wcol || '#ffbecd', 0.8); c.beginPath(); c.ellipse(q.x, q.y, 3 * q.z, 1.5 * q.z, time * 2 + q.ph, 0, 7); c.fill(); }
      else { c.strokeStyle = rgba(def.rim, 0.22); c.lineWidth = 1; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + 14 * q.z, q.y); c.stroke(); }
    }
  }
}
