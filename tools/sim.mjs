// Validation des niveaux : un pilote automatique parcourt chaque niveau.
// Usage : node tools/sim.mjs   (échoue si un niveau est infaisable ou hors durée)
import { LEVELS, HELIS } from '../js/data.js';
import { generateLevel } from '../js/levelgen.js';
import { Game, autopilot, DT } from '../js/game.js';

let ok = true;
for (const def of LEVELS) {
  const L = generateLevel(def);
  const g = new Game(L, HELIS[0]);
  let respawns = 0, steps = 0, minFuel = 1;
  while (g.state !== 'win' && steps < 120 * 600) {
    autopilot(g);
    g.step(DT);
    steps++; if (g.fuel < minFuel) minFuel = g.fuel;
    if (g.state === 'dead') break;
  }
  const s = g.stats, won = g.state === 'win';
  const starGap = Math.min(...L.items.filter((i) => i.type === 'star').map((i) => L.clearAbove(i.x, i.y)));
  const good = won && g.t > 95 && g.t < 240 && L.orbTotal === 100 && L.starTotal === 3 && starGap >= 22 && minFuel > 0.04;
  if (!good) ok = false;
  console.log(
    `N${String(def.id).padStart(2)} ${good ? 'OK ' : 'KO '} long=${Math.round(L.length)} temps=${g.t.toFixed(0)}s chocs=${s.hits} ` +
    `pieces=${s.orbs}/${L.orbTotal} etoiles=${s.stars}/${L.starTotal} obstacles=${L.obs.length} x=${Math.round(g.heli.x)} pv=${Math.round(g.heli.hp)} essenceMin=${(minFuel * 100).toFixed(0)}% poses=${s.lands} degagementEtoiles=${starGap.toFixed(0)} pose=${s.padImpact.toFixed(0)} ${won ? '' : L.secs.find((q) => q.x1 > g.heli.x).type + ' y=' + Math.round(g.heli.y) + ' path=' + Math.round(L.pathAt(g.heli.x))}`
  );
}
process.exit(ok ? 0 : 1);
