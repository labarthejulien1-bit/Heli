// Validation des courses Heli Race : le pilote automatique doit finir chaque course avec l'appareil de départ,
// en 2 à 3 minutes, sans panne sèche, en franchissant presque tous les anneaux. Usage : node tools/sim-race.mjs
import { RACE_LEVELS } from '../js/racelevels.js';
import { buildRaceLevel } from '../js/racegen.js';
import { RaceGame, raceAutopilot } from '../js/racegame.js';
import { RACE_HELIS } from '../js/race.js';
import { DT } from '../js/game.js';

let ok = true;
for (const cfg of RACE_LEVELS) {
  const L = buildRaceLevel(cfg), g = new RaceGame(L, RACE_HELIS[0], 0, 'normal');
  let minFuel = 1, steps = 0;
  while (g.state === 'fly' && steps++ < 120 * 400) { raceAutopilot(g); g.step(DT); if (g.fuel < minFuel) minFuel = g.fuel; }
  const n = L.race.rings.length, stars = L.items.filter((i) => i.type === 'star').length;
  const good = g.state === 'win' && minFuel > 0.05 && g.t >= 120 && g.t <= 180 && n >= 20 && g.passed >= 0.85 * n && stars === 3 && !L.items.some((i) => i.type === 'orb') && L.pads.length === 2;
  if (!good) ok = false;
  console.log(`C${String(cfg.n).padStart(2)} ${good ? 'OK ' : 'KO '} long=${Math.round(L.length)} temps=${g.t.toFixed(0)}s chocs=${g.stats.hits} anneaux=${g.passed}/${n} etoiles=${stars} essenceMin=${(minFuel * 100).toFixed(0)}% x=${Math.round(g.heli.x)} état=${g.state}`);
}
process.exit(ok ? 0 : 1);
