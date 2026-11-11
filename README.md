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
- **100 pièces par niveau**, placées hors de la trajectoire sûre (au ras du sol, des obstacles, du plafond) : aller les chercher coûte de l'essence. Elles s'accumulent et servent à **acheter les hélicoptères** au hangar (15 appareils, de 200 à 8000 pièces).
- **3 étoiles par niveau**, aux endroits les plus difficiles. Elles achètent les cinq appareils les plus rares (10 à 22 étoiles), dont la soucoupe volante.
- **3 objectifs par niveau** (médailles, pour le rang du pilote) : pièces, étoiles, temps, collisions, atterrissage en douceur.
- Profil pilote, 6 langues, réglages (audio, vibrations, sensibilité, qualité graphique, économie de batterie), export / import de la sauvegarde.

## Démarrage

Aucune dépendance, aucune étape de build : ce sont des fichiers statiques.

```bash
npm run serve     # http://localhost:8080
npm run check     # valide les 30 niveaux (pilote automatique) et les traductions
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
tools/           sim.mjs (validation des niveaux), i18n-check.mjs, make-icons.mjs
```
