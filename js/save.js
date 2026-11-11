// Sauvegarde 100 % locale (localStorage), versionnée, avec export/import JSON.
import { HELIS, LEVELS } from './data.js';
const KEY = 'heli-save-v1';

export function defaults() {
  return {
    v: 1, pilot: '', lang: null, heli: 'moineau', helis: ['moineau'], lastLevel: 1, tut: false,
    levels: {}, // id -> { done, obj:[bool,bool,bool], time, orbs }
    stats: { flights: 0, dist: 0, orbs: 0, crashes: 0, time: 0, landings: 0 },
    settings: { music: 0.6, sfx: 0.8, vibe: true, quality: 'high', sens: 1, invert: false, shake: true, fps: false, battery: false },
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
export const levelUnlocked = (s, id) => id === 1 || !!s.levels[id - 1]?.done;
export function unlockMet(s, u) {
  if (!u) return true;
  if (u.medals) return medalCount(s) >= u.medals;
  return !!s.levels[u.l]?.obj?.[u.o];
}
// Débloque les hélicoptères dont la condition est remplie ; renvoie les nouveaux.
export function refreshUnlocks(s) {
  const fresh = [];
  for (const h of HELIS) if (!s.helis.includes(h.id) && unlockMet(s, h.unlock)) { s.helis.push(h.id); fresh.push(h); }
  return fresh;
}
