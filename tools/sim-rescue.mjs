// Validation des niveaux Heli Rescue : le pilote automatique de sauvetage doit réussir chaque niveau
// avec l'appareil conseillé. Usage : node tools/sim-rescue.mjs
import { RESCUE_LEVELS } from '../js/rescuelevels.js';
import { buildRescueLevel } from '../js/rescuegen.js';
import { RescueGame, rescueAutopilot } from '../js/rescuegame.js';
import { rescueHeli } from '../js/rescue.js';
import { DT } from '../js/game.js';

let ok = true;
for (const cfg of RESCUE_LEVELS) {
  const L = buildRescueLevel(cfg), g = new RescueGame(L, rescueHeli(cfg.recommended), 'normal');
  let minFuel = 1, steps = 0, flips = 0, dir = 1;
  while (g.state === 'fly' && steps++ < 120 * 400) { rescueAutopilot(g); g.step(DT); if (g.fuel < minFuel) minFuel = g.fuel; if (g.heli.dir !== dir) { dir = g.heli.dir; flips++; } }
  const good = g.state === 'win' && minFuel > 0.05;
  if (!good) ok = false;
  console.log(`R${String(cfg.n).padStart(2)} ${good ? 'OK ' : 'KO '} ${g.H.name} temps=${g.t.toFixed(0)}s chocs=${g.stats.hits} sauvés=${g.savedCount}/${g.vs.length} essenceMin=${(minFuel * 100).toFixed(0)}% demi-tours=${flips} étoiles=${g.stars().filter(Boolean).length} x=${Math.round(g.heli.x)} état=${g.state}`);
}
process.exit(ok ? 0 : 1);
