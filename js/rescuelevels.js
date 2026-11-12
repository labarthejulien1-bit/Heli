// Niveaux du monde Heli Rescue : une entrée par niveau, uniquement des données (aucune logique par niveau).
// - look : thème visuel, au même format que les niveaux Aventure (ciel, couches de parallaxe, météo, arbres...).
// - terrain : points de passage [x, y] du relief (y plus petit = plus haut), reliés en courbes ; rough = irrégularité.
// - base : héliport de départ (plein, réparation, débarquement).
// - victims : type 'person' ou 'animal', variant (apparence), size ('small', 'medium', 'big' ; 'big' exige un gros porteur),
//   x = centre de la zone de pose, zoneWidth = largeur de la zone, side = côté où attend la victime (1 = à droite).
// - look.style : famille de rendu ('flat' aplats, 'paper' papier découpé, 'facet' facettes, 'wash' aquarelle) ; look.grain : grain de papier.
// - roof (sur une victime) : la zone de pose est le toit d'une maison de cette hauteur. props : maisons de décor.
// - water : niveau de l'eau y, vitesse de montée rise (unités/s), niveau maximal max. Si l'eau recouvre une zone occupée, la mission est perdue.
// - thinAir : au-dessus de l'altitude « above », la poussée baisse jusqu'à « loss » (sur « span » unités), sauf appareil de montagne.
// - hazards : 'faller' (bloc qui tombe périodiquement), 'debris' (objet flottant entre x0 et x1), 'gust' (rafale latérale périodique).
// - stars : temps à battre (s) et nombre de chocs toléré pour les 2e et 3e étoiles.
export const RESCUE_LEVELS = [
  { n: 1, seed: 4101, worldLength: 3600, tank: 62, recommended: 'mesange',
    look: {
      sky: [['#8fd0e8', '#fdf6dc'], ['#a9dcf0', '#fff4d0']], mid: '#8cc29a', ground: '#3f7d4f', obs: '#2f6645', rim: '#dff5c8', accent: '#ffd166',
      sun: { c: '#fffbe6', x: 0.72, y: [0.2, 0.26], r: 34 }, layers: ['jag', 'hill', 'pines'], extras: ['clouds', 'birds'], weather: null,
      theme: { tree: ['pine', 'round', 'pine'] }, music: { root: 57, scale: 'maj', bpm: 68 },
    },
    terrain: [[0, 700], [700, 700], [1100, 640], [1500, 690], [1900, 610], [2300, 660], [3000, 660], [3300, 600], [3600, 640]], rough: 9,
    base: { x: 260 },
    trees: { every: [150, 290], scale: 0.8 },
    victims: [{ type: 'person', variant: 'hiker', limp: true, x: 2620, zoneWidth: 170, side: 1 }],
    stars: { time: 75, maxHits: 0 } },
  { n: 2, seed: 4202, worldLength: 4200, tank: 85, recommended: 'mesange',
    look: {
      style: 'paper', grain: 0.5,
      sky: [['#bfe0c8', '#f4f6dc'], ['#a9d3bd', '#f7f1cf']], mid: '#4f8a66', ground: '#17402e', obs: '#0f2f22', rim: '#9fd8ad', accent: '#ffd166',
      sun: { c: '#fffbe0', x: 0.3, y: [0.16, 0.2], r: 30 }, layers: ['pines', 'pines', 'pines'], extras: ['birds', 'mist'], weather: null,
      theme: { tree: ['pine', 'pine', 'pine', 'round'] }, music: { root: 53, scale: 'dor', bpm: 66 },
    },
    terrain: [[0, 690], [600, 690], [1000, 650], [1500, 700], [2100, 660], [2700, 700], [3300, 670], [3700, 690], [4200, 660]], rough: 8,
    base: { x: 260 },
    trees: { every: [58, 110], scale: 1.25 },
    victims: [{ type: 'animal', variant: 'dog', size: 'small', col: '#c98a4b', x: 3260, zoneWidth: 116, side: -1 }],
    stars: { time: 90, maxHits: 0 } },
  { n: 3, seed: 4303, worldLength: 3400, tank: 64, recommended: 'mesange',
    look: {
      style: 'flat',
      sky: [['#6fd0de', '#e6fbf2'], ['#58bfd4', '#fff1cf']], mid: '#79c5c7', ground: '#3d5a6c', obs: '#2f4a5a', rim: '#f4f1de', accent: '#ffd166',
      sun: { c: '#fffbe6', x: 0.25, y: [0.18, 0.3], r: 36 }, layers: ['hill', 'jag', 'hill'], extras: ['clouds', 'birds', 'sea'], weather: null,
      theme: { tree: ['round', 'palm'] }, music: { root: 55, scale: 'maj', bpm: 78 },
    },
    terrain: [[0, 600], [520, 600], [680, 730], [900, 790], [2000, 790], [2180, 700], [2290, 648], [2510, 648], [2620, 700], [2800, 790], [3400, 790]], rough: 4,
    base: { x: 250 },
    water: { y: 742, rise: 0.5, max: 640 },
    hazards: [{ type: 'gust', x: 1250, w: 520, fx: -150, period: 5, on: 0.35 }],
    victims: [{ type: 'person', variant: 'walker', col: '#e76f51', hat: '#264653', x: 2400, zoneWidth: 150, side: 1 }, { type: 'person', variant: 'walker', col: '#2a9d8f', hat: '#e9c46a', x: 2400, zoneWidth: 150, side: 1 }],
    stars: { time: 150, maxHits: 0 } },
  { n: 4, seed: 4404, worldLength: 3800, tank: 66, recommended: 'chamois',
    look: {
      style: 'facet',
      sky: [['#9fd0ea', '#f4fbff'], ['#7fb4dc', '#e8f4fc']], mid: '#8fb9de', ground: '#dcebf8', groundDeep: '#8fb2d8', obs: '#4f78ae', rim: '#ffffff', accent: '#8ff0ff',
      sun: { c: '#ffffff', x: 0.6, y: [0.14, 0.18], r: 28 }, layers: ['jag', 'jag', 'jag'], extras: ['clouds'], weather: 'snow',
      theme: { tree: ['crystal'] }, music: { root: 59, scale: 'maj', bpm: 58 },
    },
    terrain: [[0, 690], [500, 690], [900, 600], [1300, 520], [1700, 440], [2100, 380], [2380, 350], [2400, 350], [2430, 560], [2470, 560], [2500, 345], [2780, 345], [2810, 560], [2850, 560], [2880, 350], [3200, 330], [3800, 300]], rough: 5,
    base: { x: 250 },
    thinAir: { above: 480, span: 300, loss: 0.34 },
    hazards: [{ type: 'faller', x: 1500, period: 3.6, phase: 0.1 }, { type: 'faller', x: 2050, period: 3.2, phase: 0.6 }],
    victims: [{ type: 'person', variant: 'climber', col: '#f4a261', hat: '#e63946', limp: true, x: 2640, zoneWidth: 150, side: 1 }],
    stars: { time: 100, maxHits: 0 } },
  { n: 5, seed: 4505, worldLength: 3600, tank: 60, recommended: 'chamois',
    look: {
      style: 'wash', grain: 0.6,
      sky: [['#6f8796', '#c9d6dc'], ['#5c7384', '#b9c7cf']], mid: '#6f8a96', ground: '#33424c', obs: '#44545e', rim: '#cfdde3', accent: '#ffd98a',
      sun: { c: '#e6eef2', x: 0.7, y: [0.16, 0.2], r: 24 }, layers: ['hill', 'hill', 'pines'], extras: ['clouds', 'mist'], weather: 'rain',
      theme: { tree: ['round', 'dead'] }, music: { root: 50, scale: 'min', bpm: 70 },
    },
    terrain: [[0, 610], [520, 610], [760, 740], [3000, 745], [3300, 700], [3600, 660]], rough: 5,
    base: { x: 250 },
    water: { y: 728, rise: 0.35, max: 668 },
    props: [{ type: 'house', x: 1150, w: 120, h: 96 }, { type: 'house', x: 1700, w: 140, h: 120 }, { type: 'house', x: 2900, w: 110, h: 90 }],
    hazards: [{ type: 'debris', x0: 1260, x1: 1600, speed: 34 }, { type: 'debris', x0: 1830, x1: 2260, speed: 46, phase: 0.7 }],
    trees: { every: [260, 420], scale: 0.7 },
    victims: [{ type: 'person', variant: 'resident', col: '#577590', hat: '#f9c74f', x: 2380, zoneWidth: 140, roof: 124, side: 1 }, { type: 'animal', variant: 'cat', size: 'small', col: '#3d3d3d', x: 2380, zoneWidth: 140, roof: 124, side: 1 }],
    stars: { time: 110, maxHits: 0 } },
];
export const rescueLevel = (n) => RESCUE_LEVELS.find((l) => l.n === n);
