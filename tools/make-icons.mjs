// Génère les icônes PNG à partir de icons/icon.svg. Usage : node tools/make-icons.mjs (nécessite Playwright)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const b = await chromium.launch();
for (const [name, size, pad] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['maskable-512', 512, 0.1]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0;background:#3b4a7a;display:grid;place-items:center;height:100vh"><div style="width:${100 - pad * 0}%;height:100%;transform:scale(${1 + pad * 2.2})">${svg}</div></body>`);
  await p.screenshot({ path: new URL(`../icons/${name}.png`, import.meta.url).pathname });
  await p.close();
}
await b.close();
