# Heli 🚁

Jeu de pilotage d'hélicoptère **2D, vertical, à une main**, au style graphique épuré (silhouettes, dégradés, parallaxe).
PWA Android **100 % locale** : aucune pub, aucun compte, aucune collecte de données, jouable hors ligne.

## Jouer

- **Maintenir** le pouce sur l'écran : le rotor pousse l'appareil le long de son axe.
- **Relâcher** : la gravité reprend la main.
- **Glisser** à droite / à gauche : incliner l'appareil (accélérer / freiner, reculer). L'inclinaison est conservée entre deux appuis.
- **Carburant** : le rotor consomme de l'essence. Se poser sur un héliport vert refait le plein, répare un peu l'appareil et sert de point de reprise.
- Se **poser en douceur** sur l'héliport d'arrivée pour terminer le niveau.
- Clavier (PC) : Espace = rotor, ← → = inclinaison, Échap = pause.

Les collisions retirent du blindage (proportionnellement à la vitesse d'impact) sans détruire l'appareil d'un coup ; un contact lent est sans dégât. Chaque niveau compte 3 à 5 héliports de ravitaillement : les principaux (au sol ou sur un toit) et des héliports bonus difficiles (clairière entre deux arbres, abri rocheux) gardés par des étoiles à récolter. Tomber en panne sèche loin d'un héliport détruit l'appareil.

## Contenu

- **10 niveaux** de 2 à 3 minutes, chacun avec sa palette, ses décors animés, sa météo et sa musique : montagnes, forêt, canyon, côte, métropole, glaciers, temples, volcan, ville néon, archipel céleste.
- Passages techniques : pics, forêts denses, immeubles, portes, grottes, obstacles mobiles, éoliennes, geysers / lasers, zones de vent.
- **3 objectifs par niveau** (médailles) : orbes, étoiles, temps, blindage, collisions, anneaux, atterrissage en douceur…
- **10 hélicoptères** aux caractéristiques différentes, débloqués par des objectifs précis.
- Profil pilote (nom, rang, statistiques), 6 langues, réglages (audio, vibrations, sensibilité, qualité graphique, économie de batterie), export / import de la sauvegarde.

## Démarrage

Aucune dépendance, aucune étape de build : ce sont des fichiers statiques.

```bash
npm run serve     # http://localhost:8080
npm run check     # valide les 10 niveaux (pilote automatique) et les traductions
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
