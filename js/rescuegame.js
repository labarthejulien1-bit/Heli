// Mécanique de sauvetage (monde Heli Rescue) : se poser près des victimes, les embarquer, les ramener à la base.
// S'appuie sur le moteur de vol existant (js/game.js), sans le dupliquer.
import { Game } from './game.js';
import { clamp } from './util.js';

// Surcroît de masse par passager : l'appareil chargé pousse moins fort et réagit moins vite.
const WEIGHT = { person: 0.08, small: 0.03, medium: 0.08, big: 0.2 };
const SPEED = { person: 30, small: 62, medium: 44, big: 24 }; // vitesse de marche vers la porte

export class RescueGame extends Game {
  constructor(level, heli, diff, owned = 0) { super(level, heli, owned, diff); }
  // Mission accomplie quand tout le monde est descendu à la base (redéfini par Heli Cargo).
  missionDone() { return this.vs.every((v) => v.state === 'out' || v.state === 'saved'); }

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
    for (const q of this.L.gusts) if (hh.x > q.x && hh.x < q.x + q.w && hh.y > (q.y0 ?? -1e9) && hh.y < (q.y1 ?? 1e9) && ((this.t / q.period + (q.phase || 0)) % 1) < q.on) this.gustX += q.fx; // y0/y1 : courant limité à une tranche d'altitude
    // Zones mobiles (plaques de glace) : la zone, l'appareil posé dessus et ceux qui y attendent dérivent ensemble
    for (const p of this.L.pads) {
      if (!p.move) continue;
      const nx = p.move(this.t), dx = nx - p.x; p.x = nx;
      if (this.onPad === p.i && hh.grounded) hh.x += dx;
      if (p.bob) p.y = p.bob(this.t);
      for (const v of this.vs) if (v.zone === p.i) { v.x = nx + v.off; v.y = p.y; if (v.state === 'wait' || v.state === 'walk') v.px += dx; }
    }
    super.step(dt);
    if (this.state !== 'fly') return;
    this.water(dt);
    this.dangers(dt);
    if (this.state !== 'fly') return;
    // un animal qui attend appelle quand l'appareil approche
    this.callT = (this.callT || 0) - dt;
    if (this.callT <= 0) { const d = this.vs.find((v) => v.type === 'animal' && v.state === 'wait' && Math.abs(v.px - hh.x) < 520 && (v.found || !cfg.radar)); if (d) { this.callT = 2.1; this.ev.push({ type: 'call', variant: d.variant, x: d.px, y: d.y }); } }
    const h = this.heli, H = this.H, L = this.L, pad = this.onPad >= 0 ? L.pads[this.onPad] : null;
    const still = h.grounded && Math.abs(h.vx) < 20 && h.power < 0.5 && Math.abs(h.tilt) < 12;
    const aboard = this.aboard, big = (v) => v.size === 'big';
    // Aucune zone n'est tracée au sol : il suffit d'être posé à plat tout près de la victime, à sa hauteur.
    const near = (v) => Math.abs(h.x - v.px) < 150 && Math.abs(h.y + 11 - v.y) < 28;
    let seats = H.places - aboard.filter((v) => !big(v)).length - this.vs.filter((v) => v.state === 'walk' && !big(v)).length;
    let cargo = !!H.heavyLift && !this.vs.some((v) => big(v) && (v.state === 'aboard' || v.state === 'walk'));

    for (const v of this.vs) {
      if (v.state === 'wait') {
        // retour tranquille au point d'attente si l'embarquement a été interrompu
        if (Math.abs(v.px - v.x) > 1) v.px += Math.sign(v.x - v.px) * SPEED[v.size] * 0.6 * dt;
        if (near(v) && still && pad !== L.rescue.base && (v.found || !L.rescue.cfg.radar)) {
          if (big(v) ? cargo : seats > 0) { v.state = 'walk'; if (big(v)) cargo = false; else seats--; }
          else this.warn(big(v) && !H.heavyLift ? 'needBig' : 'full');
        }
      } else if (v.state === 'walk') {
        if (!(near(v) && h.grounded)) { v.state = 'wait'; v.board = 0; this.ev.push({ type: 'cancel' }); continue; } // décollage trop tôt : annulé
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
    if (this.missionDone()) {
      this.winT += dt;
      if (this.winT > 1.3) { this.state = 'win'; this.stateT = 0; this.ev.push({ type: 'win' }); }
    }
  }

  // Eau : seul un amphibie peut s'y poser ; les autres sont rejetés et abîmés. Si la marée recouvre une zone
  // où quelqu'un attend encore, la mission est perdue.
  water(dt) {
    const L = this.L, h = this.heli;
    if (!L.waterAt) return;
    const wy = L.surfAt(h.x, this.t), crest = L.waterAt(this.t) - wy; // crest : hauteur de la vague à cet endroit
    if (h.y + 11 > wy) {
      if (this.H.amphibious && crest < 18) { h.y = wy - 11; if (h.vy > 0) h.vy = 0; h.grounded = true; h.vx -= h.vx * Math.min(1, 3 * dt); }
      else { this.damage(3, h.x, wy); h.y = wy - 12; h.vy = -190; this.ev.push({ type: 'splash', x: h.x, y: wy }); }
    }
    const flat = L.waterAt(this.t);
    for (const v of this.vs) if ((v.state === 'wait' || v.state === 'walk') && !L.pads[v.zone].floe && !L.pads[v.zone].water && flat < L.pads[v.zone].y - 2) return this.fail('tide');
  }
  // Front de feu, répliques, détecteur de victimes.
  dangers(dt) {
    const L = this.L, h = this.heli, F = L.fire, Q = L.quake;
    if (F) {
      const fx = F.x + F.speed * this.t;
      if (Math.abs(h.x - fx) < 34 && h.y > L.groundAt(h.x) - (F.height || 230)) { this.damage(3, h.x, h.y); h.vx -= Math.sign(F.speed) * 160; h.vy = -120; }
      for (const v of this.vs) if ((v.state === 'wait' || v.state === 'walk') && (F.speed < 0 ? fx < v.px + 20 : fx > v.px - 20)) return this.fail('fire');
    }
    if (Q) { // réplique : l'appareil posé sur une zone est secoué et décolle un peu (l'embarquement s'interrompt)
      const on = ((this.t / Q.period) % 1) < Q.on;
      if (on && !this.quaking) { this.ev.push({ type: 'quake' }); if (h.grounded && this.onPad !== 0) { h.vy = -95; h.y -= 3; } }
      this.quaking = on;
    }
    for (const v of this.vs) if (v.state === 'wait' && L.pads[v.zone].water && !this.H.amphibious && Math.abs(v.px - h.x) < 160) this.warn('needAmphi');
    if (L.rescue.cfg.timeLimit && this.t > L.rescue.cfg.timeLimit) return this.fail('storm'); // fenêtre météo refermée
    if (L.rescue.cfg.radar) { // victimes ensevelies : visibles seulement de près, le détecteur bipe de plus en plus vite
      let d = 1e9;
      for (const v of this.vs) { if (v.state !== 'wait' || v.found) continue; const k = Math.abs(v.px - h.x); if (k < 150) { v.found = true; this.ev.push({ type: 'found', x: v.px, y: v.y }); } else d = Math.min(d, k); }
      this.beepT = (this.beepT || 0) - dt;
      if (d < 1e9 && this.beepT <= 0) { this.beepT = clamp(d / 900, 0.16, 1.3); this.ev.push({ type: 'beep', d }); }
    }
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
  const can = (v) => (v.size !== 'big' || H.heavyLift) && (!L.pads[v.zone].water || H.amphibious);
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
  let ty = L.pathAt(h.x + dir * 60), vdes = clamp(dxp * 0.9, -150, 150);
  // on reste à l'altitude de croisière jusqu'à l'aplomb de la zone, puis on descend à la verticale (sans quitter l'axe)
  const wide = P.base || P.w >= 150, tol = P.base ? 30 : wide ? P.w * 0.2 : Math.max(9, P.w * 0.1);
  if (g.botLand === P.i ? Math.abs(dxp) > tol * 2.2 && h.y < ty + 50 : !(Math.abs(dxp) < tol && Math.abs(h.vx) < (wide ? 34 : 14))) g.botLand = -1; else g.botLand = P.i;
  let landing = g.botLand === P.i;
  if (Math.abs(dxp) < 70) vdes = clamp(dxp * 1.6, -45, 45);
  if (h.y > ty + 45 && Math.abs(dxp) > 60) vdes = clamp(vdes, -10, 10); // trop bas : on monte d'abord, presque à la verticale
  else if (Math.abs(h.y - ty) > 70 && Math.abs(dxp) > 200) vdes = clamp(vdes, -90, 90);
  // oiseaux à l'altitude de croisière : on passe au-dessus (ou au-dessous)
  for (const o of L.obs) if (o.flyY != null && h.x > o.minX - 170 && h.x < o.maxX + 170 && Math.abs(ty - o.flyY) < 72) ty = o.flyY - 78 > 50 ? o.flyY - 78 : o.flyY + 78;
  // dangers périodiques : on essaie plusieurs allures et on garde la première qui reste sûre pendant près de deux secondes
  const risk = (v, vy) => {
    for (let t = 0; t <= 1.8; t += 0.1) {
      const px = h.x + v * t - (v - h.vx) * 0.5 * (1 - Math.exp(-t / 0.5)), py = h.y + vy * Math.min(t, 0.6); // la vitesse ne rejoint l'allure voulue que peu à peu
      for (const o of L.obs) { if (o.minX > h.x + 500) break; if (!o.safeAt || o.maxX < h.x - 400) continue; if ((o.wide ? px > o.minX - 90 && px < o.maxX + 90 : px > o.minX - 46 && px < o.maxX + 46) && !o.safeAt(g.t + t, py, px)) return t; }
    }
    return 9;
  };
  const vyNow = clamp(h.vy, -60, 60);
  if (landing) { if (risk(0, 70) < 9 && h.y < P.y - 120) landing = false; }
  if (!landing && !h.grounded) {
    let best = vdes, bt = -1;
    for (const v of [vdes, vdes * 0.5, 0, -70 * dir, -150 * dir, 150 * dir]) { const r = risk(v, vyNow); if (r > bt) { bt = r; best = v; } if (r >= 9) break; }
    vdes = best;
  } else if (h.grounded && !landing && risk(vdes * 0.4, -60) < 9) { inp.thrust = false; inp.tilt = 0; return; } // on attend au sol que la voie soit libre
  inp.tilt = clamp(vdes * 0.08 + (vdes - h.vx) * 0.3, -32, 32);
  inp.thrust = landing ? h.vy > (h.y < P.y - 75 ? (P.base ? 95 : 70) : 34) : h.grounded || h.y + h.vy * 0.26 > ty || h.vy > 115;
}
