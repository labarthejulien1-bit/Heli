# Heli Adventure 🚁

Jeu de pilotage d'hélicoptère **2D, vertical, à une main**, au style graphique épuré (silhouettes, dégradés, parallaxe).
PWA Android **100 % locale** : aucune pub, aucun compte, aucune collecte de données, jouable hors ligne.

## Jouer

- **Maintenir** le pouce sur l'écran : le rotor pousse l'appareil le long de son axe.
- **Relâcher** : la gravité reprend la main.
- **Glisser** à droite / à gauche : incliner l'appareil (accélérer / freiner, reculer). L'inclinaison est conservée entre deux appuis.
- **Carburant** : le rotor consomme de l'essence. Se poser sur un héliport vert refait le plein et répare l'appareil. La panne sèche loin d'un héliport est fatale.
- Se **poser en douceur** sur l'héliport d'arrivée pour terminer le niveau.
- Clavier (PC) : Espace = rotor, ← → = inclinaison, Échap = pause.

**État de l'appareil** : pas de barre de vie, on le lit sur l'hélicoptère. Un choc doux le fait fumer légèrement, un gros choc (à pleine vitesse, pale, geyser…) le fait fumer noir ; trois chocs doux valent un gros choc et deux gros chocs détruisent un appareil standard. Un échec renvoie au début du niveau.

## Contenu

- **30 niveaux**, chacun avec sa palette, ses décors animés, sa météo, sa musique et une particularité : montagnes, forêt, canyon, côte, métropole, glaciers, temples, volcan, ville néon, archipel céleste, puis dunes (vent de face), marais (gaz acide), automne, port industriel, Lune (faible gravité), lagune aux méduses, château, savane (thermiques), mine de cristal (obscurité), orage tropical, fjords (vent arrière), jardins suspendus (moulins), fonderie (torchères), champignons géants, crevasse de glace, mégalopole 2099 (lasers), temple perdu, mer de nuages (montgolfières), planète rouge, nébuleuse.
- **Héliports de ravitaillement** de plus en plus petits et difficiles : au sol, sur un toit ou un piton, au sommet d'une montagne, dans une clairière entre deux arbres, sous un abri rocheux ou dans un bâtiment.
- **100 pièces par niveau**, placées hors de la trajectoire sûre (au ras du sol, des obstacles, du plafond) : aller les chercher coûte de l'essence. Elles s'accumulent et servent à **acheter les hélicoptères** au hangar (14 appareils, de 200 à 3600 pièces, dont deux hydravions).
- **3 étoiles par niveau**, aux endroits les plus difficiles. Elles achètent les dix appareils militaires et rares (3 à 14 étoiles), dont la soucoupe volante.
- **3 objectifs par niveau** (médailles, pour le rang du pilote) : pièces, étoiles, temps, collisions, atterrissage en douceur.
- Profil pilote, 6 langues, réglages (audio, vibrations, sensibilité, qualité graphique, économie de batterie), export / import de la sauvegarde.

## Heli Rescue

Un second monde, accessible depuis l'accueil : **20 missions de secours héliporté** et **5 appareils de secours** (Mésange, Chamois, Mouette, Sentinelle, Tandem), avec sa propre progression.

- Se poser à plat tout près de chaque victime (aucune zone n'est tracée : au pilote de trouver où), rester posé pendant qu'elle embarque, la ramener à la base. Les passagers sont visibles derrière de grands hublots (et en médaillons à l'écran) et alourdissent l'appareil ; les animaux appellent, chacun avec son cri.
- L'appareil vole dans les deux sens : une inclinaison franche du côté opposé au nez le retourne.
- Chaque mission a son décor, son style et ses dangers : marée, crevasses et air raréfié, toits inondés, canyons, front de feu, banquise à la dérive, volcan, répliques, avalanche au détecteur, marais, naufrage, gouffre de nuit, blizzard, cyclone, Himalaya...
- Missions longues et accidentées : vagues qui frappent un appareil trop bas, barrières de feu, foudre, blocs tombant du ciel, puits étroits à corniches, quartiers inondés et en ruine.
- Trois étoiles par mission : tout le monde sauf, temps, chocs. **100 pièces par mission**, créditées à l'arrivée, pour acheter les appareils de secours (porte-monnaie propre à Heli Rescue).
- Les missions sont de simples données (`js/rescuelevels.js`) ; `node tools/sim-rescue.mjs` vérifie que chacune est faisable.

## Heli Race

Un troisième monde, tourné vers la course et le meilleur chrono : **25 courses** et **5 appareils de course** (Éclair, Guépard, Flèche, Tornade, Supernova).

- Filer toujours vers la droite en passant dans les anneaux dorés, plus ou moins gros, posés sur la meilleure ligne à travers le décor : 3 s de pénalité par anneau manqué.
- Aucune pièce, aucun ravitaillement : 3 étoiles à ramasser par course, qui servent à acheter les appareils (déverrouillés au fil des courses réussies).
- Cinq univers de cinq courses : eau et cascades, neige, volcans, ovnis (soucoupes écrasées, vaisseaux posés), Lune (faible gravité, cratères, météorites). Chaque course a ses monuments : épaves, moulins, mammouth dans la glace, gardiens de pierre, forge, module lunaire, base sous dôme…
- Les courses sont de simples données (`js/racelevels.js`) ; `node tools/sim-race.mjs` vérifie que chacune se termine en 2 à 3 minutes au pilote automatique.

## Démarrage

Aucune dépendance, aucune étape de build : ce sont des fichiers statiques.

```bash
npm run serve     # http://localhost:8080
npm run check     # valide les 30 niveaux, les 20 missions Heli Rescue, les 25 courses Heli Race et les traductions
```

## Installation sur Android (PWA)

1. Le dépôt se déploie sur **GitHub Pages** via `.github/workflows/deploy.yml` (Settings → Pages → Source : *GitHub Actions*).
2. Ouvrir l'adresse du site dans Chrome Android → menu ⋮ → **Installer l'application** (ou Réglages → *Installer l'application* dans le jeu).
3. Le jeu se lance ensuite en plein écran, hors ligne, comme une appli.

Plus tard, pour le Play Store : empaqueter cette PWA en **AAB** avec Bubblewrap (Trusted Web Activity) ou Capacitor.

## Structure

```
index.html, manifest.webmanifest, sw.js   Coquille PWA (cache hors ligne)
css/style.css                             Interface
js/data.js       Hélicoptères, niveaux (palettes, thèmes, sections, objectifs)
js/levelgen.js   Génération procédurale déterministe (couloir de vol garanti)
js/game.js       Physique, collisions, objectifs, pilote automatique
js/render.js     Rendu Canvas 2D (ciel, parallaxe, obstacles, météo, particules)
js/helidraw.js   Dessin vectoriel des hélicoptères
js/audio.js      Sons et musique procéduraux (Web Audio)
js/i18n.js       Traductions fr / en / es / pt / de / it
js/save.js       Sauvegarde locale (localStorage), déblocages
js/main.js       Écrans, commandes, boucle de jeu
js/rescue*.js    Monde Heli Rescue : appareils, missions (données), constructeur, logique, dangers
tools/           sim.mjs et sim-rescue.mjs (validation), i18n-check.mjs, make-icons.mjs
```
