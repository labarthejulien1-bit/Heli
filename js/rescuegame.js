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
    this.unloadT = 0; this.winT = 0; this.warned = '';
  }

  get aboard() { return this.vs.filter((v) => v.state === 'aboard'); }
  get savedCount() { return this.vs.filter((v) => v.state === 'out' || v.state === 'saved').length; }

  step(dt) {
    super.step(dt);
    if (this.state !== 'fly') return;
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
    if (Math.abs(dxp) < P.w * 0.22 && Math.abs(h.vx) < 45) landing = true;
    else ty = Math.min(Math.max(ty, P.y - 150), P.y - 67);
  }
  if (Math.abs(h.y - ty) > 70 && Math.abs(dxp) > 200) vdes = clamp(vdes, -90, 90);
  inp.tilt = clamp(vdes * 0.08 + (vdes - h.vx) * 0.3, -32, 32);
  inp.thrust = landing ? h.vy > 34 : h.grounded || h.y + h.vy * 0.26 > ty;
}
