// Monde Heli Race : appareils de course. Module sans dépendance au DOM, comme js/data.js.
// power : accélération (poussée du rotor) ; drag : traînée, donc vitesse de pointe (plus c'est bas, plus ça file) ;
// agility : vivacité en inclinaison ; armor : résistance ; fuel : autonomie (une course se fait sans ravitaillement).
// unlock : course à réussir pour déverrouiller l'appareil ; price : étoiles du monde Heli Race (3 à ramasser par course, 75 en tout).
export const RACE_HELIS = [
  { id: 'eclair', name: 'Éclair', perk: 'c_p1', unlock: 0, price: { stars: 0 }, power: 2.0, agility: 200, armor: 100, drag: 0.92, fuel: 1,
    look: { body: 'racer', v: 0, num: 7, c1: '#f4d35e', c2: '#1b1b26', glass: '#cfeaf5' } },
  { id: 'guepard', name: 'Guépard', perk: 'c_p2', unlock: 4, price: { stars: 6 }, power: 2.4, agility: 235, armor: 95, drag: 0.98, fuel: 1,
    look: { body: 'racer', v: 1, num: 21, c1: '#ff7b2e', c2: '#ffffff', glass: '#cfeaf5' } },
  { id: 'fleche', name: 'Flèche', perk: 'c_p3', unlock: 9, price: { stars: 10 }, power: 1.95, agility: 175, armor: 105, drag: 0.72, fuel: 1.05,
    look: { body: 'racer', v: 2, num: 3, c1: '#2ec4b6', c2: '#0b132b', glass: '#d9fbff' } },
  { id: 'tornade', name: 'Tornade', perk: 'c_p4', unlock: 14, price: { stars: 14 }, power: 2.35, agility: 250, armor: 110, drag: 0.8, fuel: 1.05,
    look: { body: 'racer', v: 3, num: 88, c1: '#e63946', c2: '#f1faee', glass: '#cfeaf5', trail: '#ffb3b3' } },
  { id: 'supernova', name: 'Supernova', perk: 'c_p5', unlock: 19, price: { stars: 18 }, power: 2.5, agility: 270, armor: 115, drag: 0.68, fuel: 1.1,
    look: { body: 'racer', v: 4, num: 1, c1: '#7b2ff7', c2: '#ffd166', glass: '#f3e8ff', trail: '#c9a0ff', flame: true } },
];
export const raceHeli = (id) => RACE_HELIS.find((h) => h.id === id) || RACE_HELIS[0];
const bits = (m) => { let n = 0; for (m |= 0; m; m >>= 1) n += m & 1; return n; };
export const raceStars = (save) => Object.values(save.heliRace.levels).reduce((n, l) => n + bits(l.sm), 0);
export const raceStarWallet = (save) => Math.max(0, raceStars(save) - save.heliRace.starsSpent);
export const raceOwned = (save, h) => save.heliRace.helis.includes(h.id);
export const raceOpenHeli = (save, h) => !h.unlock || !!save.heliRace.levels[h.unlock]?.done;
export const raceCanBuy = (save, h) => raceOpenHeli(save, h) && raceStarWallet(save) >= h.price.stars;
export function raceBuy(save, h) {
  const r = save.heliRace;
  if (r.helis.includes(h.id) || !raceCanBuy(save, h)) return false;
  r.starsSpent += h.price.stars; r.helis.push(h.id);
  return true;
}
