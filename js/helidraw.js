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

export function drawHeli(c, look, t = 0, power = 0.6) {
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
