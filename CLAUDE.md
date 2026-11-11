# Heli — règles du projet

- **Aucune dépendance, aucun build** : JavaScript en modules ES, Canvas 2D, fichiers statiques servis tels quels.
- **100 % local** : aucun appel réseau, aucune pub, aucun traceur. Sauvegarde dans `localStorage` (`js/save.js`) ; toute évolution du format doit rester compatible (`sanitize`).
- **Langues** : chaque texte visible passe par `t('clé')` (`js/i18n.js`) et doit exister en fr, en, es, pt, de, it. `node tools/i18n-check.mjs` doit afficher `OK`.
- **Niveaux** : générés par `js/levelgen.js` à partir de `js/data.js` (graine fixe). Après toute modification de la physique, du générateur ou des niveaux, `node tools/sim.mjs` doit passer (chaque niveau faisable, durée 95–215 s au pilote automatique).
- **Carburant** : le réservoir (`level.tank`) est dimensionné par le générateur sur le plus long trajet entre deux héliports principaux ; le pilote automatique doit finir chaque niveau sans descendre sous ~35 % (`essenceMin` dans la sortie de `tools/sim.mjs`).
- `js/game.js`, `js/levelgen.js`, `js/data.js`, `js/util.js` ne doivent pas dépendre du DOM (ils tournent sous Node).
- À chaque mise en ligne : incrémenter `VERSION` dans `sw.js` (et `js/main.js`), et ajouter tout nouveau fichier à la liste `FILES` du service worker.
- Jeu vertical à une main : toute nouvelle commande doit rester utilisable au pouce ; les boutons font au moins 46 px.
