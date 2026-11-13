// Monde Heli Cargo : appareils de levage et charges à transporter. Module sans dépendance au DOM, comme js/data.js.
// lift : capacité de levage. Une charge de masse m alourdit l'appareil de m / lift ; au-delà de MAX_RATIO, elle est trop lourde pour lui.
// unlock : niveau Heli Cargo à réussir pour déverrouiller l'appareil ; price : étoiles du monde Heli Cargo (3 à ramasser par niveau, 60 en tout).
export const MAX_RATIO = 0.62;
export const CARGO_HELIS = [
  { id: 'mulet', name: 'Mulet', perk: 'g_p1', unlock: 0, price: { stars: 0 }, lift: 1.0, power: 2.05, agility: 175, armor: 110, drag: 1.0, fuel: 1,
    look: { body: 'heavy', c1: '#f2a516', c2: '#2b2b33', glass: '#cfeaf5', stripe: '#2b2b33' } },
  { id: 'castor', name: 'Castor', perk: 'g_p2', unlock: 4, price: { stars: 4 }, lift: 1.45, power: 2.15, agility: 185, armor: 120, drag: 1.0, fuel: 1.05,
    look: { body: 'coax', c1: '#2f7d4f', c2: '#ffd400', glass: '#e8ffd9', stripe: '#ffd400' } },
  { id: 'cigogne', name: 'Cigogne', perk: 'g_p3', unlock: 8, price: { stars: 8 }, lift: 1.95, power: 2.25, agility: 160, armor: 130, drag: 1.0, fuel: 1.1,
    look: { body: 'crane', c1: '#e4572e', c2: '#3a3f4a', glass: '#cfeaf5' } },
  { id: 'buffle', name: 'Buffle', perk: 'g_p4', unlock: 12, price: { stars: 12 }, lift: 2.55, power: 2.3, agility: 150, armor: 150, drag: 1.02, fuel: 1.15,
    look: { body: 'mi8', c1: '#f4f1de', c2: '#c1121f', glass: '#bfe0f0' } },
  { id: 'colosse', name: 'Colosse', perk: 'g_p5', unlock: 16, price: { stars: 16 }, lift: 3.3, power: 2.4, agility: 150, armor: 170, drag: 1.02, fuel: 1.2,
    look: { body: 'twin', c1: '#1d3557', c2: '#f1c40f', glass: '#d7f0ff', stripe: '#f1c40f' } },
];
export const cargoHeli = (id) => CARGO_HELIS.find((h) => h.id === id) || CARGO_HELIS[0];
// Charges : largeur, hauteur, masse, clé du nom (traductions g_l_*).
export const LOADS = {
  container: { w: 46, h: 22, m: 0.4 }, tank: { w: 42, h: 24, m: 0.5 }, pile: { w: 14, h: 58, m: 0.55 }, engine: { w: 40, h: 28, m: 0.8 }, anchor: { w: 30, h: 34, m: 0.45 },
  tower: { w: 26, h: 62, m: 0.75 }, transfo: { w: 36, h: 30, m: 1.05 }, spool: { w: 34, h: 34, m: 0.5 }, mast: { w: 12, h: 66, m: 0.45 },
  crate: { w: 34, h: 26, m: 0.35 }, skipylon: { w: 22, h: 60, m: 0.8 }, gondola: { w: 34, h: 32, m: 1.1 }, logs: { w: 52, h: 20, m: 0.6 }, snowcat: { w: 46, h: 28, m: 1.45 },
  urn: { w: 26, h: 30, m: 0.35 }, statue: { w: 24, h: 56, m: 1.1 }, sarco: { w: 50, h: 22, m: 1.45 }, obelisk: { w: 16, h: 70, m: 1.5 }, sphinx: { w: 48, h: 34, m: 1.5 },
};
const starsOf = (r) => Object.values(r.levels).reduce((n, l) => { let k = 0; for (let m = l.sm | 0; m; m >>= 1) k += m & 1; return n + k; }, 0);
export const cargoStars = (save) => starsOf(save.heliCargo);
export const cargoStarWallet = (save) => Math.max(0, starsOf(save.heliCargo) - save.heliCargo.starsSpent);
export const cargoOwned = (save, h) => save.heliCargo.helis.includes(h.id);
export const cargoOpenHeli = (save, h) => !h.unlock || !!save.heliCargo.levels[h.unlock]?.done;
export const cargoCanBuy = (save, h) => cargoOpenHeli(save, h) && cargoStarWallet(save) >= h.price.stars;
export function cargoBuy(save, h) {
  const r = save.heliCargo;
  if (r.helis.includes(h.id) || !cargoCanBuy(save, h)) return false;
  r.starsSpent += h.price.stars; r.helis.push(h.id);
  return true;
}
