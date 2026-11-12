// Mécanique de sauvetage (monde Heli Rescue) : se poser près des victimes, les embarquer, les ramener à la base.
// S'appuie sur le moteur de vol existant (js/game.js), sans le dupliquer.
import { Game } from './game.js';
import { clamp } from './util.js';

// Surcroît de masse par passager : l'appareil chargé pousse moins fort et réagit moins vite.
const WEIGHT = { person: 0.08, small: 0.03, medium: 0.08, big: 0.2 };
const SPEED = { person: 30, small: 62, medium: 44, big: 24 }; // vitesse de marche vers la porte

export class RescueGame extends Game {
  constructor(level, heli, diff) { super(level, heli, 0, diff); }

  reset(fromPad) {
    super.reset(fromPad);
    if (!fromPad || !this.vs) {
      // état de chaque victime : wait (attend), walk (marche puis embarque), aboard (à bord), out (débarquée, marche vers les secours), saved
      this.vs = this.L.rescue.victims.map((v) => ({ ...v, state: 'wait', px: v.x, board: 0, seat: -1, t: 0 }));
    } else {
      for (const v of this.vs) if (v.state === 'walk' || v.state === 'aboard') { v.state = 'wait'; v.px = v.x; v.board = 0; v.seat = -1; } // reprise : retour au point d'attente
    }
    this.unloadT = 0; this.winT = 0; this.warned = ''; this.failReason = '';
  }

  get aboard() { return this.vs.filter((v) => v.state === 'aboard'); }
  get savedCount() { return this.vs.filter((v) => v.state === 'out' || v.state === 'saved').length; }

  step(dt) {
    const cfg = this.L.rescue.cfg, hh = this.heli;
    // Air raréfié : la poussée baisse avec l'altitude, sauf pour les appareils de montagne
    this.lift = 1;
    if (cfg.thinAir && !this.H.noAltLoss) this.lift = 1 - cfg.thinAir.loss * clamp((cfg.thinAir.above - hh.y) / cfg.thinAir.span, 0, 1);
    // Rafales périodiques (embruns, vent) : une poussée latérale tant que la rafale souffle
    this.gustX = 0;
    for (const q of this.L.gusts) if (hh.x > q.x && hh.x < q.x + q.w && ((this.t / q.period + (q.phase || 0)) % 1) < q.on) this.gustX += q.fx;
    super.step(dt);
    if (this.state !== 'fly') return;
    this.water(dt);
    if (this.state !== 'fly') return;
    // un chien perdu aboie quand l'appareil approche
    this.barkT = (this.barkT || 0) - dt;
    if (this.barkT <= 0) { const d = this.vs.find((v) => v.variant === 'dog' && v.state === 'wait' && Math.abs(v.px - hh.x) < 520); if (d) { this.barkT = 1.7; this.ev.push({ type: 'bark', x: d.px, y: d.y }); } }
    const h = this.heli, H = this.H, L = this.L, pad = this.onPad >= 0 ? L.pads[this.onPad] : null;
    const still = h.grounded && Math.abs(h.vx) < 20 && h.power < 0.5 && Math.abs(h.tilt) < 12;
    const aboard = this.aboard, big = (v) => v.size === 'big';
    let seats = H.places - aboard.filter((v) => !big(v)).length - this.vs.filter((v) => v.state === 'walk' && !big(v)).length;
    let cargo = !!H.heavyLift && !this.vs.some((v) => big(v) && (v.state === 'aboard' || v.state === 'walk'));

    for (const v of this.vs) {
      if (v.state === 'wait') {
        // retour tranquille au point d'attente si l'embarquement a été interrompu
        if (Math.abs(v.px - v.x) > 1) v.px += Math.sign(v.x - v.px) * SPEED[v.size] * 0.6 * dt;
        if (pad && pad.i === v.zone && still) {
          if (big(v) ? cargo : seats > 0) { v.state = 'walk'; if (big(v)) cargo = false; else seats--; }
          else this.warn(big(v) && !H.heavyLift ? 'needBig' : 'full');
        }
      } else if (v.state === 'walk') {
        if (!(pad && pad.i === v.zone && h.grounded)) { v.state = 'wait'; v.board = 0; this.ev.push({ type: 'cancel' }); continue; } // décollage trop tôt : annulé
        const dx = h.x - v.px;
        if (Math.abs(dx) > 9) v.px += Math.sign(dx) * SPEED[v.size] * (v.limp ? 0.6 : 1) * dt;
        else {
          v.board += dt / 1.3;
          if (v.board >= 1) {
            v.state = 'aboard';
            v.seat = big(v) ? 'cargo' : H.look.seats.findIndex((_, i) => !this.vs.some((o) => o.state === 'aboard' && o.seat === i));
            this.ev.push({ type: 'aboard', x: h.x, y: h.y });
          }
        }
      } else if (v.state === 'out') {
        const tx = L.rescue.base.x + 96;
        v.t += dt;
        if (Math.abs(tx - v.px) > 3) v.px += Math.sign(tx - v.px) * SPEED[v.size] * dt; else v.state = 'saved';
      }
    }

    // À la base : les passagers descendent un par un
    if (pad && pad.base && still && aboard.length) {
      this.unloadT += dt;
      if (this.unloadT > 0.6) { this.unloadT = 0; const v = aboard[0]; v.state = 'out'; v.px = h.x; v.seat = -1; v.t = 0; this.ev.push({ type: 'saved', x: h.x, y: h.y - 14 }); }
    } else this.unloadT = 0;

    this.mass = 1 + this.aboard.reduce((m, v) => m + (WEIGHT[v.size] || 0.08), 0);

    // Mission accomplie quand tout le monde est descendu à la base
    if (this.vs.every((v) => v.state === 'out' || v.state === 'saved')) {
      this.winT += dt;
      if (this.winT > 1.3) { this.state = 'win'; this.stateT = 0; this.ev.push({ type: 'win' }); }
    }
  }

  // Eau : seul un amphibie peut s'y poser ; les autres sont rejetés et abîmés. Si la marée recouvre une zone
  // où quelqu'un attend encore, la mission est perdue.
  water(dt) {
    const L = this.L, h = this.heli;
    if (!L.waterAt) return;
    const wy = L.waterAt(this.t);
    if (h.y + 11 > wy) {
      if (this.H.amphibious) { h.y = wy - 11; if (h.vy > 0) h.vy = 0; h.grounded = true; h.vx -= h.vx * Math.min(1, 3 * dt); }
      else { this.damage(3, h.x, wy); h.y = wy - 12; h.vy = -190; this.ev.push({ type: 'splash', x: h.x, y: wy }); }
    }
    for (const v of this.vs) if ((v.state === 'wait' || v.state === 'walk') && wy < L.pads[v.zone].y - 2) return this.fail('tide');
  }
  fail(reason) { this.failReason = reason; this.heli.hp = 0; this.state = 'dead'; this.stateT = 0; this.ev.push({ type: 'crash', x: this.heli.x, y: this.heli.y }); }

  warn(kind) { if (this.warned !== kind) { this.warned = kind; this.ev.push({ type: 'note', kind }); } }

  // Les trois étoiles : tout le monde sauvé, temps, chocs.
  stars() {
    const s = this.L.rescue.cfg.stars;
    return [true, this.t <= s.time, this.stats.hits <= s.maxHits];
  }
}

// Pilote automatique de sauvetage : valide les niveaux (tools/sim-rescue.mjs) et anime le fond des menus.
export function rescueAutopilot(g) {
  const h = g.heli, L = g.L, H = g.H, inp = g.input, aboard = g.aboard;
  const can = (v) => v.size !== 'big' || H.heavyLift;
  const waiting = g.vs.filter((v) => v.state === 'wait' && can(v));
  const full = aboard.filter((v) => v.size !== 'big').length >= H.places;
  const busy = g.vs.some((v) => v.state === 'walk') || (g.onPad === 0 && aboard.length && h.grounded);
  if (busy) { inp.thrust = false; return; } // embarquement ou débarquement en cours : on reste posé
  let P = L.rescue.base;
  if (waiting.length && !full) {
    const nearest = waiting.reduce((a, b) => (Math.abs(b.x - h.x) < Math.abs(a.x - h.x) ? b : a));
    P = L.pads[nearest.zone];
  } else if (!aboard.length && !waiting.length) P = L.rescue.base;
  const dxp = P.x - h.x, dir = Math.sign(dxp) || 1;
  let ty = L.pathAt(h.x + dir * 60), vdes = clamp(dxp * 0.9, -150, 150), landing = false;
  if (Math.abs(dxp) < 380) {
    // on reste à l'altitude de croisière jusqu'à l'aplomb de la zone, puis on descend à la verticale
    if (Math.abs(dxp) < P.w * 0.22 && Math.abs(h.vx) < 45) landing = true;
  }
  if (h.y > ty + 45 && Math.abs(dxp) > 60) vdes = clamp(vdes, -25, 25); // trop bas : on monte d'abord, presque à la verticale
  else if (Math.abs(h.y - ty) > 70 && Math.abs(dxp) > 200) vdes = clamp(vdes, -90, 90);
  for (const o of L.obs) { // danger périodique droit devant : on patiente
    if (!o.safeAt) continue;
    const d = (o.x - h.x) * dir;
    if (d > 10 && d < 100) { let safe = true; for (let t = 0; t < 1.1; t += 0.1) if (!o.safeAt(g.t + t, h.y)) safe = false; if (!safe) vdes = -25 * dir; }
  }
  inp.tilt = clamp(vdes * 0.08 + (vdes - h.vx) * 0.3, -32, 32);
  inp.thrust = landing ? h.vy > (h.y < P.y - 75 ? 95 : 34) : h.grounded || h.y + h.vy * 0.26 > ty;
}
