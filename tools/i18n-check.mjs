// Vérifie que chaque langue possède exactement toutes les clés. Usage : node tools/i18n-check.mjs
import { DICT, KEYS } from '../js/i18n.js';
let ok = true;
for (const [lang, d] of Object.entries(DICT)) {
  if (d._n !== KEYS.length) { ok = false; console.log(`${lang}: ${d._n} textes pour ${KEYS.length} clés`); }
  for (const k of KEYS) if (!d[k] || !d[k].trim()) { ok = false; console.log(`${lang}: clé manquante "${k}"`); }
  for (const k of KEYS) if (DICT.fr[k].includes('{v}') !== d[k]?.includes('{v}')) { ok = false; console.log(`${lang}: variable {v} incohérente pour "${k}"`); }
}
console.log(ok ? 'OK' : 'ERREUR');
process.exit(ok ? 0 : 1);
