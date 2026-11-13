// Courses du monde Heli Race, décrites uniquement par des données (aucune logique par course).
// Chaque course emprunte l'habillage d'un niveau de l'Aventure (adv), retouché par ses propres couleurs,
// et le relief d'un enchaînement de sections (js/levelgen.js). Cinq univers de cinq courses :
// eau et cascades (1-5), neige (6-10), volcans (11-15), ovnis (16-20), Lune (21-25, faible gravité).
// - sections : enchaînement de tronçons et difficulté (voir SPEC dans js/levelgen.js) ; len : échelle de longueur (durée visée : 2 à 3 minutes).
// - story : monuments et statues du décor, sans collision : [type, position (0 à 1 le long de la course), options].
// - mod : particularités (grav : gravité, windX : vent, dark : nuit) ; traffic : appareils croisés ('ufo', 'plane').
// Aucune pièce, aucun ravitaillement : des anneaux dorés à franchir (3 s de pénalité par anneau manqué) et 3 étoiles à ramasser.
import { LEVELS } from './data.js';

const adv = (id, o = {}) => { const l = LEVELS[id - 1]; return { sky: l.sky, mid: l.mid, ground: l.ground, obs: l.obs, rim: l.rim, accent: l.accent, sun: l.sun, layers: l.layers, extras: l.extras, weather: l.weather, wcol: l.wcol, theme: l.theme, music: { ...l.music, bpm: l.music.bpm + 18 }, ...o }; };
const MOON = { mid: '#3d4152', ground: '#6f7380', groundDeep: '#3a3d48', obs: '#555967', rim: '#eceef4', accent: '#ffd166', layers: ['hill', 'jag', 'hill'], weather: null,
  theme: { tree: ['antenna', 'crystal', 'antenna'], pillar: ['rock', 'monolith'], hang: ['rock'], mover: 'rock', geyser: 'sand' } };
const UFO = { tree: ['mushroom', 'antenna', 'mushroom'], pillar: ['monolith', 'rock'], hang: ['rock'], mover: 'mine', geyser: 'plasma' };

export const RACE_LEVELS = [
  // --- Eau et cascades
  { n: 1, uni: 'water', seed: 51011, look: adv(4), sections: 'open:1 hills:1 peaks:1 gates:1 hills:2 geysers:1 peaks:2 forest:1 wind:1 hills:2 gates:2 peaks:2 open:1',
    story: [['beacon', 0.06], ['falls', 0.22], ['arch', 0.45], ['falls', 0.63], ['ship', 0.86]] },
  { n: 2, uni: 'water', seed: 52027, look: adv(22), sections: 'open:1 peaks:2 hills:2 geysers:2 gates:2 wind:2 peaks:2 hills:2 towers:2 geysers:2 peaks:2 gates:2 open:1',
    story: [['falls', 0.1], ['falls', 0.2], ['wheel', 0.36], ['falls', 0.52], ['arch', 0.7], ['falls', 0.88]] },
  { n: 3, uni: 'water', seed: 53033, look: adv(16), sections: 'open:1 hills:2 movers:2 peaks:2 gates:2 forest:2 geysers:2 peaks:2 wind:2 hills:3 movers:2 gates:2 open:1',
    story: [['ship', 0.12], ['ship', 0.3, { flip: 1 }], ['beacon', 0.5], ['arch', 0.66], ['ship', 0.84]] },
  { n: 4, uni: 'water', seed: 54041, look: adv(28, { sky: [['#2f7fb8', '#cfeefc'], ['#f08a5d', '#ffe0a8']] }), sections: 'open:1 mills:2 hills:2 peaks:2 mills:2 gates:2 wind:2 hills:2 mills:3 peaks:2 towers:2 gates:3 open:1',
    story: [['wheel', 0.08], ['falls', 0.26], ['wheel', 0.42], ['arch', 0.6], ['wheel', 0.76], ['beacon', 0.9]] },
  { n: 5, uni: 'water', seed: 55057, look: adv(20), mod: { windX: -18 }, sections: 'open:1 peaks:2 geysers:3 hills:3 gates:2 wind:3 peaks:3 forest:2 geysers:3 gates:3 hills:3 peaks:3 open:1',
    story: [['beacon', 0.07], ['ship', 0.24], ['falls', 0.4], ['arch', 0.57], ['ship', 0.73, { flip: 1 }], ['beacon', 0.9]] },
  // --- Neige
  { n: 6, uni: 'snow', seed: 56003, look: adv(6, { sky: [['#6fa8dc', '#e6f3fb'], ['#3f6fa8', '#ffe3c8']], extras: ['clouds'] }), sections: 'open:1 hills:2 peaks:2 forest:2 gates:2 hills:2 wind:2 peaks:2 towers:2 hills:3 gates:2 peaks:3 open:1',
    story: [['cabin', 0.07], ['snowman', 0.25], ['flags', 0.44], ['igloo', 0.62], ['snowman', 0.8, { flip: 1 }]] },
  { n: 7, uni: 'snow', seed: 57019, look: adv(25), sections: 'open:1 peaks:2 gates:2 hills:3 cave:2 peaks:3 wind:2 towers:2 hills:3 gates:3 peaks:3 forest:2 open:1',
    story: [['flags', 0.08], ['mammoth', 0.3], ['icearch', 0.5], ['mammoth', 0.68, { flip: 1 }], ['cabin', 0.88]] },
  { n: 8, uni: 'snow', seed: 58031, look: adv(6), sections: 'open:1 hills:3 wind:3 peaks:3 gates:2 movers:2 hills:3 peaks:3 towers:3 wind:3 gates:3 peaks:3 open:1',
    story: [['igloo', 0.1], ['icearch', 0.28], ['flags', 0.46], ['snowman', 0.64], ['icearch', 0.84]] },
  { n: 9, uni: 'snow', seed: 59047, look: adv(21, { sky: [['#243b6b', '#f3a683'], ['#1b2a4a', '#f7d794']] }), mod: { windX: 15 }, sections: 'open:1 forest:2 hills:3 gates:3 peaks:3 towers:3 hills:3 geysers:2 peaks:3 wind:3 gates:3 forest:3 open:1',
    story: [['igloo', 0.08], ['igloo', 0.14, { flip: 1 }], ['cabin', 0.3], ['snowman', 0.48], ['igloo', 0.66], ['flags', 0.86]] },
  { n: 10, uni: 'snow', seed: 60053, look: adv(25, { sky: [['#5d6d7e', '#d6dbdf'], ['#34495e', '#aab7b8']], weather: 'snow' }), mod: { windX: -25 }, sections: 'open:1 peaks:3 hills:3 cave:3 gates:3 wind:3 peaks:3 towers:3 hills:4 gates:3 peaks:4 wind:3 open:1',
    story: [['cabin', 0.06], ['mammoth', 0.26], ['flags', 0.45], ['icearch', 0.63], ['snowman', 0.8], ['flags', 0.92]] },
  // --- Volcans
  { n: 11, uni: 'lava', seed: 61007, look: adv(8), sections: 'open:1 hills:3 geysers:2 peaks:3 gates:3 hills:3 towers:3 geysers:3 peaks:3 wind:3 gates:3 hills:3 open:1',
    story: [['ribs', 0.1], ['moai', 0.3], ['temple', 0.5], ['moai', 0.7, { flip: 1 }], ['ribs', 0.88]] },
  { n: 12, uni: 'lava', seed: 62017, look: adv(8, { sky: [['#3a1c3f', '#f2994a'], ['#1f0f2e', '#eb5757']] }), sections: 'open:1 peaks:3 gates:3 hills:3 movers:3 peaks:3 towers:3 hills:3 geysers:3 gates:3 peaks:3 wind:3 open:1',
    story: [['moai', 0.08], ['moai', 0.16, { flip: 1 }], ['moai', 0.34], ['temple', 0.52], ['moai', 0.7], ['moai', 0.86, { flip: 1 }]] },
  { n: 13, uni: 'lava', seed: 63029, look: adv(23), sections: 'open:1 towers:3 geysers:3 gates:3 mills:3 hills:3 towers:3 peaks:3 geysers:3 gates:4 towers:3 hills:3 open:1',
    story: [['anvil', 0.12], ['temple', 0.32], ['anvil', 0.52, { flip: 1 }], ['ribs', 0.7], ['anvil', 0.88]] },
  { n: 14, uni: 'lava', seed: 64037, look: adv(19, { mod: {} }), sections: 'open:1 cave:3 hills:3 geysers:3 peaks:3 cave:3 gates:3 towers:3 hills:3 geysers:3 peaks:3 gates:4 open:1',
    story: [['temple', 0.1], ['temple', 0.3, { flip: 1 }], ['moai', 0.48], ['temple', 0.66], ['ribs', 0.85]] },
  { n: 15, uni: 'lava', seed: 65051, look: adv(8, { sky: [['#120808', '#7a1f10'], ['#1a0a0a', '#c0392b']], extras: ['lava', 'smoke', 'stars'] }), sections: 'open:1 peaks:4 geysers:4 hills:4 gates:4 movers:3 peaks:4 towers:4 geysers:4 wind:4 gates:4 peaks:4 open:1',
    story: [['ribs', 0.08], ['moai', 0.24], ['anvil', 0.42], ['temple', 0.6], ['moai', 0.76, { flip: 1 }], ['ribs', 0.9]] },
  // --- Ovnis
  { n: 16, uni: 'ufo', seed: 66013, look: adv(18, { sky: [['#1b2a49', '#f6b26b'], ['#101a33', '#c27ba0']], extras: ['stars', 'birds'] }), traffic: 'ufo', sections: 'open:1 hills:3 towers:3 gates:3 peaks:3 wind:3 hills:3 movers:3 gates:3 peaks:3 towers:3 hills:3 open:1',
    story: [['zone', 0.06], ['dish', 0.22], ['saucer', 0.4], ['dish', 0.56, { flip: 1 }], ['abduct', 0.72], ['zone', 0.9]] },
  { n: 17, uni: 'ufo', seed: 67021, look: adv(12, { theme: { ...LEVELS[11].theme, mover: 'mine', geyser: 'plasma' } }), traffic: 'ufo', sections: 'open:1 forest:3 geysers:3 hills:3 gates:3 movers:3 peaks:3 forest:3 geysers:3 gates:4 hills:3 peaks:4 open:1',
    story: [['saucer', 0.1], ['saucer', 0.3, { flip: 1 }], ['abduct', 0.48], ['saucer', 0.66], ['dish', 0.84]] },
  { n: 18, uni: 'ufo', seed: 68039, look: adv(24, { theme: { ...LEVELS[23].theme, pillar: ['monolith'], mover: 'mine', geyser: 'plasma' } }), traffic: 'ufo', sections: 'open:1 forest:3 gates:3 movers:3 hills:4 peaks:3 forest:4 wind:3 gates:4 movers:3 peaks:4 hills:3 open:1',
    story: [['abduct', 0.08], ['mothership', 0.3], ['saucer', 0.5], ['abduct', 0.68], ['mothership', 0.86]] },
  { n: 19, uni: 'ufo', seed: 69043, look: adv(30, { mod: {}, theme: UFO }), traffic: 'ufo', sections: 'open:1 towers:4 gates:4 hills:4 geysers:3 peaks:4 movers:4 towers:4 gates:4 wind:4 peaks:4 hills:4 open:1',
    story: [['dish', 0.07], ['mothership', 0.25], ['saucer', 0.44], ['mothership', 0.62], ['abduct', 0.8], ['saucer', 0.92, { flip: 1 }]] },
  { n: 20, uni: 'ufo', seed: 70061, look: adv(9, { theme: { ...LEVELS[8].theme, mover: 'mine', geyser: 'plasma' } }), traffic: 'ufo', sections: 'open:1 gates:4 towers:4 movers:4 peaks:4 geysers:4 gates:4 hills:4 towers:4 wind:4 gates:4 peaks:4 open:1',
    story: [['zone', 0.06], ['dish', 0.2], ['abduct', 0.38], ['mothership', 0.56], ['saucer', 0.74], ['dish', 0.9, { flip: 1 }]] },
  // --- Lune (faible gravité)
  { n: 21, uni: 'moon', seed: 71003, len: 1.02, look: adv(15, { ...MOON, sky: [['#05060d', '#1c2033'], ['#05060d', '#262b40']], extras: ['stars', 'planet'] }), mod: { grav: 0.55 }, sections: 'open:1 hills:3 peaks:3 gates:3 hills:3 movers:2 peaks:3 towers:3 wind:3 hills:3 gates:3 peaks:3 open:1',
    story: [['lander', 0.07], ['flag', 0.12], ['crater', 0.3], ['rover', 0.48], ['crater', 0.64], ['meteor', 0.82]] },
  { n: 22, uni: 'moon', seed: 72011, len: 1.02, look: adv(15, { ...MOON, sky: [['#0b0d1a', '#2a2f4a'], ['#0b0d1a', '#3a3350']], extras: ['stars', 'planet'] }), mod: { grav: 0.55 }, sections: 'open:1 peaks:3 hills:3 towers:3 gates:3 peaks:3 movers:3 hills:4 gates:3 wind:3 peaks:4 towers:3 open:1',
    story: [['flag', 0.06], ['rover', 0.22], ['lander', 0.4], ['crater', 0.56], ['flag', 0.72], ['rover', 0.88, { flip: 1 }]] },
  { n: 23, uni: 'moon', seed: 73027, len: 1.02, look: adv(29, { ...MOON, sky: [['#0d0a14', '#3b2a3f'], ['#0d0a14', '#4a2f2f']], extras: ['stars', 'planet', 'meteors'], weather: 'embers', wcol: '#ffd9a0' }), mod: { grav: 0.6 }, sections: 'open:1 movers:3 hills:4 peaks:3 movers:4 gates:4 towers:3 movers:4 peaks:4 hills:4 gates:4 movers:4 open:1',
    story: [['meteor', 0.08], ['crater', 0.2], ['meteor', 0.36, { flip: 1 }], ['crater', 0.52], ['meteor', 0.68], ['lander', 0.86]] },
  { n: 24, uni: 'moon', seed: 74033, len: 1.02, look: adv(15, { ...MOON, sky: [['#05060d', '#16213e'], ['#05060d', '#1f3a5f']], extras: ['stars', 'planet'] }), mod: { grav: 0.5 }, sections: 'open:1 towers:4 gates:4 geysers:3 hills:4 towers:4 peaks:4 mills:3 gates:4 towers:4 hills:4 peaks:4 open:1',
    story: [['dome', 0.08], ['dome', 0.2, { flip: 1 }], ['rover', 0.38], ['dome', 0.56], ['flag', 0.72], ['dome', 0.88]] },
  { n: 25, uni: 'moon', seed: 75041, len: 1.02, look: adv(30, { ...MOON, sky: [['#020205', '#0c0c18'], ['#020205', '#14101f']], extras: ['stars', 'meteors'] }), mod: { grav: 0.5, dark: 1 }, traffic: 'ufo', sections: 'open:1 cave:4 peaks:4 movers:4 gates:4 hills:4 cave:4 towers:4 geysers:4 peaks:4 gates:5 movers:4 open:1',
    story: [['meteor', 0.08], ['crater', 0.24], ['monolith', 0.42], ['crater', 0.6], ['monolith', 0.76], ['lander', 0.9]] },
];
export const raceLevel = (n) => RACE_LEVELS.find((l) => l.n === n);
