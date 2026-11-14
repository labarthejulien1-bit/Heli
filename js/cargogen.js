// Construit un niveau Heli Cargo à partir de sa description (js/cargolevels.js).
// Le relief, l'eau, les plateformes et les dangers viennent du constructeur de Heli Rescue (js/rescuegen.js), appelé sans
// victime ; on retire les pièces, puis on pose les charges, leurs zones de livraison, l'aire d'arrivée, les 3 étoiles et le décor.
import { buildRescueLevel } from './rescuegen.js';
import { LOADS } from './cargo.js';

export function buildCargoLevel(cfg) {
  // replats dégagés autour des charges, des zones de livraison, de l'arrivée et des ravitaillements
  const clear = [...cfg.loads.flatMap((l) => [{ x: l.x, w: 130 }, { x: l.to, w: (l.zw || 110) + 50 }]), { x: cfg.finish.x, w: (cfg.finish.w || 120) + 50 }, ...(cfg.fuel || []).map((f) => ({ x: f.x, w: 160 }))];
  const L = buildRescueLevel({ ...cfg, victims: [], clear, stars: { time: 0, maxHits: 0 } });
  L.def.id = 300 + cfg.n; L.def.objectives = cfg.objectives || [];
  // Hauteur portante en un point : le dessus d'une plateforme s'il y en a une, sinon le sol.
  const topAt = (x) => { let y = L.groundAt(x); for (const o of L.obs) if (o.st === 'deck' && x > o.minX && x < o.maxX) y = Math.min(y, o.y); return y; };
  const base = L.pads[0];
  base.y = topAt(base.x); base.w = cfg.base.w || 140;
  const finish = { x: cfg.finish.x, y: topAt(cfg.finish.x), w: cfg.finish.w || 120, kind: 'finish', i: 1 };
  L.pads = [base, finish]; L.pad = finish;
  for (const f of cfg.fuel || []) L.pads.push({ x: f.x, y: topAt(f.x), w: f.w || 110, kind: 'fuel', main: true, i: L.pads.length });
  // Chaque charge a sa couleur, la même que celle de sa zone de livraison : on voit d'un coup d'œil où la poser.
  const TINT = ['#ffd34d', '#4dd6ff', '#ff7ad1', '#9dff6a'];
  const loads = cfg.loads.map((l, i) => { const T = LOADS[l.type]; return { col: TINT[i % TINT.length], type: l.type, x: l.x, y: topAt(l.x), w: T.w, h: T.h, m: l.m ?? T.m, to: { x: l.to, w: l.zw || 110, y: topAt(l.to) } }; });
  // 3 étoiles à ramasser, placées par les données : [x, hauteur au-dessus du sol ou de l'eau]
  const floor = (x) => Math.min(topAt(x), L.waterAt ? L.waterAt(0) : 1e9);
  L.items = (cfg.starsAt || []).map(([x, up]) => ({ type: 'star', x, y: floor(x) - up })).sort((a, b) => a.x - b.x);
  L.orbTotal = 0; L.starTotal = L.items.length;
  // Aucun pylône de décor (ligne électrique, télésiège) sur une zone de livraison ni près d'une charge : la place doit être vide
  const busy = (x) => loads.some((l) => Math.abs(l.to.x - x) < 230 || Math.abs(l.x - x) < 230);
  L.story = (cfg.story || []).filter(([type, x]) => !(['epyl', 'skilift'].includes(type) && busy(x))).map(([type, x, o]) => ({ type, x, y: floor(x), v: (x * 0.137) % 1, ...(o || {}) }));
  L.cargo = { cfg, loads, topAt, finish };
  return L;
}
