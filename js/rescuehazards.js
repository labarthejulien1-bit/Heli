// Dangers des missions Heli Rescue, créés à partir des données d'un niveau (champ « hazards »).
// Chaque danger est un obstacle animé : shapesAt(t) donne ses formes de collision, draw(...) son dessin,
// safeAt(t) indique au pilote automatique s'il peut passer. Aucun code propre à un niveau.
import { TAU, hash } from './util.js';

export function makeHazard(hz, L) {
  if (hz.type === 'faller') {
    // Bloc de glace (ou de roche) qui se détache périodiquement et tombe jusqu'au sol.
    const g = L.groundAt(hz.x), top = hz.top ?? 70, per = hz.period ?? 3.6, ph = hz.phase ?? 0, r = hz.r ?? 13;
    const state = (t) => { const u = (((t / per + ph) % 1) + 1) % 1; return u < 0.35 ? { hang: u / 0.35 } : { y: top + (g - top) * Math.pow((u - 0.35) / 0.65, 2) }; };
    return {
      kind: 'hazard', dyn: 1, x: hz.x, minX: hz.x - r - 4, maxX: hz.x + r + 4,
      shapesAt(t) { const s = state(t); return s.y == null ? [] : [{ c: [hz.x, s.y, r], hz: 16 }]; },
      safeAt(t, y) { const s = state(t); return s.y == null ? s.hang < 0.9 || top < y - 70 : Math.abs(s.y - y) > 70; }, // dangereux seulement quand le bloc passe à hauteur de l'appareil
      draw(c, t, time, def) {
        const s = state(t), y = s.y ?? top, shake = s.y == null ? Math.sin(time * 40) * s.hang * 1.6 : 0;
        c.fillStyle = hz.col || '#eaf6ff'; c.beginPath();
        for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, q = r * (0.8 + 0.35 * hash(k, hz.x)); c.lineTo(hz.x + shake + Math.cos(a) * q, y + Math.sin(a) * q); }
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(120,170,220,.55)'; c.beginPath(); c.moveTo(hz.x + shake, y - r * 0.8); c.lineTo(hz.x + shake + r * 0.8, y + r * 0.3); c.lineTo(hz.x + shake, y + r * 0.9); c.fill();
        if (s.y == null) { c.fillStyle = hz.col || '#eaf6ff'; c.fillRect(hz.x - 2, -80, 4, top + 80 - r * 0.6); } // attache avant la chute
      },
    };
  }
  if (hz.type === 'debris') {
    // Débris flottant qui dérive à la surface de l'eau, entre x0 et x1.
    const span = hz.x1 - hz.x0, sp = hz.speed ?? 40;
    const pos = (t) => { const u = ((t * sp) / span + (hz.phase ?? 0)) % 2; return hz.x0 + span * (u < 1 ? u : 2 - u); };
    return {
      kind: 'hazard', dyn: 1, x: (hz.x0 + hz.x1) / 2, minX: hz.x0 - 14, maxX: hz.x1 + 14,
      shapesAt(t) { return [{ c: [pos(t), L.waterAt(t) - 3, 10], hz: 10 }]; },
      safeAt() { return true; },
      draw(c, t, time) {
        const x = pos(t), y = L.waterAt(t) - 3 + Math.sin(time * 2 + x * 0.02) * 1.5;
        c.save(); c.translate(x, y); c.rotate(Math.sin(time * 1.3 + hz.x0) * 0.12);
        c.fillStyle = '#7a5a3c'; c.fillRect(-13, -5, 26, 8); c.fillStyle = '#5f4329'; c.fillRect(-13, -1, 26, 1.5); c.fillRect(-4, -5, 1.5, 8); c.fillRect(6, -5, 1.5, 8);
        c.restore();
      },
    };
  }
  return null;
}
