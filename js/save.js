// Sauvegarde 100 % locale (localStorage), versionnée, avec export/import JSON.
import { HELIS, LEVELS, heliUnlock } from './data.js';
import { RESCUE_HELIS } from './rescue.js';
import { RACE_HELIS } from './race.js';
import { CARGO_HELIS } from './cargo.js';
const KEY = 'heli-save-v1';

export function defaults() {
  return {
    v: 1, pilot: '', lang: null, heli: 'moineau', helis: ['moineau'], lastLevel: 1, tut: false, tutHangar: false, tutRescue: false, tutRace: false, tutCargo: false, // tutoriels déjà vus
    world: 'adv', // monde affiché à l'accueil : 'adv' (Aventure) ou 'rescue' (Heli Rescue)
    heliRescue: { levels: {}, heli: 'mesange', coins: 0, starsSpent: 0, helis: ['mesange'] }, // progression du monde Heli Rescue, indépendante de l'Aventure
    heliRace: { levels: {}, heli: 'eclair', starsSpent: 0, helis: ['eclair'] }, // monde Heli Race : n -> { done, time (meilleur chrono), sm (étoiles ramassées) }
    heliCargo: { levels: {}, heli: 'mulet', starsSpent: 0, helis: ['mulet'] }, // monde Heli Cargo : n -> { done, time, sm (étoiles ramassées) }
    coins: 0, starsSpent: 0, // porte-monnaie : pièces cumulées, étoiles dépensées
    levels: {}, // id -> { done, obj:[bool,bool,bool], time, orbs, sm (masque des étoiles trouvées) }
    stats: { flights: 0, dist: 0, orbs: 0, crashes: 0, time: 0, landings: 0, refuels: 0 },
    settings: { diff: 'normal', music: 0.6, sfx: 0.8, vibe: true, quality: 'high', sens: 1, invert: false, shake: true, fps: false, battery: false },
  };
}
function sanitize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const s = { ...d, ...raw };
  s.settings = { ...d.settings, ...(raw.settings || {}) };
  s.stats = { ...d.stats, ...(raw.stats || {}) };
  s.levels = raw.levels && typeof raw.levels === 'object' ? raw.levels : {};
  s.helis = Array.isArray(raw.helis) ? raw.helis.filter((id) => HELIS.some((h) => h.id === id)) : ['moineau'];
  if (!s.helis.includes('moineau')) s.helis.unshift('moineau');
  if (!s.helis.includes(s.heli)) s.heli = 'moineau';
  s.pilot = String(s.pilot || '').slice(0, 16);
  s.world = ['rescue', 'race', 'cargo'].includes(s.world) ? s.world : 'adv';
  s.heliRescue = { ...d.heliRescue, ...(raw.heliRescue && typeof raw.heliRescue === 'object' ? raw.heliRescue : {}) };
  const r = s.heliRescue;
  if (!r.levels || typeof r.levels !== 'object') r.levels = {};
  // sauvegarde d'avant les pièces Heli Rescue : les appareils déjà débloqués par les niveaux réussis restent acquis
  if (!Array.isArray(raw.heliRescue?.helis)) r.helis = RESCUE_HELIS.filter((h) => !h.unlock || r.levels[h.unlock]?.done).map((h) => h.id);
  r.helis = r.helis.filter((id) => RESCUE_HELIS.some((h) => h.id === id));
  if (!r.helis.includes('mesange')) r.helis.unshift('mesange');
  if (!r.helis.includes(r.heli)) r.heli = 'mesange';
  r.coins = Math.max(0, Math.floor(+r.coins || 0)); r.starsSpent = Math.max(0, Math.floor(+r.starsSpent || 0));
  const c = (s.heliRace = { ...d.heliRace, ...(raw.heliRace && typeof raw.heliRace === 'object' ? raw.heliRace : {}) });
  if (!c.levels || typeof c.levels !== 'object') c.levels = {};
  c.helis = (Array.isArray(c.helis) ? c.helis : []).filter((id) => RACE_HELIS.some((h) => h.id === id));
  if (!c.helis.includes('eclair')) c.helis.unshift('eclair');
  if (!c.helis.includes(c.heli)) c.heli = 'eclair';
  c.starsSpent = Math.max(0, Math.floor(+c.starsSpent || 0));
  const k = (s.heliCargo = { ...d.heliCargo, ...(raw.heliCargo && typeof raw.heliCargo === 'object' ? raw.heliCargo : {}) });
  if (!k.levels || typeof k.levels !== 'object') k.levels = {};
  k.helis = (Array.isArray(k.helis) ? k.helis : []).filter((id) => CARGO_HELIS.some((h) => h.id === id));
  if (!k.helis.includes('mulet')) k.helis.unshift('mulet');
  if (!k.helis.includes(k.heli)) k.heli = 'mulet';
  k.starsSpent = Math.max(0, Math.floor(+k.starsSpent || 0));
  for (const [f, w] of [['tutRescue', s.heliRescue], ['tutRace', s.heliRace], ['tutCargo', s.heliCargo]]) s[f] = raw[f] === undefined ? !!w.levels[1]?.done : !!raw[f];
  s.coins = Math.max(0, Math.floor(+s.coins || 0)); s.starsSpent = Math.max(0, Math.floor(+s.starsSpent || 0));
  s.lastLevel = Math.min(LEVELS.length, Math.max(1, s.lastLevel | 0 || 1));
  return s;
}
export function load() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return defaults(); }
}
export function store(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ }
}
export function importSave(text) { return sanitize(JSON.parse(text)); }

export const medalCount = (s) => Object.values(s.levels).reduce((n, l) => n + (l.obj || []).filter(Boolean).length, 0);
const bits = (m) => { let n = 0; for (m |= 0; m; m >>= 1) n += m & 1; return n; };
export const levelStars = (s, id) => bits(s.levels[id]?.sm);
export const rescueStars = (s) => Object.values(s.heliRescue.levels).reduce((n, l) => n + (l.stars || 0), 0);
export const starCount = (s) => Object.values(s.levels).reduce((n, l) => n + bits(l.sm), 0);
export const starWallet = (s) => Math.max(0, starCount(s) - s.starsSpent);
export const levelUnlocked = (s, id) => id === 1 || !!s.levels[id - 1]?.done;
// Achat d'un hélicoptère : en pièces, ou en étoiles pour les plus rares.
// Chaque hélicoptère se déverrouille en réussissant un niveau (heliUnlock), puis s'achète.
export const heliOpen = (s, h) => s.helis.includes(h.id) || !heliUnlock(h) || !!s.levels[heliUnlock(h)]?.done;
export function canBuy(s, h) { return !heliOpen(s, h) ? false : h.price.stars ? starWallet(s) >= h.price.stars : s.coins >= h.price.coins; }
export function buy(s, h) {
  if (s.helis.includes(h.id) || !canBuy(s, h)) return false;
  if (h.price.stars) s.starsSpent += h.price.stars; else s.coins -= h.price.coins;
  s.helis.push(h.id);
  return true;
}
