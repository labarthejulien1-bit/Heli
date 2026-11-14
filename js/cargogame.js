// Règles du levage (monde Heli Cargo) : se placer au-dessus d'une charge, laisser le câble la saisir, la porter
// en bout de câble jusqu'à sa zone de livraison, l'y poser, puis atterrir. S'appuie sur le moteur de vol (js/game.js)
// et sur les éléments de mission de Heli Rescue (eau, rafales, dangers), sans les dupliquer.
import { RescueGame } from './rescuegame.js';
import { G } from './game.js';
import { clamp } from './util.js';
import { MAX_RATIO } from './cargo.js';

const ptDist = (sh, x, y) => {
  if (sh.c) return Math.hypot(x - sh.c[0], y - sh.c[1]) - sh.c[2];
  const P = sh.p, n = P.length / 2; let best = 1e9, inside = n > 2;
  for (let i = 0; i < n; i++) { const x1 = P[i * 2], y1 = P[i * 2 + 1], k = ((i + 1) % n) * 2, ex = P[k] - x1, ey = P[k + 1] - y1, t = clamp(((x - x1) * ex + (y - y1) * ey) / (ex * ex + ey * ey || 1), 0, 1); best = Math.min(best, Math.hypot(x - x1 - ex * t, y - y1 - ey * t)); if (inside && ex * (y - y1) - ey * (x - x1) < 0) inside = false; }
  return inside ? -best : best;
};
export const HOOK = { dx: 24, lo: 38, hi: 125, vx: 32, vy: 48 }; // fenêtre de prise : écart latéral, hauteur au-dessus de la charge, vitesses
export const HOOK_EASY = { dx: 85, lo: 22, hi: 240, vx: 95, vy: 115, speed: 170 }; // mode facile : on peut être très décalé, plus haut et peu immobile ; le câble descend deux fois plus vite

export class CargoGame extends RescueGame {
  constructor(level, heli, owned = 0, diff = 'normal') { super(level, heli, diff, owned); this.hook = diff === 'easy' ? HOOK_EASY : HOOK; }

  reset(fromPad) {
    super.reset(fromPad);
    const src = this.L.cargo.loads;
    if (!fromPad || !this.loads) this.loads = src.map((l) => ({ ...l, state: 'ground' }));
    else this.loads.forEach((l, i) => { if (l.state === 'carried') Object.assign(l, src[i], { state: 'ground' }); }); // reprise : la charge en cours retourne à sa place
    this.carry = null; this.cable = 0; this.target = null; this.th = 0; this.om = 0; this.rope = 0; this.pvx = 0; this.doneT = 0;
  }
  missionDone() { return false; } // la fin de mission est décidée ici : tout livré, puis posé sur l'aire d'arrivée
  get delivered() { return this.loads.filter((l) => l.state === 'delivered').length; }
  // Position affichée de la charge portée : posée au sol quand le câble est détendu.
  loadDraw() { const [x, y] = this.loadPos(), c = this.carry; return [x, Math.min(y, this.L.cargo.topAt(x) - c.h)]; }
  // Position du point d'attache de la charge portée (haut de la charge).
  loadPos() { const h = this.heli; return [h.x + this.rope * Math.sin(this.th), h.y + 10 + this.rope * Math.cos(this.th)]; }

  step(dt) {
    super.step(dt);
    const h = this.heli, H = this.H, L = this.L, mod = L.def.mod || {}, Gl = G * (mod.grav || 1);
    this.mass = 1 + (this.carry ? this.carry.m / H.lift : 0); // la charge alourdit l'appareil : il pousse moins fort et réagit moins vite
    if (this.state !== 'fly') return;
    const ax = (h.vx - this.pvx) / dt; this.pvx = h.vx;

    if (this.carry) {
      const c = this.carry, wind = ((mod.windX || 0) + this.gustX) * 0.6;
      // Pendule : la charge traîne derrière quand on accélère, se balance, et tire l'appareil de son côté.
      this.om += (-(Gl / this.rope) * Math.sin(this.th) - (clamp(ax, -700, 700) / this.rope) * Math.cos(this.th) + (wind / this.rope) * Math.cos(this.th) - 0.9 * this.om) * dt;
      this.th = clamp(this.th + this.om * dt, -1.1, 1.1);
      if (!h.grounded) h.vx += (c.m / H.lift) * Gl * Math.sin(this.th) * Math.cos(this.th) * 0.55 * dt;
      const [lx, ly] = this.loadPos(), bottom = ly + c.h, gy = L.cargo.topAt(lx);
      const wy = L.surfAt ? L.surfAt(lx, this.t) : 1e9;
      if (bottom > Math.min(gy, wy)) {
        const z = c.to, inZone = Math.abs(lx - z.x) < z.w / 2 && Math.abs(gy - z.y) < 8 && gy <= wy;
        if (inZone && Math.abs(h.vy) < 80 && Math.abs(h.vx) < 50) { // posée dans sa zone : elle se décroche toute seule
          c.state = 'delivered'; c.x = lx; c.y = gy; this.carry = null; this.cable = 0;
          this.ev.push({ type: 'delivered', x: lx, y: gy, n: this.delivered, of: this.loads.length });
        } else if (wy < gy) { // la charge trempe dans l'eau : choc, et l'appareil est renvoyé vers le haut
          h.y -= bottom - wy; this.damage(1, lx, wy); h.vy = -110; this.ev.push({ type: 'splash', x: lx, y: wy });
        } else {
          // posée hors de sa zone : le câble se détend, la charge traîne au sol et freine l'appareil ; lâchée trop fort, elle cogne
          if (!this.rest && h.vy > 85) { this.damage(1, lx, gy); this.ev.push({ type: 'bump', x: lx, y: gy }); }
          this.rest = true; h.vx -= h.vx * Math.min(1, 2.5 * dt); this.om -= this.om * Math.min(1, 6 * dt);
        }
      } else {
        this.rest = false;
        // la charge heurte un obstacle du décor : choc, et l'appareil est renvoyé en arrière
        const cx = lx, cy = ly + c.h / 2, rad = Math.min(c.w, c.h) / 2 - 2;
        for (const o of L.obs) {
          if (o.minX > cx + 40) break;
          if (o.maxX < cx - 40 || o.dyn || !o.shapes) continue;
          let hit = false; for (const sh of o.shapes) if (ptDist(sh, cx, cy) < rad) hit = true;
          if (hit) { const before = this.stats.hits; this.damage(1, cx, cy); if (this.stats.hits > before) { const s = Math.sign(cx - o.x) || 1; h.vx = s * 90; h.vy = Math.min(h.vy, -60); this.om = -this.om * 0.5; } break; }
        }
      }
    } else {
      // Prise d'une charge : stationnaire au-dessus d'elle, à bonne hauteur, le câble descend tout seul ; sinon il remonte.
      let best = null;
      for (const l of this.loads) if (l.state === 'ground' && Math.abs(l.x - h.x) < 150 && (!best || Math.abs(l.x - h.x) < Math.abs(best.x - h.x))) best = l;
      let ok = false;
      if (best) {
        const hgt = best.y - best.h - (h.y + 10);
        const K = this.hook || HOOK, slim = best.h > best.w * 1.8 ? 18 : 0; // charge haute et étroite (pieu, pylône, obélisque) : on tolère un écart plus grand
        const inWin = Math.abs(best.x - h.x) < K.dx + slim && hgt > K.lo && hgt < K.hi;
        if (inWin && best.m / H.lift > MAX_RATIO) this.warn('tooHeavy');
        else if (inWin && Math.abs(h.vx) < K.vx && Math.abs(h.vy) < K.vy && !h.grounded) {
          ok = true; this.target = best; this.cable += (K.speed || 80) * dt;
          if (this.cable >= hgt) { // le crochet a saisi la charge
            this.carry = best; best.state = 'carried'; this.rope = Math.hypot(best.x - h.x, hgt); this.th = Math.atan2(best.x - h.x, hgt); this.om = 0; this.cable = 0; this.target = null;
            this.ev.push({ type: 'hooked', x: best.x, y: best.y - best.h });
          }
        }
      }
      if (!ok && this.cable > 0) { if (this.cable > 14 && !this.retract) this.ev.push({ type: 'unhook' }); this.retract = true; this.cable = Math.max(0, this.cable - 170 * dt); if (!this.cable) { this.target = null; this.retract = false; } }
      else if (ok) this.retract = false;
    }

    // Mission accomplie : toutes les charges livrées, appareil posé rotor au ralenti sur l'aire d'arrivée
    const fin = L.cargo.finish;
    if (!this.carry && this.delivered === this.loads.length && this.onPad === fin.i && h.grounded && h.power < 0.5 && Math.abs(h.vx) < 20) {
      this.doneT += dt;
      if (this.doneT > 0.6) { this.state = 'win'; this.stateT = 0; this.ev.push({ type: 'win' }); }
    } else this.doneT = 0;
  }
}

// Pilote automatique de levage : valide les niveaux (tools/sim-cargo.mjs) et anime le fond des menus.
export function cargoAutopilot(g) {
  const h = g.heli, L = g.L, inp = g.input, c = g.carry;
  const next = g.loads.find((l) => l.state === 'ground' && l.m / g.H.lift <= MAX_RATIO);
  const fin = L.cargo.finish;
  // objectif : la zone de la charge portée, sinon la prochaine charge, sinon l'aire d'arrivée
  const tx = c ? c.to.x : next ? next.x : fin.x, dxp = tx - h.x, dir = Math.sign(dxp) || 1;
  const hang = c ? g.rope + c.h + 26 : 0;
  let ty = Math.max(34, L.pathAt(h.x + dir * 60) - hang), vmax = c ? 120 : 150, vdes = clamp(dxp * 0.8, -vmax, vmax), mode = 'cruise';
  if (Math.abs(dxp) < 80) vdes = clamp(dxp * 1.4, -40, 40);
  if (h.y > ty + 45 && Math.abs(dxp) > 60) vdes = clamp(vdes, -10, 10);
  else if (Math.abs(h.y - ty) > 70 && Math.abs(dxp) > 200) vdes = clamp(vdes, -80, 80);
  if (c) {
    // livraison : à l'aplomb de la zone, charge calmée, on descend doucement jusqu'à ce qu'elle se pose
    if (g.botDrop ? Math.abs(dxp) < c.to.w * 0.42 : Math.abs(dxp) < Math.min(16, c.to.w * 0.15) && Math.abs(h.vx) < 16 && Math.abs(g.th) < 0.12) { g.botDrop = true; mode = 'drop'; } else g.botDrop = false;
  } else if (next) {
    g.botDrop = false;
    if (Math.abs(dxp) < 60) { mode = 'hook'; ty = next.y - next.h - 10 - 78; } // stationnaire à 78 au-dessus de la charge
  } else {
    g.botDrop = false;
    if (g.botLand ? Math.abs(dxp) < fin.w * 0.4 : Math.abs(dxp) < fin.w * 0.2 && Math.abs(h.vx) < 30) { g.botLand = true; mode = 'land'; } else g.botLand = false;
  }
  if (mode === 'cruise') for (const o of L.obs) if (o.flyY != null && h.x > o.minX - 170 && h.x < o.maxX + 170 && Math.abs(ty - o.flyY) < 72 + hang) ty = Math.max(34, o.flyY - 78 - hang);
  const risk = (v, vy) => {
    for (let t = 0; t <= 1.8; t += 0.1) {
      const px = h.x + v * t - (v - h.vx) * 0.5 * (1 - Math.exp(-t / 0.5)), py = h.y + vy * Math.min(t, 0.6);
      for (const o of L.obs) { if (o.minX > h.x + 500) break; if (!o.safeAt || o.maxX < h.x - 400) continue; if ((o.wide ? px > o.minX - 90 && px < o.maxX + 90 : px > o.minX - 46 && px < o.maxX + 46) && !o.safeAt(g.t + t, py, px)) return t; }
    }
    return 9;
  };
  if (mode === 'cruise' && !h.grounded) {
    let best = vdes, bt = -1;
    for (const v of [vdes, vdes * 0.5, 0, -70 * dir, -150 * dir, 150 * dir]) { const r = risk(v, clamp(h.vy, -60, 60)); if (r > bt) { bt = r; best = v; } if (r >= 9) break; }
    vdes = best;
  } else if (h.grounded && mode === 'cruise' && risk(vdes * 0.4, -60) < 9) { inp.thrust = false; inp.tilt = 0; return; }
  inp.tilt = clamp(vdes * 0.08 + (vdes - h.vx) * 0.3 - ((L.def.mod || {}).windX || 0) * 0.1 - g.gustX * 0.06, -30, 30);
  inp.thrust = mode === 'drop' ? h.vy > 38 : mode === 'land' ? h.vy > (h.y < fin.y - 75 ? 90 : 34) : h.grounded || h.y + h.vy * 0.26 > ty || h.vy > 115;
}
