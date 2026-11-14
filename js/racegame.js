// Règles de course (monde Heli Race) : filer vers la droite, passer dans les anneaux dorés, battre son chrono.
// S'appuie sur le moteur de vol existant (js/game.js), sans le dupliquer.
import { Game, autopilot } from './game.js';

export const PENALTY = 3; // secondes ajoutées au chrono pour chaque anneau manqué
// Taille des anneaux selon la difficulté (dessin et zone de passage) ; la zone de passage dépasse en plus de 20 % le cercle dessiné.
export const RING_SCALE = { easy: 1.3, normal: 1, hard: 0.8 }, RING_PASS = 1.2;

export class RaceGame extends Game {
  constructor(level, heli, owned = 0, diff = 'normal') { super(level, heli, owned, diff); this.ringK = RING_SCALE[diff] || 1; }
  reset(fromPad) {
    super.reset(fromPad);
    this.ring = new Uint8Array(this.L.race.rings.length); // 0 : à venir, 1 : franchi, 2 : manqué
    this.rk = 0; this.passed = 0; this.missed = 0;
  }
  // Chrono de la course : temps de vol plus les pénalités.
  get raceTime() { return this.t + PENALTY * this.missed; }
  // Médailles de temps décrochées par un chrono : bronze, argent, or.
  medals(time = this.raceTime) { return this.L.race.medals.map((m) => time <= m); }

  step(dt) {
    const h = this.heli, px = h.x, py = h.y;
    super.step(dt);
    if (this.state !== 'fly') return;
    const R = this.L.race.rings;
    while (this.rk < R.length && h.x >= R[this.rk].x) {
      const r = R[this.rk], k = h.x > px ? (r.x - px) / (h.x - px) : 1, y = py + (h.y - py) * k; // altitude au franchissement du plan de l'anneau
      if (Math.abs(y - r.y) < r.r * (this.ringK || 1) * RING_PASS - 3) { this.ring[this.rk] = 1; this.passed++; this.ev.push({ type: 'ring', x: r.x, y: r.y, n: this.passed }); }
      else { this.ring[this.rk] = 2; this.missed++; this.ev.push({ type: 'miss', x: r.x, y: r.y }); }
      this.rk++;
    }
    // Ligne d'arrivée : on la franchit en vol, sans se poser
    if (h.x >= this.L.race.finishX) { this.state = 'win'; this.stateT = 0; this.ev.push({ type: 'win' }); }
  }
}
// Le pilote automatique de l'Aventure suit la trajectoire du niveau, que le constructeur fait passer par les anneaux.
export const raceAutopilot = autopilot;
