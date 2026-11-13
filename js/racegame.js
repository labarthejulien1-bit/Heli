// Règles de course (monde Heli Race) : filer vers la droite, passer dans les anneaux dorés, battre son chrono.
// S'appuie sur le moteur de vol existant (js/game.js), sans le dupliquer.
import { Game, autopilot } from './game.js';

export const PENALTY = 3; // secondes ajoutées au chrono pour chaque anneau manqué

export class RaceGame extends Game {
  reset(fromPad) {
    super.reset(fromPad);
    this.ring = new Uint8Array(this.L.race.rings.length); // 0 : à venir, 1 : franchi, 2 : manqué
    this.rk = 0; this.passed = 0; this.missed = 0;
  }
  // Chrono de la course : temps de vol plus les pénalités.
  get raceTime() { return this.t + PENALTY * this.missed; }

  step(dt) {
    const h = this.heli, px = h.x, py = h.y;
    super.step(dt);
    if (this.state !== 'fly') return;
    const R = this.L.race.rings;
    while (this.rk < R.length && h.x >= R[this.rk].x) {
      const r = R[this.rk], k = h.x > px ? (r.x - px) / (h.x - px) : 1, y = py + (h.y - py) * k; // altitude au franchissement du plan de l'anneau
      if (Math.abs(y - r.y) < r.r - 3) { this.ring[this.rk] = 1; this.passed++; this.ev.push({ type: 'ring', x: r.x, y: r.y, n: this.passed }); }
      else { this.ring[this.rk] = 2; this.missed++; this.ev.push({ type: 'miss', x: r.x, y: r.y }); }
      this.rk++;
    }
  }
}
// Le pilote automatique de l'Aventure suit la trajectoire du niveau, que le constructeur fait passer par les anneaux.
export const raceAutopilot = autopilot;
