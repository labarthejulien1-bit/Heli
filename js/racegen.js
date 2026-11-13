// Construit une course Heli Race à partir de sa description (js/racelevels.js).
// Le décor, la trajectoire sûre, les obstacles et les 3 étoiles viennent du générateur de l'Aventure (js/levelgen.js),
// appelé sans arrêt de ravitaillement ; on retire les pièces, on pose les anneaux dorés et les monuments du décor.
import { rng, clamp } from './util.js';
import { generateLevel, STEP } from './levelgen.js';
import { Game, autopilot, DT } from './game.js';
import { RACE_HELIS } from './race.js';

const ptDist = (sh, x, y) => {
  if (sh.c) return Math.hypot(x - sh.c[0], y - sh.c[1]) - sh.c[2];
  const P = sh.p, n = P.length / 2; let best = 1e9, inside = n > 2;
  for (let i = 0; i < n; i++) { const x1 = P[i * 2], y1 = P[i * 2 + 1], k = ((i + 1) % n) * 2, ex = P[k] - x1, ey = P[k + 1] - y1, t = clamp(((x - x1) * ex + (y - y1) * ey) / (ex * ex + ey * ey || 1), 0, 1); best = Math.min(best, Math.hypot(x - x1 - ex * t, y - y1 - ey * t)); if (inside && ex * (y - y1) - ey * (x - x1) < 0) inside = false; }
  return inside ? -best : best;
};

export function buildRaceLevel(cfg) {
  const L = generateLevel({ ...cfg.look, id: 200 + cfg.n, seed: cfg.seed, fuel: 'none', lenScale: cfg.len || 1.3, sections: cfg.sections, mod: cfg.mod || {}, traffic: cfg.traffic, objectives: [] });
  const R = rng(cfg.seed * 7 + 3), rand = (a, b) => a + (b - a) * R();
  L.items = L.items.filter((it) => it.type !== 'orb'); L.orbTotal = 0; // pas de pièces en course
  if (cfg.tank) L.tank *= cfg.tank;

  // --- Anneaux dorés : en zigzag dans le couloir de vol, plus ou moins gros, jamais contre un obstacle
  const path0 = L.pathAt, rings = [];
  const clearAt = (x, y, r) => {
    if (y - r < 50 || y + r > L.groundAt(x) - 14 || y - r < L.ceilAt(x) + 14) return false;
    for (const o of L.obs) {
      if (o.minX > x + 140) break;
      if (o.maxX < x - 140) continue;
      if (o.dyn) { if (Math.abs(o.x - x) < (o.kind === 'mill' ? o.len + 70 : 100)) return false; continue; }
      for (const sh of o.shapes) if (ptDist(sh, x, y) < r + 6) return false;
    }
    for (const it of L.items) if (Math.abs(it.x - x) < 110) return false; // on laisse la descente vers une étoile dégagée
    return true;
  };
  // La ligne de course est celle que vole réellement le pilote automatique dans le couloir sûr : elle monte, plonge
  // et zigzague déjà entre les obstacles. Les anneaux y sont posés (à quelques unités près), si bien que chacun est franchissable.
  const N = L.ground.length, line = new Float32Array(N).fill(NaN), bot = new Game(L, RACE_HELIS[0], 0, 'normal');
  for (let k = 0; k < 120 * 400 && bot.state === 'fly'; k++) { autopilot(bot); bot.step(DT); const i = (bot.heli.x / STEP) | 0; if (Number.isNaN(line[i])) line[i] = bot.heli.y; }
  const lineAt = (x) => { let i = (x / STEP) | 0; while (i > 0 && Number.isNaN(line[i])) i--; return Number.isNaN(line[i]) ? path0(x) : line[i]; };
  for (let x = 760 + rand(0, 80); x < L.length - 940; x += rand(330, 500)) {
    const y = lineAt(x) + rand(-7, 7);
    for (let r = clamp(rand(31, 50) - cfg.n * 0.25, 27, 50); r >= 26; r -= 5) if (clearAt(x, y, r)) { rings.push({ x, y, r }); break; }
  }

  // --- Monuments et statues du décor (sans collision) : posés là où le sol est le plus plat autour de l'endroit voulu
  const story = (cfg.story || []).map(([type, at, o]) => {
    let bx = at * L.length, best = 1e9;
    for (let x = at * L.length - 320; x <= at * L.length + 320; x += 20) { const d = Math.abs(L.groundAt(x + 50) - L.groundAt(x - 50)) + Math.abs(x - at * L.length) * 0.02; if (d < best) { best = d; bx = x; } }
    return { type, x: bx, y: Math.max(L.groundAt(bx - 30), L.groundAt(bx + 30)), v: R(), ...(o || {}) };
  });
  L.race = { cfg, rings };
  L.story = story;
  return L;
}
export { STEP };
