// Prépare le dossier www/ que Capacitor embarque dans l'application Android : une copie des fichiers du jeu,
// servis tels quels (aucun build). Usage : node tools/make-www.mjs
import fs from 'fs';
const out = new URL('../www/', import.meta.url), root = new URL('../', import.meta.url);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons']) fs.cpSync(new URL(f, root), new URL(f, out), { recursive: true });
console.log('www/ prêt');
