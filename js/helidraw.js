// Dessin vectoriel des hélicoptères (repère local : nez vers la droite, centre en 0,0).
import { rgba } from './util.js';

function poly(c, pts, fill) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fillStyle = fill; c.fill();
}
function rrect(c, x, y, w, h, r, fill) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  c.fillStyle = fill; c.fill();
}
function rotor(c, x, y, R, t, power, col) {
  const ph = t * (10 + 34 * power), k = Math.cos(ph);
  c.fillStyle = `rgba(255,255,255,${0.08 + 0.1 * power})`;
  c.beginPath(); c.ellipse(x, y, R + 1, 3.6, 0, 0, 7); c.fill();
  c.fillStyle = rgba(col, 0.1 + 0.14 * power);
  c.beginPath(); c.ellipse(x, y, R, 2.6, 0, 0, 7); c.fill();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x - R * k, y); c.lineTo(x + R * k, y); c.stroke();
  c.strokeStyle = col; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(x - R * k, y); c.lineTo(x + R * k, y); c.stroke();
  c.fillStyle = col; c.fillRect(x - 1.5, y, 3, 5);
}
function tailRotor(c, x, y, t, power, col) {
  const a = t * (14 + 40 * power);
  c.fillStyle = rgba(col, 0.25); c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill();
  c.strokeStyle = col; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6); c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); c.stroke();
}
function skids(c, col) {
  c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-9, 11.5); c.lineTo(15, 11.5); c.quadraticCurveTo(18, 11.5, 19, 9);
  c.moveTo(-3, 7); c.lineTo(-5, 11.5); c.moveTo(9, 7); c.lineTo(11, 11.5); c.stroke();
}

// Petits outils de tracé (chemins SVG) pour les silhouettes inspirées d'appareils réels.
function kit(c) {
  const F = (d, col) => { c.fillStyle = col; c.fill(new Path2D(d)); };
  const S = (d, col, w = 1.5) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(new Path2D(d)); };
  const E = (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
  const wheel = (x, y, r, sx, sy) => { S(`M${sx},${sy} L${x},${y}`, '#1b1b26', 1.4); E(x, y, r, r, '#1b1b26'); };
  return { F, S, E, wheel };
}

// Croix de secours réutilisable. On n'emploie jamais la croix rouge sur fond blanc carré (emblème protégé) :
// 'white' = croix blanche aux branches arrondies sur la carrosserie ; 'disc' = croix rouge arrondie dans un rond blanc.
export function drawRescueCross(c, x, y, s, style = 'white') {
  if (style === 'disc') { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, s * 1.5, 0, 6.2832); c.fill(); }
  const col = style === 'disc' ? '#d62828' : '#ffffff', a = s * 0.36;
  rrect(c, x - s, y - a, s * 2, a * 2, a * 0.7, col); rrect(c, x - a, y - s, a * 2, s * 2, a * 0.7, col);
}
// Équipement commun des appareils de secours : hublots (derrière lesquels s'afficheront les passagers),
// croix, gyrophare clignotant et treuil replié sur le flanc.
let _pax = null; // passagers à afficher pendant le dessin en cours
function rescueFit(c, look, t, cross, beacon, winch) {
  const pax = _pax;
  for (const [x, y, r] of look.seats) {
    rrect(c, x - r, y - r, r * 2, r * 2, r * 0.75, '#22303a');
    const who = pax && pax.seats[look.seats.findIndex((q) => q[0] === x && q[1] === y)];
    if (who) { // passager découpé à la forme du hublot, derrière une vitre légèrement teintée
      rrect(c, x - r + 0.6, y - r + 0.6, r * 2 - 1.2, r * 2 - 1.2, r * 0.65, '#3d4f5c');
      c.save(); c.beginPath(); c.rect(x - r + 0.6, y - r + 0.6, r * 2 - 1.2, r * 2 - 1.2); c.clip();
      drawOccupant(c, x, y, r, who, t); c.restore();
      c.globalAlpha = 0.28; rrect(c, x - r + 0.6, y - r + 0.6, r * 2 - 1.2, r * 2 - 1.2, r * 0.65, look.glass); c.globalAlpha = 1;
    } else rrect(c, x - r + 0.6, y - r + 0.6, r * 2 - 1.2, r * 2 - 1.2, r * 0.65, look.glass);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(x - r + 1, y - r + 1); c.lineTo(x - r + 2.6, y - r + 1); c.lineTo(x - r + 1, y + r * 0.2); c.fill(); // reflet
  }
  if (look.cargo) {
    const [x, y, r] = look.cargo;
    if (pax && pax.cargo) { rrect(c, x - r + 0.8, y - r + 0.8, r * 2 - 1.6, r * 2 - 1.6, 2, '#3d4f5c'); c.save(); c.beginPath(); c.rect(x - r + 0.8, y - r + 0.8, r * 2 - 1.6, r * 2 - 1.6); c.clip(); drawOccupant(c, x, y, r, pax.cargo, t); c.restore(); c.globalAlpha = 0.25; }
    rrect(c, x - r + 0.8, y - r + 0.8, r * 2 - 1.6, r * 2 - 1.6, 2, look.glass); c.globalAlpha = 1;
  }
  drawRescueCross(c, cross[0], cross[1], cross[2], look.cross);
  const on = Math.sin(t * 11) > 0, bc = on ? '#ff3b3b' : '#3b8bff';
  c.fillStyle = bc; c.globalAlpha = 0.28; c.beginPath(); c.arc(beacon[0], beacon[1], 5, 0, 6.2832); c.fill(); c.globalAlpha = 1;
  c.beginPath(); c.arc(beacon[0], beacon[1], 1.9, Math.PI, 0); c.fill();
  c.strokeStyle = '#1b1b26'; c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(winch[0], winch[1] + 2); c.lineTo(winch[0], winch[1]); c.lineTo(winch[0] + 4, winch[1]); c.stroke();
  c.lineWidth = 1; c.beginPath(); c.moveTo(winch[0] + 4, winch[1]); c.lineTo(winch[0] + 4, winch[1] + 2.5); c.stroke();
}

// Tête et épaules d'un passager, centrées en (x, y) dans un hublot de rayon r.
// p = { type, variant, col (veste), sway (balancement selon l'accélération) }.
export function drawOccupant(c, x, y, r, p, t) {
  const sw = clamp1(p.sway || 0) * r * 0.25, blink = (t * 0.7 + (p.seed || 0)) % 3 < 0.12;
  const dot = (dx, dy, rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(x + dx + sw, y + dy, rr, 0, 6.2832); c.fill(); };
  if (p.type === 'person') {
    c.fillStyle = p.col || '#2a9d8f'; c.beginPath(); c.ellipse(x + sw * 0.5, y + r * 1.05, r * 0.95, r * 0.7, 0, 0, 6.2832); c.fill(); // épaules
    dot(0, -r * 0.05, r * 0.52, '#f1c9a5');
    c.fillStyle = p.hat || '#e76f51'; c.beginPath(); c.arc(x + sw, y - r * 0.12, r * 0.56, Math.PI, 0); c.fill(); // bonnet ou casque
    if (!blink) { dot(-r * 0.2, -r * 0.02, r * 0.07, '#1b1b26'); dot(r * 0.2, -r * 0.02, r * 0.07, '#1b1b26'); }
  } else {
    const fur = p.col || '#b5835a', ear = Math.sin(t * 5 + (p.seed || 0) * 9) * 0.25;
    dot(0, r * 0.15, r * 0.6, fur);
    c.fillStyle = fur;
    const V = p.variant, X = x + sw;
    const tri = (sx, w, h2) => { c.beginPath(); c.moveTo(X + sx * r * 0.55, y - r * 0.1); c.lineTo(X + sx * (r * 0.55 - w * r * 0.15), y - r * h2 + ear * r * 0.2); c.lineTo(X + sx * r * 0.12, y - r * 0.3); c.fill(); };
    const flop = (sx, len) => { c.beginPath(); c.ellipse(X + sx * r * 0.58, y - r * 0.05 + ear * r * 0.3, r * 0.2, r * len, sx * 0.4, 0, 6.2832); c.fill(); };
    if (V === 'cat' || V === 'husky') { tri(-1, 1, 0.78); tri(1, 1, 0.78); if (V === 'husky') dot(0, r * 0.3, r * 0.38, '#ffffff'); }
    else if (V === 'deer' || V === 'fawn' || V === 'goat' || V === 'horse') { // oreilles dressées, plus cornes ou crinière
      tri(-1, 2, 0.95); tri(1, 2, 0.95);
      if (V === 'goat') { c.strokeStyle = '#d8d2c4'; c.lineWidth = r * 0.14; c.lineCap = 'round'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(X + sx * r * 0.2, y - r * 0.5); c.quadraticCurveTo(X + sx * r * 0.5, y - r * 1.1, X + sx * r * 0.2, y - r * 1.05); c.stroke(); } }
      if (V === 'horse') { c.fillStyle = '#2b1d14'; c.beginPath(); c.ellipse(X, y - r * 0.5, r * 0.22, r * 0.4, 0, 0, 6.2832); c.fill(); c.fillStyle = fur; }
      if (V === 'fawn') { dot(-r * 0.3, r * 0.5, r * 0.08, '#ffffff'); dot(r * 0.34, r * 0.42, r * 0.08, '#ffffff'); }
    } else if (V === 'elephant') { for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(X + sx * r * 0.72, y + r * 0.1, r * 0.36, r * 0.52, 0, 0, 6.2832); c.fill(); } c.strokeStyle = fur; c.lineWidth = r * 0.26; c.lineCap = 'round'; c.beginPath(); c.moveTo(X, y + r * 0.3); c.quadraticCurveTo(X + r * 0.1, y + r * 0.9, X + r * 0.4, y + r * 0.85); c.stroke(); }
    else if (V === 'orangutan') { dot(0, r * 0.25, r * 0.4, '#7a4a2a'); c.fillStyle = fur; c.beginPath(); c.ellipse(X, y - r * 0.5, r * 0.3, r * 0.22, 0, 0, 6.2832); c.fill(); }
    else if (V === 'flamingo') { c.strokeStyle = fur; c.lineWidth = r * 0.22; c.lineCap = 'round'; c.beginPath(); c.moveTo(X, y + r); c.quadraticCurveTo(X - r * 0.4, y + r * 0.5, X, y + r * 0.2); c.stroke(); c.fillStyle = '#2b2d42'; c.beginPath(); c.moveTo(X + r * 0.3, y + r * 0.1); c.lineTo(X + r * 0.75, y + r * 0.45); c.lineTo(X + r * 0.25, y + r * 0.4); c.fill(); }
    else if (V === 'turtle') { c.fillStyle = '#2f5d50'; c.beginPath(); c.arc(X, y + r * 0.9, r * 0.8, Math.PI, 0); c.fill(); c.fillStyle = fur; }
    else { flop(-1, 0.42); flop(1, 0.42); }
    c.fillStyle = fur;
    if (p.variant !== 'flamingo' && p.variant !== 'elephant') { dot(0, r * 0.38, r * 0.22, '#f3e3d0'); dot(0, r * 0.3, r * 0.09, '#1b1b26'); }
    if (!blink) { dot(-r * 0.24, r * 0.02, r * 0.08, '#1b1b26'); dot(r * 0.24, r * 0.02, r * 0.08, '#1b1b26'); }
  }
}
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

// pax (facultatif, appareils de secours) : { seats: [passager ou null, ...], cargo: passager ou null }
export function drawHeli(c, look, t = 0, power = 0.6, pax = null) {
  _pax = pax;
  const { c1, c2, glass } = look, dark = '#1b1b26';
  c.save();
  c.lineJoin = 'round';
  if (look.glow) { c.shadowColor = look.glow; c.shadowBlur = 10; }
  switch (look.body) {
    case 'bubble':
      skids(c, dark);
      poly(c, [-6, -5, -31, -6.5, -31, -4, -6, 2], c1);
      poly(c, [-27, -6, -34, -15, -30, -6], c2);
      c.fillStyle = c1; c.beginPath(); c.ellipse(4, -1, 13.5, 10.5, 0, 0, 7); c.fill();
      c.fillStyle = glass; c.beginPath(); c.ellipse(6, -1.5, 10.5, 8, 0, -1.25, 1.25); c.fill();
      if (look.stripe) { c.fillStyle = look.stripe; c.fillRect(-9, 1, 13, 2.4); }
      tailRotor(c, -31, -6, t, power, dark);
      rotor(c, 2, -16, 30, t, power, dark);
      break;
    case 'sleek':
      skids(c, dark);
      c.fillStyle = c1; c.beginPath(); c.moveTo(19, 1); c.quadraticCurveTo(12, -10, 0, -9.5); c.lineTo(-8, -8); c.lineTo(-33, -5.5); c.lineTo(-33, -3); c.lineTo(-10, 5); c.quadraticCurveTo(10, 9, 19, 1); c.fill();
      poly(c, [-27, -5, -36, -15, -31, -4.5], c2);
      c.fillStyle = glass; c.beginPath(); c.moveTo(18, 0.5); c.quadraticCurveTo(12, -8.5, 3, -8); c.lineTo(5, 0); c.closePath(); c.fill();
      if (look.stripe) { c.strokeStyle = look.stripe; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-30, -3.4); c.lineTo(-6, 2.6); c.lineTo(8, 3.4); c.stroke(); }
      tailRotor(c, -33, -5, t, power, dark);
      rotor(c, 0, -15, 31, t, power, dark);
      break;
    case 'heavy':
      skids(c, dark);
      poly(c, [-8, -7, -32, -6, -32, -2, -8, 5], c1);
      poly(c, [-27, -6, -35, -16, -29, -16, -24, -6], c2);
      rrect(c, -13, -10.5, 32, 20, 8, c1);
      c.fillStyle = look.stripe; c.fillRect(-7, -10.5, 4.5, 20); c.fillRect(1, -10.5, 4.5, 20);
      c.fillStyle = glass; c.beginPath(); c.moveTo(19, -1); c.quadraticCurveTo(17, -9.5, 9, -9.5); c.lineTo(9, 0); c.closePath(); c.fill();
      tailRotor(c, -32, -5, t, power, dark);
      rotor(c, 2, -16, 32, t, power, dark);
      break;
    case 'attack':
      poly(c, [21, 2, 9, -6, -2, -9.5, -10, -6.5, -33, -5.5, -33, -2.5, -10, 4, 4, 7.5, 15, 6.5], c1);
      poly(c, [-28, -5, -38, -14, -32, -14, -24, -5], c1);
      poly(c, [-35, -3, -27, -3, -30, 3], c2);
      poly(c, [16, 0, 9, -5, 4, -4.2, 6, 1], glass);
      poly(c, [4, -5.2, -2, -8.2, -5, -5, 1, -2], glass);
      rrect(c, -6, 2, 14, 3.2, 1.5, c2);
      c.fillStyle = dark; c.fillRect(-2, 5, 9, 2.6); c.fillRect(14, 5.5, 8, 1.6);
      c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, 8); c.lineTo(-2, 11); c.moveTo(-5, 11.4); c.lineTo(10, 11.4); c.moveTo(7, 8); c.lineTo(7, 11); c.stroke();
      tailRotor(c, -33, -4.5, t, power, dark);
      rotor(c, -1, -15.5, 32, t, power, dark);
      break;
    case 'twin':
      rrect(c, -31, -7, 51, 15, 7, c1);
      poly(c, [-31, -4, -27, -17, -17, -17, -15, -7], c1);
      poly(c, [8, -7, 10, -13, 17, -13, 19, -5], c1);
      c.fillStyle = look.stripe; c.fillRect(-28, 1, 44, 2);
      c.fillStyle = glass; c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(19, -6, 12, -6.2); c.lineTo(12, 0); c.closePath(); c.fill();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-20 + i * 8, -2.5, 1.7, 0, 7); c.fill(); }
      c.fillStyle = dark; c.beginPath(); c.arc(-20, 9.5, 2.6, 0, 7); c.arc(10, 9.5, 2.6, 0, 7); c.fill();
      rotor(c, -22, -22, 23, t, power, dark);
      rotor(c, 13, -18, 23, t + 0.4, power, dark);
      break;
    case 'stealth':
      poly(c, [23, 1, 8, -7, -6, -8.5, -30, -4.5, -37, -14, -32, -14, -27, -3, -8, 5.5, 10, 6.5], c1);
      poly(c, [-30, -2, -36, 4, -26, -1], c1);
      c.shadowBlur = 0;
      poly(c, [17, -1, 8, -5.5, 0, -6, 4, -1.5], glass);
      c.strokeStyle = c2; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-26, -1.6); c.lineTo(-8, 3.6); c.lineTo(12, 4.6); c.stroke();
      c.strokeStyle = dark; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-4, 6); c.lineTo(-5, 11.4); c.moveTo(-9, 11.4); c.lineTo(12, 11.4); c.moveTo(7, 6.5); c.lineTo(8, 11.4); c.stroke();
      rotor(c, 0, -15, 33, t, power, '#3a3d4d');
      break;
    case 'retro': // bulle vitrée et queue en treillis
      skids(c, dark);
      c.strokeStyle = c1; c.lineWidth = 1.3; c.beginPath();
      c.moveTo(-4, -6); c.lineTo(-33, -7); c.moveTo(-4, 3); c.lineTo(-33, -4);
      for (let k = 0; k < 5; k++) { const tx = -8 - k * 5.5; c.moveTo(tx, -6.1 - k * 0.1); c.lineTo(tx - 2.7, 2 - k * 1.25); c.lineTo(tx - 5.5, -6.3 - k * 0.1); }
      c.stroke();
      poly(c, [-30, -7, -36, -15, -32, -4], c2);
      c.fillStyle = glass; c.beginPath(); c.arc(5, -1, 11.5, 0, 7); c.fill();
      c.strokeStyle = c1; c.lineWidth = 1.6; c.beginPath(); c.arc(5, -1, 11.5, 0, 7); c.moveTo(5, -12.5); c.lineTo(5, 10.5); c.stroke();
      rrect(c, -7, 2, 13, 6, 2, c1);
      tailRotor(c, -33, -6, t, power, dark);
      rotor(c, 3, -16, 31, t, power, dark);
      break;
    case 'coax': // deux rotors superposés, pas de rotor de queue
      skids(c, dark);
      poly(c, [-6, -5, -28, -4, -28, -1, -6, 4], c1);
      poly(c, [-24, -9, -30, -11, -30, 6, -24, 4], c2);
      c.fillStyle = c1; c.beginPath(); c.ellipse(5, -1, 15, 10, 0, 0, 7); c.fill();
      c.fillStyle = look.stripe; c.fillRect(-6, -9, 3.5, 16); c.fillRect(0, -10.5, 3.5, 19);
      c.fillStyle = glass; c.beginPath(); c.ellipse(9, -2, 9.5, 7, 0, -1.2, 1.2); c.fill();
      rotor(c, 3, -15, 27, t, power, dark);
      rotor(c, 3, -20, 27, -t * 1.1 + 1, power, dark);
      break;
    case 'rescue': // gros porteur à flotteurs
      poly(c, [-8, -7, -33, -6, -33, -3, -8, 4], c1);
      poly(c, [-28, -6, -36, -16, -30, -16, -25, -6], look.stripe);
      rrect(c, -14, -10, 34, 18, 7, c1);
      c.fillStyle = look.stripe; c.fillRect(-14, -1, 34, 3.5);
      c.fillStyle = glass; c.beginPath(); c.moveTo(20, -1.5); c.quadraticCurveTo(18, -9, 10, -9); c.lineTo(10, -1.5); c.closePath(); c.fill();
      c.fillRect(-8, -7, 5, 4.5); c.fillRect(0, -7, 5, 4.5);
      c.strokeStyle = dark; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-6, 8); c.lineTo(-6, 9.5); c.moveTo(10, 8); c.lineTo(10, 9.5); c.stroke();
      rrect(c, -13, 9, 30, 3.6, 1.8, c2);
      tailRotor(c, -33, -5, t, power, dark);
      rotor(c, 2, -16, 33, t, power, dark);
      break;
    case 'crane': // grue volante : poutre fine, cabine en nacelle
      poly(c, [14, -8, -33, -7, -33, -3.5, 14, -3], c1);
      poly(c, [-28, -7, -36, -16, -31, -16, -26, -7], c1);
      rrect(c, 6, -9, 15, 15, 5, c1);
      c.fillStyle = glass; c.beginPath(); c.moveTo(21, -2); c.quadraticCurveTo(20, -8, 13, -8); c.lineTo(13, 0); c.lineTo(20, 0); c.closePath(); c.fill();
      rrect(c, -14, -3, 16, 9, 2, c2);
      c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-16, -3); c.lineTo(-19, 11); c.moveTo(4, -3); c.lineTo(7, 11); c.moveTo(-22, 11.4); c.lineTo(-16, 11.4); c.moveTo(4, 11.4); c.lineTo(11, 11.4); c.stroke();
      tailRotor(c, -33, -5.5, t, power, dark);
      rotor(c, -2, -16, 34, t, power, dark);
      break;
    case 'tilt': // rotors basculants en bout d'aile
      c.fillStyle = c1; c.beginPath(); c.moveTo(21, 1); c.quadraticCurveTo(15, -8, 4, -8); c.lineTo(-28, -5); c.lineTo(-30, -1); c.lineTo(-8, 6); c.quadraticCurveTo(12, 9, 21, 1); c.fill();
      poly(c, [-24, -5, -33, -14, -28, -14, -20, -5], c1);
      poly(c, [-33, -14, -24, -14, -25, -11.5, -32, -11.5], look.stripe);
      c.fillStyle = glass; c.beginPath(); c.moveTo(20, 0.5); c.quadraticCurveTo(15, -7, 7, -7); c.lineTo(9, 0); c.closePath(); c.fill();
      rrect(c, -15, -9.5, 28, 3.4, 1.7, look.stripe);
      rrect(c, -18, -13, 6, 9, 2.5, c2 === look.stripe ? dark : c2); rrect(c, 10, -13, 6, 9, 2.5, c2 === look.stripe ? dark : c2);
      c.fillStyle = dark; c.beginPath(); c.arc(-5, 8.5, 2.4, 0, 7); c.arc(8, 8.5, 2.4, 0, 7); c.fill();
      rotor(c, -15, -18, 17, t, power, dark);
      rotor(c, 13, -18, 17, t + 0.5, power, dark);
      break;
    case 'drone': // quadricoptère
      c.strokeStyle = c1; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-24, -9); c.lineTo(22, -9); c.moveTo(-14, -9); c.lineTo(-8, 0); c.moveTo(14, -9); c.lineTo(8, 0); c.stroke();
      rrect(c, -13, -6, 28, 13, 6, c1);
      c.shadowBlur = 0;
      c.fillStyle = c2; c.fillRect(-13, 1, 28, 2.4);
      c.fillStyle = glass; c.beginPath(); c.arc(9, -0.5, 4.2, 0, 7); c.fill();
      c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-8, 7); c.lineTo(-10, 11.4); c.moveTo(8, 7); c.lineTo(10, 11.4); c.moveTo(-13, 11.4); c.lineTo(-6, 11.4); c.moveTo(6, 11.4); c.lineTo(13, 11.4); c.stroke();
      rotor(c, -24, -14, 13, t, power, '#3a3d4d');
      rotor(c, 22, -14, 13, t + 0.7, power, '#3a3d4d');
      break;
    case 'manta': // aile volante
      c.fillStyle = c1; c.beginPath(); c.moveTo(23, 0); c.bezierCurveTo(12, -8, -6, -10, -20, -6); c.lineTo(-36, -13); c.lineTo(-30, -2); c.lineTo(-37, 6); c.lineTo(-18, 4); c.bezierCurveTo(-4, 8, 12, 7, 23, 0); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = c2; c.beginPath(); c.moveTo(23, 0); c.bezierCurveTo(12, 5, -4, 6, -18, 3); c.bezierCurveTo(-4, 8, 12, 7, 23, 0); c.fill();
      c.fillStyle = glass; c.beginPath(); c.moveTo(18, -1.5); c.bezierCurveTo(12, -6.5, 4, -7.5, -2, -6.5); c.lineTo(4, -1.5); c.closePath(); c.fill();
      c.fillStyle = c2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-22 + k * 7, -0.5, 1.3, 0, 7); c.fill(); }
      c.strokeStyle = '#2a2a36'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-4, 6.5); c.lineTo(-5, 11.4); c.lineTo(9, 11.4); c.lineTo(8, 6.5); c.stroke();
      rotor(c, 0, -15, 33, t, power, '#3a3046');
      break;
    case 'dragon': // corps écailleux, crête et cornes
      c.fillStyle = c1; c.beginPath(); c.moveTo(22, 1); c.bezierCurveTo(18, -9, 4, -11, -8, -7); c.lineTo(-32, -4); c.lineTo(-38, -9); c.lineTo(-35, -1); c.lineTo(-39, 4); c.lineTo(-30, 1); c.lineTo(-10, 5); c.bezierCurveTo(4, 9, 16, 8, 22, 1); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = c2; c.beginPath(); c.moveTo(-10, 5); c.bezierCurveTo(4, 9, 16, 8, 22, 1); c.bezierCurveTo(12, 5, 0, 5, -10, 2.6); c.fill();
      for (let k = 0; k < 5; k++) poly(c, [-26 + k * 6, -5.5 - k * 0.7, -23 + k * 6, -11 - k * 0.8, -20 + k * 6, -6.5 - k * 0.7], c2);
      poly(c, [12, -8, 9, -15, 15, -9], c2); poly(c, [17, -6, 16, -12, 20, -5], c2);
      c.fillStyle = glass; c.beginPath(); c.ellipse(14, -3, 3.4, 2.2, -0.3, 0, 7); c.fill();
      c.fillStyle = '#1b1b26'; c.beginPath(); c.arc(14.6, -3, 1.1, 0, 7); c.fill();
      c.strokeStyle = '#2a2a36'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, 7.500); c.lineTo(-5, 11.4); c.lineTo(11, 11.4); c.lineTo(9, 7.800); c.stroke();
      rotor(c, 0, -16, 33, t, power, '#22332a');
      break;
    case 'ufo': { // soucoupe volante : pas de rotor, un anneau de lumières et un faisceau
      c.shadowBlur = 0;
      const beam = c.createLinearGradient(0, 6, 0, 30);
      beam.addColorStop(0, rgba(c2, 0.35 * power + 0.1)); beam.addColorStop(1, rgba(c2, 0));
      c.fillStyle = beam; c.beginPath(); c.moveTo(-8, 6); c.lineTo(8, 6); c.lineTo(20, 30); c.lineTo(-20, 30); c.fill();
      c.fillStyle = glass; c.beginPath(); c.arc(0, -4, 12, Math.PI, 0); c.fill();
      c.fillStyle = rgba('#ffffff', 0.55); c.beginPath(); c.arc(-4, -9, 3, 0, 7); c.fill();
      c.fillStyle = '#3d7a52'; c.beginPath(); c.ellipse(1, -6, 3.2, 4, 0, 0, 7); c.fill();
      c.fillStyle = '#10131a'; c.beginPath(); c.ellipse(-0.2, -6.800, 1, 1.5, 0.3, 0, 7); c.ellipse(2.4, -6.800, 1, 1.5, -0.3, 0, 7); c.fill();
      if (look.glow) { c.shadowColor = look.glow; c.shadowBlur = 12; }
      c.fillStyle = c1; c.beginPath(); c.ellipse(0, 0, 31, 7.5, 0, 0, 7); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = look.c3 || '#8d97a8'; c.beginPath(); c.ellipse(0, 3, 20, 5, 0, 0, Math.PI); c.fill();
      for (let k = 0; k < 7; k++) {
        const lx = -24 + k * 8, on = ((k + Math.floor(t * (4 + 10 * power))) % 3) === 0;
        c.fillStyle = on ? '#ffffff' : c2; c.beginPath(); c.arc(lx, 0.5 + Math.abs(k - 3) * -0.35 + 1, 1.7, 0, 7); c.fill();
      }
      c.strokeStyle = '#6b7484'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-12, 6); c.lineTo(-16, 11.4); c.moveTo(12, 6); c.lineTo(16, 11.4); c.moveTo(-19, 11.4); c.lineTo(-13, 11.4); c.moveTo(13, 11.4); c.lineTo(19, 11.4); c.stroke();
      break;
    }
    // --- Appareils de secours (monde Heli Rescue) : hublots latéraux, croix, gyrophare, treuil replié.
    case 'r_light': { // monorotor léger
      const { F, S } = kit(c);
      skids(c, dark);
      F('M19,1 Q15,-8 5,-9 L-6,-9 Q-10,-8 -11,-3 L-33,-5.5 L-33,-3.500 L-11,3 Q0,7 12,6 Q18,5 19,1Z', c1);
      F('M-29,-5.5 L-36,-16 L-33,-16 L-27,-5.500Z', c1); F('M-25,-5 L-19,-4.500 L-19,-3.300 L-25,-3.800Z', c2);
      F('M18,0.5 Q14.500,-7 6.500,-8 L6,-0.500Z', glass); F('M-11,-0.5 L18.500,1.500 L17.500,3 L-11.500,1Z', c2);
      rescueFit(c, look, t, [-8.2, 0.6, 2.1], [3, -11], [-7, -9.5]);
      tailRotor(c, -33, -5, t, power, dark);
      rotor(c, 0, -15, 31, t, power, dark);
      break;
    }
    case 'r_mountain': { // monorotor de montagne à fenestron
      const { F, S, E } = kit(c);
      skids(c, dark);
      F('M-10,-10 L-31,-9 L-31,-5.5 L-12,-4Z', c1); F('M-28,-9 L-35,-19 L-31,-19 L-25,-9Z', look.c2);
      E(-31, -6, 6, 6, c1); E(-31, -6, 4.2, 4.2, dark); S('M-34.5,-6 L-27.500,-6', '#8a8f9c', 1);
      F('M19,2 Q19,-8 9,-10 L-7,-10 Q-12,-10 -13,-4 L-13,4 Q0,8 12,7 Q18,6 19,2Z', c1);
      F('M-13,1 L19,2.6 Q18,6 12,7 Q0,8 -13,4Z', look.c2);
      F('M-9,-10 L-8,-14 L5,-14 L7,-10Z', '#3a3f4a');
      F('M18.5,1 Q18.500,-7 9.500,-9 L8,0Z', glass);
      rescueFit(c, look, t, [-1.7, 3.7, 2.2], [-2, -16], [-11.5, -11]);
      rotor(c, 0, -18, 32, t, power, dark);
      break;
    }
    case 'r_float': { // amphibie à flotteurs
      const { F, S } = kit(c);
      F('M20,1 Q16,-8 6,-10 L-6,-10 Q-11,-9 -12,-3 L-33,-6 L-33,-4 L-12,3 Q0,7 12,6 Q19,5 20,1Z', c1);
      F('M-29,-6 L-36,-17 L-33,-17 L-27,-6Z', c1); F('M-25,-5.6 L-19,-5 L-19,-3.800 L-25,-4.400Z', look.c2);
      F('M19,0.5 Q15.500,-7.500 7,-9 L6.500,-1Z', glass); F('M-12,0 L19.500,1.600 L18.500,3.200 L-12,1.600Z', look.c2);
      S('M-5,5 L-7,9 M9,5.5 L11,9 M-5,5 L11,9', dark, 1.3);
      F('M-15,8.5 L20,8.500 Q23,8.500 22,10.500 Q20,13.500 14,13.500 L-9,13.500 Q-15,13.500 -15,8.500Z', '#f8f9fa'); F('M-14,11.4 L21.500,11.400 Q20,13.500 14,13.500 L-9,13.500 Q-13.500,13.500 -14,11.400Z', '#d62828');
      rescueFit(c, look, t, [-1.8, 3.5, 1.9], [2, -12], [-10, -10.5]);
      tailRotor(c, -33, -6, t, power, dark);
      rotor(c, 0, -16, 32, t, power, dark);
      break;
    }
    case 'r_coax': { // birotor coaxial, sans rotor de queue, projecteur sous le nez
      const { F, S, E } = kit(c);
      skids(c, dark);
      F('M-10,-7 L-27,-5 L-27,-1 L-12,3Z', c1); F('M-24,-12 L-30,-13 L-30,5 L-24,3Z', c1); F('M-32,-5 L-22,-4.5 L-22,-2.500 L-32,-3Z', look.c2);
      F('M20,2 Q19,-7 10,-9 L-6,-9 Q-12,-8 -13,-3 L-13,4 Q0,8 12,7 Q18,6 20,2Z', c1);
      F('M19.5,1 Q18.500,-6 10.500,-8 L9,0Z', glass); F('M-13,1.2 L20,2.800 L19,4.400 L-13,2.800Z', look.c2);
      E(14, 7.5, 2.4, 1.8, '#3a3f4a'); E(15, 7.8, 1.3, 1.1, '#fff3b0');
      rescueFit(c, look, t, [-1.2, 4.2, 2.1], [-6, -11], [8, -10]);
      F('M0,-9 L1.2,-23 L3.800,-23 L5,-9Z', c1);
      rotor(c, 2.5, -17.5, 29, t, power, dark);
      rotor(c, 2.5, -24.5, 29, -t * 1.07 + 0.8, power, dark);
      break;
    }
    case 'r_tandem': { // birotor en tandem, gros porteur avec porte cargo arrière
      const { F, S, E, wheel } = kit(c);
      rrect(c, -31, -7, 52, 15, 7, c1);
      F('M-31,-4 L-27,-18 L-17,-18 L-15,-7Z', c1); F('M9,-7 L11,-13 L18,-13 L20,-5Z', c1);
      F('M-31,2.5 L21,2.500 L21,4.500 L-31,4.500Z', look.c2);
      F('M21,0 Q20,-6 14,-6.2 L14,0Z', glass);
      if (look.cargo) { const [gx, gy, gr] = look.cargo; rrect(c, gx - gr - 1.5, gy - gr - 1, gr * 2 + 3, gr * 2 + 2, 2.5, '#5f1212'); }
      rescueFit(c, look, t, [17, 4.9, 2.1], [2, -9], [15, -8]);
      wheel(-20, 9.5, 2.6, -20, 6); wheel(10, 9.5, 2.600, 10, 6);
      rotor(c, -22, -23, 23, t, power, dark);
      rotor(c, 14, -18, 23, -t + 0.4, power, dark);
      break;
    }
    case 'floats': { // hydravion : cabine classique posée sur deux grands flotteurs
      const { F, S } = kit(c);
      F('M21,1 Q15,-3 9,-9 Q4,-11 -4,-11 L-10,-9 L-12,-3 L-34,-6 L-34,-4 L-12,3 Q0,7 12,6 Q19,5 21,1Z', c1);
      F('M-29,-6 L-36,-17 L-33,-17 L-27,-6Z', c2); F('M-25,-5.6 L-19,-5 L-19,-3.800 L-25,-4.400Z', c2);
      F('M20,0.5 Q15,-3 9.5,-8.500 L4,-9 L4,-1Z', glass); F('M2,-9 L-4,-9 L-4,-2 L2,-1.500Z', glass); F('M-11,-0.5 L20,1.600 L19,3.200 L-11.500,1Z', c2);
      S('M-5,5 L-7,9 M9,5.5 L11,9 M-5,5 L11,9', dark, 1.3);
      F('M-15,8.5 L20,8.500 Q23,8.500 22,10.500 Q20,13.500 14,13.500 L-9,13.500 Q-15,13.500 -15,8.500Z', '#f8f9fa'); F('M-14,11.3 L21.500,11.300 Q20,13.500 14,13.500 L-9,13.500 Q-13.500,13.500 -14,11.300Z', c2);
      tailRotor(c, -34, -6.5, t, power, dark);
      rotor(c, 0, -16, 32, t, power, dark);
      break;
    }
    case 'amphib': { // amphibie : coque de bateau, ballonnets sous des moignons d'aile, queue en T
      const { F, S, E, wheel } = kit(c);
      F('M23,-1 Q20,-8 10,-9 L-8,-9 L-13,-5 L-30,-7 L-30,-4 L-14,1 L-13,5 Q2,11 16,7 Q22,4 23,-1Z', c1);
      F('M-13,5 Q2,11 16,7 Q21,4.5 23,-0.500 Q10,4 -14,2Z', c2);
      F('M-26,-7 L-34,-19 L-30,-19 L-22,-7Z', c2); S('M-39,-19 L-27,-19', c2, 2.2);
      F('M-8,-9 L-7,-13 L4,-13 L6,-9Z', c2);
      F('M22,-1.5 Q19.500,-7 11,-8 L8,-1.500Z', glass); for (const x of [-8, -2, 4]) E(x, -4, 1.9, 1.9, glass);
      F('M-7,-1 L8,-1 L8,1.200 L-7,1.200Z', c2); S('M0.5,1.2 L0.500,6', dark, 1.3); E(0.5, 7.5, 6.5, 2.3, look.c3 || c2);
      wheel(-9, 10.5, 1.7, -9, 7); wheel(12, 10.5, 1.7, 12, 7);
      tailRotor(c, -33, -12, t, power, dark);
      rotor(c, -1, -17, 34, t, power, dark);
      break;
    }
    case 'seaking': { // sauvetage en mer : coque, flotteur latéral, radôme
      const { F, S, E } = kit(c);
      F('M22,0 Q20,-7 10,-8 L-10,-8 L-14,-5 L-33,-7 L-37,-17 L-33,-17 L-30,-4 L-14,2 L-12,6 Q4,11 18,6 Q22,4 22,0Z', c1);
      F('M-12,6 Q4,11 18,6 Q21,4.5 22,1 Q10,5 -13,3Z', c2); E(-5, -9.5, 5, 3, c2); F('M-8,-8 L-7,-12 L4,-12 L6,-8Z', '#c9c5b0');
      F('M21,-0.5 Q19.500,-6 11,-7 L8,-1Z', glass); for (const x of [-9, -3, 3]) E(x, -3, 1.8, 1.8, glass);
      S('M-6,4 L-6,8', dark, 1.4); F('M-12,7.5 Q-12,10.500 -8,10.500 L2,10.500 Q5,10.500 5,7.500Z', c2);
      S('M-10,11.4 L6,11.400', dark, 1.4);
      tailRotor(c, -35, -15, t, power, dark);
      rotor(c, -1, -16, 35, t, power, dark);
      break;
    }
    case 'mi8': { // gros porteur : nez vitré, hublots, roues
      const { F, S, E, wheel } = kit(c);
      F('M22,1 Q22,-8 12,-9 L-12,-9 L-16,-5 L-34,-7 L-34,-4.5 L-16,4 L-10,7 L12,7 Q21,6 22,1Z', c1);
      F('M-29,-7 L-37,-18 L-33,-18 L-26,-7Z', c2); F('M-10,-9 Q-9,-14 -2,-14 L6,-14 L9,-9Z', c2);
      F('M21.5,0.5 Q21.500,-7.500 12,-8.200 L10,1Z', glass); S('M16,-7.5 L15,0.500 M11,-3.500 L21.500,-3', c1, 1);
      for (const x of [-10, -4.5, 1, 6]) E(x, -3.5, 1.9, 1.9, glass);
      F('M-16,1.5 L21.500,2.500 L20,4.500 L-15.500,3.500Z', c2);
      wheel(14, 10, 2.2, 14, 7); wheel(-6, 10.5, 2.6, -6, 7);
      tailRotor(c, -34, -6, t, power, dark);
      rotor(c, -1, -18, 35, t, power, dark);
      break;
    }
    case 'shark': { // requin : aileron, queue en croissant, ventre blanc, dents
      skids(c, dark);
      c.fillStyle = c1; c.beginPath(); c.moveTo(23, 0); c.bezierCurveTo(16, -9, 0, -10, -12, -7); c.lineTo(-27, -4); c.lineTo(-38, -15); c.lineTo(-33, -2.5); c.lineTo(-37, 6); c.lineTo(-27, 0.5); c.lineTo(-10, 5); c.bezierCurveTo(4, 9, 16, 7, 23, 0); c.fill();
      poly(c, [-5, -8.5, -11, -19, -15, -7.5], c1); // aileron dorsal
      c.fillStyle = c2; c.beginPath(); c.moveTo(23, 0); c.bezierCurveTo(16, 7, 4, 9, -10, 5); c.lineTo(-24, 1.2); c.bezierCurveTo(-8, 2.5, 8, 3.5, 23, 0); c.fill();
      poly(c, [3, 3.5, -5, 12, -3, 3.5], c1); // nageoire pectorale
      c.fillStyle = '#7a1420'; c.beginPath(); c.moveTo(21, 1.2); c.lineTo(9, 2.6); c.lineTo(11, 5.6); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(19.5 - k * 2.2, 1.5 + k * 0.25); c.lineTo(18.4 - k * 2.2, 3.6 + k * 0.2); c.lineTo(17.3 - k * 2.2, 1.7 + k * 0.25); c.fill(); }
      c.strokeStyle = rgba('#0f172a', 0.5); c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(3 - k * 3, -4); c.lineTo(2 - k * 3, 1); } c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(13.5, -3, 2.2, 0, 7); c.fill();
      c.fillStyle = glass; c.beginPath(); c.arc(14, -3, 1.2, 0, 7); c.fill();
      tailRotor(c, -30, -3, t, power, dark);
      rotor(c, 1, -16, 33, t, power, dark);
      break;
    }
    case 'racer': { // appareil de course : fuselage effilé, haute dérive, bande et numéro (look.v : variante de 0 à 4)
      const { F, S, E } = kit(c), v = look.v || 0, long = v >= 2;
      skids(c, dark);
      F('M-8,-6 L-33,-4.5 L-33,-2 L-10,4Z', c1);
      F(v % 2 ? 'M-27,-4.5 L-38,-18 L-31,-18 L-22,-4.5Z' : 'M-28,-4.5 L-35,-15 L-30,-15 L-24,-4.5Z', c2);
      if (long) F('M-30,-2.6 L-38,2 L-32,2.4 L-25,-1.6Z', c2);
      F(long ? 'M25,1.5 Q15,-9.5 2,-9 L-9,-7.5 Q-13,-2 -11,3.5 Q4,9 16,6.2 Q23,5 25,1.5Z' : 'M20,1 Q14,-9.5 3,-9 L-8,-8 Q-12,-3 -10,4 Q4,9 14,6.5 Q19,5 20,1Z', c1);
      F(long ? 'M22.5,0.6 Q15,-8 6.5,-8 L8.5,-0.4Z' : 'M18.5,0 Q13.5,-8 6.5,-8 L8,-0.5Z', glass);
      F(long ? 'M-11,1.2 L23,2 L20,4.2 L-11,3.4Z' : 'M-10,1.2 L19,1.8 L17,3.8 L-10.4,3.4Z', c2);
      if (v >= 1) S('M-31,-3.2 L-11,-0.4', c2, 1.3);
      if (v >= 3) F('M-5,5.4 L-15,10 L-2,7.6Z', c2);
      if (v === 4) { E(-12.5, 0.6, 2.2, 3.2, dark); E(-12.5, 0.6, 1.2, 2, '#ffb703'); }
      E(-1.5, -3.4, 4.7, 4.7, '#ffffff'); c.fillStyle = dark; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(look.num ?? ''), -1.5, -3.1); c.textBaseline = 'alphabetic';
      tailRotor(c, -33, -3.5, t, power, dark);
      rotor(c, 1, -15, long ? 33 : 31, t, power, dark);
      break;
    }
    default: // future
      c.fillStyle = c1; c.beginPath(); c.moveTo(22, 0); c.bezierCurveTo(16, -12, -6, -12, -14, -6); c.lineTo(-30, -5); c.lineTo(-30, -1.5); c.lineTo(-12, 5); c.bezierCurveTo(0, 10, 16, 8, 22, 0); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = c2; c.beginPath(); c.moveTo(-12, 5); c.bezierCurveTo(0, 10, 16, 8, 22, 0); c.bezierCurveTo(12, 5, 0, 5.5, -12, 2.6); c.fill();
      poly(c, [-26, -5, -35, -15, -29, -15, -21, -5], c2);
      c.fillStyle = glass; c.beginPath(); c.moveTo(19, -1.5); c.bezierCurveTo(14, -9, 4, -9.5, 0, -7.5); c.lineTo(5, -1); c.closePath(); c.fill();
      c.strokeStyle = c2; c.lineWidth = 2; c.beginPath(); c.arc(-31, -3.2, 5, 0, 7); c.stroke();
      c.strokeStyle = rgba(c2, 0.8); c.lineWidth = 1.2; const a = t * 30; c.beginPath(); c.moveTo(-31 - Math.cos(a) * 4, -3.2 - Math.sin(a) * 4); c.lineTo(-31 + Math.cos(a) * 4, -3.2 + Math.sin(a) * 4); c.stroke();
      c.strokeStyle = '#2a2a36'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, 7.5); c.lineTo(-5, 11.4); c.lineTo(11, 11.4); c.lineTo(9, 7.8); c.stroke();
      rotor(c, 1, -16, 33, t, power, '#2a2a36');
  }
  c.restore();
}
