// Rendu Canvas 2D : ciel, parallaxe, relief, obstacles, objets, particules.
import { clamp, lerp, hash, noise1, fbm, mix, rgba, TAU, DEG } from './util.js';
import { WORLD_H, STEP, moverY, millAngle, geyserState } from './levelgen.js';
import { drawHeli, drawOccupant } from './helidraw.js';
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
    // (ce décalage glisse lentement d'un côté à l'autre au demi-tour, pour que l'œil suive)
    if (this.snap || this.lead == null) this.lead = h.dir;
    else { const dl = h.dir - this.lead; this.lead += Math.sign(dl) * Math.min(Math.abs(dl), dt * (0.5 + 1.1 * Math.min(1, Math.abs(dl)))); }
    const ld = this.lead, e = ld * (1.5 - 0.5 * ld * ld), fw = (e + 1) / 2; // e : même trajet, adouci au départ et à l'arrivée
    const tx = clamp(h.x - VW * (0.5 - 0.2 * e) + clamp(h.vx * 0.22, lerp(-70, -40, fw), lerp(40, 70, fw)), 0, L.length - VW);
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
    if (ex.includes('meteors')) { // pluie de météorites dans le ciel lunaire : traits de feu qui filent vers l'horizon
      for (let k = 0; k < 5; k++) {
        const u = (time * (0.16 + 0.05 * hash(k, 41)) + hash(k, 42)) % 1, mx = VW * (1.1 - 1.3 * u) + hash(k, 43) * 160 - 80, my = vh * (0.04 + 0.5 * u * u) + hash(k, 44) * 60;
        c.strokeStyle = rgba('#ffd9a0', 0.75 * (1 - u)); c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + 46, my - 22); c.stroke();
        c.fillStyle = rgba('#ffffff', 0.9 * (1 - u)); c.beginPath(); c.arc(mx, my, 2.6, 0, TAU); c.fill();
      }
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
    if (L.story) this.story(c, L, def, time, x0, x1);
    for (const o of L.obs) {
      if (o.minX > x1 + 60) break;
      if (o.maxX < x0 - 60) continue;
      if (o.draw) o.draw(c, g.t, time, def); else this.obstacle(c, o, g.t, time, def, hi);
    }
    this.terrain(c, L, def, x0, x1, camY, vh);
    this.pads(c, L, def, g, time, x0, x1);
    if (L.rescue) this.rescue(c, L, def, g, time, x0, x1);
    if (L.cargo) this.cargo(c, L, def, g, time, x0, x1);
    this.items(c, L, def, g, time, x0, x1);
    if (L.race) this.rings(c, L, g, time, x0, x1, 0);
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
      drawHeli(c, look, time, g.state === 'ready' ? 0.8 : h.power, g.vs && look.seats ? this.pax(g, look) : null);
      c.restore();
    }

    // bancs de fumée épaisse (missions en feu) : au premier plan, ils cachent l'appareil qui vole trop haut
    if (L.race) this.rings(c, L, g, time, x0, x1, 1); // moitié avant des anneaux, par-dessus l'appareil
    // Chaque banc tient dans une tranche d'altitude : couloir dégagé au ras du relief, ciel libre au-dessus.
    for (const q of L.clouds || []) {
      const qx = q.xAt(g.t);
      if (qx > camX + VW + 120 || qx + q.w < camX - 120) continue;
      const col = q.col || '#241a18', n = Math.ceil(q.w / 46), mid = (q.top + q.y) / 2, half = (q.y - q.top) / 2;
      c.fillStyle = rgba(col, 0.95); c.fillRect(qx + 50, q.top + 34, q.w - 100, q.y - q.top - 68);
      for (let pass = 0; pass < 2; pass++) for (const sd of [1, -1]) for (let k = 0; k <= n; k++) {
        const e = Math.min(1, k / 2.5, (n - k) / 2.5), r = 36 + 22 * hash(k, q.w + pass * 7 + sd), px = qx + (k / n) * q.w + pass * 17;
        const py = mid + sd * (half - r) * e + Math.sin(time * 0.5 + k * 1.7 + pass + sd) * 4 - pass * sd * 16;
        c.fillStyle = pass ? rgba(mix(col, '#ffffff', 0.09), 0.55) : rgba(col, 0.95);
        c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
      }
    }
    // --- premier plan (écran)
    c.setTransform(s, 0, 0, s, 0, 0);
    this.weather(c, def, vh, time, dt, camDX);
    if (L.smoke) { // fumée ou cendres : nappes sombres qui dérivent et masquent une partie de la vue
      c.fillStyle = L.smoke.col ? rgba(L.smoke.col, 0.5 * L.smoke.density) : `rgba(30,22,20,${0.5 * L.smoke.density})`; // col : brume claire, poussière...
      for (let k = 0; k < 7; k++) {
        // les nappes restent dans une tranche du haut de l'écran : ni sur l'affichage tout en haut, ni dans le couloir de vol près du relief
        const sx2 = ((((hash(k, 21) * 700 - camX * 0.5 - time * (14 + k * 3)) % 700) + 700) % 700) - 150, sy2 = vh * (0.24 + 0.2 * hash(k, 22)), w2 = 110 + hash(k, 23) * 90;
        c.beginPath(); c.ellipse(sx2, sy2, w2, w2 * 0.36, 0, 0, TAU); c.fill();
      }
    }
    if (L.rescue && L.rescue.cfg.radar && g.vs) { // détecteur de victimes : flèche vers la plus proche encore ensevelie
      let best = null;
      for (const v of g.vs) if (v.state === 'wait' && !v.found && (!best || Math.abs(v.px - h.x) < Math.abs(best.px - h.x))) best = v;
      if (best) {
        const d = best.px - h.x, pulse = 0.55 + 0.45 * Math.sin(time * clamp(1800 / Math.abs(d), 3, 22)), ax = VW / 2 + Math.sign(d) * 60, ay = 150;
        c.fillStyle = 'rgba(12,13,32,.6)'; c.beginPath(); c.arc(VW / 2, ay, 30, 0, TAU); c.fill();
        c.strokeStyle = `rgba(110,231,160,${pulse})`; c.lineWidth = 2.5; c.beginPath(); c.arc(VW / 2, ay, 12 + 14 * ((time * 1.4) % 1), 0, TAU); c.stroke();
        c.fillStyle = '#6ee7a0'; c.beginPath(); c.arc(VW / 2, ay, 4, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(ax + Math.sign(d) * 12, ay); c.lineTo(ax - Math.sign(d) * 4, ay - 11); c.lineTo(ax - Math.sign(d) * 4, ay + 11); c.fill();
        c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.fillText(Math.round(Math.abs(d) / 10) + ' m', VW / 2, ay + 50);
      }
    }
    if (def.grain && hi) { // grain de papier (styles aquarelle et papier découpé)
      if (!this._grain) {
        const g2 = document.createElement('canvas'); g2.width = g2.height = 96; const q = g2.getContext('2d'), im = q.createImageData(96, 96);
        for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 26; }
        q.putImageData(im, 0, 0); this._grain = c.createPattern(g2, 'repeat');
      }
      c.globalAlpha = def.grain; c.fillStyle = this._grain; c.fillRect(0, 0, VW, vh); c.globalAlpha = 1;
    }
    gr = c.createRadialGradient(VW / 2, vh / 2, vh * 0.35, VW / 2, vh / 2, vh * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,10,.28)');
    c.fillStyle = gr; c.fillRect(0, 0, VW, vh);
    if ((def.mod || {}).dark && !opts.hideHeli) {
      const hx = h.x - camX, hy = h.y - camY;
      // un appareil équipé d'un projecteur éclaire plus loin, vers l'avant
      const lamp = !!g.H.searchlight, ox = (lamp ? 90 : 40) * h.dir;
      gr = c.createRadialGradient(hx + ox, hy + (lamp ? 30 : 0), lamp ? 110 : 70, hx + ox, hy + (lamp ? 30 : 0), lamp ? 400 : 250);
      gr.addColorStop(0, 'rgba(0,0,8,0)'); gr.addColorStop(1, lamp ? 'rgba(0,0,8,.8)' : 'rgba(0,0,8,.88)');
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
    const style = def.style;
    if (style === 'paper' && !this._inShadow) { // papier découpé : chaque couche projette une ombre sur la suivante
      this._inShadow = true; c.save(); c.translate(4, 7); this.layer(c, st, u0, base, amp, 'rgba(0,0,0,.2)', vh, def, idx, time, false); c.restore(); this._inShadow = false;
    }
    if (style === 'wash' && !this._inShadow) { // aquarelle : un halo plus clair qui déborde, puis la couche en transparence
      this._inShadow = true; c.save(); c.translate(0, -5); c.globalAlpha = 0.3; this.layer(c, st, u0, base, amp, mix(col, '#ffffff', 0.35), vh, def, idx, time, false); c.restore(); this._inShadow = false;
      c.globalAlpha = 0.86;
    }
    this._ridge = style === 'facet' && !this._inShadow ? [] : null;
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
    let r0 = 0;
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
      const ly = style === 'pixel' ? Math.round((base - hh + amp * 0.3) / 7) * 7 : base - hh + amp * 0.3;
      if (style === 'pixel' && x > -step) c.lineTo(x, this._py ?? ly); // marche d'escalier : façon pixel art
      this._py = ly;
      c.lineTo(x, ly);
      if (this._ridge) { if (!this._ridge.length) r0 = Math.round(u / step); this._ridge.push(x, base - hh + amp * 0.3); }
    }
    c.lineTo(VW + 8, vh); c.fill();
    c.globalAlpha = 1;
    if (style === 'hatch' && !this._inShadow) { // gravure : hachures obliques dans la matière de la couche
      c.save(); c.clip();
      c.strokeStyle = 'rgba(40,24,10,.22)'; c.lineWidth = 1; c.beginPath();
      const off = -((u0 * 1) % 9);
      for (let hx = off - vh; hx < VW + 20; hx += 9) { c.moveTo(hx, base - amp); c.lineTo(hx + vh * 0.6, base - amp + vh * 0.6); }
      c.stroke(); c.restore();
    }
    if (this._ridge) { // facettes : pans alternés clairs et sombres sous la crête, arêtes nettes
      const P = this._ridge;
      // chaque pan est attaché à une position fixe du décor (et non de l'écran) : les sommets ne clignotent pas quand on avance
      for (let k = r0 & 1 ? 2 : 0; k + 5 < P.length; k += 4) {
        c.fillStyle = ((r0 + k / 2) / 2) & 1 ? 'rgba(255,255,255,.2)' : 'rgba(20,40,80,.14)';
        c.beginPath(); c.moveTo(P[k], P[k + 1]); c.lineTo(P[k + 4], P[k + 5]); c.lineTo(P[k + 2], Math.max(P[k + 1], P[k + 5]) + 46); c.fill();
      }
    }
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
      if (pad.kind === 'zone') continue; // aucune marque au sol : au joueur de trouver où se poser près des victimes
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

  // Monde Heli Cargo : zones de livraison, charges (au sol, portées, livrées), câble et crochet.
  cargo(c, L, def, g, time, x0, x1) {
    const h = g.heli, loads = g.loads || L.cargo.loads.map((l) => ({ ...l, state: 'ground' }));
    for (const l of loads) { // zone de livraison : cadre rayé et fanion, tant que la charge n'y est pas
      const z = l.to; if (l.state === 'delivered' || z.x < x0 - 120 || z.x > x1 + 120) continue;
      const on = l === g.carry, col = on ? '#7dffb0' : '#ffd34d';
      c.fillStyle = rgba(col, on ? 0.2 + 0.1 * Math.sin(time * 5) : 0.1); c.fillRect(z.x - z.w / 2, z.y - 46, z.w, 46);
      c.fillStyle = col; for (let k = 0; k < z.w - 6; k += 16) { c.beginPath(); c.moveTo(z.x - z.w / 2 + k, z.y); c.lineTo(z.x - z.w / 2 + k + 8, z.y); c.lineTo(z.x - z.w / 2 + k + 13, z.y - 5); c.lineTo(z.x - z.w / 2 + k + 5, z.y - 5); c.fill(); }
      for (const sd of [-1, 1]) { c.fillRect(z.x + sd * z.w / 2 - 1.2, z.y - 46, 2.4, 46); c.beginPath(); c.moveTo(z.x + sd * z.w / 2, z.y - 46); c.lineTo(z.x + sd * (z.w / 2 - 14), z.y - 41); c.lineTo(z.x + sd * z.w / 2, z.y - 36); c.fill(); }
    }
    for (const l of loads) {
      if (l.state === 'carried' || l.x < x0 - 80 || l.x > x1 + 80) continue;
      c.save(); c.translate(l.x, l.y);
      if (l.state === 'ground' && !g.carry) { c.strokeStyle = rgba('#ffffff', 0.5 + 0.3 * Math.sin(time * 4)); c.lineWidth = 1.5; c.setLineDash([4, 4]); c.strokeRect(-l.w / 2 - 5, -l.h - 5, l.w + 10, l.h + 5); c.setLineDash([]); }
      this.load(c, l, def, time); c.restore();
    }
    const hx = h.x, hy = h.y + 10;
    if (g.carry) { // charge portée : câble tendu (ou détendu si elle repose), élingues, charge qui se balance
      const l = g.carry, [lx, ly] = g.loadDraw(), slack = ly < g.loadPos()[1] - 1;
      c.strokeStyle = '#20222c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx, hy);
      if (slack) c.quadraticCurveTo((hx + lx) / 2 + 14, (hy + ly) / 2 + 12, lx, ly - 7); else c.lineTo(lx, ly - 7);
      c.stroke();
      c.lineWidth = 1.1; c.beginPath(); c.moveTo(lx, ly - 7); c.lineTo(lx - l.w * 0.4, ly); c.moveTo(lx, ly - 7); c.lineTo(lx + l.w * 0.4, ly); c.stroke();
      c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(lx, ly - 7, 2.6, 0, TAU); c.fill();
      c.save(); c.translate(lx, ly + l.h); c.rotate(slack ? 0 : -g.th * 0.35); this.load(c, l, def, time); c.restore();
    } else if (g.cable > 0 && g.target) { // le câble descend vers la charge visée ; jauge de prise au-dessus de l'appareil
      const t = g.target, full = t.y - t.h - hy, k = clamp(g.cable / Math.max(1, full), 0, 1);
      c.strokeStyle = '#20222c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + (t.x - hx) * k, hy + g.cable); c.stroke();
      c.strokeStyle = '#ffd34d'; c.lineWidth = 2; c.beginPath(); c.arc(hx + (t.x - hx) * k, hy + g.cable + 3, 3, 0.2, Math.PI + 0.6); c.stroke();
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(hx, h.y - 34, 9, 0, TAU); c.stroke();
      c.strokeStyle = '#6ee7a0'; c.beginPath(); c.arc(hx, h.y - 34, 9, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    }
  }
  // Dessin d'une charge, posée en (0, 0) : l'origine est le milieu de sa base.
  load(c, l, def, time) {
    const w = l.w, hh = l.h, R = (col, x, y, ww, h2) => { c.fillStyle = col; c.fillRect(x, y, ww, h2); };
    const P = (col, pts) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.fill(); };
    const E = (col, x, y, rx, ry = rx, a0 = 0, a1 = TAU) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, a0, a1); c.fill(); };
    const steel = '#8d99ae', dk = '#2b2d42', stone = '#d9b77e', stoneD = '#a8834e';
    switch (l.type) {
      case 'container': R('#c1121f', -w / 2, -hh, w, hh); c.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 4; k < w - 2; k += 6) c.fillRect(-w / 2 + k, -hh + 2, 1.5, hh - 4); R('#780000', -w / 2, -hh, w, 2.5); break;
      case 'tank': E('#e9ecef', 0, -hh / 2, w / 2, hh / 2); R('#e9ecef', -w / 2 + 6, -hh, w - 12, hh); R('#f77f00', -w / 2 + 6, -hh * 0.62, w - 12, 5); R(dk, -w * 0.3, -3, 4, 3); R(dk, w * 0.3 - 4, -3, 4, 3); R(steel, -3, -hh - 4, 6, 4); break;
      case 'pile': R(steel, -w / 2, -hh, w, hh); R('#adb5bd', -w / 2, -hh, 4, hh); for (let y = -hh + 8; y < -4; y += 14) R('#6c757d', -w / 2, y, w, 2); break;
      case 'engine': R('#495057', -w / 2, -hh * 0.75, w, hh * 0.75); R('#6c757d', -w / 2 + 4, -hh, w * 0.5, hh * 0.3); for (let k = 0; k < 4; k++) R('#adb5bd', -w / 2 + 5 + k * 8, -hh * 0.6, 5, hh * 0.35); E('#f77f00', w / 2 - 7, -hh * 0.4, 5); R(dk, -w / 2, -3, w, 3); break;
      case 'anchor': c.strokeStyle = '#343a40'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -hh + 6); c.lineTo(0, -4); c.moveTo(-w / 2 + 3, -12); c.quadraticCurveTo(0, 4, w / 2 - 3, -12); c.moveTo(-7, -hh + 12); c.lineTo(7, -hh + 12); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, -hh + 4, 4, 0, TAU); c.stroke(); break;
      case 'tower': case 'skipylon': case 'mast': { // tronçon de pylône : treillis d'acier
        const col = l.type === 'mast' ? '#9a6b3f' : l.type === 'skipylon' ? '#e63946' : steel;
        if (l.type === 'mast') { R(col, -w / 2 + 2, -hh, w - 4, hh); R('#7a5230', -w / 2 + 2, -hh, 2.5, hh); R(dk, -w, -hh + 6, w * 2, 3); break; }
        c.strokeStyle = col; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w * 0.22, -hh); c.moveTo(w / 2, 0); c.lineTo(w * 0.22, -hh); c.stroke();
        c.lineWidth = 1.3; c.beginPath(); for (let k = 0; k < 4; k++) { const y0 = -(k / 4) * hh, y1 = -((k + 1) / 4) * hh, a = w / 2 - (w * 0.28 * k) / 4, b = w / 2 - (w * 0.28 * (k + 1)) / 4; c.moveTo(-a, y0); c.lineTo(b, y1); c.moveTo(a, y0); c.lineTo(-b, y1); c.moveTo(-b, y1); c.lineTo(b, y1); } c.stroke();
        if (l.type === 'skipylon') { R(dk, -w * 0.9, -hh - 3, w * 1.8, 4); E(dk, -w * 0.8, -hh + 3, 3); E(dk, w * 0.8, -hh + 3, 3); } else R(col, -w * 0.7, -hh, w * 1.4, 2.5);
        break;
      }
      case 'transfo': R('#5c677d', -w / 2, -hh * 0.8, w, hh * 0.8); for (let k = 0; k < 5; k++) R('#33415c', -w / 2 + 3 + k * 7, -hh * 0.7, 3, hh * 0.6); for (const sx of [-10, 0, 10]) { R('#e9ecef', sx - 1.5, -hh, 3, hh * 0.22); E('#e9ecef', sx, -hh, 3, 2); } R('#ffd400', -w / 2, -6, w, 3); break;
      case 'spool': E('#9a6b3f', 0, -hh / 2, hh / 2); E('#3a2a1c', 0, -hh / 2, hh * 0.36); E('#c9a26a', 0, -hh / 2, hh * 0.12); c.strokeStyle = '#1b1b26'; c.lineWidth = 1; for (let r = hh * 0.2; r < hh * 0.36; r += 3) { c.beginPath(); c.arc(0, -hh / 2, r, 0, TAU); c.stroke(); } break;
      case 'crate': R('#b08968', -w / 2, -hh, w, hh); R('#7f5539', -w / 2, -hh, w, 3); R('#7f5539', -w / 2, -3, w, 3); R('#7f5539', -2, -hh, 4, hh); c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(-w / 2, -hh); c.lineTo(w / 2, 0); c.moveTo(w / 2, -hh); c.lineTo(-w / 2, 0); c.stroke(); break;
      case 'gondola': c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(-w / 2 + 5, -hh * 0.8); c.lineTo(w / 2 - 5, -hh * 0.8); c.quadraticCurveTo(w / 2, -hh * 0.8, w / 2, -hh * 0.6); c.lineTo(w / 2, -4); c.quadraticCurveTo(w / 2, 0, w / 2 - 5, 0); c.lineTo(-w / 2 + 5, 0); c.quadraticCurveTo(-w / 2, 0, -w / 2, -4); c.lineTo(-w / 2, -hh * 0.6); c.quadraticCurveTo(-w / 2, -hh * 0.8, -w / 2 + 5, -hh * 0.8); c.fill(); R('#cfeaf5', -w / 2 + 4, -hh * 0.68, w - 8, hh * 0.32); R('#e63946', -1, -hh * 0.68, 2, hh * 0.32); R(dk, -1.5, -hh, 3, hh * 0.22); R(dk, -7, -hh, 14, 3); break;
      case 'logs': for (const [x, y] of [[-w / 2 + 9, -6], [0, -6], [w / 2 - 9, -6], [-8, -15], [8, -15]]) { E('#7f5539', x, y, 8.5, 5.5); E('#ddb892', x, y, 4, 2.6); } c.strokeStyle = dk; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-w / 2 + 2, -2); c.lineTo(0, -hh - 1); c.lineTo(w / 2 - 2, -2); c.stroke(); break;
      case 'snowcat': R('#e63946', -w / 2 + 4, -hh * 0.75, w * 0.5, hh * 0.5); R('#cfeaf5', -w / 2 + 7, -hh * 0.7, w * 0.3, hh * 0.25); R('#c1121f', -w / 2 + 2, -hh * 0.42, w - 6, hh * 0.22); c.fillStyle = dk; c.beginPath(); c.moveTo(-w / 2, -3); c.quadraticCurveTo(-w / 2, -9, -w / 2 + 6, -9); c.lineTo(w / 2 - 6, -9); c.quadraticCurveTo(w / 2, -9, w / 2, -3); c.quadraticCurveTo(w / 2, 0, w / 2 - 5, 0); c.lineTo(-w / 2 + 5, 0); c.quadraticCurveTo(-w / 2, 0, -w / 2, -3); c.fill(); for (let k = 0; k < 4; k++) E('#6c757d', -w / 2 + 8 + k * 10, -4.5, 2.6); P('#adb5bd', [w / 2 - 4, -hh * 0.3, w / 2 + 6, -2, w / 2 - 2, -2]); break;
      case 'urn': R('#b08968', -w / 2, -9, w, 9); c.fillStyle = '#c8553d'; c.beginPath(); c.moveTo(-4, -9); c.quadraticCurveTo(-w * 0.45, -hh * 0.6, -4, -hh + 5); c.lineTo(-3, -hh); c.lineTo(3, -hh); c.lineTo(4, -hh + 5); c.quadraticCurveTo(w * 0.45, -hh * 0.6, 4, -9); c.fill(); R('#f2cc8f', -6, -hh * 0.6, 12, 2.5); break;
      case 'statue': R(stoneD, -w / 2, -6, w, 6); c.fillStyle = stone; c.beginPath(); c.moveTo(-8, -6); c.lineTo(-9, -hh * 0.55); c.lineTo(-6, -hh * 0.75); c.lineTo(6, -hh * 0.75); c.lineTo(9, -hh * 0.55); c.lineTo(8, -6); c.fill(); E(stone, 0, -hh * 0.8, 5.5, 6); P('#1d6fb8', [-8, -hh * 0.72, -5, -hh + 1, 5, -hh + 1, 8, -hh * 0.72, 6, -hh * 0.78, -6, -hh * 0.78]); R('#f2c14e', -1.5, -hh * 0.7, 3, 7); R(stoneD, -9, -hh * 0.45, 18, 2); break;
      case 'sarco': c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(-w / 2, -3); c.quadraticCurveTo(-w / 2, -hh, -w * 0.25, -hh); c.lineTo(w * 0.3, -hh * 0.85); c.quadraticCurveTo(w / 2, -hh * 0.7, w / 2, -3); c.lineTo(w / 2, 0); c.lineTo(-w / 2, 0); c.fill(); for (let k = 0; k < 6; k++) R(k % 2 ? '#1d6fb8' : '#c1121f', -w * 0.1 + k * 5, -hh * 0.8, 3, hh * 0.55); E('#e0a458', -w * 0.32, -hh * 0.6, 5, 6); P('#1d6fb8', [-w * 0.45, -hh * 0.5, -w * 0.32, -hh * 0.98, -w * 0.19, -hh * 0.5, -w * 0.25, -hh * 0.3, -w * 0.4, -hh * 0.3]); E('#e0a458', -w * 0.32, -hh * 0.58, 3.6, 4.4); break;
      case 'obelisk': P(stone, [-w / 2, 0, -w * 0.3, -hh + 8, 0, -hh, w * 0.3, -hh + 8, w / 2, 0]); P(stoneD, [0, -hh, w * 0.3, -hh + 8, w / 2, 0, 1, 0]); P('#f2c14e', [-w * 0.3, -hh + 8, 0, -hh, w * 0.3, -hh + 8]); for (let y = -hh + 16; y < -6; y += 9) R(rgba('#5c4326', 0.6), -3, y, 4, 2.5); break;
      case 'sphinx': R(stoneD, -w / 2, -5, w, 5); c.fillStyle = stone; c.beginPath(); c.moveTo(-w / 2 + 2, -5); c.quadraticCurveTo(-w / 2, -hh * 0.55, -w * 0.2, -hh * 0.55); c.lineTo(w * 0.12, -hh * 0.55); c.lineTo(w * 0.14, -hh * 0.3); c.lineTo(w / 2 - 2, -hh * 0.3); c.lineTo(w / 2 - 2, -5); c.fill(); P('#1d6fb8', [w * 0.02, -hh * 0.45, w * 0.08, -hh, w * 0.32, -hh, w * 0.36, -hh * 0.45]); E(stone, w * 0.2, -hh * 0.72, 5, 6); R('#f2c14e', w * 0.08, -hh, w * 0.24, 2.5); break;
    }
  }

  // Anneaux dorés des courses (monde Heli Race). Chaque anneau est dessiné en deux moitiés, l'une derrière l'appareil,
  // l'autre devant lui, pour qu'on le voie passer au travers.
  rings(c, L, g, time, x0, x1, front) {
    const R = L.race.rings, st = g.ring;
    for (let i = 0; i < R.length; i++) {
      const r = R[i];
      if (r.x < x0 - 30 || r.x > x1 + 30) continue;
      const s = st ? st[i] : 0, next = st && i === g.rk, pulse = next ? 0.5 + 0.5 * Math.sin(time * 7) : 0;
      if (s === 1 && g.heli.x - r.x > 260) continue;
      c.save(); c.translate(r.x, r.y);
      c.globalAlpha = s === 1 ? Math.max(0, 1 - (g.heli.x - r.x) / 260) : s === 2 ? 0.35 : 1;
      const a0 = front ? -Math.PI / 2 : Math.PI / 2, col = s === 1 ? '#7dffb0' : s === 2 ? '#9aa0ad' : '#ffd34d';
      if (!front && s === 0) { c.strokeStyle = rgba('#ffd34d', 0.18 + 0.2 * pulse); c.lineWidth = 9 + 5 * pulse; c.beginPath(); c.ellipse(0, 0, r.r * 0.34, r.r, 0, 0, TAU); c.stroke(); }
      c.strokeStyle = mix(col, '#7a5200', front ? 0 : 0.35); c.lineWidth = 4.2; c.beginPath(); c.ellipse(0, 0, r.r * 0.34, r.r, 0, a0, a0 + Math.PI); c.stroke();
      c.strokeStyle = rgba('#ffffff', front ? 0.75 : 0.3); c.lineWidth = 1.2; c.beginPath(); c.ellipse(-1, 0, r.r * 0.34, r.r, 0, a0 + 0.3, a0 + Math.PI - 0.3); c.stroke();
      c.restore();
    }
  }

  // Monuments et statues des courses (décor sans collision), dessinés dans les tons de l'arrière-plan.
  story(c, L, def, time, x0, x1) {
    const base = mix(def.mid, def.obs, 0.55), dk = mix(base, '#000000', 0.25), lt = mix(base, '#ffffff', 0.3), rim = def.rim, ac = def.accent;
    const F = (col, pts) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.fill(); };
    const E = (col, x, y, rx, ry = rx, a0 = 0, a1 = TAU) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, a0, a1); c.fill(); };
    const Ln = (col, w, pts) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };
    for (const d of L.story) {
      if (d.x < x0 - 260 || d.x > x1 + 260) continue;
      c.save(); c.translate(d.x, d.y + 6); c.scale(d.flip ? -1 : 1, 1);
      const bl = 0.5 + 0.5 * Math.sin(time * 3 + d.v * 9);
      switch (d.type) {
        case 'falls': { // falaise et cascade : l'eau file, l'écume bouillonne au pied
          F(base, [-80, 10, -66, -330, -20, -352, 34, -340, 70, -300, 84, 10]); F(lt, [-66, -330, -20, -352, 34, -340, 20, -326, -40, -322]);
          c.fillStyle = rgba('#dff6ff', 0.85); c.fillRect(-24, -338, 44, 348);
          c.strokeStyle = rgba('#ffffff', 0.9); c.lineWidth = 2; c.beginPath();
          for (let k = 0; k < 7; k++) { const sx = -20 + k * 6, o = (time * 260 + k * 53) % 340; c.moveTo(sx, -334 + o); c.lineTo(sx, -334 + Math.min(340, o + 30)); }
          c.stroke();
          for (let k = 0; k < 6; k++) E(rgba('#ffffff', 0.55), -30 + k * 12, 4 - 6 * Math.abs(Math.sin(time * 3 + k)), 11 + 3 * Math.sin(time * 2 + k * 2));
          break;
        }
        case 'arch': // vieux pont de pierre à moitié effondré
          F(base, [-110, 10, -110, -92, 40, -92, 52, -80, 60, -92, 70, -84, 70, 10, 44, 10, 44, -40, -84, -40, -84, 10]);
          c.fillStyle = base; c.beginPath(); c.moveTo(-84, -30); c.arc(-20, -30, 64, Math.PI, 0); c.lineTo(44, -62); c.lineTo(-84, -62); c.fill();
          c.globalCompositeOperation = 'destination-out'; E('#000', -20, -30, 50, 50, Math.PI, 0); c.fillRect(-70, -30, 100, 42); c.globalCompositeOperation = 'source-over';
          F(lt, [-110, -92, 40, -92, 40, -86, -110, -86]); F(base, [96, 10, 100, -30, 118, -36, 126, 10]);
          break;
        case 'ship': // épave d'un voilier couchée sur le flanc
          c.rotate(-0.16); F(dk, [-78, 0, -92, -30, 74, -30, 96, -44, 84, 0]); F(base, [-92, -30, 74, -30, 70, -22, -88, -22]);
          Ln(dk, 5, [-20, -30, -34, -128]); Ln(dk, 3, [-52, -92, -8, -100]); Ln(dk, 4, [36, -30, 46, -76]);
          F(rgba(lt, 0.7), [-33, -124, -6, -98, -30, -62, -38, -92]); for (const px of [-60, -30, 0, 30]) E(mix(dk, '#000000', 0.4), px, -12, 4);
          break;
        case 'wheel': { // moulin et sa roue à aubes
          F(base, [-10, 10, -10, -84, 30, -112, 70, -84, 70, 10]); F(dk, [-18, -80, 30, -116, 78, -80, 70, -74, 30, -104, -10, -74]); c.fillStyle = rgba(ac, 0.8); c.fillRect(22, -70, 16, 18);
          c.translate(-38, -36); c.rotate(time * 0.9); c.strokeStyle = dk; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.stroke();
          c.lineWidth = 3; c.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.moveTo(0, 0); c.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); } c.stroke(); E(dk, 0, 0, 6);
          break;
        }
        case 'beacon': // balise de course : tour rayée et feu clignotant
          F(base, [-13, 10, -9, -120, 9, -120, 13, 10]); c.fillStyle = rgba('#ffffff', 0.35); for (let y = -100; y < 0; y += 40) c.fillRect(-11, y, 22, 16);
          F(dk, [-14, -120, 14, -120, 10, -134, -10, -134]); E(rgba(ac, 0.25 + 0.5 * bl), 0, -142, 20); E(ac, 0, -142, 6);
          break;
        case 'cabin': // refuge : toit enneigé, fenêtre éclairée, fumée
          F(base, [-44, 10, -44, -40, 44, -40, 44, 10]); F(dk, [-54, -38, 0, -76, 54, -38]); F('#f4faff', [-54, -40, 0, -78, 54, -40, 46, -42, 0, -68, -46, -42]);
          c.fillStyle = rgba(ac, 0.9); c.fillRect(-28, -28, 18, 16); c.fillStyle = dk; c.fillRect(8, -30, 18, 40); c.fillRect(22, -72, 9, 20);
          for (let k = 0; k < 3; k++) E(rgba('#ffffff', 0.3 - k * 0.08), 27 + k * 7 + Math.sin(time + k) * 3, -84 - k * 16, 7 + k * 3);
          break;
        case 'snowman': // bonhomme de neige géant
          E('#f4faff', 0, -22, 34, 32); E('#f4faff', 0, -72, 25, 24); E('#f4faff', 0, -110, 18, 17); E(rgba('#9bb8d6', 0.35), 8, -18, 24, 26, -1, 1.4);
          F(dk, [-16, -124, 16, -124, 13, -150, -13, -150]); F(dk, [-24, -122, 24, -122, 24, -127, -24, -127]); F('#ff8a3a', [4, -110, 30, -106, 4, -104]);
          E(dk, -6, -114, 2); E(dk, 5, -115, 2); for (const y of [-80, -68, -56]) E(dk, 0, y, 2.4); Ln(dk, 3, [-22, -78, -52, -98, -58, -108]); Ln(dk, 3, [22, -78, 50, -92]);
          break;
        case 'igloo':
          E('#eef6fc', 0, 6, 56, 52, Math.PI, 0); c.strokeStyle = rgba('#8fb4d6', 0.6); c.lineWidth = 1.5; c.beginPath();
          for (const rr of [18, 34]) { c.moveTo(-Math.sqrt(56 * 56 - rr * rr * 0.9), 6 - rr); c.lineTo(Math.sqrt(56 * 56 - rr * rr * 0.9), 6 - rr); } for (let k = -2; k <= 2; k++) { c.moveTo(k * 20, 6); c.lineTo(k * 18, -12); } c.stroke();
          E('#dbe9f5', 46, 6, 20, 22, Math.PI, 0); E(dk, 50, 6, 11, 14, Math.PI, 0);
          break;
        case 'mammoth': // mammouth pris dans un bloc de glace
          F(rgba('#cfe9fb', 0.55), [-70, 10, -78, -70, -40, -112, 44, -108, 82, -60, 74, 10]); F(rgba('#ffffff', 0.5), [-78, -70, -40, -112, -30, -100, -66, -64]);
          E(rgba(dk, 0.75), -6, -46, 36, 26); E(rgba(dk, 0.75), 30, -62, 18, 20); for (const px of [-28, -10, 8, 24]) { c.fillStyle = rgba(dk, 0.75); c.fillRect(px, -30, 10, 34); }
          Ln(rgba(dk, 0.75), 7, [44, -56, 54, -30, 46, -12]); Ln('#f4faff', 4, [40, -52, 58, -40, 62, -58]);
          break;
        case 'flags': // fanions d'expédition
          Ln(dk, 3, [-70, 10, -70, -70]); Ln(dk, 3, [70, 10, 70, -86]); Ln(dk, 1.2, [-70, -68, 0, -52, 70, -84]);
          for (let k = 0; k < 7; k++) { const u = (k + 0.5) / 7, px = -70 + 140 * u, py = -68 + (u < 0.5 ? 32 * u : 16 - 64 * (u - 0.5)) + 2; F(['#e63946', '#ffd166', '#2ec4b6', '#f4faff'][k % 4], [px - 6, py, px + 6, py, px + Math.sin(time * 4 + k) * 3, py + 15]); }
          break;
        case 'icearch':
          c.fillStyle = rgba('#cfe9fb', 0.8); c.beginPath(); c.moveTo(-74, 10); c.lineTo(-62, -80); c.quadraticCurveTo(0, -150, 62, -80); c.lineTo(74, 10); c.lineTo(42, 10); c.lineTo(36, -60); c.quadraticCurveTo(0, -104, -36, -60); c.lineTo(-42, 10); c.fill();
          F(rgba('#ffffff', 0.7), [-62, -80, -30, -116, -22, -106, -50, -76]); for (const px of [-20, -6, 10, 22]) F(rgba('#eaf6ff', 0.9), [px - 4, -92, px + 4, -92, px, -70 - 10 * hash(px, 3)]);
          break;
        case 'moai': // gardien de pierre : une tête au regard fixé sur la piste
          F(base, [-26, 10, -30, -70, -24, -118, 20, -122, 28, -90, 30, -40, 22, 10]); F(dk, [-30, -70, -36, -80, -30, -96, -24, -118, -22, -76]);
          F(dk, [-20, -96, 24, -100, 24, -92, -20, -88]); F(dk, [8, -88, 30, -56, 14, -56]); F(dk, [-8, -44, 22, -46, 20, -38, -8, -36]); E(rgba(ac, 0.5 + 0.4 * bl), 2, -82, 3.4); E(rgba(ac, 0.5 + 0.4 * bl), 18, -84, 3);
          break;
        case 'temple': // colonnade en ruine
          F(base, [-96, 10, -96, -8, 96, -8, 96, 10]);
          for (const [px, hh] of [[-78, 104], [-42, 104], [-6, 66], [30, 104], [66, 40]]) { c.fillStyle = base; c.fillRect(px, -8 - hh, 18, hh); c.fillStyle = lt; c.fillRect(px - 3, -12 - hh, 24, 6); c.fillStyle = rgba(dk, 0.5); c.fillRect(px + 4, -8 - hh, 2, hh); c.fillRect(px + 11, -8 - hh, 2, hh); }
          F(base, [-88, -116, -52, -144, -16, -116]); F(dk, [44, 4, 70, -6, 96, 8]);
          break;
        case 'ribs': // squelette d'une bête immense
          for (let k = 0; k < 6; k++) { const px = -70 + k * 22, hh = 86 - Math.abs(k - 2) * 12; c.strokeStyle = lt; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(px, 8); c.quadraticCurveTo(px - 16, -hh * 0.7, px + 16, -hh); c.stroke(); }
          Ln(lt, 7, [-84, 2, 70, -8]); E(lt, 92, -26, 26, 20); F(lt, [100, -18, 132, -8, 104, -4]); E(dk, 98, -30, 6, 7);
          break;
        case 'anvil': { // forge du titan : enclume et marteau dressé
          F(dk, [-50, 10, -38, -30, -70, -44, -70, -60, 60, -60, 60, -46, 30, -40, 40, 10]); E(rgba('#ff7a2a', 0.5 + 0.4 * bl), 0, -64, 22, 6);
          c.save(); c.translate(20, -62); c.rotate(-0.5 + 0.12 * Math.sin(time * 1.4 + d.v * 5)); F(base, [-4, 0, 4, 0, 4, -110, -4, -110]); F(dk, [-26, -110, 26, -110, 26, -140, -26, -140]); c.restore();
          break;
        }
        case 'saucer': { // soucoupe écrasée, plantée de travers dans le sol
          c.rotate(0.42); E(dk, 0, -8, 78, 15); E(base, 0, -14, 70, 11); E(rgba('#9ff5d0', 0.55), -6, -22, 30, 22, Math.PI, 0);
          for (let k = 0; k < 5; k++) E(k % 2 ? rgba(ac, 0.3 + 0.6 * bl) : rgba(ac, 0.9 - 0.6 * bl), -52 + k * 26, -8, 3.4);
          c.rotate(-0.42); for (let k = 0; k < 4; k++) E(rgba('#20202a', 0.32 - k * 0.06), -50 + Math.sin(time * 0.8 + k) * 6 - k * 6, -50 - k * 24, 12 + k * 7);
          F(dk, [40, 10, 58, -6, 78, 10]); F(dk, [-96, 10, -84, -4, -70, 10]);
          break;
        }
        case 'mothership': { // vaisseau posé sur ses béquilles, rampe abaissée, faisceau allumé
          Ln(dk, 5, [-70, -70, -96, 8]); Ln(dk, 5, [70, -70, 96, 8]); Ln(dk, 5, [0, -66, 0, 8]);
          c.fillStyle = rgba('#9ff5d0', 0.14 + 0.1 * bl); c.beginPath(); c.moveTo(-22, -66); c.lineTo(22, -66); c.lineTo(52, 8); c.lineTo(-52, 8); c.fill();
          E(dk, 0, -78, 130, 22); E(base, 0, -88, 118, 17); E(rgba('#9ff5d0', 0.5), 0, -100, 54, 36, Math.PI, 0); E(rgba('#ffffff', 0.25), -18, -118, 16, 8);
          for (let k = 0; k < 9; k++) E(((k + Math.floor(time * 4)) % 3) ? rgba(ac, 0.35) : ac, -104 + k * 26, -78, 4);
          break;
        }
        case 'dish': // antenne d'écoute pointée vers le ciel
          Ln(dk, 4, [-22, 10, 0, -50, 22, 10]); Ln(dk, 4, [0, -50, 0, 10]); c.translate(0, -56); c.rotate(-0.7 + 0.25 * Math.sin(time * 0.5 + d.v * 6));
          E(base, 0, 0, 46, 16); E(lt, 0, -3, 40, 11); Ln(dk, 2.5, [0, -4, 0, -40]); E(rgba(ac, 0.4 + 0.6 * bl), 0, -42, 4);
          break;
        case 'abduct': { // petite soucoupe en vol stationnaire qui enlève une vache
          const hy = -190 + Math.sin(time * 1.3 + d.v * 4) * 8;
          c.fillStyle = rgba('#b6ff5a', 0.13 + 0.08 * bl); c.beginPath(); c.moveTo(-12, hy + 6); c.lineTo(12, hy + 6); c.lineTo(46, 8); c.lineTo(-46, 8); c.fill();
          E(dk, 0, hy, 46, 9); E(rgba('#9ff5d0', 0.6), 0, hy - 4, 20, 15, Math.PI, 0); for (let k = 0; k < 5; k++) E(rgba(ac, 0.4 + 0.6 * ((k + Math.floor(time * 5)) % 2)), -32 + k * 16, hy + 1, 2.6);
          const cy = -70 + Math.sin(time * 0.9 + d.v) * 26; c.translate(0, cy); c.rotate(0.3 * Math.sin(time * 1.1));
          E('#f4f1e8', 0, 0, 13, 7); E('#f4f1e8', 14, -3, 5, 4); E('#3a2a1c', -4, -1, 4.5, 3); Ln('#3a2a1c', 2, [-8, 6, -9, 13]); Ln('#3a2a1c', 2, [7, 6, 8, 13]);
          break;
        }
        case 'zone': // clôture et panneau de zone interdite
          for (let k = -3; k <= 3; k++) Ln(dk, 2.5, [k * 22, 10, k * 22, -44]); Ln(dk, 1.3, [-66, -38, 66, -38]); Ln(dk, 1.3, [-66, -18, 66, -18]); Ln(dk, 1.3, [-66, -44, 66, -44, 60, -50, -60, -50]);
          F(ac, [-20, -40, 20, -40, 20, -84, -20, -84]); E(dk, 0, -64, 10, 12); E(ac, -4, -64, 3, 4.5); E(ac, 4, -64, 3, 4.5);
          break;
        case 'lander': // module lunaire posé là depuis longtemps
          Ln(lt, 3, [-22, -26, -44, 8]); Ln(lt, 3, [22, -26, 44, 8]); Ln(lt, 3, [-48, 8, -40, 8]); Ln(lt, 3, [40, 8, 48, 8]);
          F('#d9a441', [-28, -26, 28, -26, 22, -6, -22, -6]); F(lt, [-20, -26, -24, -54, -8, -68, 10, -68, 24, -54, 20, -26]); E(dk, 0, -46, 7); F(dk, [-8, -6, 8, -6, 12, 6, -12, 6]);
          Ln(lt, 2, [16, -66, 30, -86]); E(lt, 32, -90, 9, 4);
          break;
        case 'flag': // drapeau planté, figé faute de vent
          Ln(lt, 2.5, [0, 10, 0, -84]); F('#f4faff', [0, -84, 42, -84, 42, -58, 0, -58]); F(ac, [14, -78, 18, -70, 26, -70, 20, -65, 22, -57, 14, -62, 6, -57, 8, -65, 2, -70, 10, -70]);
          for (let k = 0; k < 5; k++) E(rgba(dk, 0.5), -60 + k * 14, 8 + (k % 2) * 3, 5, 2); // empreintes
          break;
        case 'rover': // véhicule lunaire
          for (const px of [-30, 0, 30]) { E(dk, px, 0, 11); E(lt, px, 0, 5); } F(lt, [-40, -10, 40, -10, 34, -26, -34, -26]); F('#d9a441', [-10, -26, 22, -26, 18, -40, -6, -40]);
          Ln(lt, 2, [-26, -26, -30, -66]); E(lt, -30, -70, 12, 5); Ln(lt, 2, [28, -26, 36, -52]); E(rgba(ac, 0.4 + 0.6 * bl), 36, -54, 3);
          break;
        case 'crater': // cratère : bourrelet clair, fond dans l'ombre
          E(lt, 0, 4, 120, 16); E(mix(def.ground, '#000000', 0.45), 0, 6, 100, 11); E(rgba('#000000', 0.25), -18, 7, 70, 7); for (const [px, pr] of [[-134, 7], [128, 5], [150, 9]]) E(lt, px, 6, pr, pr * 0.6);
          break;
        case 'dome': // base lunaire : dôme vitré, sas, antenne
          E(rgba('#9fd8ff', 0.35), 0, 8, 86, 78, Math.PI, 0); c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 1.5; c.beginPath(); for (const rr of [86, 58, 28]) { c.moveTo(-rr, 8); c.quadraticCurveTo(0, 8 - 78 * 2.05, rr, 8); } c.moveTo(-80, -22); c.lineTo(80, -22); c.stroke();
          F(lt, [-96, 10, -96, -6, 96, -6, 96, 10]); F(dk, [-126, 10, -126, -30, -92, -30, -92, 10]); c.fillStyle = rgba(ac, 0.5 + 0.4 * bl); c.fillRect(-118, -22, 18, 12);
          for (const px of [-40, -8, 26]) F(mix('#2e8b57', dk, 0.3), [px, -6, px + 8, -34, px + 16, -6]); Ln(lt, 2, [60, -6, 60, -110]); E(rgba('#ff5a5a', bl), 60, -112, 3.5);
          break;
        case 'meteor': // météorite fichée dans son cratère, encore incandescente
          E(lt, 0, 6, 74, 11); E(mix(def.ground, '#000000', 0.5), 0, 7, 58, 7); E(rgba('#ff8a3a', 0.2 + 0.2 * bl), 6, -20, 54);
          F(dk, [-26, 6, -34, -22, -14, -50, 22, -54, 44, -26, 34, 6]); Ln(rgba('#ffb347', 0.5 + 0.5 * bl), 2.2, [-14, -44, -4, -26, -16, -10]); Ln(rgba('#ffb347', 0.5 + 0.5 * bl), 2.2, [18, -48, 12, -30, 28, -14]);
          break;
        case 'farm': // ferme : grange rouge, silo, moulin à vent
          F(base, [-70, 10, -70, -44, -36, -70, -2, -44, -2, 10]); F(dk, [-76, -42, -36, -74, 4, -42, -2, -44, -36, -66, -70, -44]); c.fillStyle = dk; c.fillRect(-46, -24, 20, 34);
          c.fillStyle = lt; c.fillRect(14, -84, 26, 94); E(lt, 27, -84, 13, 9, Math.PI, 0); Ln(dk, 2, [70, 10, 70, -70]); c.save(); c.translate(70, -70); c.rotate(time * 2 + d.v * 5); for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); F(lt, [0, 0, 16, -4, 16, 4]); } c.restore();
          break;
        case 'epyl': { // pylône électrique en attente de ses câbles
          Ln(dk, 3, [-16, 10, -5, -150]); Ln(dk, 3, [16, 10, 5, -150]); for (let y2 = -8; y2 > -140; y2 -= 24) { const a2 = 16 - (11 * (-y2 + 10)) / 160; Ln(dk, 1.3, [-a2, y2, a2 - 2, y2 - 24]); Ln(dk, 1.3, [a2, y2, -a2 + 2, y2 - 24]); }
          for (const y2 of [-150, -124]) { Ln(dk, 2.4, [-34, y2, 34, y2]); for (const sx of [-32, 32]) Ln(lt, 2, [sx, y2, sx, y2 + 8]); }
          break;
        }
        case 'turbine': { // éolienne lointaine
          F(lt, [-4, 10, -2, -170, 2, -170, 4, 10]); c.save(); c.translate(0, -170); c.rotate(time * 1.2 + d.v * 6); for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); F(lt, [0, -2, 58, -1, 58, 1.5, 0, 3]); } c.restore(); E(dk, 0, -170, 4);
          break;
        }
        case 'skilift': { // pylône de télésiège, câble et siège qui se balance
          Ln(dk, 4, [0, 10, 0, -96]); Ln(dk, 4, [-22, -96, 22, -96]); Ln(dk, 1.2, [-160, -70, -22, -96, 22, -96, 160, -122]);
          const sw = Math.sin(time * 1.6 + d.v * 7) * 4; Ln(dk, 1.4, [70, -106, 70 + sw, -78]); F(base, [58 + sw, -78, 82 + sw, -78, 82 + sw, -70, 58 + sw, -70]); Ln(dk, 1.4, [-96, -82, -96 - sw, -54]); F(base, [-108 - sw, -54, -84 - sw, -54, -84 - sw, -46, -108 - sw, -46]);
          break;
        }
        case 'pyramid': { // pyramide : assises de pierre, face à l'ombre, sommet doré
          const k = d.s || 1, bw = 190 * k, ph = 230 * k; F(mix(base, '#e9c46a', 0.55), [-bw, 10, 0, -ph, bw, 10]); F(mix(base, '#7a5a2a', 0.5), [0, -ph, bw, 10, bw * 0.25, 10]);
          c.strokeStyle = rgba('#5c4326', 0.28); c.lineWidth = 1; c.beginPath(); for (let y2 = -ph + 22; y2 < 6; y2 += 16) { const a2 = (bw * (y2 + ph)) / (ph + 10); c.moveTo(-a2, y2); c.lineTo(a2, y2); } c.stroke(); F(ac, [-bw * 0.08, -ph * 0.92, 0, -ph, bw * 0.08, -ph * 0.92]);
          break;
        }
        case 'sphinx': { // sphinx couché, regard vers la piste
          const k = d.s || 1, st = mix(base, '#e9c46a', 0.5), sd2 = mix(base, '#7a5a2a', 0.45); c.scale(k, k);
          F(st, [-100, 10, -100, -30, -70, -44, 10, -44, 16, -18, 96, -18, 100, 10]); F(sd2, [16, -18, 96, -18, 100, 10, 30, 10]); F(st, [-6, -44, 2, -104, 46, -104, 56, -44]); F('#1d6fb8', [-10, -44, 4, -110, 44, -110, 60, -44, 50, -50, 40, -98, 8, -98, -2, -50]); E(st, 24, -76, 15, 18); F(sd2, [10, -72, 38, -72, 36, -66, 12, -66]); F(st, [-100, -30, -118, -22, -112, 10, -100, 10]);
          break;
        }
        case 'camel': // caravane : un dromadaire et son chamelier
          E(base, 0, -30, 26, 13); E(base, -2, -44, 11, 9); Ln(base, 5, [20, -32, 34, -56, 44, -56]); E(base, 46, -57, 6, 4.5); for (const px of [-18, -8, 10, 20]) Ln(base, 4, [px, -22, px + Math.sin(time * 2 + px) * 2, 8]); Ln(dk, 2, [-60, 8, -60, -30]); E(dk, -60, -36, 6); F(lt, [-70, -28, -50, -28, -54, 4, -66, 4]);
          break;
        case 'palms': // bouquet de palmiers de l'oasis
          for (const [px, hh2] of [[-30, 96], [8, 120], [44, 84]]) { Ln(base, 5, [px, 10, px + 8, -hh2]); for (let k = 0; k < 6; k++) { const a2 = -Math.PI * (0.05 + 0.18 * k) + Math.sin(time * 1.3 + k + px) * 0.05; c.strokeStyle = mix('#2e8b57', base, 0.35); c.lineWidth = 4; c.beginPath(); c.moveTo(px + 8, -hh2); c.quadraticCurveTo(px + 8 + Math.cos(a2) * 26, -hh2 + Math.sin(a2) * 26 - 8, px + 8 + Math.cos(a2) * 44, -hh2 + Math.sin(a2) * 30 + 8); c.stroke(); } }
          E(rgba('#9ad1e6', 0.5), 6, 8, 60, 6);
          break;
        case 'monolith': // dalle noire dressée, gravée d'un trait de lumière
          F('#0b0b12', [-22, 10, -22, -170, 22, -170, 22, 10]); F(rgba('#ffffff', 0.12), [-22, -170, -14, -170, -14, 10, -22, 10]); Ln(rgba(ac, 0.4 + 0.6 * bl), 2, [0, -150, 0, -60, -10, -40, 10, -20]); E(rgba(ac, 0.05 + 0.05 * bl), 0, -90, 34);
          break;
      }
      c.restore();
    }
  }

  // Monde Heli Rescue : poste de secours à la base, victimes au sol, jauge d'embarquement, remerciements.
  rescue(c, L, def, g, time, x0, x1) {
    const b = L.rescue.base;
    this.decor(c, L, def, g, time, x0, x1);
    if (L.waterAt) { // eau : nappe translucide par-dessus le relief immergé, houle animée et crêtes d'écume des grosses vagues
      const wc = mix(def.mid, '#1c6f8f', 0.55), X0 = Math.floor(x0 / 12) * 12, surf = (x) => L.surfAt(x, g.t) + Math.sin(x * 0.045 + time * 1.8) * 2.4;
      c.fillStyle = rgba(wc, 0.62);
      c.beginPath(); c.moveTo(x0, surf(x0));
      for (let x = X0; x <= x1 + 12; x += 12) c.lineTo(x, surf(x));
      c.lineTo(x1 + 12, 1300); c.lineTo(x0, 1300); c.fill();
      c.strokeStyle = rgba('#ffffff', 0.55); c.lineWidth = 1.6; c.beginPath();
      for (let x = X0; x <= x1 + 12; x += 12) c.lineTo(x, surf(x));
      c.stroke();
      if (L.waves) { // écume au sommet des vagues
        const flat = L.waterAt(g.t); c.fillStyle = rgba('#ffffff', 0.8);
        for (let x = X0; x <= x1 + 12; x += 12) { const k = flat - L.surfAt(x, g.t); if (k > L.waves.height * 0.55) { c.beginPath(); c.arc(x + 3 * Math.sin(time * 7 + x), surf(x) - 1, 2 + 3.5 * hash(x, Math.floor(time * 6)), 0, TAU); c.fill(); } }
      }
    }
    if (L.fire) { // front de feu : flammes dansantes, lueur, et terre brûlée derrière lui
      const F = L.fire, fx = F.x + F.speed * g.t, gy = L.groundAt(fx), back = F.speed < 0 ? 1 : -1;
      if (fx > x0 - 400 && fx < x1 + 400) {
        c.fillStyle = 'rgba(20,6,4,.45)'; c.fillRect(back > 0 ? fx : x0, 0, back > 0 ? x1 - fx + 40 : fx - x0, 900);
        const gl = c.createRadialGradient(fx, gy - 80, 10, fx, gy - 80, 300);
        gl.addColorStop(0, 'rgba(255,150,40,.55)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = gl; c.fillRect(fx - 300, gy - 380, 600, 500);
        for (let k = 0; k < 9; k++) {
          const px = fx + (k - 4) * 9 + Math.sin(time * 5 + k) * 5, hgt = (F.height || 230) * (0.45 + 0.55 * Math.abs(Math.sin(time * 3.3 + k * 1.7)));
          c.fillStyle = k % 2 ? '#ff5a1f' : '#ffb703';
          c.beginPath(); c.moveTo(px - 13, gy + 6); c.quadraticCurveTo(px - 8, gy - hgt * 0.5, px, gy - hgt); c.quadraticCurveTo(px + 8, gy - hgt * 0.5, px + 13, gy + 6); c.fill();
        }
      }
    }
    for (const q of L.gusts) { // rafale : traînées d'embruns pendant qu'elle souffle
      if (q.x > x1 || q.x + q.w < x0 || ((g.t / q.period + (q.phase || 0)) % 1) >= q.on) continue;
      c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath();
      for (let k = 0; k < 22; k++) { const gx = q.x + ((hash(k, 5) * q.w + time * q.fx * 1.6) % q.w + q.w) % q.w, gy = 120 + hash(k, 9) * 560; c.moveTo(gx, gy); c.lineTo(gx - Math.sign(q.fx) * 26, gy + 3); }
      c.stroke();
    }
    if (!L.cargo && b.x + 200 > x0 && b.x - 200 < x1) { // poste de secours (pas en Heli Cargo)
      const bx = b.x + 112, by = b.y;
      c.fillStyle = '#f4f1de'; c.fillRect(bx - 26, by - 34, 58, 34); c.fillStyle = '#d62828'; c.fillRect(bx - 30, by - 40, 66, 8);
      c.fillStyle = '#9ad1e6'; c.fillRect(bx - 20, by - 26, 12, 10); c.fillRect(bx + 14, by - 26, 12, 10); c.fillStyle = '#7a5a3c'; c.fillRect(bx - 3, by - 20, 10, 20);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(bx + 3, by - 36, 5.5, 0, TAU); c.fill(); c.fillStyle = '#d62828'; c.fillRect(bx + 2, by - 39.5, 2, 7); c.fillRect(bx - 0.5, by - 37, 7, 2);
      c.fillStyle = def.obs; c.fillRect(bx + 40, by - 60, 2.5, 60); // manche à air
      const todo = g.vs.filter((v) => v.state === 'wait' || v.state === 'walk'); // portraits de ceux qu'il reste à aller chercher, en transparence
      todo.forEach((v, i) => {
        const px = bx + 3 + (i - (todo.length - 1) / 2) * 38, py = by - 86 + Math.sin(time * 1.6 + i) * 2;
        c.save(); c.globalAlpha = 0.62;
        c.fillStyle = '#e9f6fb'; c.beginPath(); c.arc(px, py, 17, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(px - 5, py + 15); c.lineTo(px, py + 23); c.lineTo(px + 5, py + 15); c.fill();
        c.beginPath(); c.arc(px, py, 15.5, 0, TAU); c.clip();
        drawOccupant(c, px, py + 1, 11.5, { type: v.type, variant: v.variant, col: v.col, hat: v.hat, seed: 1 }, 0.6);
        c.restore();
        c.strokeStyle = 'rgba(214,40,40,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 17, 0, TAU); c.stroke();
      });
      c.fillStyle = '#ff7b2e'; c.beginPath(); c.moveTo(bx + 42, by - 60); c.lineTo(bx + 62, by - 55 + Math.sin(time * 4) * 2); c.lineTo(bx + 42, by - 50); c.fill();
    }
    for (const v of g.vs) {
      if (v.state === 'aboard' || v.state === 'saved' || v.px < x0 - 30 || v.px > x1 + 30) continue;
      if (L.rescue.cfg.radar && v.state === 'wait' && !v.found) continue; // enseveli : invisible tant que le détecteur ne l'a pas trouvé
      const gy = L.groundAt(v.px), moving = v.state === 'walk' && Math.abs(g.heli.x - v.px) > 9 || v.state === 'out' || (v.state === 'wait' && Math.abs(v.px - v.x) > 1);
      const face = v.state === 'out' ? 1 : Math.sign(g.heli.x - v.px) || 1;
      const py = v.state === 'out' || Math.abs(v.px - L.pads[v.zone].x) > L.pads[v.zone].w / 2 + 4 ? gy : L.pads[v.zone].y; // sur un toit, on reste à hauteur du toit
      const near = v.state === 'wait' && Math.abs(g.heli.x - v.px) < 520;
      this.figure(c, v, v.px, py, time, moving, face, near);
      if (near && v.type === 'animal' && g.callT > 1.5) { // cri de l'animal : petits arcs au-dessus de lui
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.lineCap = 'round';
        for (const r of [7, 12]) { c.beginPath(); c.arc(v.px + face * 9, py - 16, r, -1.1 + (face < 0 ? Math.PI : 0), 0.3 + (face < 0 ? Math.PI : 0)); c.stroke(); }
      }
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

  // Décor sans collision : bétail, et tout le désordre d'une catastrophe (poteaux couchés, barques, épaves, clôtures, souches).
  decor(c, L, def, g, time, x0, x1) {
    const dark = mix(def.obs, '#000000', 0.25);
    for (const d of L.decor || []) {
      if (d.x < x0 - 60 || d.x > x1 + 60) continue;
      let gy = L.groundAt(d.x);
      c.save(); c.lineCap = 'round';
      if (d.type === 'boat') { // barque : flotte si le sol est sous l'eau, sinon échouée de travers
        const wy = L.waterAt ? L.waterAt(g.t) : 1e9, afloat = gy > wy; if (afloat) gy = wy + 2 + Math.sin(time * 1.6 + d.x) * 1.5;
        c.translate(d.x, gy); c.scale(d.flip ? -1 : 1, 1); c.rotate(afloat ? Math.sin(time * 1.3 + d.x) * 0.06 : -0.22);
        c.fillStyle = '#8a5a3c'; c.beginPath(); c.moveTo(-20, -9); c.lineTo(22, -9); c.lineTo(15, 1); c.lineTo(-15, 1); c.fill();
        c.fillStyle = '#f1e9d8'; c.fillRect(-20, -10.5, 42, 2.5); c.fillStyle = '#5f3d28'; c.fillRect(-6, -9, 2.5, 8); c.fillRect(7, -9, 2.5, 8);
      } else {
        c.translate(d.x, gy); c.scale(d.flip ? -1 : 1, 1);
        if (d.type === 'pole') { // poteau électrique penché, fils pendants
          c.rotate(0.3); c.strokeStyle = dark; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -92); c.stroke();
          c.lineWidth = 3; c.beginPath(); c.moveTo(-15, -82); c.lineTo(15, -82); c.stroke();
          c.lineWidth = 1.1; c.strokeStyle = rgba(dark, 0.8); c.beginPath(); c.moveTo(-14, -82); c.quadraticCurveTo(-34, -40 + Math.sin(time * 1.5 + d.x) * 4, -44, -6); c.moveTo(14, -82); c.quadraticCurveTo(22, -60, 17 + Math.sin(time * 2 + d.x) * 3, -44); c.stroke();
        } else if (d.type === 'wreck') { // voiture renversée sur le flanc
          c.rotate(-0.14); c.fillStyle = mix('#b23a48', def.obs, 0.35); c.beginPath(); c.moveTo(-19, 0); c.lineTo(-17, -9); c.lineTo(-8, -10); c.lineTo(-3, -18); c.lineTo(10, -18); c.lineTo(15, -10); c.lineTo(20, -8); c.lineTo(20, 0); c.fill();
          c.fillStyle = rgba('#cfe6f0', 0.7); c.fillRect(-1, -16, 9, 5); c.fillStyle = '#1b1b22'; c.beginPath(); c.arc(-10, 0, 4.4, 0, TAU); c.arc(12, 0, 4.4, 0, TAU); c.fill();
        } else if (d.type === 'fence') { // clôture couchée par le vent
          c.strokeStyle = '#8a6a4a'; c.lineWidth = 2.6; c.beginPath();
          for (let k = 0; k < 5; k++) { const lean = 0.25 + 0.3 * hash(k, d.x); c.moveTo(-30 + k * 15, 2); c.lineTo(-30 + k * 15 + Math.sin(lean) * 15, 2 - Math.cos(lean) * 15); }
          c.stroke(); c.lineWidth = 1.8; c.beginPath(); c.moveTo(-28, -8); c.lineTo(8, -10); c.lineTo(36, -2); c.stroke();
        } else if (d.type === 'stump') { // souche et tronc abattu
          c.fillStyle = dark; c.fillRect(-7, -12, 14, 14); c.beginPath(); c.moveTo(-7, -12); c.lineTo(-3, -18); c.lineTo(0, -12); c.lineTo(4, -16); c.lineTo(7, -12); c.fill();
          c.save(); c.translate(14, -3); c.rotate(0.08); c.fillRect(0, -5, 62, 9); c.fillStyle = mix(dark, '#d9b38c', 0.5); c.beginPath(); c.ellipse(62, -0.5, 3, 4.5, 0, 0, TAU); c.fill(); c.restore();
        } else { // vache
          c.strokeStyle = '#3a2a1c'; c.lineWidth = 1.8; c.beginPath(); for (const lx of [-6, -3, 4, 7]) { c.moveTo(lx, -6); c.lineTo(lx, 0); } c.stroke();
          c.fillStyle = '#f4f1e8'; c.beginPath(); c.ellipse(0.5, -9, 9, 4.6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(10.5, -8 + Math.sin(time * 1.2 + d.x) * 2.5, 3.4, 2.8, 0.5, 0, TAU); c.fill();
          c.fillStyle = '#3a2a1c'; c.beginPath(); c.ellipse(-3, -10, 3.2, 2.2, 0.3, 0, TAU); c.ellipse(4, -8, 2.2, 1.8, 0, 0, TAU); c.fill();
        }
      }
      c.restore();
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
      const V = v.variant, fur = v.col || '#b5835a', leg = moving ? Math.sin(ph) * 2.2 : 0;
      const s = v.size === 'big' ? (V === 'horse' ? 1.7 : 1.9) : v.size === 'medium' ? 1.3 : V === 'goat' || V === 'husky' ? 0.95 : 0.8;
      c.scale(s, s);
      if (V === 'flamingo') { // échassier : deux longues pattes, cou en S
        c.strokeStyle = '#ff8fab'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -9); c.lineTo(-1 - leg, 0); c.moveTo(1.5, -9); c.lineTo(1.5 + leg, 0); c.stroke();
        c.fillStyle = fur; c.beginPath(); c.ellipse(0, -11, 5, 3.4, 0, 0, TAU); c.fill();
        c.strokeStyle = fur; c.lineWidth = 1.7; c.beginPath(); c.moveTo(4, -12); c.quadraticCurveTo(8, -16, 5, -19); c.quadraticCurveTo(3, -22, 6.5, -22.5); c.stroke();
        c.fillStyle = '#2b2d42'; c.beginPath(); c.moveTo(6.5, -23.5); c.lineTo(10, -21.5); c.lineTo(6.5, -21.5); c.fill();
      } else if (V === 'turtle') { // carapace basse, nageoires
        c.fillStyle = fur; c.beginPath(); c.ellipse(-6, -1.5 + leg * 0.3, 3.4, 1.4, 0.4, 0, TAU); c.ellipse(6, -1.5 - leg * 0.3, 3.4, 1.4, -0.4, 0, TAU); c.fill();
        c.fillStyle = '#2f5d50'; c.beginPath(); c.arc(0, -2, 8, Math.PI, 0); c.fill(); c.fillStyle = fur; c.beginPath(); c.arc(9.5, -3, 2.4, 0, TAU); c.fill();
      } else if (V === 'orangutan') { // assis, longs bras
        c.fillStyle = fur; c.beginPath(); c.ellipse(0, -7, 5, 7, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(1, -15.5, 3.6, 0, TAU); c.fill();
        c.strokeStyle = fur; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-3, -11); c.lineTo(-7, -2 + (wave ? Math.sin(time * 9) * 3 - 12 : 0)); c.moveTo(3, -11); c.lineTo(7, -2 + leg); c.stroke();
        c.fillStyle = '#7a4a2a'; c.beginPath(); c.arc(1.5, -15, 2.1, 0, TAU); c.fill();
      } else {
        const tall = V === 'deer' || V === 'horse' ? 8.5 : V === 'fawn' || V === 'goat' ? 6.5 : 5, by = -tall - 2.5; // hauteur des pattes
        c.strokeStyle = fur; c.lineWidth = V === 'elephant' ? 3 : 1.8; c.beginPath();
        for (const [lx, sg] of [[-5, -1], [-2, 1], [3, -1], [6, 1]]) { c.moveTo(lx, by + 2.5); c.lineTo(lx + sg * leg, 0); }
        c.stroke();
        c.fillStyle = fur; c.beginPath(); c.ellipse(0.5, by, 7.5, V === 'elephant' ? 5 : 3.6, 0, 0, TAU); c.fill();
        const hx = V === 'deer' || V === 'horse' || V === 'fawn' || V === 'goat' ? 9.5 : 8.5, hy = by - (V === 'deer' || V === 'horse' ? 6.5 : V === 'fawn' || V === 'goat' ? 5 : 3);
        if (hy < by - 3.5) { c.lineWidth = 2.6; c.beginPath(); c.moveTo(6, by - 1); c.lineTo(hx - 0.5, hy + 1); c.stroke(); } // encolure
        c.beginPath(); c.ellipse(hx, hy, V === 'horse' ? 3.8 : 3.2, V === 'horse' ? 2.4 : 3, V === 'horse' ? 0.5 : 0, 0, TAU); c.fill();
        if (V === 'cat' || V === 'husky' || V === 'deer' || V === 'fawn' || V === 'horse') { c.beginPath(); c.moveTo(hx - 2.4, hy - 2); c.lineTo(hx - 1.6, hy - 6.2); c.lineTo(hx + 0.4, hy - 2.4); c.fill(); } // oreille dressée
        else if (V !== 'elephant' && V !== 'goat') { c.beginPath(); c.ellipse(hx - 1.5, hy - 3, 1.2, 2.4, -0.4, 0, TAU); c.fill(); } // oreille tombante
        if (V === 'goat') { c.strokeStyle = '#d8d2c4'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(hx - 1, hy - 2.6); c.quadraticCurveTo(hx - 4, hy - 6.5, hx - 5.5, hy - 4.5); c.stroke(); c.strokeStyle = fur; c.beginPath(); c.moveTo(hx + 1, hy + 2.6); c.lineTo(hx + 0.6, hy + 5); c.stroke(); }
        if (V === 'horse') { c.strokeStyle = '#2b1d14'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(6.5, by - 2.5); c.lineTo(hx - 2.5, hy - 1.5); c.stroke(); }
        if (V === 'fawn') { c.fillStyle = '#ffffff'; for (const [dx2, dy2] of [[-3, -0.8], [0.5, 0.6], [3.5, -0.6]]) { c.beginPath(); c.arc(dx2, by + dy2, 0.7, 0, TAU); c.fill(); } }
        if (V === 'elephant') { c.strokeStyle = fur; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx + 2, hy + 1); c.quadraticCurveTo(hx + 5.5, hy + 4.5, hx + 4, by + 8.5); c.stroke(); c.fillStyle = mix(fur, '#000000', 0.15); c.beginPath(); c.ellipse(hx - 2, hy - 0.5, 3, 3.8, 0.3, 0, TAU); c.fill(); }
        const tailCol = V === 'horse' ? '#2b1d14' : fur;
        c.strokeStyle = tailCol; c.lineWidth = V === 'horse' ? 2.2 : 1.6; c.beginPath(); c.moveTo(-7, by - 0.5);
        if (V === 'horse' || V === 'deer' || V === 'fawn' || V === 'goat' || V === 'elephant') c.quadraticCurveTo(-10, by + 1, -9.5 + Math.sin(time * 3) * 0.8, by + (V === 'horse' ? 7 : 3.5));
        else c.quadraticCurveTo(-11, by - 2.5 + Math.sin(time * 9) * 2, -10, by - 6.5); // queue qui remue
        c.stroke();
        c.fillStyle = '#1b1b26'; c.beginPath(); c.arc(hx + 1.1, hy - 0.5, 0.6, 0, TAU); c.fill();
      }
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
      if (!['rock', 'ledge', 'deck', 'bridge', 'derrick', 'turbine', 'obel', 'column'].includes(o.st)) c.fillRect(l, top, w, h);
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
        case 'house': { // maison : murs clairs, toit en léger débord, fenêtres éclairées, cheminée
          c.fillStyle = mix(col, '#ffffff', 0.45); c.fillRect(l, top + 10, w, h - 10);
          c.fillStyle = mix(col, '#7a2f2a', 0.6); c.fillRect(l - 5, top, w + 10, 11); c.fillRect(l + w * 0.72, top - 13, 9, 14);
          c.fillStyle = rgba(def.accent, 0.85);
          for (let k = 0; k < Math.floor(w / 34); k++) c.fillRect(l + 12 + k * 34, top + 26, 13, 15);
          c.fillStyle = mix(col, '#000000', 0.3); c.fillRect(l + w / 2 - 7, top + h - 24 - 30, 14, 30);
          if (o.ruin) { // maison sinistrée : toit éventré, fissures, volet pendant, gravats
            const sk = mix(def.sky[0][1], def.mid, 0.5);
            c.fillStyle = sk; c.beginPath(); c.moveTo(l + w * 0.12, top - 1); c.lineTo(l + w * 0.2, top + 9); c.lineTo(l + w * 0.3, top + 4); c.lineTo(l + w * 0.38, top + 12); c.lineTo(l + w * 0.5, top - 1); c.fill();
            c.strokeStyle = mix(col, '#000000', 0.45); c.lineWidth = 1.4; c.beginPath(); c.moveTo(l + w * 0.38, top + 12); c.lineTo(l + w * 0.32, top + 30); c.lineTo(l + w * 0.4, top + 44); c.lineTo(l + w * 0.34, top + 62);
            c.moveTo(l + w * 0.8, top + 12); c.lineTo(l + w * 0.86, top + 34); c.lineTo(l + w * 0.78, top + 50); c.stroke();
            c.fillStyle = mix(col, '#000000', 0.5); for (let k = 0; k < Math.floor(w / 34); k += 2) c.fillRect(l + 12 + k * 34, top + 26, 13, 15); // fenêtres éteintes
            c.save(); c.translate(l + w - 4, top + 28); c.rotate(0.5); c.fillStyle = mix(col, '#7a2f2a', 0.6); c.fillRect(0, 0, 7, 15); c.restore();
            c.fillStyle = mix(col, '#ffffff', 0.25); for (let k = 0; k < 6; k++) { const gx = l - 16 + hash(k, o.v * 50) * (w + 32), gs = 4 + 6 * hash(k, o.v * 9); c.fillRect(gx, top + h - 24 - gs, gs * 1.4, gs); }
          }
          break;
        }
        case 'deck': { // plateforme portante de Heli Cargo : barge, plateforme pétrolière, navire, dalle, barrage, refuge, musée, socle
          const k = o.deck, bot = top + h, P2 = (colr, pts) => { c.fillStyle = colr; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.fill(); };
          if (k === 'barge') { P2('#3d405b', [l, top, l + w, top, l + w - 14, bot, l + 14, bot]); c.fillStyle = '#e07a5f'; c.fillRect(l, top, w, 5); c.fillStyle = '#1b1b26'; for (let x2 = l + 16; x2 < l + w - 10; x2 += 34) { c.beginPath(); c.arc(x2, top + 14, 5, 0, TAU); c.fill(); } }
          else if (k === 'ship') { P2('#1d3557', [l - 26, top, l + w + 40, top, l + w + 10, bot, l - 10, bot]); c.fillStyle = '#c1121f'; c.fillRect(l - 14, top + 44, w + 34, 60); c.fillStyle = '#f1faee'; c.fillRect(l - 26, top, w + 66, 4); c.fillStyle = rgba('#ffffff', 0.35); for (let x2 = l + 10; x2 < l + w; x2 += 26) c.fillRect(x2, top + 14, 9, 5); }
          else if (k === 'rig') { // tablier sur jambes en treillis, grue de pont, torchère éteinte
            c.fillStyle = '#343a40'; for (const x2 of [l + 14, l + w / 2 - 8, l + w - 30]) c.fillRect(x2, top + 22, 16, h); c.strokeStyle = '#495057'; c.lineWidth = 3; c.beginPath(); for (let y2 = top + 30; y2 < bot - 40; y2 += 46) { c.moveTo(l + 22, y2); c.lineTo(l + w - 22, y2 + 46); c.moveTo(l + w - 22, y2); c.lineTo(l + 22, y2 + 46); } c.stroke();
            c.fillStyle = '#f2a516'; c.fillRect(l - 10, top, w + 20, 24); c.fillStyle = '#1b1b26'; for (let x2 = l - 4; x2 < l + w + 6; x2 += 22) c.fillRect(x2, top + 15, 12, 5); c.fillStyle = '#f1faee'; c.fillRect(l - 10, top, w + 20, 3);
          } else if (k === 'dam') { P2('#adb5bd', [l - 30, top, l + w + 20, top, l + w + 60, bot, l - 30, bot]); c.fillStyle = '#6c757d'; c.fillRect(l - 30, top, w + 50, 5); c.fillStyle = rgba('#dff6ff', 0.8); for (let x2 = l + w * 0.55; x2 < l + w + 10; x2 += 22) c.fillRect(x2, top + 20, 9, h - 30); }
          else if (k === 'refuge') { // terrasse du refuge, cabane en retrait
            c.fillStyle = '#7f5539'; c.fillRect(l, top, w, 7); c.fillStyle = '#5c3d2e'; for (let x2 = l + 6; x2 < l + w; x2 += 28) c.fillRect(x2, top + 7, 5, h); c.fillStyle = mix(def.ground, '#ffffff', 0.5); c.fillRect(l, top + h - 12, w, 16);
          } else if (k === 'museum') { // musée : colonnade, fronton, toit-terrasse où l'on dépose les pièces
            c.fillStyle = '#e9d8a6'; c.fillRect(l, top, w, h); c.fillStyle = '#ca9a55'; c.fillRect(l - 8, top, w + 16, 9); c.fillRect(l - 8, bot - 46, w + 16, 8);
            for (let x2 = l + 14; x2 < l + w - 10; x2 += 34) { c.fillStyle = '#f4ecd0'; c.fillRect(x2, top + 14, 14, h - 52); c.fillStyle = rgba('#8a6a3a', 0.4); c.fillRect(x2 + 4, top + 14, 2, h - 52); c.fillRect(x2 + 9, top + 14, 2, h - 52); }
            c.fillStyle = '#6b4f2a'; c.fillRect(x - 13, bot - 78, 26, 40);
          } else if (k === 'plinth') { c.fillStyle = '#d9b77e'; c.fillRect(l, top, w, h); c.fillStyle = '#a8834e'; c.fillRect(l - 5, top, w + 10, 4); for (let x2 = l + 12; x2 < l + w; x2 += 26) c.fillRect(x2, top + 5, 2, 7); }
          else { c.fillStyle = '#adb5bd'; c.fillRect(l, top, w, h); c.fillStyle = '#6c757d'; c.fillRect(l, top, w, 3); c.fillStyle = '#ffd400'; for (let x2 = l + 4; x2 < l + w - 8; x2 += 22) c.fillRect(x2, top + 4, 10, 2.5); } // dalle de béton
          break;
        }
        case 'bridge': // château d'un navire : passerelle vitrée, cheminée, mât
          c.fillStyle = '#f1faee'; c.fillRect(l, top + 30, w, h); c.fillRect(l - 8, top + 30, w + 16, 16); c.fillStyle = '#9ad1e6'; c.fillRect(l - 5, top + 34, w + 10, 7);
          c.fillStyle = '#c1121f'; c.fillRect(l + 8, top, w - 16, 30); c.fillStyle = '#1b1b26'; c.fillRect(l + 8, top, w - 16, 7);
          break;
        case 'derrick': { // derrick : tour en treillis, torchère au sommet
          c.strokeStyle = '#495057'; c.lineWidth = 3; c.beginPath(); c.moveTo(l, top + h); c.lineTo(x - 5, top); c.moveTo(l + w, top + h); c.lineTo(x + 5, top); c.stroke();
          c.lineWidth = 1.6; c.beginPath(); for (let y2 = top + 20; y2 < top + h - 40; y2 += 36) { const a2 = 5 + ((w / 2 - 5) * (y2 - top)) / h, b2 = 5 + ((w / 2 - 5) * (y2 + 36 - top)) / h; c.moveTo(x - a2, y2); c.lineTo(x + b2, y2 + 36); c.moveTo(x + a2, y2); c.lineTo(x - b2, y2 + 36); } c.stroke();
          c.fillStyle = Math.sin(time * 9 + o.v * 7) > 0 ? '#ffb703' : '#ff5a1f'; c.beginPath(); c.moveTo(x - 6, top); c.quadraticCurveTo(x - 9 + Math.sin(time * 5) * 3, top - 16, x, top - 26 - 6 * Math.abs(Math.sin(time * 4))); c.quadraticCurveTo(x + 9, top - 14, x + 6, top); c.fill();
          break;
        }
        case 'turbine': { // éolienne : mât clair et trois pales qui tournent
          c.fillStyle = '#f1f3f5'; c.beginPath(); c.moveTo(x - 6, top + h); c.lineTo(x - 3, top); c.lineTo(x + 3, top); c.lineTo(x + 6, top + h); c.fill();
          c.fillStyle = rgba('#f1f3f5', 0.9); for (let k = 0; k < 3; k++) { const a2 = time * 1.6 + o.v * 6 + (k * TAU) / 3; c.beginPath(); c.moveTo(x, top); c.lineTo(x + Math.cos(a2 + 0.07) * 64, top + Math.sin(a2 + 0.07) * 64); c.lineTo(x + Math.cos(a2 - 0.1) * 30, top + Math.sin(a2 - 0.1) * 30); c.fill(); }
          c.fillStyle = '#adb5bd'; c.beginPath(); c.arc(x, top, 5, 0, TAU); c.fill();
          break;
        }
        case 'obel': // obélisque dressé
          c.fillStyle = '#d9b77e'; c.beginPath(); c.moveTo(l, top + h); c.lineTo(l + w * 0.2, top + 16); c.lineTo(x, top); c.lineTo(l + w * 0.8, top + 16); c.lineTo(l + w, top + h); c.fill();
          c.fillStyle = '#a8834e'; c.beginPath(); c.moveTo(x, top); c.lineTo(l + w * 0.8, top + 16); c.lineTo(l + w, top + h); c.lineTo(x + 1, top + h); c.fill(); c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(l + w * 0.2, top + 16); c.lineTo(x, top); c.lineTo(l + w * 0.8, top + 16); c.fill();
          break;
        case 'column': // colonne de temple à chapiteau
          c.fillStyle = '#e9d8a6'; c.fillRect(l + 5, top + 12, w - 10, h); c.fillStyle = '#ca9a55'; c.fillRect(l - 2, top, w + 4, 12); c.fillStyle = rgba('#8a6a3a', 0.35); for (let x2 = l + 10; x2 < l + w - 8; x2 += 7) c.fillRect(x2, top + 14, 2, h);
          break;
        case 'ledge': { // corniche : un éperon de la même matière que la falaise, large à sa racine dans la paroi, effilé vers le vide
          const sd = o.side || -1, root = x - sd * (w / 2 + 6), tip = x + sd * w / 2, j = (k) => hash(k, o.v * 77) * 3;
          const gr = c.createLinearGradient(0, 380, 0, 820); gr.addColorStop(0, def.ground); gr.addColorStop(1, def.groundDeep || mix(def.ground, '#000000', 0.35));
          c.fillStyle = gr;
          c.beginPath(); c.moveTo(root, top - 10); c.lineTo(root + sd * w * 0.35, top - 1 + j(1)); c.lineTo(tip - sd * 5, top + j(2)); c.lineTo(tip, top + 4);
          c.lineTo(tip - sd * 6, top + h); c.lineTo(root + sd * w * 0.45, top + h + 5 + j(3)); c.lineTo(root, top + h + 30); c.fill();
          c.strokeStyle = rgba(def.rim, 0.75); c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath();
          c.moveTo(root, top - 10); c.lineTo(root + sd * w * 0.35, top - 1 + j(1)); c.lineTo(tip - sd * 5, top + j(2)); c.lineTo(tip, top + 4); c.lineTo(tip - sd * 6, top + h); c.lineTo(root + sd * w * 0.45, top + h + 5 + j(3)); c.lineTo(root, top + h + 30); c.stroke();
          break;
        }
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
