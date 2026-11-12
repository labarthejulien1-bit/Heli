// Point d'entrée : écrans, commandes, boucle de jeu.
import { HELIS, LEVELS, RANKS, TOTAL_MEDALS, LANGS } from './data.js';
import { generateLevel } from './levelgen.js';
import { Game, autopilot, DT, BASE_TILT, MIN_TILT, MAX_TILT } from './game.js';
import { Renderer } from './render.js';
import { drawHeli } from './helidraw.js';
import { Sound } from './audio.js';
import { t, setLang, getLang, detectLang } from './i18n.js';
import { load, store, defaults, importSave, medalCount, starCount, rescueStars, starWallet, levelStars, levelUnlocked, canBuy, buy } from './save.js';
import { clamp, fmtTime } from './util.js';
import { RESCUE_HELIS, rescueHeli, rescueUnlocked } from './rescue.js';

const VERSION = '2.1.0';
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app'), cv = $('#cv'), ui = $('#ui'), hud = $('#hud');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let save = load();
setLang(save.lang || detectLang());
const R = new Renderer(cv), snd = new Sound();
const cache = new Map();
const getLevel = (id) => { if (!cache.has(id)) cache.set(id, generateLevel(LEVELS[id - 1])); return cache.get(id); };
const heliOf = (id) => HELIS.find((h) => h.id === id) || HELIS[0];
const S = { mode: 'demo', game: null, level: null, levelId: 1, screen: 'home', touch: null, pid: null, anchor: 0, keys: {}, ended: false };
let installEvt = null, wake = null, time = 0;

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5z"/></svg>',
  levels: '<svg viewBox="0 0 24 24"><path d="m2 20 6.5-11 4 6.5 2.5-4L22 20z"/><circle cx="17" cy="6" r="2.5"/></svg>',
  hangar: '<svg viewBox="0 0 24 24"><path d="M3 5h18v1.6H13V8c3.5.3 6 2.4 6 5.2 0 1.6-1.3 2.8-3 2.8H9.5C7 16 5 14.3 4.6 12L2 11.5V10l5-.5C8 8.6 9.4 8.1 11 8V6.6H3zM8 18h10v1.6H8z"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.6-4.4 4.1-7 8.5-7s7.9 2.6 8.5 7z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.400 7.400 0 0 0 1.7 1l.3 2.5h4l.3-2.500a7.400 7.400 0 0 0 1.700-1l2.400 1 2-3.400zM13 15.200a3.200 3.200 0 1 1 0-6.400 3.200 3.200 0 0 1 0 6.400z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.500v11h-13V10zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>',
};

// ---------- Aides
const persist = () => store(save);
const rankIdx = (n) => { let r = 0; RANKS.forEach((m, i) => { if (n >= m) r = i; }); return r; };
const objLabel = (o) => t('o_' + o.t, o.t === 'time' ? fmtTime(o.v) : o.v);
const priceLabel = (p) => (p.stars ? `★ ${p.stars}` : `<i class="coin"></i>${p.coins}`);
const wallet = () => `<span class="wallet"><span><i class="coin"></i>${save.coins}</span><b>★ ${starWallet(save)}</b></span>`;
const nextLevelId = () => { for (const l of LEVELS) if (levelUnlocked(save, l.id) && !save.levels[l.id]?.done) return l.id; return save.lastLevel; };
function vibe(p) { if (save.settings.vibe && navigator.vibrate) try { navigator.vibrate(p); } catch { /* non pris en charge */ } }
let toastT = 0;
function toast(msg) { const e = $('#toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1600); }
function theme(def) {
  app.style.setProperty('--accent', def.accent === '#22e6ff' ? '#5ef0ff' : def.accent);
  app.style.setProperty('--c1', def.sky[0][0]); app.style.setProperty('--c2', def.sky[0][1]);
  $('meta[name=theme-color]').content = def.sky[0][0];
}
function heliCanvas(cvs, look, scale = 1) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cvs.clientWidth || 84, h = cvs.clientHeight || 50;
  cvs.width = w * dpr; cvs.height = h * dpr;
  const c = cvs.getContext('2d'), k = (w / 80) * scale * dpr;
  c.setTransform(k, 0, 0, k, (w * dpr) / 2 + 6 * k, (h * dpr) / 2 + 3 * k);
  drawHeli(c, look, 0.31, 0.9);
}

// ---------- Démo de fond et lancement des niveaux
// Décor de fond des menus : il suit le monde affiché (Aventure : prochain niveau et appareil choisi ;
// Heli Rescue : un décor côtier et un appareil de secours, en attendant les niveaux du monde).
const RESCUE_DEMO = { level: 4 };
const myRescueHeli = () => { const h = rescueHeli(save.heliRescue.heli); return rescueUnlocked(save, h) ? h : RESCUE_HELIS[0]; };
const inRescue = () => ['rmap', 'rhangar'].includes(S.screen) || (S.screen === 'home' && save.world === 'rescue');
function setDemo(id) {
  const rescue = id == null && inRescue();
  id = id ?? (rescue ? RESCUE_DEMO.level : nextLevelId());
  S.mode = 'demo'; S.levelId = id; S.level = getLevel(id); S.demoRescue = rescue;
  S.game = new Game(S.level, rescue ? myRescueHeli() : heliOf(save.heli));
  R.setLevel(S.level); theme(S.level.def);
  hud.hidden = true; S.touch = null;
  snd.rotorStop(); snd.playMusic(S.level.def.music);
  releaseWake();
}
function startLevel(id) {
  S.mode = 'play'; S.levelId = id; S.level = getLevel(id); S.ended = false;
  S.game = new Game(S.level, heliOf(save.heli), save.levels[id]?.sm || 0, save.settings.diff);
  R.setLevel(S.level); theme(S.level.def);
  ui.innerHTML = ''; S.screen = 'game'; hud.hidden = false; S.touch = null; S.pid = null;
  lowBeep = 0; timeShown = -1;
  $('#cpMarks').innerHTML = S.level.pads.filter((p) => p.kind === 'fuel').map((p) => `<b class="${p.main ? '' : 'bonus'}" style="left:${(p.x / S.level.pad.x) * 100}%"></b>`).join('');
  S.tut = null;
  $('#fps').hidden = !save.settings.fps;
  snd.unlock(); snd.playMusic(S.level.def.music); snd.rotorStart(S.game.H);
  save.lastLevel = id; save.stats.flights++; persist();
  requestWake(); guardBack();
  if (id === 1 && !save.tut) tutorialCard();
}
// Tutoriel du premier vol : une carte sur l'état de l'appareil, puis quatre gestes à réussir.
// Vignettes des fenêtres d'aide : l'appareil de départ, annoté (fumée, flèches, héliport).
function tutIcon(cv2, kind) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), c = cv2.getContext('2d');
  cv2.width = 92 * dpr; cv2.height = 58 * dpr;
  const px = () => c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const arrow = (x1, y1, x2, y2, col) => {
    px(); const a = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.beginPath(); c.moveTo(x2 + Math.cos(a) * 4, y2 + Math.sin(a) * 4); c.lineTo(x2 + Math.cos(a + 2.4) * 7, y2 + Math.sin(a + 2.4) * 7); c.lineTo(x2 + Math.cos(a - 2.4) * 7, y2 + Math.sin(a - 2.4) * 7); c.fill();
  };
  const heli = (x, y, rot = 0, power = 0.9) => { c.setTransform(dpr * 0.95, 0, 0, dpr * 0.95, x * dpr, y * dpr); c.rotate(rot); drawHeli(c, HELIS[0].look, 0.31, power); };
  const dots = (list) => { for (const [x, y, r, col] of list) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } };
  const pad = () => { px(); c.fillStyle = '#e8f1f0'; c.fillRect(8, 50, 52, 4); c.fillStyle = '#6ee7a0'; c.fillRect(8, 50, 52, 1.6); };
  const mark = (ok) => { px(); c.strokeStyle = ok ? '#6ee7a0' : '#ff6b6b'; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); if (ok) { c.moveTo(70, 30); c.lineTo(75, 36); c.lineTo(85, 22); } else { c.moveTo(70, 22); c.lineTo(84, 36); c.moveTo(84, 22); c.lineTo(70, 36); } c.stroke(); };
  if (kind.startsWith('dmg')) {
    const k = +kind[3]; heli(46, 38);
    dots(k === 1 ? [[-8, -16, 4, 'rgba(210,210,220,.6)'], [-13, -23, 5.5, 'rgba(210,210,220,.4)']] : [[-8, -16, 5, 'rgba(25,25,32,.85)'], [-14, -23, 7, 'rgba(25,25,32,.7)'], [-22, -28, 9, 'rgba(25,25,32,.5)']]);
    drawHeli(c, HELIS[0].look, 0.31, 0.9);
    if (k === 3) dots([[-10, -9, 6, '#ff5a1f'], [-7, -12, 4, '#ffb703'], [-13, -5, 3.5, '#ffb703']]);
  } else if (kind === 'ctl1') { heli(36, 36); arrow(76, 44, 76, 16, '#6ee7a0'); }
  else if (kind === 'ctl2') { heli(36, 26, 0, 0.1); arrow(76, 14, 76, 42, '#ffd34d'); }
  else if (kind === 'ctl3') { heli(46, 32, 0.32); arrow(40, 52, 14, 52, '#ffffff'); arrow(52, 52, 78, 52, '#ffffff'); }
  else if (kind === 'land1') { pad(); heli(34, 37, 0, 0.5); mark(true); }
  else if (kind === 'land2') { pad(); heli(34, 38, 0.2, 0.1); dots([[14, 12, 3, '#ffd34d'], [-18, 13, 2.5, '#ffd34d'], [20, 9, 2, '#ff8a3a']]); mark(false); }
}
// Fenêtres d'aide du premier vol : état de l'appareil, commandes, atterrissage ; puis quatre gestes à réussir.
const TUT_PAGES = [
  { title: 'dmgTitle', rows: ['dmg1', 'dmg2', 'dmg3'], note: 'dmg4' },
  { title: 'ctlTitle', rows: ['ctl1', 'ctl2', 'ctl3'] },
  { title: 'landTitle', rows: ['land1', 'land2'], note: 'land3' },
];
function tutorialCard(page = 0) {
  if (!S.tut) { S.tut = { step: 0, hold: 0 }; S.game.freeFuel = true; S.mode = 'pause'; snd.rotorStop(); }
  S.tut.page = page;
  const pg = TUT_PAGES[page], last = page === TUT_PAGES.length - 1;
  ui.innerHTML = `<div class="overlay center"><div class="sheet">
    <p class="sub" style="margin:0 0 4px">${page + 1}/${TUT_PAGES.length}</p><h2 style="margin-bottom:10px">${t(pg.title)}</h2>
    ${pg.rows.map((k) => `<div class="tutrow"><canvas data-tut="${k}"></canvas><span>${t(k)}</span></div>`).join('')}
    ${pg.note ? `<p class="sub" style="margin:10px 0 0">${t(pg.note)}</p>` : ''}
    <button class="btn primary" style="width:100%;margin-top:14px" data-act="${last ? 'resume' : 'tutNext'}">${last ? ICON.play + t('go') : t('next')}</button>
  </div></div>`;
  ui.querySelectorAll('canvas[data-tut]').forEach((cv2) => tutIcon(cv2, cv2.dataset.tut));
}
function tutorialStep(g, dt) {
  const T = S.tut, h = g.heli, inp = g.input, air = S.level.groundAt(h.x) - h.y > 60;
  let done = false;
  if (T.step === 0) done = S.level.groundAt(h.x) - h.y > 110;
  else if (T.step === 1) { if (!inp.thrust && air) T.hold += dt; done = T.hold > 0.45; }
  else if (T.step === 2) done = inp.thrust && inp.tilt > 25;
  else if (T.step === 3) done = inp.thrust && inp.tilt < 3;
  if (done) { T.step++; T.hold = 0; snd.sfx('cp'); vibe(20); }
  if (T.step > 3) { S.tut = null; g.freeFuel = false; save.tut = true; persist(); toast('✔ ' + t('tutOk')); }
}
function commitRun() {
  const g = S.game;
  if (!g || g.committed) return;
  g.committed = true;
  save.stats.dist += g.stats.dist; save.stats.orbs += g.stats.orbs; save.stats.time += g.t; save.stats.refuels += g.stats.lands;
  persist();
}
async function requestWake() { try { wake = await navigator.wakeLock?.request('screen'); } catch { /* refusé */ } }
function releaseWake() { try { wake?.release(); } catch { /* déjà libéré */ } wake = null; }

// ---------- Écrans
// Barre du bas, à l'intérieur d'un monde : accueil, écrans du monde, profil, réglages.
function nav(cur) {
  const world = ['rmap', 'rhangar'].includes(cur) || (S.navWorld === 'rescue' && !['levels', 'hangar'].includes(cur)) ? 'rescue' : 'adv';
  S.navWorld = world;
  const items = world === 'rescue' ? [['home', 'home', 'home'], ['rmap', 'levels', 'map'], ['rhangar', 'hangar', 'hangar']] : [['home', 'home', 'home'], ['levels', 'levels', 'levels'], ['hangar', 'hangar', 'hangar']];
  items.push(['profile', 'profile', 'profile'], ['settings', 'settings', 'settings']);
  return `<nav class="nav">${items.map(([k, ic, lb]) => `<button data-go="${k}" class="${k === cur ? 'on' : ''}">${ICON[ic]}<span>${t(lb)}</span></button>`).join('')}</nav>`;
}
function go(screen) {
  S.screen = screen;
  if (S.mode !== 'demo' || S.demoRescue !== inRescue()) setDemo();
  ({ home, levels, hangar, profile, settings, rmap, rhangar })[screen]();
  if (screen !== 'home') guardBack();
}
// Accueil : le décor animé en fond, et en bas les deux mondes côte à côte. Toucher une bulle choisit le monde
// (le décor s'adapte) ; « Entrer » ouvre le monde choisi.
function home() {
  if (!save.pilot) return welcome();
  S.screen = 'home';
  const m = medalCount(save), w = save.world, id = nextLevelId();
  if (S.mode !== 'demo' || S.demoRescue !== (w === 'rescue') || (w === 'adv' && S.levelId !== id)) setDemo();
  const bubble = (k, title, prog, sky) => `<button class="world ${w === k ? 'sel' : ''}" data-world="${k}">
      <span class="bubble" style="background:linear-gradient(${sky[0]},${sky[1]})"><canvas data-bubble="${k}"></canvas></span>
      <b>${title}</b><small>${prog}</small></button>`;
  ui.innerHTML = `<section class="screen home">
    <div class="top"><button class="chip" data-go="profile"><span class="avatar">${esc(save.pilot[0].toUpperCase())}</span><span><b>${esc(save.pilot)}</b><small>${t('rank' + rankIdx(m))} · ${m}/${TOTAL_MEDALS}</small></span></button>
      <button class="round" data-go="settings" aria-label="${t('settings')}">${ICON.settings}</button></div>
    <div class="title"><h1>HELI<span>${w === 'rescue' ? 'RESCUE' : 'ADVENTURE'}</span></h1><p>${t('tagline')}</p></div>
    <div class="homebot">
      <div class="worlds">${bubble('adv', t('adventure'), `★ ${starCount(save)}/${LEVELS.length * 3}`, LEVELS[id - 1].sky[0])}${bubble('rescue', 'Heli Rescue', `★ ${rescueStars(save)}/60`, LEVELS[RESCUE_DEMO.level - 1].sky[0])}</div>
      <button class="btn primary" data-go="${w === 'rescue' ? 'rmap' : 'levels'}">${ICON.play}${t('enter')} · ${w === 'rescue' ? 'Heli Rescue' : t('adventure')}</button>
    </div>
  </section>`;
  ui.querySelectorAll('canvas[data-bubble]').forEach((c) => heliCanvas(c, (c.dataset.bubble === 'rescue' ? myRescueHeli() : heliOf(save.heli)).look, 1.05));
}
// Carte du monde Heli Rescue : un chemin sinueux de 20 pastilles (les niveaux arrivent avec les phases suivantes).
function rmap() {
  const N = 20, pos = (i) => [50 + 30 * Math.sin(i * 1.15), 96 - i * 4.75];
  const pts = Array.from({ length: N }, (_, i) => pos(i));
  const path = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y * 3).toFixed(1)).join(' ');
  ui.innerHTML = `<section class="screen scrim"><h2 class="top">Heli Rescue<span class="wallet"><b>★ ${rescueStars(save)}/60</b></span></h2><div class="scroll" id="rmapScroll">
    <div class="rmap"><svg viewBox="0 0 100 300" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-dasharray="1 3.2" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-width:5px"/></svg>
    ${pts.map(([x, y], i) => `<button class="node ${i ? 'locked' : ''}" data-act="soon" style="left:${x}%;top:${y}%"><b>${i + 1}</b><small>☆☆☆</small></button>`).join('')}</div>
  </div></section>${nav('rmap')}`;
  const sc = $('#rmapScroll'); sc.scrollTop = sc.scrollHeight;
}
// Hangar Heli Rescue : carrousel des appareils de secours, barres de caractéristiques, déblocage par niveau réussi.
function rhangar() {
  const cur = myRescueHeli().id;
  ui.innerHTML = `<section class="screen scrim"><h2>${t('hangar')} · Heli Rescue</h2><div class="cards">${RESCUE_HELIS.map((h) => {
    const own = rescueUnlocked(save, h), sel = cur === h.id;
    const bar = (lb, v) => `<div class="bar"><span>${t(lb)}</span><i><b style="width:${Math.round(clamp(v, 0.08, 1) * 100)}%"></b></i></div>`;
    return `<div class="hcard panel ${own ? '' : 'locked'}" id="rh-${h.id}">
      <canvas data-rheli="${h.id}"></canvas><h4>${h.name}</h4>
      <p class="perk">${t(h.perk)}</p>
      ${bar('stat_power', h.thrust / 1.5)}${bar('stat_agility', h.handling / 1.3)}${bar('r_fuel', h.fuel / 1.4)}${bar('r_wind', h.wind / 1.5)}
      <div class="bar"><span>${t('places')}</span><em class="seats">${'<u></u>'.repeat(h.places)}${h.heavyLift ? '<u class="big"></u>' : ''}</em></div>
      ${own ? `<button class="btn ${sel ? 'ghost' : 'primary'}" data-rheli-sel="${h.id}" ${sel ? 'disabled' : ''}>${sel ? '✓ ' + t('selected') : t('select')}</button>`
        : `<div class="req"><small>${ICON.lock.replace('<svg', '<svg style="width:12px;height:12px"')} ${t('toUnlock')}</small>${t('r_unlock', h.unlock)}</div>`}
    </div>`;
  }).join('')}</div></section>${nav('rhangar')}`;
  ui.querySelectorAll('canvas[data-rheli]').forEach((c) => heliCanvas(c, rescueHeli(c.dataset.rheli).look, 0.95));
  $('#rh-' + cur)?.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function welcome() {
  ui.innerHTML = `<div class="overlay center"><div class="sheet col">
    <h2>${t('welcome')}</h2><p class="sub">${t('welcomeText')}</p>
    <input class="field" id="pilotName" maxlength="16" placeholder="${t('namePh')}" autocomplete="off" enterkeyhint="done">
    <div class="row"><span>${t('s_lang')}</span>${langSelect()}</div>
    <div><h3 style="margin:4px 2px 8px">${t('s_diff')}</h3>${diffPicker()}</div>
    <button class="btn primary" data-act="welcomeOk">${t('start')}</button>
  </div></div>`;
}
const diffPicker = () => `<div class="seg wide">${['easy', 'normal', 'hard'].map((q) => `<button data-diff="${q}" class="${save.settings.diff === q ? 'on' : ''}">${t('d_' + q)}</button>`).join('')}</div>
      <p class="sub" style="margin:10px 2px 0;font-size:13px">${t('d_' + save.settings.diff + 'Txt')}</p>`;
const langSelect = () => `<select data-set="lang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === getLang() ? 'selected' : ''}>${v}</option>`).join('')}</select>`;

function levels() {
  ui.innerHTML = `<section class="screen scrim"><h2>${t('levels')}</h2><div class="scroll">${LEVELS.map((l) => {
    const open = levelUnlocked(save, l.id), rec = save.levels[l.id];
    return `<button class="lvl ${open ? '' : 'locked'}" data-level="${l.id}" style="--a:${l.sky[0][0]};--b:${l.sky[0][1]};--gr:${l.ground}">
      <span class="n">${l.id}</span>
      <span class="name">${t('lvl' + l.id)}<small>${open ? `★ ${levelStars(save, l.id)}/3 · <i class="coin"></i>${rec?.orbs || 0}/100${rec?.time != null ? ` · ${t('best')} ${fmtTime(rec.time)}` : ''}` : t('lockedLevel', l.id - 1)}</small></span>
      ${open ? `<span class="medals">${[0, 1, 2].map((i) => `<i class="medal ${rec?.obj?.[i] ? 'on' : ''}"></i>`).join('')}</span>` : ICON.lock}
    </button>`;
  }).join('')}</div></section>${nav('levels')}`;
}
function levelSheet(id) {
  const l = LEVELS[id - 1], rec = save.levels[id];
  if (!levelUnlocked(save, id)) return toast(t('lockedLevel', id - 1));
  setDemo(id);
  ui.insertAdjacentHTML('beforeend', `<div class="overlay" data-act="closeSheet"><div class="sheet">
    <h2>${id} · ${t('lvl' + id)}</h2><p class="sub">★ ${levelStars(save, id)}/3 ${t('stars').toLowerCase()} · <i class="coin"></i>${rec?.orbs || 0}/100${rec?.time != null ? ` · ${t('best')} ${fmtTime(rec.time)}` : ''}</p>
    ${l.objectives.map((o, i) => `<div class="obj"><i class="medal ${rec?.obj?.[i] ? 'on' : ''}"></i>${objLabel(o)}</div>`).join('')}
    <button class="btn primary" style="width:100%;margin-top:14px" data-play="${id}">${ICON.play}${t('play')}</button>
  </div></div>`);
}

function hangar() {
  const max = { power: 2.45, agility: 280, armor: 200 };
  ui.innerHTML = `<section class="screen scrim"><h2 class="top">${t('hangar')}${wallet()}</h2><div class="cards">${HELIS.map((h) => {
    const own = save.helis.includes(h.id), sel = save.heli === h.id;
    const bar = (k, v) => `<div class="bar"><span>${t('stat_' + k)}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`;
    return `<div class="hcard panel ${own ? '' : 'locked'}" id="h-${h.id}">
      <canvas data-heli="${h.id}"></canvas><h4>${h.name}</h4>
      ${bar('power', (h.power - 1.6) / (max.power - 1.6))}${bar('agility', h.agility / max.agility)}${bar('armor', h.armor / max.armor)}${bar('speed', (1.25 - h.drag) / 0.5)}
      ${own ? `<button class="btn ${sel ? 'ghost' : 'primary'}" data-heli-sel="${h.id}" ${sel ? 'disabled' : ''}>${sel ? '✓ ' + t('selected') : t('select')}</button>`
        : `<button class="btn primary ${canBuy(save, h) ? '' : 'cant'}" data-buy="${h.id}">${t('buy')} · ${priceLabel(h.price)}</button>`}
    </div>`;
  }).join('')}</div></section>${nav('hangar')}`;
  ui.querySelectorAll('canvas[data-heli]').forEach((c) => heliCanvas(c, heliOf(c.dataset.heli).look, 0.95));
  $('#h-' + save.heli)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (!save.tutHangar) { // première visite : à quoi servent les pièces et les étoiles
    save.tutHangar = true; persist();
    ui.insertAdjacentHTML('beforeend', `<div class="overlay center" data-act="closeSheet"><div class="sheet">
      <h2 style="margin-bottom:10px">${t('shopTitle')}</h2>
      <div class="tutrow"><span class="big"><i class="coin"></i></span><span>${t('shop1')}</span></div>
      <div class="tutrow"><span class="big star">★</span><span>${t('shop2')}</span></div>
      <p class="sub" style="margin:10px 0 0">${t('shop3')}</p>
      <button class="btn primary" style="width:100%;margin-top:14px" data-act="closeTip">${t('ok')}</button>
    </div></div>`);
  }
}

function profile() {
  const m = medalCount(save), r = rankIdx(m), nx = RANKS[r + 1], st = save.stats;
  const cell = (v, k) => `<div><b>${v}</b><small>${t(k)}</small></div>`;
  ui.innerHTML = `<section class="screen scrim"><h2>${t('profile')}</h2><div class="scroll">
    <div class="panel"><div class="rankbox"><span class="avatar">${esc((save.pilot || '?')[0].toUpperCase())}</span><span><b>${t('rank' + r)}</b><small>★ ${m}/${TOTAL_MEDALS} ${t('medals').toLowerCase()} · ${nx ? t('nextRank', nx) : t('maxRank')}</small></span></div>
      <div class="pbar"><i style="width:${nx ? ((m - RANKS[r]) / (nx - RANKS[r])) * 100 : 100}%"></i></div></div>
    <h3>${t('pilot')}</h3><input class="field" data-set="pilot" maxlength="16" value="${esc(save.pilot)}" placeholder="${t('namePh')}" autocomplete="off" enterkeyhint="done">
    <h3>${t('hangar')} · ${save.helis.length}/${HELIS.length}</h3>
    <div class="grid">${cell(st.flights, 'st_flights')}${cell(st.landings, 'st_landings')}${cell((st.dist / 1000).toFixed(1) + ' km', 'st_dist')}${cell(fmtTime(st.time), 'st_time')}${cell(st.refuels, 'st_refuels')}${cell('★ ' + starCount(save), 'stars')}${cell(st.orbs, 'st_orbs')}${cell(st.crashes, 'st_crashes')}</div>
  </div></section>${nav('profile')}`;
}

function settings() {
  const s = save.settings;
  const sw = (k) => `<label class="sw"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
  const rng = (k, min, max, step) => `<input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}">`;
  ui.innerHTML = `<section class="screen scrim"><h2>${t('settings')}</h2><div class="scroll">
    <h3>${t('s_general')}</h3><div class="panel">
      <div class="row"><span>${t('s_lang')}</span>${langSelect()}</div>
      <div class="row"><span>${t('s_vibe')}</span>${sw('vibe')}</div>
      ${installEvt ? `<div class="row"><button class="btn primary" style="flex:1" data-act="install">${t('install')}</button></div>` : ''}
    </div>
    <h3>${t('s_diff')}</h3><div class="panel">
      ${diffPicker()}
    </div>
    <h3>${t('s_audio')}</h3><div class="panel">
      <div class="row"><span>${t('s_music')}</span>${rng('music', 0, 1, 0.05)}</div>
      <div class="row"><span>${t('s_sfx')}</span>${rng('sfx', 0, 1, 0.05)}</div>
    </div>
    <h3>${t('s_controls')}</h3><div class="panel">
      <div class="row"><span>${t('s_sens')}</span>${rng('sens', 0.5, 2, 0.1)}</div>
      <div class="row"><span>${t('s_invert')}</span>${sw('invert')}</div>
    </div>
    <h3>${t('s_display')}</h3><div class="panel">
      <div class="row"><span>${t('s_quality')}</span><div class="seg">${['low', 'med', 'high'].map((q) => `<button data-quality="${q}" class="${s.quality === q ? 'on' : ''}">${t('q_' + q)}</button>`).join('')}</div></div>
      <div class="row"><span>${t('s_shake')}</span>${sw('shake')}</div>
      <div class="row"><span>${t('s_battery')}</span>${sw('battery')}</div>
      <div class="row"><span>${t('s_fps')}</span>${sw('fps')}</div>
    </div>
    <h3>${t('s_data')}</h3><div class="col">
      <button class="btn" data-act="export">${t('export')}</button>
      <button class="btn" data-act="import">${t('import')}</button>
      <button class="btn" data-act="replayTut">${t('replayTut')}</button>
      <button class="btn ghost danger" data-act="reset">${t('reset')}</button>
    </div>
    <p class="about">HELI v${VERSION}<br>${t('s_about')}</p>
  </div></section>${nav('settings')}`;
}

function confirmBox(msg, onYes) {
  ui.insertAdjacentHTML('beforeend', `<div class="overlay center" id="confirm"><div class="sheet col"><p style="margin:0 0 8px;font-weight:600;line-height:1.4">${msg}</p>
    <button class="btn danger ghost" id="cfYes">${t('confirm')}</button><button class="btn" id="cfNo">${t('cancel')}</button></div></div>`);
  $('#cfYes').onclick = () => { $('#confirm').remove(); onYes(); };
  $('#cfNo').onclick = () => $('#confirm').remove();
}

// ---------- Pause, crash, résultat
function pause() {
  if (S.mode !== 'play' || S.ended) return;
  S.mode = 'pause'; S.touch = null; S.pid = null; S.game.input.thrust = false;
  snd.rotorStop();
  const l = S.level.def, g = S.game;
  ui.innerHTML = `<div class="overlay center"><div class="sheet col">
    <h2>${t('pause')}</h2><p class="sub">${l.id} · ${t('lvl' + l.id)}</p>
    <div>${l.objectives.map((o, i) => `<div class="obj"><i class="medal ${save.levels[l.id]?.obj?.[i] ? 'on' : ''}"></i>${objLabel(o)}${o.t === 'orbs' ? `<small>${g.stats.orbs}/${Math.ceil((S.level.orbTotal * o.v) / 100)}</small>` : o.t === 'hits' ? `<small>${g.stats.hits}/${o.v}</small>` : o.t === 'stars' ? `<small>${g.stats.stars}/${S.level.starTotal}</small>` : ''}</div>`).join('')}</div>
    <button class="btn primary" data-act="resume">${ICON.play}${t('resume')}</button>
    <button class="btn" data-act="restart">${t('restart')}</button>
    <button class="btn ghost" data-act="quit">${t('quit')}</button>
  </div></div>`;
}
function resume() { ui.innerHTML = ''; S.mode = 'play'; snd.resume(); snd.rotorStart(S.game.H); guardBack(); }
function showCrash() {
  S.ended = true; save.stats.crashes++; persist();
  const dry = S.game.fuel <= 0, canRe = S.game.D.respawn && S.game.padIdx > 0; // mode facile : reprise au dernier ravitaillement
  ui.innerHTML = `<div class="overlay center"><div class="sheet col"><h2>${dry ? t('noFuel') : t('crashed')}</h2><p class="sub">${S.level.def.id} · ${t('lvl' + S.level.def.id)}</p>
    ${canRe ? `<button class="btn primary" data-act="respawn">${t('fromPad')}</button>` : ''}
    <button class="btn ${canRe ? '' : 'primary'}" data-act="restart">${t('restart')}</button>
    <button class="btn ghost" data-act="quit">${t('quit')}</button></div></div>`;
}
function showResult() {
  S.ended = true;
  const g = S.game, L = S.level, def = L.def, id = def.id;
  const done = def.objectives.map((o) => g.objectiveDone(o));
  const rec = (save.levels[id] ||= { done: false, obj: [false, false, false], time: null, orbs: 0, stars: 0 });
  const newRec = rec.time != null && g.t < rec.time;
  const fresh = done.map((d, i) => d && !rec.obj[i]);
  rec.done = true; rec.obj = rec.obj.map((o, i) => o || done[i]);
  if (rec.time == null || g.t < rec.time) rec.time = g.t;
  rec.orbs = Math.max(rec.orbs, g.stats.orbs);
  // Les pièces du vol s'ajoutent au porte-monnaie ; chaque étoile ne compte qu'une fois.
  save.coins += g.stats.orbs;
  let k = 0; L.items.forEach((it, i) => { if (it.type === 'star') { if (g.taken[i]) rec.sm = (rec.sm || 0) | (1 << k); k++; } });
  save.stats.landings++; save.tut = true;
  commitRun(); persist();
  const hasNext = id < LEVELS.length;
  ui.innerHTML = `<div class="overlay"><div class="sheet">
    <h2>${t('levelDone')}</h2><p class="sub">${id} · ${t('lvl' + id)} ${newRec ? `<span class="rec">· ${t('newRecord')}</span>` : ''}</p>
    ${def.objectives.map((o, i) => `<div class="obj ${fresh[i] ? 'new' : ''}"><i class="medal ${done[i] ? 'on' : ''}"></i>${objLabel(o)}</div>`).join('')}
    <div class="stats3"><div><b>${fmtTime(g.t)}</b><small>${t('time')}</small></div><div><b><i class="coin"></i>+${g.stats.orbs}</b><small>${t('orbs')} · ${save.coins}</small></div><div><b>★ ${g.stats.stars}/3</b><small>${t('stars')}</small></div><div><b>${g.stats.hits}</b><small>${t('hits')}</small></div></div>
    <div class="col">
      ${hasNext ? `<button class="btn primary" data-play="${id + 1}">${ICON.play}${t('next')}</button>` : ''}
      <button class="btn ${hasNext ? '' : 'primary'}" data-act="restart">${t('retry')}</button>
      <button class="btn ghost" data-act="quit">${t('menu')}</button>
    </div></div></div>`;
  ui.querySelectorAll('canvas[data-heli]').forEach((c) => heliCanvas(c, heliOf(c.dataset.heli).look, 1));
  fresh.forEach((f, i) => f && setTimeout(() => { snd.sfx('medal'); vibe(20); }, 300 + i * 250));
}

// ---------- Événements d'interface
ui.addEventListener('click', (e) => {
  const b = e.target.closest('button,[data-act]');
  if (!b) return;
  snd.unlock();
  const d = b.dataset;
  if (d.act === 'closeSheet' && e.target !== b) { if (!e.target.closest('button')) return; }
  if (b.tagName === 'BUTTON') snd.sfx('ui');
  if (d.world) { if (save.world !== d.world) { save.world = d.world; persist(); vibe(15); } return home(); }
  if (d.go) return go(d.go);
  if (d.play) return startLevel(+d.play);
  if (d.level) return levelSheet(+d.level);
  if (d.buy) {
    const h = heliOf(d.buy);
    if (!buy(save, h)) return toast(t('notEnough'));
    save.heli = h.id; persist(); snd.sfx('win'); snd.preview(h); vibe([30, 40, 60]); toast(t('bought')); setDemo(S.levelId); return hangar();
  }
  if (d.rheliSel) { save.heliRescue.heli = d.rheliSel; persist(); snd.preview(rescueHeli(d.rheliSel)); setDemo(); return rhangar(); }
  if (d.heliSel) { save.heli = d.heliSel; persist(); snd.preview(heliOf(d.heliSel)); setDemo(S.levelId); return hangar(); }
  if (d.diff) {
    save.settings.diff = d.diff; persist();
    if (save.pilot) return settings();
    const keep = $('#pilotName').value; welcome(); $('#pilotName').value = keep; return;
  }
  if (d.quality) { save.settings.quality = d.quality; persist(); R.resize(d.quality); R.setLevel(S.level); return settings(); }
  switch (d.act) {
    case 'closeSheet': b.remove(); break;
    case 'soon': toast(t('soon')); break;
    case 'closeTip': b.closest('.overlay').remove(); break;
    case 'tutNext': tutorialCard(S.tut.page + 1); break;
    case 'respawn': S.game.reset(true); S.ended = false; S.mode = 'play'; ui.innerHTML = ''; snd.rotorStart(S.game.H); R.snap = true; guardBack(); break;
    case 'welcomeOk': {
      const n = $('#pilotName').value.trim();
      if (!n) { $('#pilotName').focus(); break; }
      save.pilot = n.slice(0, 16); save.lang = getLang(); persist(); home(); break;
    }
    case 'resume': resume(); break;
    case 'restart': commitRun(); startLevel(S.levelId); break;
    case 'quit': commitRun(); setDemo(); go('home'); break;
    case 'install': installEvt?.prompt(); installEvt = null; settings(); break;
    case 'export': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(save, null, 1)], { type: 'application/json' }));
      a.download = 'heli-sauvegarde.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      break;
    }
    case 'import': {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        try { save = importSave(await inp.files[0].text()); persist(); applySettings(); setDemo(); go('settings'); toast(t('imported')); }
        catch { toast(t('importErr')); }
      };
      inp.click(); break;
    }
    case 'replayTut': save.tut = false; persist(); startLevel(1); break;
    case 'reset':
      confirmBox(t('resetConfirm'), () => { const keep = { lang: save.lang, settings: save.settings }; save = { ...defaults(), ...keep }; persist(); setDemo(); go('home'); });
      break;
  }
});
function onSet(e) {
  const k = e.target.dataset?.set;
  if (!k) return;
  const el = e.target, s = save.settings;
  if (k === 'lang') { setLang(el.value); if (save.pilot) save.lang = el.value; persist(); const keep = $('#pilotName')?.value; ({ home, settings })[S.screen]?.(); if (keep != null && $('#pilotName')) $('#pilotName').value = keep; return; }
  if (k === 'pilot') { if (e.type === 'change') { const n = el.value.trim(); if (n) save.pilot = n.slice(0, 16); persist(); profile(); } return; }
  s[k] = el.type === 'checkbox' ? el.checked : +el.value;
  persist(); applySettings();
  if (k === 'sfx' && e.type === 'change') snd.sfx('orb');
  if (k === 'vibe' && s.vibe) vibe(30);
}
ui.addEventListener('input', onSet); ui.addEventListener('change', onSet);
ui.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'pilotName') $('[data-act=welcomeOk]').click(); else if (e.key === 'Enter' && e.target.dataset.set === 'pilot') e.target.blur(); });
function applySettings() { snd.setVolumes(save.settings.music, save.settings.sfx); $('#fps').hidden = !save.settings.fps; }
$('#pauseBtn').addEventListener('click', () => { snd.sfx('ui'); pause(); });

// ---------- Commandes de vol : maintenir = rotor, glisser = inclinaison (conservée entre deux appuis)
const tiltK = () => 0.33 * save.settings.sens * (save.settings.invert ? -1 : 1);
cv.addEventListener('pointerdown', (e) => {
  snd.unlock();
  if (S.mode !== 'play' || S.pid !== null) return;
  S.pid = e.pointerId;
  try { cv.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, inp = S.game.input;
  S.anchor = x - (inp.tilt - BASE_TILT) / tiltK();
  S.touch = { x, y: e.clientY - r.top, ax: x };
  inp.thrust = true;
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== S.pid || S.mode !== 'play') return;
  const x = e.clientX - cv.getBoundingClientRect().left, k = tiltK(), raw = BASE_TILT + (x - S.anchor) * k, tl = clamp(raw, MIN_TILT, MAX_TILT);
  if (raw !== tl) S.anchor = x - (tl - BASE_TILT) / k;
  S.game.input.tilt = tl; S.touch.x = x;
});
const up = (e) => { if (e.pointerId !== S.pid) return; S.pid = null; S.touch = null; if (S.game) S.game.input.thrust = false; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (S.mode === 'play') pause(); else if (S.mode === 'pause') resume(); return; }
  S.keys[e.code] = true;
  if (S.mode === 'play' && (e.code === 'Space' || e.code === 'ArrowUp')) { snd.unlock(); S.game.input.thrust = true; e.preventDefault(); }
});
addEventListener('keyup', (e) => { S.keys[e.code] = false; if (S.mode === 'play' && (e.code === 'Space' || e.code === 'ArrowUp')) S.game.input.thrust = false; });

// ---------- Cycle de vie
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); snd.suspend(); } else { snd.resume(); if (S.mode === 'play') requestWake(); }
});
addEventListener('blur', pause);
let guarded = false;
function guardBack() { if (!guarded) { history.pushState({ heli: 1 }, ''); guarded = true; } }
addEventListener('popstate', () => {
  guarded = false;
  if (S.mode === 'play') { pause(); guardBack(); }
  else if (S.mode === 'pause') { resume(); }
  else if ($('.overlay[data-act=closeSheet]')) { $('.overlay[data-act=closeSheet]').remove(); guardBack(); }
  else if (S.screen !== 'home' && save.pilot) go('home');
});
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (S.screen === 'settings') settings(); });
addEventListener('resize', () => R.resize(save.settings.quality));
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.().catch?.(() => {});

// ---------- Boucle principale
function events() {
  const g = S.game, play = S.mode === 'play', def = S.level.def;
  for (const e of g.ev) {
    switch (e.type) {
      case 'orb': R.spawn(e.x, e.y, 6, { v: 70, col: '#ffd34d', life: 0.4, size: 1.6 }); if (play) snd.sfx('orb'); break;
      case 'hit': R.spawn(e.x, e.y, 14, { v: 150, col: def.accent, life: 0.5, g: 300 }); R.flash = e.big ? 1 : 0.5; R.shake = e.big ? 22 : 9; if (play) { snd.sfx(e.big ? 'hit' : 'bump'); if (e.big) snd.sfx('bump'); vibe(e.big ? 120 : 40); } break;
      case 'bump': if (play) snd.sfx('bump'); break;
      case 'land': R.spawn(g.heli.x, g.heli.y + 11, 8, { a: -Math.PI / 2, spread: 3, v: 60, col: 'rgba(255,255,255,.5)', life: 0.5 }); break;
      case 'crash': R.spawn(e.x, e.y, 46, { v: 230, col: '#ff8a3a', life: 1, g: 220, size: 3 }); R.spawn(e.x, e.y, 16, { v: 60, col: 'rgba(30,30,40,.7)', life: 1.4, size: 5, grow: 8 }); R.shake = 26; if (play) { snd.sfx('crash'); snd.rotorStop(); vibe([80, 40, 180]); } break;
      case 'pad': R.spawn(e.x, e.y - 6, 14, { a: -Math.PI / 2, spread: 2.6, v: 90, col: '#7dffb0', life: 0.6 }); if (play) { toast('⛽ ' + t('refuel')); snd.sfx('cp'); vibe(20); } break;
      case 'fueled': if (play) { toast('✔ ' + t('fueled')); snd.sfx('repair'); } break;
      case 'star': R.spawn(e.x, e.y, 20, { v: 140, col: '#ffd34d', life: 0.7, size: 2 }); if (play) { snd.sfx('ring'); vibe(25); } break;
      case 'nofuel': if (play) { toast('⚠ ' + t('noFuel')); snd.sfx('bump'); vibe([40, 60, 40]); } break;
      case 'win': R.spawn(g.heli.x, g.heli.y, 40, { a: -Math.PI / 2, spread: 2.2, v: 260, col: def.accent, life: 1.2, g: 260, size: 2.4 }); if (play) { snd.sfx('win'); snd.rotorStop(); vibe([30, 40, 30, 40, 80]); } break;
    }
  }
  g.ev.length = 0;
}
let lowBeep = 0;
const timeTxt = $('#timeTxt'), progFill = $('#progFill'), progDot = $('#progDot'); let timeShown = -1;
const fuelFill = $('#fuelFill'), fuelBar = $('#fuelBar'), starTxt = $('#starTxt'), hint = $('#hint'), fpsEl = $('#fps');
let hintKey = '';
function updateHud() {
  const g = S.game, L = S.level, h = g.heli;
  fuelFill.style.width = g.fuel * 100 + '%';
  const low = g.fuel < 0.22 && g.state === 'fly';
  fuelBar.classList.toggle('low', low);
  if (low && g.fuel > 0 && time > lowBeep) { lowBeep = time + 1.1; snd.tone(520, 0.09, 'square', 0.1); snd.tone(520, 0.09, 'square', 0.1, 0.16); }
  starTxt.textContent = '★'.repeat(g.stats.stars) + '☆'.repeat(3 - g.stats.stars);
  // Bas de l'écran : temps depuis le départ et avancement, avec les ravitaillements sur la route.
  const pr = clamp(h.x / L.pad.x, 0, 1) * 100 + '%';
  progFill.style.width = pr; progDot.style.left = pr;
  const sec = Math.floor(g.t);
  if (sec !== timeShown) { timeShown = sec; timeTxt.textContent = fmtTime(g.t); }
  let key = '';
  const fp = L.pads[1];
  if (g.fuel < 0.22 && g.fuel > 0 && g.state === 'fly') key = 'lowFuel';
  else if (S.tut && g.state === 'fly') key = ['tut1', 'tut2', 'tutC', 'tutD'][S.tut.step];
  else if (g.state === 'fly' && L.def.id === 1 && !save.levels[1]?.done && h.x > fp.x - 700 && h.x < fp.x + 100 && g.padIdx < 1) key = 'tut5';
  if (g.state === 'fly' && L.def.id === 1 && h.x > L.pad.x - 700) key = 'tut4';
  if (key !== hintKey) { hintKey = key; if (key) hint.textContent = (S.tut ? `${S.tut.step + 1}/4 · ` : '') + t(key); hint.classList.toggle('on', !!key); }
}
let last = 0, acc = 0, frame = 0, drawAcc = 0, fpsN = 0, fpsT = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts; time += dt;
  const g = S.game;
  if (!g) return;
  if (S.mode === 'play' || S.mode === 'demo') {
    if (S.mode === 'play') {
      const dir = (S.keys.ArrowRight ? 1 : 0) - (S.keys.ArrowLeft ? 1 : 0);
      if (dir) g.input.tilt = clamp(g.input.tilt + dir * 70 * dt, MIN_TILT, MAX_TILT);
    }
    acc += dt;
    while (acc >= DT) {
      if (S.mode === 'demo') autopilot(g);
      g.step(DT); acc -= DT;
    }
    events();
    if (S.mode === 'play' && S.tut) tutorialStep(g, dt);
    if (S.mode === 'demo') {
      if (g.state === 'win' && g.stateT > 2.5) { S.game = new Game(S.level, g.H); R.snap = true; }
      else if (g.state === 'dead' && g.stateT > 1.5) { S.game = new Game(S.level, g.H); R.snap = true; }
    } else {
      snd.rotorSet(g.heli.power);
      if (!S.ended && g.state === 'win' && g.stateT > 1.3) showResult();
      else if (!S.ended && g.state === 'dead' && g.stateT > 1.5) showCrash();
    }
  }
  frame++; drawAcc += dt;
  if (save.settings.battery && frame % 2) return;
  const frozen = S.mode === 'pause';
  R.draw(S.game, S.game.H.look, time, frozen ? 0 : drawAcc, { touch: S.touch, shake: save.settings.shake });
  drawAcc = 0;
  if (S.mode === 'play') updateHud();
  if (save.settings.fps) { fpsN++; if (ts - fpsT > 500) { fpsEl.textContent = Math.round((fpsN * 1000) / (ts - fpsT)) + ' FPS'; fpsN = 0; fpsT = ts; } }
}

R.resize(save.settings.quality);
applySettings();
setDemo();
home();
requestAnimationFrame(loop);
// Accès de débogage (console) : window.__heli
window.__heli = { S, R, get save() { return save; }, startLevel, autopilot };
