// Simulation : physique de l'hélicoptère, collisions, objets, objectifs.
// Aucune dépendance au DOM : ce module tourne aussi sous Node (tools/sim.mjs).
import { clamp, DEG } from './util.js';
import { dynShapes, geyserState, moverY } from './levelgen.js';

export const G = 400; // gravité (unités/s²)
export const TOP = 24; // plafond de vol
export const DT = 1 / 120;
export const BASE_TILT = 14, MIN_TILT = -28, MAX_TILT = 38;
const HIT = [[2, 0, 11], [-19, -2, 6]]; // cercles de collision (repère de l'appareil)
const SOFT = 60; // vitesse d'impact sous laquelle on ne subit aucun dégât

// Point le plus proche d'un polygone convexe (ou d'un segment) ; renvoie distance signée.
function polyContact(pts, cx, cy, out) {
  const n = pts.length / 2;
  let best = 1e9, bx = 0, by = 0, inside = n > 2;
  for (let i = 0; i < n; i++) {
    const x1 = pts[i * 2], y1 = pts[i * 2 + 1], k = ((i + 1) % n) * 2, x2 = pts[k], y2 = pts[k + 1];
    const ex = x2 - x1, ey = y2 - y1;
    let t = ((cx - x1) * ex + (cy - y1) * ey) / (ex * ex + ey * ey || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = x1 + ex * t, qy = y1 + ey * t, d = Math.hypot(cx - qx, cy - qy);
    if (d < best) { best = d; bx = qx; by = qy; }
    if (inside && ex * (cy - y1) - ey * (cx - x1) < 0) inside = false;
    if (n === 2) break;
  }
  out.d = inside ? -best : best;
  const s = best > 1e-6 ? (inside ? -1 : 1) / best : 0;
  out.nx = (cx - bx) * s; out.ny = (cy - by) * s;
  if (!s) { out.nx = 0; out.ny = -1; }
}

export class Game {
  constructor(level, heli) {
    this.L = level; this.H = heli;
    this.ev = [];
    this.input = { thrust: false, tilt: BASE_TILT };
    this.reset(false);
  }

  reset(fromCheckpoint) {
    const L = this.L;
    if (!fromCheckpoint) {
      this.t = 0;
      this.taken = new Uint8Array(L.items.length);
      this.cpIdx = -1;
      this.stats = { orbs: 0, rings: 0, hits: 0, respawns: 0, padImpact: 0, dist: 0 };
    }
    const h = (this.heli = { x: L.startX, y: L.groundAt(L.startX) - 11, vx: 0, vy: 0, tilt: 0, power: 0, hp: this.H.armor, inv: 0, grounded: true, spin: 0, air: 0 });
    this.state = 'fly';
    if (fromCheckpoint && this.cpIdx >= 0) {
      const c = L.checkpoints[this.cpIdx];
      h.x = c.x; h.y = c.y; h.grounded = false; h.hp = Math.round(this.H.armor * 0.6); h.inv = 2.5; h.tilt = 6;
      this.state = 'ready';
      this.stats.respawns++;
    }
    this.stateT = 0; this.padT = 0; this.o0 = 0;
    this.input.tilt = BASE_TILT;
  }

  damage(d, x, y) {
    const h = this.heli;
    if (h.inv > 0 || this.state !== 'fly') return;
    h.hp -= d; h.inv = 1; this.stats.hits++;
    this.ev.push({ type: 'hit', dmg: d, x, y });
    if (h.hp <= 0) { h.hp = 0; this.state = 'dead'; this.stateT = 0; this.ev.push({ type: 'crash', x: h.x, y: h.y }); }
  }

  step(dt = DT) {
    const h = this.heli, L = this.L, inp = this.input, H = this.H;
    if (this.state === 'ready') { if (!inp.thrust) return; this.state = 'fly'; }
    this.stateT += dt;
    if (this.state === 'win') { h.power += (0 - h.power) * Math.min(1, dt * 2); return; }
    const fly = this.state === 'fly';
    if (fly) this.t += dt;
    const thrust = fly && inp.thrust;
    h.power += ((thrust ? 1 : 0) - h.power) * Math.min(1, dt * (thrust ? 9 : 6));
    if (fly) {
      const tt = h.grounded && !thrust ? 0 : clamp(inp.tilt, MIN_TILT, MAX_TILT);
      h.tilt += clamp(tt - h.tilt, -H.agility * dt, H.agility * dt);
    } else { h.spin += dt * 9; }
    if (h.inv > 0) h.inv -= dt;

    // Forces : poussée du rotor le long de l'axe de l'appareil, gravité, traînée, vent.
    const T = H.power * G * h.power, a = h.tilt * DEG;
    let ax = T * Math.sin(a) - H.drag * h.vx, ay = -T * Math.cos(a) + G - 0.9 * h.vy;
    for (const z of L.zones) {
      if (h.x > z.x && h.x < z.x + z.w && h.y > z.y0 && h.y < z.y1) {
        const e = Math.min(1, (h.x - z.x) / 40, (z.x + z.w - h.x) / 40);
        ax += z.fx * e; ay += z.fy * e;
      }
    }
    h.vx += ax * dt; h.vy += ay * dt;
    const ox = h.x;
    h.x += h.vx * dt; h.y += h.vy * dt;
    if (h.y < TOP) { h.y = TOP; if (h.vy < 0) h.vy = 0; }
    if (h.x < 30) { h.x = 30; if (h.vx < 0) h.vx = 0; }
    if (h.x > L.length - 30) { h.x = L.length - 30; if (h.vx > 0) h.vx = 0; }
    this.stats.dist += Math.abs(h.x - ox);

    const was = h.grounded;
    h.grounded = false;
    this.collide(dt);
    if (h.grounded) h.air = 0; else h.air += dt;
    if (!fly) return;
    if (h.grounded && !was) this.ev.push({ type: 'land' });

    // Objets
    for (let i = 0; i < L.items.length; i++) {
      if (this.taken[i]) continue;
      const it = L.items[i], dx = it.x - h.x;
      if (dx > 40) break;
      if (dx < -40) continue;
      const d = Math.hypot(dx, it.y - h.y);
      if (it.type === 'orb' && d < 27) { this.taken[i] = 1; this.stats.orbs++; this.ev.push({ type: 'orb', x: it.x, y: it.y }); }
      else if (it.type === 'ring' && d < 30) { this.taken[i] = 1; this.stats.rings++; this.ev.push({ type: 'ring', x: it.x, y: it.y }); }
      else if (it.type === 'repair' && d < 30) {
        this.taken[i] = 1; h.hp = Math.min(H.armor, h.hp + H.armor * 0.35); this.ev.push({ type: 'repair', x: it.x, y: it.y });
      }
    }
    const nc = L.checkpoints[this.cpIdx + 1];
    if (nc && h.x > nc.x) { this.cpIdx++; this.ev.push({ type: 'cp', x: nc.x, y: nc.y }); }

    // Victoire : posé et immobile sur l'héliport d'arrivée.
    const onPad = Math.abs(h.x - L.pad.x) < L.pad.w / 2;
    if (h.grounded && onPad && Math.abs(h.vx) < 30) {
      this.padT += dt;
      if (this.padT > 0.45) { this.state = 'win'; this.stateT = 0; this.ev.push({ type: 'win' }); }
    } else this.padT = 0;
  }

  collide(dt) {
    const h = this.heli, L = this.L;
    const ca = Math.cos(h.tilt * DEG), sa = Math.sin(h.tilt * DEG), c = {};
    let pen = 0, nx = 0, ny = 0, hz = 0, px = 0, py = 0, isGround = false;
    const obs = L.obs;
    while (this.o0 < obs.length && obs[this.o0].maxX < h.x - 500) this.o0++;
    while (this.o0 > 0 && obs[this.o0 - 1].maxX > h.x - 500) this.o0--;
    for (const [ox, oy, r] of HIT) {
      const cx = h.x + ox * ca - oy * sa, cy = h.y + ox * sa + oy * ca;
      // sol
      let s = L.groundSlope(cx), k = 1 / Math.sqrt(1 + s * s), d = (L.groundAt(cx) - cy) * k;
      if (r - d > pen) { pen = r - d; nx = s * k; ny = -k; hz = 0; px = cx; py = cy + r; isGround = true; }
      // plafond
      const cl = L.ceilAt(cx);
      if (cl > -200) {
        s = L.ceilSlope(cx); k = 1 / Math.sqrt(1 + s * s); d = (cy - cl) * k;
        if (r - d > pen) { pen = r - d; nx = -s * k; ny = k; hz = 0; px = cx; py = cy - r; isGround = false; }
      }
      for (let i = this.o0; i < obs.length; i++) {
        const o = obs[i];
        if (o.minX > cx + 30) break;
        if (o.maxX < cx - 30) continue;
        const shapes = o.dyn ? dynShapes(o, this.t) : o.shapes;
        for (const sh of shapes) {
          let dd;
          if (sh.c) {
            const dx = cx - sh.c[0], dy = cy - sh.c[1], dist = Math.hypot(dx, dy) || 1e-6;
            dd = dist - sh.c[2]; c.nx = dx / dist; c.ny = dy / dist;
          } else { polyContact(sh.p, cx, cy, c); dd = c.d - (sh.r || 0); }
          if (r - dd > pen) { pen = r - dd; nx = c.nx; ny = c.ny; hz = sh.hz || 0; px = cx - nx * r; py = cy - ny * r; isGround = false; }
        }
      }
    }
    if (pen <= 0) return;
    h.x += nx * pen; h.y += ny * pen;
    const vn = h.vx * nx + h.vy * ny;
    if (hz) {
      this.damage(hz, px, py);
      if (vn < 150) { h.vx += (150 - vn) * nx; h.vy += (150 - vn) * ny; }
      return;
    }
    if (vn >= 0) return;
    const impact = -vn, soft = impact < SOFT, e = soft ? 0 : 0.4;
    h.vx -= (1 + e) * vn * nx; h.vy -= (1 + e) * vn * ny;
    if (!soft) {
      this.damage(5 + (impact - SOFT) * 0.13, px, py);
      this.ev.push({ type: 'bump', x: px, y: py });
    }
    if (isGround && Math.abs(h.x - L.pad.x) < L.pad.w / 2 && impact > this.stats.padImpact && h.air > 0.15) this.stats.padImpact = impact;
    if (ny < -0.75 && soft) {
      h.grounded = true;
      h.vx -= h.vx * Math.min(1, 7 * dt);
    }
  }

  // Résultat d'un objectif à la fin du niveau.
  objectiveDone(o) {
    const s = this.stats, L = this.L;
    switch (o.t) {
      case 'finish': return true;
      case 'orbs': return s.orbs >= Math.ceil((L.orbTotal * o.v) / 100);
      case 'time': return this.t <= o.v;
      case 'hp': return this.heli.hp >= (this.H.armor * o.v) / 100;
      case 'hits': return s.hits <= o.v;
      case 'nocp': return s.respawns === 0;
      case 'soft': return s.padImpact <= o.v;
      case 'rings': return s.rings >= L.ringTotal;
    }
    return false;
  }
}

// Pilote automatique : sert à valider les niveaux (tools/sim.mjs) et à animer le menu.
export function autopilot(g) {
  const h = g.heli, L = g.L, inp = g.input;
  let ty = L.pathAt(h.x + 55 + Math.max(0, h.vx) * 0.35), vdes = 150;
  const dxp = L.pad.x - h.x;
  let landing = false;
  if (dxp < 430) {
    vdes = clamp(dxp * 0.9, -70, 140);
    const gy = L.groundAt(h.x) - 12;
    if (Math.abs(dxp) < 42 && Math.abs(h.vx) < 45) landing = true;
    else ty = Math.min(ty, gy - 55);
  }
  for (let i = g.o0; i < L.obs.length; i++) {
    const o = L.obs[i];
    if (o.minX > h.x + 260) break;
    if (!o.dyn || o.kind === 'mill') continue;
    const dist = o.minX - (h.x + 16);
    if (dist < -4 || dist > 230) continue;
    const v = Math.max(120, h.vx), tA = dist / v, tB = (dist + (o.maxX - o.minX) + 44) / v;
    let safe = true;
    if (o.kind === 'geyser') {
      for (let t = tA - 0.1; t <= tB + 0.1; t += 0.08) if (geyserState(o, g.t + t).h > 0.05) safe = false;
    } else {
      for (let t = tA; t <= tB; t += 0.08) if (Math.abs(moverY(o, g.t + t) - L.pathAt(o.x)) < o.r + 30) safe = false;
    }
    if (!safe) { vdes = dist < 80 ? -25 : 25; break; }
  }
  const err = Math.abs(h.y - ty);
  if (err > 70) vdes = Math.min(vdes, 90);
  inp.tilt = clamp(vdes * 0.08 + (vdes - h.vx) * 0.3, -24, 32);
  inp.thrust = landing ? h.vy > 38 : h.grounded || h.y + h.vy * 0.26 > ty;
}
