// Niveaux du monde Heli Rescue : une entrée par niveau, uniquement des données (aucune logique par niveau).
// - look : thème visuel, au même format que les niveaux Aventure (ciel, couches de parallaxe, météo, arbres...).
// - terrain : points de passage [x, y] du relief (y plus petit = plus haut), reliés en courbes ; rough = irrégularité.
// - base : héliport de départ (plein, réparation, débarquement).
// - victims : type 'person' ou 'animal', variant (apparence), size ('small', 'medium', 'big' ; 'big' exige un gros porteur),
//   x = centre de la zone de pose, zoneWidth = largeur de la zone, side = côté où attend la victime (1 = à droite).
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
];
export const rescueLevel = (n) => RESCUE_LEVELS.find((l) => l.n === n);
