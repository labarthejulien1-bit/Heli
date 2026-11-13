// Validation des niveaux Heli Cargo : le pilote automatique de levage doit livrer toutes les charges et se poser,
// avec l'appareil conseillé, en 2 à 3 minutes et demie (le joueur, moins direct, met environ 3 minutes), sans panne sèche. Usage : node tools/sim-cargo.mjs
import { CARGO_LEVELS } from '../js/cargolevels.js';
import { buildCargoLevel } from '../js/cargogen.js';
import { CargoGame, cargoAutopilot } from '../js/cargogame.js';
import { cargoHeli, MAX_RATIO } from '../js/cargo.js';
import { DT } from '../js/game.js';

let ok = true;
for (const cfg of CARGO_LEVELS) {
  const L = buildCargoLevel(cfg), H = cargoHeli(cfg.recommended), g = new CargoGame(L, H, 0, 'normal');
  let minFuel = 1, steps = 0;
  while (g.state === 'fly' && steps++ < 120 * 420) { cargoAutopilot(g); g.step(DT); if (g.fuel < minFuel) minFuel = g.fuel; }
  const liftOk = L.cargo.loads.every((l) => l.m / H.lift <= MAX_RATIO);
  // chaque étoile doit être hors du relief, des plateformes et de l'eau
  const starsOk = L.items.length === 3 && L.items.every((s) => s.y > 50 && s.y < L.cargo.topAt(s.x) - 18 && (!L.waterAt || s.y < L.waterAt(0) - 18));
  const good = g.state === 'win' && minFuel > 0.05 && g.t >= 120 && g.t <= 240 && liftOk && starsOk && g.stats.hits <= 2 && L.def.objectives.length === 3 && g.objectiveDone(L.def.objectives[1]); // le pilote automatique tient l'objectif de temps
  if (!good) ok = false;
  console.log(`G${String(cfg.n).padStart(2)} ${good ? 'OK ' : 'KO '} ${H.name} temps=${g.t.toFixed(0)}s chocs=${g.stats.hits} livrées=${g.delivered}/${g.loads.length} essenceMin=${(minFuel * 100).toFixed(0)}% etoiles=${L.items.length}${starsOk ? '' : '!'} levage=${liftOk ? 'ok' : 'trop lourd'} x=${Math.round(g.heli.x)} état=${g.state}${g.failReason ? ' ' + g.failReason : ''}`);
}
process.exit(ok ? 0 : 1);
