// Audio 100 % procédural (Web Audio) : aucun fichier son à télécharger.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = {
  maj: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
  min: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
  dor: [[0, 3, 7], [5, 9, 12], [0, 3, 7], [-2, 2, 5]],
  pent: [[0, 7, 12], [-3, 4, 9], [5, 12, 14], [0, 7, 9]],
};
const SCALES = { maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10], dor: [0, 2, 3, 7, 9], pent: [0, 2, 4, 7, 9] };

export class Sound {
  constructor() { this.ac = null; this.musicVol = 0.6; this.sfxVol = 0.8; this.music = null; this.combo = 0; this.lastOrb = 0; }

  // À appeler depuis un geste utilisateur (politique d'autoplay des navigateurs).
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = (this.ac = new AC());
    this.mg = ac.createGain(); this.sg = ac.createGain();
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.mg.connect(lp); lp.connect(ac.destination); this.sg.connect(ac.destination);
    this.delay = ac.createDelay(1); this.delay.delayTime.value = 0.33;
    const fb = ac.createGain(); fb.gain.value = 0.35;
    this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(this.mg);
    const len = ac.sampleRate * 1.5, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.setVolumes(this.musicVol, this.sfxVol);
    if (this.pending) this.playMusic(this.pending);
  }
  setVolumes(m, s) {
    this.musicVol = m; this.sfxVol = s;
    if (!this.ac) return;
    this.mg.gain.setTargetAtTime(m * 0.5, this.ac.currentTime, 0.05);
    this.sg.gain.setTargetAtTime(s, this.ac.currentTime, 0.05);
  }
  suspend() { if (this.ac && this.ac.state === 'running') this.ac.suspend(); }
  resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); }

  // --- Rotor : bruit filtré haché à la fréquence des pales, avec une signature par appareil.
  // f : couleur du souffle (Hz), chop : cadence des pales, q : résonance, wave : forme du hachage,
  // whine : sifflement de turbine [fréquence, volume, forme], dual : deux rotors qui battent entre eux.
  profile(heli) {
    const P = {
      bubble: { f: 170, chop: 13 }, sleek: { f: 215, chop: 15, whine: [620, 0.02] }, heavy: { f: 120, chop: 9, wave: 'square' },
      attack: { f: 150, chop: 12, q: 1.4, whine: [480, 0.03] }, twin: { f: 105, chop: 8, dual: 1 },
      stealth: { f: 270, chop: 18, q: 0.5, vol: 0.65, whine: [900, 0.012] }, future: { f: 300, chop: 20, whine: [760, 0.035] },
      retro: { f: 190, chop: 10.5, q: 2.2, wave: 'square' }, coax: { f: 160, chop: 14, dual: 1 }, rescue: { f: 130, chop: 10, whine: [380, 0.015] },
      crane: { f: 95, chop: 7.5, wave: 'square', q: 1.2 }, tilt: { f: 185, chop: 16, dual: 1, whine: [540, 0.03] },
      drone: { f: 520, chop: 34, q: 3, vol: 0.8, whine: [330, 0.05, 'sawtooth'] }, manta: { f: 285, chop: 19, q: 0.6, whine: [840, 0.03] },
      r_light: { f: 195, chop: 14 }, r_mountain: { f: 170, chop: 12.5, whine: [560, 0.02] }, r_float: { f: 175, chop: 12 }, r_coax: { f: 160, chop: 13, dual: 1 }, r_tandem: { f: 105, chop: 8, dual: 1 },
      floats: { f: 180, chop: 12.5 }, amphib: { f: 150, chop: 11, whine: [420, 0.02] }, seaking: { f: 125, chop: 9.5, whine: [360, 0.015] }, mi8: { f: 100, chop: 8, wave: 'square' },
      shark: { f: 140, chop: 11, q: 1.3, whine: [300, 0.03] }, dragon: { f: 135, chop: 10, q: 1.6, whine: [110, 0.06, 'sawtooth'] }, ufo: { ufo: 1 },
    }[heli?.look?.body] || { f: 170, chop: 13 };
    // les appareils agiles tournent plus vite, les blindés sonnent plus grave
    const k = heli ? Math.sqrt(heli.agility / 180) : 1, low = heli ? Math.pow(120 / heli.armor, 0.35) : 1;
    return { q: 0.8, wave: 'sawtooth', vol: 1, ...P, f: (P.f || 0) * low, chop: (P.chop || 0) * k };
  }
  rotorStart(heli) {
    if (!this.ac || this.rot) return;
    const ac = this.ac, p = this.profile(heli), out = ac.createGain(), nodes = [];
    out.gain.value = 0; out.connect(this.sg);
    const osc = (type, freq, dest) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(dest); o.start(); nodes.push(o); return o; };
    const r = { p, out, nodes };
    if (p.ufo) { // soucoupe : deux ondes pures qui battent, avec un vibrato
      const g = ac.createGain(); g.gain.value = 0.5; g.connect(out);
      r.hum = [osc('sine', 150, g), osc('sine', 153, g), osc('triangle', 600, g)];
      const vib = ac.createGain(); vib.gain.value = 9; osc('sine', 6, vib);
      r.hum.forEach((o) => vib.connect(o.frequency));
    } else {
      const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = p.q;
      const am = ac.createGain(), depth = ac.createGain();
      am.gain.value = 0.5; depth.gain.value = p.dual ? 0.28 : 0.5;
      r.lfo = [osc(p.wave, p.chop, depth)]; depth.connect(am.gain);
      if (p.dual) r.lfo.push(osc(p.wave, p.chop * 1.09, depth));
      src.connect(bp); bp.connect(am); am.connect(out); src.start(); nodes.push(src);
      r.bp = bp;
      if (p.whine) { r.wg = ac.createGain(); r.wg.gain.value = 0; r.wg.connect(out); r.whine = osc(p.whine[2] || 'sine', p.whine[0], r.wg); }
    }
    this.rot = r;
  }
  rotorSet(power) {
    if (!this.rot) return;
    const t = this.ac.currentTime, r = this.rot, p = r.p, set = (prm, v) => prm.setTargetAtTime(v, t, 0.05);
    if (p.ufo) {
      set(r.hum[0].frequency, 150 + 90 * power); set(r.hum[1].frequency, 153 + 96 * power); set(r.hum[2].frequency, 600 + 380 * power);
      set(r.out.gain, 0.04 + 0.2 * power);
      return;
    }
    set(r.bp.frequency, p.f * (0.9 + 1.8 * power));
    r.lfo.forEach((o, i) => set(o.frequency, p.chop * (0.8 + 0.75 * power) * (i ? 1.09 : 1)));
    set(r.out.gain, (0.03 + 0.26 * power) * p.vol);
    if (r.whine) { set(r.whine.frequency, p.whine[0] * (0.6 + 0.5 * power)); set(r.wg.gain, p.whine[1] * (0.25 + power)); }
  }
  rotorStop() {
    if (!this.rot) return;
    const r = this.rot; this.rot = null;
    r.out.gain.setTargetAtTime(0, this.ac.currentTime, 0.08);
    setTimeout(() => { for (const n of r.nodes) { try { n.stop(); } catch { /* déjà arrêté */ } } r.out.disconnect(); }, 400);
  }
  // Bref aperçu du moteur (au hangar).
  preview(heli) {
    if (!this.ac) return;
    this.rotorStop(); this.rotorStart(heli); this.rotorSet(0.2);
    const mine = this.rot;
    setTimeout(() => { if (this.rot === mine) this.rotorSet(1); }, 60);
    setTimeout(() => { if (this.rot === mine) this.rotorStop(); }, 1100);
  }

  tone(f, dur, type = 'sine', vol = 0.3, when = 0, slide = 0) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sg); o.start(t); o.stop(t + dur + 0.05);
  }
  burst(dur, freq, vol) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sg); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  sfx(name) {
    if (!this.ac || this.sfxVol <= 0) return;
    const now = this.ac.currentTime;
    switch (name) {
      case 'orb': {
        this.combo = now - this.lastOrb < 1.2 ? Math.min(this.combo + 1, 9) : 0; this.lastOrb = now;
        const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
        this.tone(mtof(76 + sc[this.combo]), 0.22, 'sine', 0.22); this.tone(mtof(88 + sc[this.combo]), 0.12, 'sine', 0.08);
        break;
      }
      case 'ring': [0, 4, 7, 12].forEach((n, i) => this.tone(mtof(72 + n), 0.3, 'triangle', 0.2, i * 0.06)); break;
      case 'hit': this.burst(0.3, 900, 0.7); this.tone(110, 0.25, 'sine', 0.5, 0, 0.4); break;
      case 'bump': this.burst(0.12, 500, 0.3); break;
      case 'crash': this.burst(1.1, 1600, 0.9); this.tone(90, 0.9, 'sawtooth', 0.35, 0, 0.3); break;
      case 'cp': [0, 7, 12].forEach((n, i) => this.tone(mtof(69 + n), 0.35, 'triangle', 0.22, i * 0.1)); break;
      case 'repair': [0, 5, 9].forEach((n, i) => this.tone(mtof(74 + n), 0.25, 'sine', 0.22, i * 0.07)); break;
      case 'win': [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(mtof(69 + n), 0.5, 'triangle', 0.22, i * 0.11)); break;
      case 'medal': this.tone(mtof(84), 0.4, 'triangle', 0.25); this.tone(mtof(91), 0.5, 'sine', 0.18, 0.08); break;
      case 'ui': this.tone(660, 0.06, 'triangle', 0.12); break;
      case 'bark': this.tone(430, 0.09, 'sawtooth', 0.16, 0, 0.6); this.tone(390, 0.1, 'sawtooth', 0.14, 0.16, 0.6); break;
      case 'splash': this.burst(0.5, 1400, 0.5); break;
      case 'thunder': this.burst(1.6, 300, 0.35); break;
    }
  }

  // --- Musique générative : nappes d'accords lents + notes pincées avec écho
  playMusic(cfg) {
    this.pending = cfg;
    if (!this.ac) return;
    if (this.music && this.music.cfg === cfg) return;
    this.stopMusic();
    const m = (this.music = { cfg, bar: 0, next: this.ac.currentTime + 0.1 });
    m.timer = setInterval(() => this.schedule(), 250);
    this.schedule();
  }
  stopMusic() { if (this.music) { clearInterval(this.music.timer); this.music = null; } }
  schedule() {
    const m = this.music, ac = this.ac;
    if (!m || ac.state !== 'running') return;
    if (m.next < ac.currentTime - 1) m.next = ac.currentTime + 0.05;
    const { root, scale, bpm } = m.cfg, bar = 240 / bpm;
    while (m.next < ac.currentTime + 0.6) {
      const t = m.next, ch = CHORDS[scale][m.bar % 4];
      ch.forEach((n, i) => this.pad(mtof(root + n), t, bar * 1.25, i ? 0.07 : 0.09));
      this.pad(mtof(root + ch[0] - 12), t, bar * 1.1, 0.12, 'sine');
      const sc = SCALES[scale];
      for (let k = 0; k < 8; k++) {
        if (Math.random() < 0.3) this.pluck(mtof(root + 12 + sc[(Math.random() * sc.length) | 0] + (Math.random() < 0.3 ? 12 : 0)), t + (k * bar) / 8);
      }
      m.next += bar; m.bar++;
    }
  }
  pad(f, t, dur, vol, type = 'triangle') {
    const ac = this.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = type; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 1.004;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); o2.connect(g); g.connect(this.mg); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  pluck(f, t) {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(this.mg); g.connect(this.delay); o.start(t); o.stop(t + 1);
  }
}
