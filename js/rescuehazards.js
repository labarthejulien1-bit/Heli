// Dangers des missions Heli Rescue, créés à partir des données d'un niveau (champ « hazards »).
// Chaque danger est un obstacle animé : shapesAt(t) donne ses formes de collision, draw(...) son dessin,
// safeAt(t) indique au pilote automatique s'il peut passer. Aucun code propre à un niveau.
import { TAU, hash } from './util.js';

export function makeHazard(hz, L) {
  if (hz.type === 'faller') {
    // Bloc (glace, roche, neige, branche en feu) qui arrive du ciel par la droite et s'écrase au sol en x, périodiquement.
    const g = L.groundAt(hz.x), per = hz.period ?? 3.6, ph = hz.phase ?? 0, r = hz.r ?? 13, sx = hz.x + (hz.reach ?? 300), sy = -60;
    const pos = (t) => { const u = (((t / per + ph) % 1) + 1) % 1; if (u < 0.25) return null; const k = Math.pow((u - 0.25) / 0.75, 1.5); return [sx + (hz.x - sx) * k, sy + (g - sy) * k]; };
    return {
      kind: 'hazard', dyn: 1, wide: 1, x: hz.x, minX: hz.x - r - 4, maxX: sx + r,
      shapesAt(t) { const p = pos(t); return p ? [{ c: [p[0], p[1], r], hz: 16 }] : []; },
      safeAt(t, y, x) { const p = pos(t); return !p || Math.hypot(p[0] - x, p[1] - y) > 95; },
      draw(c, t, time) {
        const p = pos(t);
        const u0 = t / per + ph;
        if (!p && u0 >= 1) { // impact au sol : éclair bref, onde de poussière, éclats qui retombent
          const k = ((u0 % 1) / 0.25), col = hz.col || '#eaf6ff';
          if (k < 0.2) { c.fillStyle = 'rgba(255,255,255,' + 0.5 * (1 - k / 0.2) + ')'; c.beginPath(); c.arc(hz.x, g - 4, 34 + 60 * k, Math.PI, 0); c.fill(); }
          c.strokeStyle = 'rgba(255,255,255,' + 0.6 * (1 - k) + ')'; c.lineWidth = 3 * (1 - k) + 0.5; c.beginPath(); c.ellipse(hz.x, g, 14 + 70 * k, 4 + 12 * k, 0, Math.PI, 0); c.stroke();
          c.fillStyle = col; c.globalAlpha = 1 - k * k;
          for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.12 + 0.76 * hash(i, hz.x)), v = 90 + 110 * hash(i, hz.x + 3), tt = k * 0.85, sx2 = hz.x + Math.cos(a) * v * tt, sy2 = g + Math.sin(a) * v * tt + 260 * tt * tt, s2 = (2 + 3.5 * hash(i, 7)) * (1 - k * 0.5); c.fillRect(sx2 - s2 / 2, Math.min(sy2, g) - s2 / 2, s2, s2); }
          c.globalAlpha = 0.35 * (1 - k); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(hz.x + (i - 1.5) * 16 * (1 + k), g - 6 - 14 * k, 9 + 12 * k, 0, TAU); c.fill(); }
          c.globalAlpha = 1;
        }
        if (!p) return;
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(p[0] + r * 0.6, p[1] - r); c.lineTo(p[0] + 46, p[1] - 30); c.lineTo(p[0] + r, p[1] + r * 0.3); c.fill(); // traînée
        c.fillStyle = hz.col || '#eaf6ff'; c.beginPath();
        for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + time * 3, q = r * (0.8 + 0.35 * hash(k, hz.x)); c.lineTo(p[0] + Math.cos(a) * q, p[1] + Math.sin(a) * q); }
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(40,60,90,.3)'; c.beginPath(); c.arc(p[0] + r * 0.25, p[1] + r * 0.25, r * 0.55, 0, TAU); c.fill();
      },
    };
  }
  if (hz.type === 'firewall') {
    // Barrière de feu : une colonne de flammes qui s'embrase puis retombe, périodiquement. On passe pendant l'accalmie ou par-dessus.
    const g = L.groundAt(hz.x), H = hz.height ?? 180, per = hz.period ?? 5, on = hz.on ?? 0.55, ph = hz.phase ?? 0;
    const lvl = (t) => { const u = (((t / per + ph) % 1) + 1) % 1; return u < on ? Math.min(1, u / 0.08, (on - u) / 0.08) : 0; };
    return {
      kind: 'hazard', dyn: 1, x: hz.x, minX: hz.x - 16, maxX: hz.x + 16,
      shapesAt(t) { const k = lvl(t); return k > 0.25 ? [{ p: [hz.x - 12, g - H * k, hz.x + 12, g - H * k, hz.x + 12, g + 10, hz.x - 12, g + 10], hz: 16 }] : []; },
      safeAt(t, y) { return lvl(t) < 0.05 || y < g - H - 45; },
      draw(c, t, time) {
        const k = lvl(t), col = hz.col || '#ff5a1f';
        c.fillStyle = '#1a0d0a'; c.beginPath(); c.ellipse(hz.x, g + 2, 20, 5, 0, 0, TAU); c.fill(); // foyer
        const gl = c.createRadialGradient(hz.x, g, 4, hz.x, g, 60 + 90 * k); gl.addColorStop(0, 'rgba(255,150,40,' + (0.25 + 0.3 * k) + ')'); gl.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = gl; c.fillRect(hz.x - 150, g - 150 - H * k, 300, 300 + H * k);
        for (let i = 0; i < 5; i++) {
          const px = hz.x + (i - 2) * 7 + Math.sin(time * 6 + i * 2) * 3, hh = (k > 0 ? H * k * (0.6 + 0.4 * Math.abs(Math.sin(time * 4 + i * 1.9))) : 10 + 6 * Math.abs(Math.sin(time * 5 + i)));
          c.fillStyle = i % 2 ? col : '#ffb703';
          c.beginPath(); c.moveTo(px - 9, g + 4); c.quadraticCurveTo(px - 6, g - hh * 0.5, px, g - hh); c.quadraticCurveTo(px + 6, g - hh * 0.5, px + 9, g + 4); c.fill();
        }
      },
    };
  }
  if (hz.type === 'lava') {
    // Lave en fusion au fond d'un gouffre ou d'un cratère : une nappe incandescente qui bouillonne, mortelle au contact.
    const xm = (hz.x0 + hz.x1) / 2, y = L.groundAt(xm) - (hz.depth ?? 60), l = hz.x0 - 40, r = hz.x1 + 40;
    return {
      kind: 'hazard', x: xm, minX: l, maxX: r,
      shapes: [{ p: [l, y + 6, r, y + 6, r, y + 200, l, y + 200], hz: 16 }],
      draw(c, t, time) {
        const gl = c.createLinearGradient(0, y - 150, 0, y); gl.addColorStop(0, 'rgba(255,110,30,0)'); gl.addColorStop(1, 'rgba(255,110,30,.4)');
        c.fillStyle = gl; c.fillRect(l, y - 150, r - l, 150); // lueur qui remonte le long des parois
        c.fillStyle = '#ff5a14'; c.beginPath(); c.moveTo(l, y + 220);
        for (let x = l; x <= r; x += 8) c.lineTo(x, y + Math.sin(x * 0.09 + time * 2.2) * 2.5 + Math.sin(x * 0.05 - time * 1.4) * 2);
        c.lineTo(r, y + 220); c.fill();
        c.fillStyle = '#ffc233'; c.beginPath();
        for (let x = l; x <= r; x += 8) c.lineTo(x, y + Math.sin(x * 0.09 + time * 2.2) * 2.5 + Math.sin(x * 0.05 - time * 1.4) * 2);
        for (let x = r; x >= l; x -= 8) c.lineTo(x, y + 5 + Math.sin(x * 0.07 + time * 1.7) * 2);
        c.fill();
        for (let i = 0; i < 5; i++) { // bulles qui gonflent puis éclatent en gouttes
          const ph = (time * (0.5 + 0.3 * hash(i, xm)) + hash(i, xm + 2)) % 1, bx = hz.x0 + 8 + hash(i, xm + 5 + Math.floor(time * (0.5 + 0.3 * hash(i, xm)) + hash(i, xm + 2))) * (hz.x1 - hz.x0 - 16);
          if (ph < 0.6) { c.fillStyle = '#ffd866'; c.beginPath(); c.arc(bx, y + 2, 2 + 5 * ph, Math.PI, 0); c.fill(); }
          else { const k = (ph - 0.6) / 0.4; c.fillStyle = 'rgba(255,190,70,' + (1 - k) + ')'; for (const sx of [-1, 0, 1]) c.fillRect(bx + sx * 9 * k - 1.2, y - 26 * k * (1 - k) * 4 * (1 - 0.3 * Math.abs(sx)) - 1.2, 2.4, 2.4); }
        }
      },
    };
  }
  if (hz.type === 'strike') {
    // Foudre : une lueur d'avertissement, puis l'éclair frappe du ciel jusqu'au sol.
    const g = L.groundAt(hz.x), per = hz.period ?? 6, ph = hz.phase ?? 0;
    const st = (t) => { const u = (((t / per + ph) % 1) + 1) % 1 * per; return u < 1.3 ? { warn: u / 1.3 } : u < 1.65 ? { bolt: 1 } : {}; };
    return {
      kind: 'hazard', dyn: 1, x: hz.x, minX: hz.x - 14, maxX: hz.x + 14,
      shapesAt(t) { return st(t).bolt ? [{ p: [hz.x - 9, -80, hz.x + 9, -80, hz.x + 9, g, hz.x - 9, g], hz: 16 }] : []; },
      safeAt(t) { const s = st(t); return !s.bolt && !(s.warn > 0.2); },
      draw(c, t, time) {
        const s = st(t);
        if (s.warn) { c.fillStyle = 'rgba(255,255,220,' + 0.1 * s.warn * (1 + Math.sin(time * 30)) + ')'; c.fillRect(hz.x - 9, -80, 18, g + 80); c.fillStyle = 'rgba(255,255,200,' + (0.4 + 0.5 * s.warn) + ')'; c.beginPath(); c.arc(hz.x, g - 3, 4 + 5 * s.warn, 0, TAU); c.fill(); }
        if (s.bolt) {
          c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); let bx = hz.x, by = -80; c.moveTo(bx, by);
          for (let k = 0; by < g; k++) { by = Math.min(g, by + 46); bx = hz.x + (hash(k, Math.floor(t * 20)) - 0.5) * 26; c.lineTo(bx, by); }
          c.stroke(); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(hz.x - 60, -80, 120, g + 80);
        }
      },
    };
  }
  if (hz.type === 'debris') {
    // Débris flottant qui dérive à la surface de l'eau, entre x0 et x1.
    const span = hz.x1 - hz.x0, sp = hz.speed ?? 40;
    const pos = (t) => { const u = ((t * sp) / span + (hz.phase ?? 0)) % 2; return hz.x0 + span * (u < 1 ? u : 2 - u); };
    return {
      kind: 'hazard', dyn: 1, x: (hz.x0 + hz.x1) / 2, minX: hz.x0 - 14, maxX: hz.x1 + 14,
      shapesAt(t) { const x = pos(t); return [{ c: [x, L.surfAt(x, t) - 3, 11], hz: 10 }]; },
      safeAt() { return true; },
      draw(c, t, time) {
        const x = pos(t), y = L.surfAt(x, t) - 3 + Math.sin(time * 2 + x * 0.02) * 1.5, look = hz.look || 'crate';
        c.save(); c.translate(x, y); c.rotate(Math.sin(time * 1.3 + hz.x0) * 0.14);
        if (look === 'car') { c.fillStyle = hz.col || '#c0392b'; c.beginPath(); c.moveTo(-16, 2); c.lineTo(-14, -5); c.lineTo(-7, -6); c.lineTo(-3, -12); c.lineTo(8, -12); c.lineTo(12, -6); c.lineTo(16, -4); c.lineTo(16, 2); c.fill(); c.fillStyle = '#bfe0f0'; c.fillRect(-2, -10.5, 9, 4); }
        else if (look === 'roof') { c.fillStyle = '#8a3b2e'; c.beginPath(); c.moveTo(-18, 2); c.lineTo(0, -11); c.lineTo(18, 2); c.fill(); c.fillStyle = '#5c2a20'; c.fillRect(6, -12, 4, 7); }
        else if (look === 'log') { c.fillStyle = '#6b4a2e'; c.fillRect(-18, -4, 36, 7); c.fillStyle = '#a07a52'; c.beginPath(); c.arc(18, -0.5, 3.5, 0, TAU); c.fill(); c.strokeStyle = '#6b4a2e'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-9, -11); c.stroke(); }
        else { c.fillStyle = '#7a5a3c'; c.fillRect(-13, -5, 26, 8); c.fillStyle = '#5f4329'; c.fillRect(-13, -1, 26, 1.5); c.fillRect(-4, -5, 1.5, 8); c.fillRect(6, -5, 1.5, 8); }
        c.restore();
      },
    };
  }
  if (hz.type === 'flyer') {
    // Oiseau (ou chauve-souris) qui fait des allers-retours à altitude fixe entre x0 et x1.
    const span = hz.x1 - hz.x0, sp = hz.speed ?? 60;
    const st = (t) => { const u = ((t * sp) / span + (hz.phase ?? 0)) % 2; return { x: hz.x0 + span * (u < 1 ? u : 2 - u), dir: u < 1 ? 1 : -1 }; };
    return {
      kind: 'hazard', dyn: 1, wide: 1, x: (hz.x0 + hz.x1) / 2, minX: hz.x0 - 16, maxX: hz.x1 + 16, flyY: hz.y,
      shapesAt(t) { return [{ c: [st(t).x, hz.y, 9], hz: 10 }]; },
      safeAt(t, y, x) { return Math.abs(hz.y - y) > 46 || Math.abs(st(t).x - x) > 90; },
      draw(c, t, time, def) {
        const s = st(t), f = Math.sin(time * 10 + hz.x0) * 9;
        c.save(); c.translate(s.x, hz.y); c.scale(s.dir, 1);
        c.fillStyle = hz.col || def.obs; c.beginPath(); c.ellipse(0, 0, 10, 4.5, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, -7 - f); c.lineTo(13, -f * 1.2 - 4); c.lineTo(5, 0); c.fill();
        c.fillStyle = def.accent; c.beginPath(); c.moveTo(9, -1.5); c.lineTo(15, 0.5); c.lineTo(9, 1.5); c.fill();
        c.restore();
      },
    };
  }
  return null;
}

// Plaque de glace dérivante servant de zone de pose : la zone (pad) se déplace avec elle.
export function makeFloe(pad, L) {
  const w = pad.w + 26;
  return {
    kind: 'hazard', dyn: 1, x: (pad.floe.x0 + pad.floe.x1) / 2, minX: pad.floe.x0 - w, maxX: pad.floe.x1 + w,
    shapesAt() { return [{ p: [pad.x - w / 2, pad.y, pad.x + w / 2, pad.y, pad.x + w / 2 - 8, pad.y + 22, pad.x - w / 2 + 8, pad.y + 22] }]; },
    draw(c, t, time, def) {
      if (pad.floe.raft) { // radeau de fortune : rondins et mât avec un fanion
        c.fillStyle = '#7a5a3c'; c.fillRect(pad.x - w / 2, pad.y, w, 9); c.fillStyle = '#5f4329'; for (let k = 6; k < w; k += 14) c.fillRect(pad.x - w / 2 + k, pad.y, 2, 9);
        c.fillRect(pad.x - w / 2 + 4, pad.y - 34, 2.5, 34); c.fillStyle = '#ff7b2e'; c.beginPath(); c.moveTo(pad.x - w / 2 + 6, pad.y - 34); c.lineTo(pad.x - w / 2 + 22, pad.y - 29); c.lineTo(pad.x - w / 2 + 6, pad.y - 24); c.fill();
        return;
      }
      c.fillStyle = '#f4faff'; c.beginPath(); c.moveTo(pad.x - w / 2, pad.y); c.lineTo(pad.x + w / 2, pad.y); c.lineTo(pad.x + w / 2 - 8, pad.y + 22); c.lineTo(pad.x - w / 2 + 8, pad.y + 22); c.fill();
      c.fillStyle = 'rgba(120,170,220,.5)'; c.fillRect(pad.x - w / 2 + 4, pad.y + 9, w - 8, 3);
    },
  };
}
