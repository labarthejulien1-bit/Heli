// Monde Heli Rescue : appareils de secours (les niveaux arrivent avec les phases suivantes).
// Module sans dépendance au DOM, comme js/data.js.

// Les multiplicateurs (thrust, handling, fuel, wind) sont ceux du cahier des charges ; power / agility / armor / drag
// sont les valeurs attendues par le moteur de vol existant (js/game.js), dérivées de ces multiplicateurs.
// seats : hublots latéraux [x, y, rayon] où apparaîtront les passagers ; cargo : emplacement d'un gros animal.
// price : prix en pièces du monde Heli Rescue (100 pièces à ramasser par mission). unlock : ancien déblocage par niveau,
// conservé pour reprendre les sauvegardes d'avant les pièces (js/save.js).
export const RESCUE_HELIS = [
  { id: 'mesange', name: 'Mésange', places: 1, thrust: 1.0, handling: 1.3, fuel: 0.8, wind: 0.7, perk: 'p_agile', unlock: 0, price: 0,
    power: 1.9, agility: 234, armor: 100, drag: 1.0,
    look: { body: 'r_light', rescue: 1, c1: '#d62828', c2: '#ffffff', glass: '#cfeaf5', cross: 'white', seats: [[-1.5, -3.7, 4.7]] } },
  { id: 'chamois', name: 'Chamois', places: 2, thrust: 1.2, handling: 1.1, fuel: 1.0, wind: 1.0, perk: 'p_alt', unlock: 3, price: 120,
    power: 2.08, agility: 198, armor: 110, drag: 0.98, noAltLoss: true,
    look: { body: 'r_mountain', rescue: 1, c1: '#d62828', c2: '#ffc300', glass: '#cfeaf5', cross: 'white', seats: [[3.2, -4.7, 4.4], [-6.6, -4.7, 4.4]] } },
  { id: 'mouette', name: 'Mouette', places: 2, thrust: 1.0, handling: 1.0, fuel: 1.1, wind: 0.9, perk: 'p_water', unlock: 6, price: 250,
    power: 1.9, agility: 180, armor: 110, drag: 1.0, amphibious: true,
    look: { body: 'r_float', rescue: 1, c1: '#ffc300', c2: '#ffffff', glass: '#cfeaf5', cross: 'disc', seats: [[3, -4.7, 4.4], [-6.6, -4.7, 4.4]] } },
  { id: 'sentinelle', name: 'Sentinelle', places: 2, thrust: 1.1, handling: 0.9, fuel: 1.0, wind: 1.5, perk: 'p_wind', unlock: 10, price: 400,
    power: 1.99, agility: 162, armor: 130, drag: 1.0, searchlight: true,
    look: { body: 'r_coax', rescue: 1, c1: '#f77f00', c2: '#ffffff', glass: '#cfeaf5', cross: 'white', seats: [[3.6, -4.2, 4.3], [-6, -4.2, 4.3]] } },
  { id: 'tandem', name: 'Tandem', places: 3, thrust: 1.5, handling: 0.6, fuel: 1.4, wind: 1.2, perk: 'p_heavy', unlock: 13, price: 550,
    power: 2.33, agility: 108, armor: 160, drag: 1.05, heavyLift: true,
    look: { body: 'r_tandem', rescue: 1, c1: '#8d1b1b', c2: '#ffffff', glass: '#cfeaf5', cross: 'white', seats: [[9.6, -2.4, 4], [0.8, -2.4, 4], [-8, -2.4, 4]], cargo: [-20.5, -0.6, 6] } },
];
export const rescueHeli = (id) => RESCUE_HELIS.find((h) => h.id === id) || RESCUE_HELIS[0];
// Un appareil est disponible quand il a été acheté avec les pièces du monde Heli Rescue.
export const rescueUnlocked = (save, h) => save.heliRescue.helis.includes(h.id);
export function rescueBuy(save, h) {
  const r = save.heliRescue;
  if (r.helis.includes(h.id) || r.coins < h.price) return false;
  r.coins -= h.price; r.helis.push(h.id);
  return true;
}
