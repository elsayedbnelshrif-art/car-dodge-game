import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* =========================================================
   Lane Rush — 3D endless car game with levels and a garage
   ========================================================= */

// ---------- Tunables ----------
const LANES = [-3, 0, 3];
const SPAWN_Z = -165;
const DESPAWN_Z = 18;
const WRAP_MIN = -191;
const WRAP_MAX = 25;
const WRAP_LEN = WRAP_MAX - WRAP_MIN;
const TRAFFIC_OWN_SPEED = 8; // oncoming cars drive toward the player
const ROAD_SHADOW = 0x24262f;

const ENDLESS_PARAMS = {
  startSpeed: 20,
  speedGain: 0.45,
  maxSpeed: 64,
  intStart: 1.2,
  intMin: 0.55,
  intDecay: 0.0075,
  dblBase: 0.12,
  dblGain: 0.006,
  dblMax: 0.55,
};

/* =========================================================
   Themes (environments)
   ========================================================= */
const THEMES = {
  city: {
    name: 'City',
    emoji: '🏙️',
    sky: 0x8fdcff,
    fogNear: 55,
    fogFar: 165,
    ground: 0x7bd85a,
    road: 0x3d4250,
    curbA: 0xff3b5c,
    curbB: 0xffffff,
    hemi: [0xffffff, 0x6aa84f, 1.6],
    sun: [0xffffff, 1.8],
    clouds: true,
  },
  desert: {
    name: 'Desert',
    emoji: '🏜️',
    sky: 0xffd9a8,
    fogNear: 50,
    fogFar: 160,
    ground: 0xf0c27b,
    road: 0x4b4646,
    curbA: 0xf77f00,
    curbB: 0xfff3e0,
    hemi: [0xfff1d6, 0xd9a066, 1.6],
    sun: [0xfff0d0, 2.0],
    clouds: true,
  },
  night: {
    name: 'Night',
    emoji: '🌙',
    sky: 0x161a3d,
    fogNear: 35,
    fogFar: 150,
    ground: 0x1d4d3a,
    road: 0x2f3345,
    curbA: 0xffd60a,
    curbB: 0x3a3f5c,
    hemi: [0x9fb4ff, 0x203040, 1.05],
    sun: [0x9db0ff, 0.9],
    clouds: false,
  },
  snow: {
    name: 'Snow',
    emoji: '❄️',
    sky: 0xcfe6f7,
    fogNear: 40,
    fogFar: 150,
    ground: 0xf3f8ff,
    road: 0x535a69,
    curbA: 0x4cc9f0,
    curbB: 0xffffff,
    hemi: [0xffffff, 0xb0c4de, 1.5],
    sun: [0xffffff, 1.6],
    clouds: true,
  },
};
const THEME_KEYS = ['city', 'desert', 'night', 'snow'];

/* =========================================================
   Levels
   ========================================================= */
const round50 = (v) => Math.round(v / 50) * 50;
const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const d = i / 19;
  const type = i % 5 === 1 || i % 5 === 3 ? 'coins' : 'distance';
  const target = type === 'distance' ? round50(400 + i * 250) : 12 + i * 5;
  const lvl = {
    index: i,
    num: i + 1,
    theme: THEME_KEYS[Math.floor(i / 5)],
    type,
    target,
    params: {
      startSpeed: 18 + 12 * d,
      speedGain: 0.3 + 0.3 * d,
      maxSpeed: 42 + 24 * d,
      intStart: 1.3 - 0.45 * d,
      intMin: 0.8 - 0.25 * d,
      intDecay: 0.006 + 0.004 * d,
      dblBase: 0.05 + 0.3 * d,
      dblGain: 0.004 + 0.004 * d,
      dblMax: 0.25 + 0.35 * d,
    },
  };
  if (type === 'distance') {
    lvl.s2 = Math.round(target / 16); // coins for 2 stars
    lvl.s3 = Math.round(target / 10); // coins for 3 stars
  } else {
    lvl.s2 = Math.round(target * 0.95); // seconds for 2 stars
    lvl.s3 = Math.round(target * 0.7); // seconds for 3 stars
  }
  return lvl;
});

function goalText(lvl) {
  return lvl.type === 'distance' ? `Reach ${lvl.target} m` : `Collect ${lvl.target} coins`;
}
function starRules(lvl) {
  if (lvl.type === 'distance') {
    return ['Reach the goal', `…with ${lvl.s2}+ coins`, `…with ${lvl.s3}+ coins`];
  }
  return ['Collect them all', `…in under ${lvl.s2}s`, `…in under ${lvl.s3}s`];
}
function computeStars(lvl, coins, time) {
  if (lvl.type === 'distance') return 1 + (coins >= lvl.s2 ? 1 : 0) + (coins >= lvl.s3 ? 1 : 0);
  return 1 + (time <= lvl.s2 ? 1 : 0) + (time <= lvl.s3 ? 1 : 0);
}

/* =========================================================
   Garage cars (stats)
   ========================================================= */
const CARS = [
  { id: 'rookie', name: 'Rookie', unlock: 1, price: 0, speedMul: 1.0, handling: 13, halfW: 0.8, halfL: 1.85, bars: [2, 3, 3], perk: 'Balanced all-rounder' },
  { id: 'bolt', name: 'Bolt', unlock: 3, price: 150, speedMul: 0.95, handling: 16, halfW: 0.66, halfL: 1.55, bars: [2, 4, 1], perk: 'Tiny & nimble: squeezes past traffic' },
  { id: 'viper', name: 'Viper', unlock: 6, price: 400, speedMul: 1.12, handling: 13, halfW: 0.85, halfL: 2.05, bars: [4, 3, 4], perk: 'Muscle power: covers distance fast' },
  { id: 'titan', name: 'Titan', unlock: 9, price: 800, speedMul: 0.95, handling: 11, halfW: 0.95, halfL: 2.0, bars: [2, 2, 5], perk: '🛡️ Armor: survives one crash per run', shield: true },
  { id: 'phantom', name: 'Phantom', unlock: 13, price: 1400, speedMul: 1.2, handling: 18, halfW: 0.78, halfL: 1.85, bars: [5, 5, 3], perk: 'Supercar: blazing speed, razor handling' },
  { id: 'comet', name: 'Comet', unlock: 17, price: 2500, speedMul: 1.25, handling: 19, halfW: 0.72, halfL: 1.7, bars: [5, 5, 2], perk: '🧲 Hover tech: built-in coin magnet', magnet: true },
];
const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

/* =========================================================
   Power-ups, upgrades and daily rewards (data)
   ========================================================= */
const POWERUPS = {
  magnet: { name: 'Magnet', icon: '🧲', color: 0xff3b5c, css: '#ff3b5c', base: 6, step: 1.5, desc: 'Pulls nearby coins to your car' },
  shield: { name: 'Shield', icon: '🛡️', color: 0x3a86ff, css: '#3a86ff', base: 8, step: 2, desc: 'Blocks one crash while it is active' },
  double: { name: 'Double Coins', icon: '💰', color: 0x2fbf71, css: '#2fbf71', base: 6, step: 1.5, desc: 'Every coin counts ×2' },
};
const PU_KEYS = Object.keys(POWERUPS);
const MAX_UPGRADE = 5;
const UPGRADE_COSTS = [80, 160, 300, 500, 800]; // cost of upgrade level 1..5
const puDurationAt = (key, lvl) => POWERUPS[key].base + POWERUPS[key].step * lvl;
const puDuration = (key) => puDurationAt(key, save.upgrades[key]);

// Daily missions: [target, reward] tiers per mission type.
const MISSION_DEFS = {
  coins: { icon: '🪙', text: (n) => `Collect ${n} coins`, tiers: [[60, 40], [100, 60], [150, 90]] },
  nearmiss: { icon: '😱', text: (n) => `Do ${n} near misses`, tiers: [[3, 50], [5, 80], [8, 120]] },
  levels: { icon: '🏁', text: (n) => `Finish ${n} level${n > 1 ? 's' : ''}`, tiers: [[1, 50], [2, 90], [3, 130]] },
  distance: { icon: '🛣️', text: (n) => `Drive ${n} m in total`, tiers: [[1500, 40], [3000, 70], [5000, 110]] },
  powerups: { icon: '⚡', text: (n) => `Grab ${n} power-ups`, tiers: [[2, 40], [4, 70]] },
  endless: { icon: '∞', text: (n) => `Reach ${n} m in one Endless run`, tiers: [[400, 50], [700, 90], [1000, 140]], max: true },
  stars: { icon: '⭐', text: (n) => `Earn ${n} stars in levels`, tiers: [[3, 50], [6, 90]] },
};
const NEAR_MISS_BONUS = 3;

// Day 1..7 of a login streak. Day 7 also grants a free shield.
const DAILY_REWARDS = [25, 50, 75, 100, 150, 200, 300];

/* =========================================================
   Save data (localStorage)
   ========================================================= */
const SAVE_KEY = 'laneRush.save.v1';
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSet(key, v) {
  try {
    localStorage.setItem(key, v);
  } catch (e) {
    /* storage unavailable */
  }
}
function loadSave() {
  const def = {
    coins: 0,
    unlocked: 0, // highest unlocked level index
    stars: Array(LEVELS.length).fill(0),
    owned: ['rookie'],
    selected: 'rookie',
    best: parseInt(safeGet('laneRush.best') || '0', 10) || 0,
    upgrades: { magnet: 0, shield: 0, double: 0 },
    daily: { last: '', streak: 0 }, // last claimed local date (YYYY-MM-DD) and streak day (1..7)
    freeShields: 0,
    settings: { music: true, sound: true, vibration: true },
    tutorialDone: false,
    missions: null, // { date, list: [{ type, target, reward, progress, claimed }] }
  };
  if (safeGet('laneRush.muted') === '1') {
    // carried over from the old single mute button
    def.settings.music = false;
    def.settings.sound = false;
  }
  const defSettings = { ...def.settings };
  try {
    const raw = JSON.parse(safeGet(SAVE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const s = Object.assign(def, raw);
      s.stars = LEVELS.map((_, i) => Math.max(0, Math.min(3, (raw.stars && raw.stars[i]) | 0)));
      if (!Array.isArray(s.owned) || !s.owned.includes('rookie')) s.owned = ['rookie', ...(Array.isArray(s.owned) ? s.owned : [])];
      if (!s.owned.includes(s.selected)) s.selected = 'rookie';
      s.unlocked = Math.max(0, Math.min(LEVELS.length - 1, s.unlocked | 0));
      s.coins = Math.max(0, s.coins | 0);
      // Fields added later: older saves simply get the defaults.
      const up = raw.upgrades && typeof raw.upgrades === 'object' ? raw.upgrades : {};
      s.upgrades = {};
      for (const k of PU_KEYS) s.upgrades[k] = Math.max(0, Math.min(MAX_UPGRADE, up[k] | 0));
      const dl = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
      s.daily = { last: typeof dl.last === 'string' ? dl.last : '', streak: Math.max(0, Math.min(7, dl.streak | 0)) };
      s.freeShields = Math.max(0, s.freeShields | 0);
      const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
      s.settings = {};
      for (const k of ['music', 'sound', 'vibration']) s.settings[k] = typeof st[k] === 'boolean' ? st[k] : defSettings[k];
      // Players who already made progress before the tutorial existed skip it.
      s.tutorialDone = typeof raw.tutorialDone === 'boolean' ? raw.tutorialDone : s.unlocked > 0 || s.best > 0;
      const ms = raw.missions;
      const okMissions =
        ms && typeof ms.date === 'string' && Array.isArray(ms.list) && ms.list.length > 0 &&
        ms.list.every((m) => m && MISSION_DEFS[m.type] && m.target > 0 && m.reward >= 0);
      s.missions = okMissions
        ? { date: ms.date, list: ms.list.map((m) => ({ type: m.type, target: m.target | 0, reward: m.reward | 0, progress: Math.max(0, Math.min(m.target | 0, m.progress | 0)), claimed: !!m.claimed })) }
        : null;
      return s;
    }
  } catch (e) {
    /* corrupted: start fresh */
  }
  return def;
}
const save = loadSave();
function persist() {
  safeSet(SAVE_KEY, JSON.stringify(save));
}
const settings = save.settings;
let lastVibe = 0;
function vibrate(pattern, minGap = 0) {
  if (!settings.vibration || !navigator.vibrate) return;
  const now = performance.now();
  if (now - lastVibe < minGap) return;
  lastVibe = now;
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    /* not allowed */
  }
}
const totalStars = () => save.stars.reduce((a, b) => a + b, 0);
const carUnlocked = (car) => save.unlocked >= car.unlock - 1;

/* =========================================================
   DOM
   ========================================================= */
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'),
  score: $('score'),
  coins: $('coins'),
  best: $('best'),
  thirdLabel: $('hud-third-label'),
  goal: $('goal'),
  goalLabel: $('goal-label'),
  goalCount: $('goal-count'),
  goalFill: $('goal-fill'),
  shield: $('shield'),
  pause: $('pause'),
  loading: $('loading'),
  toast: $('toast'),
  screens: {
    menu: $('menu'),
    levels: $('levels'),
    garage: $('garage'),
    upgrades: $('upgrades'),
    missions: $('missions'),
    over: $('over'),
    complete: $('complete'),
    paused: $('paused'),
  },
  levelInfo: $('level-info'),
  levelList: $('level-list'),
};

function showScreen(name) {
  for (const [k, el] of Object.entries(ui.screens)) el.classList.toggle('hidden', k !== name);
  ui.levelInfo.classList.add('hidden');
  refreshWallets();
}
function refreshWallets() {
  document.querySelectorAll('.wallet-val').forEach((el) => (el.textContent = save.coins));
  $('menu-best').textContent = save.best;
  $('menu-stars').textContent = totalStars();
  const fs = $('menu-shields');
  fs.classList.toggle('hidden', save.freeShields <= 0);
  fs.textContent = `🛡️ Free shield ready${save.freeShields > 1 ? ' ×' + save.freeShields : ''} for your next run`;
}
let toastTimer = 0;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 1800);
}

/* =========================================================
   Audio (Web Audio API)
   ========================================================= */
const Sound = (() => {
  let ctx = null;
  let master = null; // sound effects bus
  let musicBus = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicTime = 0;
  let noiseBuf = null;
  let engine = null;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.sound ? 1 : 0;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    musicStart();
  }

  function applySettings() {
    if (!ctx) return;
    master.gain.setTargetAtTime(settings.sound ? 1 : 0, ctx.currentTime, 0.02);
    if (settings.music) musicStart();
    else musicStop();
  }

  /* ----- Background music: a looping 8-bar chiptune scheduled ahead of time ----- */
  const STEP = 60 / 116 / 4; // one 16th note
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]; // Am F C G
  const BASS = [45, 41, 48, 43];
  const ARP = [0, 1, 2, 1, 2, 1, 0, 2];
  const LEAD = [69, 72, 76, 74, 72, 69, 67, 72, 76, 79, 76, 74, 72, 74, 69, 67];

  function musicNote(step, t) {
    const bar = Math.floor(step / 16) % 8;
    const s = step % 16;
    const ch = bar % 4;
    if (s % 4 === 0) {
      // kick
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g).connect(musicBus);
      o.start(t);
      o.stop(t + 0.15);
    }
    if (s % 4 === 2) noise(t, 0.04, 0.035, 'highpass', 7000, 9000, musicBus);
    if (s === 4 || s === 12) noise(t, 0.1, 0.07, 'bandpass', 1900, 1200, musicBus);
    if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) {
      tone(hz(BASS[ch] + (s === 6 || s === 14 ? 12 : 0)), t, 0.14, 'triangle', 0.16, musicBus);
    }
    if (s % 2 === 0) tone(hz(CHORDS[ch][ARP[s / 2]] + 12), t, 0.1, 'square', 0.022, musicBus);
    if (bar >= 4 && (s === 0 || s === 3 || s === 6 || s === 10 || s === 12)) {
      tone(hz(LEAD[(bar * 5 + s) % LEAD.length]), t, 0.22, 'triangle', 0.055, musicBus);
    }
  }

  function musicTick() {
    if (!ctx || ctx.state !== 'running') return;
    if (musicTime < ctx.currentTime) musicTime = ctx.currentTime + 0.03; // timers were throttled: skip ahead
    while (musicTime < ctx.currentTime + 0.35) {
      musicNote(musicStep, musicTime);
      musicTime += STEP;
      musicStep = (musicStep + 1) % 128;
    }
  }

  function musicStart() {
    if (!ctx || musicTimer || !settings.music || document.hidden) return;
    musicTime = ctx.currentTime + 0.05;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(0.55, ctx.currentTime, 0.05);
    musicTimer = setInterval(musicTick, 90);
  }

  function musicStop() {
    if (!musicTimer) return;
    clearInterval(musicTimer);
    musicTimer = null;
    musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04); // fade out notes already scheduled
  }

  function tone(freq, start, dur, type = 'square', vol = 0.12, dest = master) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function noise(start, dur, vol, type, f0, f1, dest = master) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, start);
    f.frequency.exponentialRampToValueAtTime(f1, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(start, Math.random() * 0.2, dur + 0.05);
  }

  function coin() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(988, t, 0.08, 'square', 0.08);
    tone(1319, t + 0.07, 0.18, 'square', 0.08);
    tone(2637, t + 0.07, 0.12, 'sine', 0.04);
  }

  function swoosh() {
    if (!ctx) return;
    noise(ctx.currentTime, 0.15, 0.09, 'bandpass', 600, 2400);
  }

  function click() {
    if (!ctx) return;
    tone(660, ctx.currentTime, 0.06, 'triangle', 0.08);
  }

  function crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.8, 0.7, 'lowpass', 3500, 150);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    og.gain.setValueAtTime(0.8, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 0.55);
    for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 2500, t + 0.05 + i * 0.04, 0.08, 'triangle', 0.03);
  }

  function shield() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.4, 0.4, 'highpass', 800, 4000);
    tone(523, t, 0.12, 'sawtooth', 0.06);
    tone(392, t + 0.1, 0.25, 'sawtooth', 0.06);
  }

  function fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'square', 0.08));
    tone(1047, t + 0.45, 0.5, 'triangle', 0.1);
    tone(1319, t + 0.45, 0.5, 'triangle', 0.07);
  }

  function star(i) {
    if (!ctx) return;
    tone(880 * Math.pow(1.25, i), ctx.currentTime, 0.2, 'triangle', 0.1);
  }

  function nearMiss() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.18, 0.12, 'bandpass', 900, 3600);
    tone(1175, t + 0.03, 0.09, 'square', 0.06);
    tone(1760, t + 0.1, 0.16, 'square', 0.06);
  }

  function power() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.045, 0.14, 'sawtooth', 0.05));
    tone(1568, t + 0.22, 0.25, 'triangle', 0.08);
  }

  function powerEnd() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(660, t, 0.1, 'triangle', 0.06);
    tone(440, t + 0.09, 0.16, 'triangle', 0.06);
  }

  function buy() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) tone(1200 + i * 180, t + i * 0.05, 0.1, 'square', 0.05);
  }

  function engineStart() {
    if (!ctx || engine) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 27.5;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.4);
    o.connect(f);
    o2.connect(f);
    f.connect(g).connect(master);
    o.start();
    o2.start();
    engine = { o, o2, f, g };
  }

  function engineUpdate(speed) {
    if (!engine) return;
    const t = ctx.currentTime;
    const freq = 45 + speed * 1.6;
    engine.o.frequency.setTargetAtTime(freq, t, 0.1);
    engine.o2.frequency.setTargetAtTime(freq / 2, t, 0.1);
    engine.f.frequency.setTargetAtTime(300 + speed * 8, t, 0.1);
  }

  function engineStop() {
    if (!engine) return;
    const e = engine;
    engine = null;
    const t = ctx.currentTime;
    e.g.gain.cancelScheduledValues(t);
    e.g.gain.setTargetAtTime(0.0001, t, 0.08);
    e.o.stop(t + 0.5);
    e.o2.stop(t + 0.5);
  }

  return { init, applySettings, musicStart, musicStop, nearMiss, coin, swoosh, click, crash, shield, fanfare, star, buy, power, powerEnd, engineStart, engineUpdate, engineStop };
})();

/* =========================================================
   Renderer / scene
   ========================================================= */
const container = $('game');
const renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(THEMES.city.sky);
scene.fog = new THREE.Fog(THEMES.city.sky, 55, 165);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 400);
let baseFov = 60;

const hemi = new THREE.HemisphereLight(0xffffff, 0x6aa84f, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(-6, 12, 6);
scene.add(sun);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Keep the whole road visible in narrow portrait screens.
  const hHalf = Math.atan(6.2 / 12);
  const vFov = 2 * Math.atan(Math.tan(hHalf) / camera.aspect) * (180 / Math.PI);
  baseFov = THREE.MathUtils.clamp(vFov, 55, 88);
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* =========================================================
   Geometry helpers (merge parts into one vertex-colored mesh)
   ========================================================= */
const tmpColor = new THREE.Color();

function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  tmpColor.set(color);
  for (let i = 0; i < n; i++) {
    cols[i * 3] = tmpColor.r;
    cols[i * 3 + 1] = tmpColor.g;
    cols[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

function merge(parts) {
  let total = 0;
  for (const p of parts) total += p.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let off = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, off * 3);
    nor.set(p.attributes.normal.array, off * 3);
    col.set(p.attributes.color.array, off * 3);
    off += p.attributes.position.count;
    p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s);
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const vcBasic = new THREE.MeshBasicMaterial({ vertexColors: true });

const GLASS = 0x1d2a44;
const TIRE = 0x1f1f24;
const RIM = 0xd8dce6;

function addWheels(parts, halfW, zs, r = 0.38, w = 0.3, rim = RIM) {
  for (const z of zs) {
    for (const s of [-1, 1]) {
      parts.push(part(cyl(r, r, w, 10), TIRE, s * halfW, r, z, 0, 0, Math.PI / 2));
      parts.push(part(cyl(r * 0.5, r * 0.5, w + 0.02, 6), rim, s * halfW, r, z, 0, 0, Math.PI / 2));
    }
  }
}

/* ---------- Traffic models (front at -Z, rotated to face player) ---------- */
function buildSedan(color, opts = {}) {
  const p = [];
  p.push(part(box(2.0, 0.02, 4.3), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(1.7, 0.6, 3.8), color, 0, 0.62, 0));
  p.push(part(box(1.36, 0.42, 1.9), 0x23324d, 0, 1.13, 0.25));
  p.push(part(box(1.42, 0.12, 1.7), opts.roof || color, 0, 1.38, 0.25));
  p.push(part(box(1.78, 0.18, 0.22), 0xdadde5, 0, 0.42, -1.92));
  p.push(part(box(1.78, 0.18, 0.22), 0xdadde5, 0, 0.42, 1.92));
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, -0.55, 0.72, -1.91));
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, 0.55, 0.72, -1.91));
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, -0.6, 0.72, 1.91));
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, 0.6, 0.72, 1.91));
  if (opts.taxi) {
    p.push(part(box(0.6, 0.22, 0.32), 0xffffff, 0, 1.55, 0.25));
    p.push(part(box(1.72, 0.1, 3.0), 0x222222, 0, 0.75, 0));
  }
  if (opts.stripe) p.push(part(box(0.35, 0.02, 3.82), opts.stripe, 0, 0.93, 0));
  addWheels(p, 0.82, [-1.2, 1.2]);
  return { geo: merge(p), halfL: 1.95, halfW: 0.85 };
}

function buildVan(color) {
  const p = [];
  p.push(part(box(2.1, 0.02, 4.7), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(1.8, 1.45, 4.3), color, 0, 1.05, 0.05));
  p.push(part(box(1.82, 0.5, 0.9), 0x23324d, 0, 1.35, -1.75));
  p.push(part(box(1.84, 0.12, 4.32), 0xffffff, 0, 0.6, 0.05));
  p.push(part(box(1.86, 0.2, 0.22), 0xdadde5, 0, 0.42, -2.12));
  p.push(part(box(0.36, 0.18, 0.06), 0xfff6c4, -0.6, 0.72, -2.12));
  p.push(part(box(0.36, 0.18, 0.06), 0xfff6c4, 0.6, 0.72, -2.12));
  p.push(part(box(0.3, 0.3, 0.06), 0xff2a3d, -0.7, 0.85, 2.21));
  p.push(part(box(0.3, 0.3, 0.06), 0xff2a3d, 0.7, 0.85, 2.21));
  addWheels(p, 0.88, [-1.4, 1.4]);
  return { geo: merge(p), halfL: 2.2, halfW: 0.9 };
}

function buildTruck(cabColor, cargoColor) {
  const p = [];
  p.push(part(box(2.3, 0.02, 6.6), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(2.0, 1.5, 1.7), cabColor, 0, 1.15, -2.3));
  p.push(part(box(2.02, 0.55, 0.8), 0x23324d, 0, 1.5, -2.75));
  p.push(part(box(2.1, 2.1, 4.4), cargoColor, 0, 1.55, 0.9));
  p.push(part(box(2.12, 0.18, 4.42), 0xffffff, 0, 2.2, 0.9));
  p.push(part(box(1.6, 0.25, 6.2), 0x333338, 0, 0.5, 0));
  p.push(part(box(2.06, 0.22, 0.22), 0xdadde5, 0, 0.45, -3.18));
  p.push(part(box(0.4, 0.2, 0.06), 0xfff6c4, -0.7, 0.8, -3.16));
  p.push(part(box(0.4, 0.2, 0.06), 0xfff6c4, 0.7, 0.8, -3.16));
  addWheels(p, 0.95, [-2.3, 1.0, 2.3], 0.45);
  return { geo: merge(p), halfL: 3.2, halfW: 1.0 };
}

/* ---------- Player models (front at -Z) ---------- */
const PLAYER_BUILDERS = {
  rookie() {
    const p = [];
    const body = 0xff3864;
    p.push(part(box(2.0, 0.02, 4.4), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.8, 0.5, 4.0), body, 0, 0.55, 0));
    p.push(part(box(1.7, 0.2, 1.3), body, 0, 0.88, -1.25));
    p.push(part(box(1.4, 0.4, 1.6), GLASS, 0, 1.0, 0.25));
    p.push(part(box(1.44, 0.1, 1.2), body, 0, 1.23, 0.35));
    p.push(part(box(0.4, 0.02, 4.02), 0xffffff, -0.3, 0.81, 0));
    p.push(part(box(0.4, 0.02, 4.02), 0xffffff, 0.3, 0.81, 0));
    p.push(part(box(0.14, 0.4, 0.14), 0x222228, -0.7, 1.0, 1.85));
    p.push(part(box(0.14, 0.4, 0.14), 0x222228, 0.7, 1.0, 1.85));
    p.push(part(box(1.9, 0.1, 0.5), 0x222228, 0, 1.24, 1.85));
    p.push(part(box(0.5, 0.14, 0.06), 0xff1030, -0.55, 0.65, 2.01));
    p.push(part(box(0.5, 0.14, 0.06), 0xff1030, 0.55, 0.65, 2.01));
    p.push(part(box(0.25, 0.12, 0.25), 0x8a8f99, -0.4, 0.35, 2.05));
    p.push(part(box(0.25, 0.12, 0.25), 0x8a8f99, 0.4, 0.35, 2.05));
    p.push(part(box(1.9, 0.16, 0.24), 0x222228, 0, 0.36, -2.0));
    p.push(part(box(0.4, 0.12, 0.06), 0xfff6c4, -0.6, 0.62, -2.01));
    p.push(part(box(0.4, 0.12, 0.06), 0xfff6c4, 0.6, 0.62, -2.01));
    addWheels(p, 0.9, [-1.25, 1.3], 0.4);
    return merge(p);
  },
  bolt() {
    const p = [];
    const body = 0xffd60a;
    p.push(part(box(1.75, 0.02, 3.5), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.5, 0.6, 3.1), body, 0, 0.6, 0));
    p.push(part(box(1.36, 0.55, 1.7), GLASS, 0, 1.18, 0.25));
    p.push(part(box(1.4, 0.1, 1.6), 0xffffff, 0, 1.5, 0.25));
    p.push(part(box(0.3, 0.02, 3.12), 0x111111, 0, 0.91, 0));
    p.push(part(box(1.56, 0.2, 0.2), 0x333338, 0, 0.42, -1.58));
    p.push(part(box(1.56, 0.2, 0.2), 0x333338, 0, 0.42, 1.58));
    p.push(part(box(0.32, 0.18, 0.06), 0xff1030, -0.5, 0.72, 1.56));
    p.push(part(box(0.32, 0.18, 0.06), 0xff1030, 0.5, 0.72, 1.56));
    p.push(part(new THREE.SphereGeometry(0.16, 8, 6), 0xfff6c4, -0.5, 0.7, -1.55));
    p.push(part(new THREE.SphereGeometry(0.16, 8, 6), 0xfff6c4, 0.5, 0.7, -1.55));
    addWheels(p, 0.75, [-1.0, 1.0], 0.36, 0.28, 0x111111);
    return merge(p);
  },
  viper() {
    const p = [];
    const body = 0x2dc653;
    p.push(part(box(2.1, 0.02, 4.7), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.9, 0.55, 4.3), body, 0, 0.6, 0));
    p.push(part(box(0.7, 0.2, 1.0), 0x111111, 0, 0.97, -1.0)); // hood scoop
    p.push(part(box(1.5, 0.42, 1.5), GLASS, 0, 1.08, 0.55));
    p.push(part(box(1.54, 0.1, 1.1), body, 0, 1.3, 0.6));
    p.push(part(box(0.22, 0.02, 4.32), 0x111111, -0.35, 0.88, 0));
    p.push(part(box(0.22, 0.02, 4.32), 0x111111, 0.35, 0.88, 0));
    p.push(part(box(1.96, 0.18, 0.24), 0xc0c4cc, 0, 0.4, -2.15));
    p.push(part(box(1.96, 0.18, 0.24), 0xc0c4cc, 0, 0.4, 2.15));
    p.push(part(box(1.7, 0.16, 0.06), 0xff1030, 0, 0.72, 2.16));
    p.push(part(box(0.35, 0.15, 0.06), 0xfff6c4, -0.65, 0.7, -2.16));
    p.push(part(box(0.35, 0.15, 0.06), 0xfff6c4, 0.65, 0.7, -2.16));
    p.push(part(box(0.2, 0.2, 0.4), 0x9aa0aa, -0.6, 0.3, 2.25));
    p.push(part(box(0.2, 0.2, 0.4), 0x9aa0aa, 0.6, 0.3, 2.25));
    addWheels(p, 0.95, [-1.35], 0.4, 0.3, 0xffd60a);
    addWheels(p, 0.97, [1.4], 0.46, 0.38, 0xffd60a);
    return merge(p);
  },
  titan() {
    const p = [];
    const body = 0xff7b00;
    p.push(part(box(2.3, 0.02, 4.6), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.95, 0.8, 4.0), body, 0, 1.25, 0));
    p.push(part(box(1.7, 0.6, 2.0), body, 0, 1.95, 0.35));
    p.push(part(box(1.76, 0.34, 1.7), GLASS, 0, 1.98, 0.3));
    p.push(part(box(1.5, 0.34, 2.04), GLASS, 0, 1.98, 0.35));
    p.push(part(box(1.8, 0.1, 2.0), body, 0, 2.3, 0.35));
    p.push(part(box(1.5, 0.12, 1.6), 0x333338, 0, 2.42, 0.35)); // roof rack
    for (const x of [-0.5, -0.17, 0.17, 0.5]) p.push(part(box(0.2, 0.16, 0.12), 0xfff6c4, x, 2.46, -0.4)); // roof lights
    p.push(part(box(2.1, 0.5, 0.2), 0x333338, 0, 0.95, -2.1)); // bull bar
    p.push(part(box(0.15, 0.8, 0.15), 0x333338, -0.7, 1.1, -2.15));
    p.push(part(box(0.15, 0.8, 0.15), 0x333338, 0.7, 1.1, -2.15));
    p.push(part(box(0.5, 0.5, 0.3), 0x222222, 0, 1.4, 2.15)); // spare tire
    p.push(part(box(0.35, 0.2, 0.06), 0xff1030, -0.75, 1.35, 2.01));
    p.push(part(box(0.35, 0.2, 0.06), 0xff1030, 0.75, 1.35, 2.01));
    p.push(part(box(2.0, 0.1, 0.5), 0xffffff, 0, 1.0, -0.9)); // stripe
    addWheels(p, 1.0, [-1.3, 1.3], 0.6, 0.45, 0x888888);
    return merge(p);
  },
  phantom() {
    const p = [];
    const body = 0x7209b7;
    p.push(part(box(2.1, 0.02, 4.4), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.7, 0.02, 3.8), 0x00f5d4, 0, 0.03, 0)); // neon underglow
    p.push(part(box(1.9, 0.38, 4.1), body, 0, 0.5, 0));
    p.push(part(box(1.7, 0.16, 1.4), body, 0, 0.74, -1.25));
    p.push(part(box(1.3, 0.34, 1.6), GLASS, 0, 0.86, 0.3));
    p.push(part(box(0.12, 0.3, 1.0), 0x111111, -0.98, 0.5, 0.4)); // side intakes
    p.push(part(box(0.12, 0.3, 1.0), 0x111111, 0.98, 0.5, 0.4));
    p.push(part(box(0.1, 0.42, 0.1), 0x111111, -0.6, 0.86, 1.9));
    p.push(part(box(0.1, 0.42, 0.1), 0x111111, 0.6, 0.86, 1.9));
    p.push(part(box(2.0, 0.08, 0.55), 0x111111, 0, 1.1, 1.95));
    p.push(part(box(1.8, 0.08, 0.06), 0x00f5d4, 0, 0.58, 2.06));
    p.push(part(box(0.5, 0.08, 0.06), 0x00f5d4, -0.6, 0.6, -2.06));
    p.push(part(box(0.5, 0.08, 0.06), 0x00f5d4, 0.6, 0.6, -2.06));
    addWheels(p, 0.95, [-1.3, 1.3], 0.38, 0.34, 0x00f5d4);
    return merge(p);
  },
  comet() {
    const p = [];
    const body = 0xf1f3f5;
    const accent = 0x4cc9f0;
    p.push(part(box(1.8, 0.02, 3.8), ROAD_SHADOW, 0, 0.015, 0));
    p.push(part(box(1.6, 0.4, 3.6), body, 0, 0.85, 0));
    p.push(part(box(1.0, 0.25, 1.4), body, 0, 0.82, -2.2)); // nose
    p.push(part(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), GLASS, 0, 1.05, 0.1));
    p.push(part(box(1.62, 0.08, 3.62), accent, 0, 0.72, 0));
    p.push(part(box(0.08, 0.6, 0.9), accent, -0.6, 1.25, 1.4)); // fins
    p.push(part(box(0.08, 0.6, 0.9), accent, 0.6, 1.25, 1.4));
    for (const [x, z] of [[-0.75, -1.2], [0.75, -1.2], [-0.75, 1.3], [0.75, 1.3]]) {
      p.push(part(cyl(0.38, 0.3, 0.2, 10), 0x495057, x, 0.55, z));
      p.push(part(cyl(0.3, 0.3, 0.04, 10), accent, x, 0.44, z));
    }
    p.push(part(box(1.0, 0.2, 0.08), 0xff006e, 0, 0.85, 1.82));
    return merge(p);
  },
};
const playerGeos = {};
for (const c of CARS) playerGeos[c.id] = PLAYER_BUILDERS[c.id]();

/* =========================================================
   World: ground, road, curbs, dashes
   ========================================================= */
const groundMat = new THREE.MeshLambertMaterial({ color: THEMES.city.ground });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 420), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, -150);
scene.add(ground);

const roadMat = new THREE.MeshLambertMaterial({ color: THEMES.city.road });
const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0, -150);
scene.add(road);

for (const s of [-1, 1]) {
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 420), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(s * 4.55, 0.01, -150);
  scene.add(edge);
}

const dummy = new THREE.Object3D();

/** A pool of instanced objects that scroll toward the camera and wrap. */
class Scroller {
  constructor(geo, mat, count, init, { colors = null } = {}) {
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.items = [];
    this.init = init;
    for (let i = 0; i < count; i++) {
      const it = { x: 0, y: 0, z: 0, s: 1, sy: 1, ry: 0 };
      init(it, i, true);
      this.items.push(it);
      if (colors) this.mesh.setColorAt(i, tmpColor.set(colors[Math.floor(Math.random() * colors.length)]));
    }
    scene.add(this.mesh);
    this.update(0);
  }
  set visible(v) {
    this.mesh.visible = v;
  }
  get visible() {
    return this.mesh.visible;
  }
  update(dz) {
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.z += dz;
      if (it.z > WRAP_MAX) {
        it.z -= WRAP_LEN;
        this.init(it, i, false);
      }
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.set(it.s, it.s * it.sy, it.s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Lane dashes
const DASH_PERIOD = 9;
const dashCount = Math.ceil(WRAP_LEN / DASH_PERIOD);
const dashes = new Scroller(box(0.18, 0.02, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }), dashCount * 2, (it, i, first) => {
  if (first) {
    it.x = i % 2 === 0 ? -1.5 : 1.5;
    it.z = WRAP_MIN + Math.floor(i / 2) * DASH_PERIOD;
  }
  it.y = 0.01;
});

// Curbs (alternating colored blocks)
const CURB_PERIOD = 2;
const curbCount = Math.ceil(WRAP_LEN / CURB_PERIOD) * 2;
const curbs = new THREE.InstancedMesh(box(0.5, 0.2, 2), new THREE.MeshLambertMaterial(), curbCount);
curbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
curbs.frustumCulled = false;
const curbZ = [];
for (let i = 0; i < curbCount; i++) {
  curbZ.push(WRAP_MIN + Math.floor(i / 2) * CURB_PERIOD);
  curbs.setColorAt(i, tmpColor.set(0xffffff));
}
scene.add(curbs);
function setCurbColors(a, b) {
  for (let i = 0; i < curbCount; i++) curbs.setColorAt(i, tmpColor.set(Math.floor(i / 2) % 2 === 0 ? a : b));
  curbs.instanceColor.needsUpdate = true;
}
function updateCurbs(dz) {
  for (let i = 0; i < curbCount; i++) {
    let z = curbZ[i] + dz;
    if (z > WRAP_MAX) z -= WRAP_LEN;
    curbZ[i] = z;
    dummy.position.set(i % 2 === 0 ? -5.0 : 5.0, 0.1, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    curbs.setMatrixAt(i, dummy.matrix);
  }
  curbs.instanceMatrix.needsUpdate = true;
}
updateCurbs(0);

/* =========================================================
   Scenery per theme
   ========================================================= */
function sideX(min, max) {
  return (Math.random() < 0.5 ? -1 : 1) * (min + Math.random() * (max - min));
}
function placeScenery(min, max, sMin, sMax, spin = true) {
  return (it, i, first) => {
    it.x = sideX(min, max);
    if (first) it.z = WRAP_MIN + Math.random() * WRAP_LEN;
    it.s = sMin + Math.random() * (sMax - sMin);
    it.ry = spin ? Math.random() * Math.PI * 2 : 0;
  };
}
function placeBlocks(min, max, sMin, sMax, syMin, syMax) {
  return (it, i, first) => {
    it.x = sideX(min, max);
    if (first) it.z = WRAP_MIN + Math.random() * WRAP_LEN;
    it.s = sMin + Math.random() * (sMax - sMin);
    it.sy = syMin + Math.random() * (syMax - syMin);
    it.ry = 0;
  };
}

const unitBox = box(1, 1, 1);
unitBox.translate(0, 0.5, 0);

// ---- City
const pineGeo = merge([
  part(cyl(0.22, 0.3, 1.2, 5), 0x8b5a2b, 0, 0.6, 0),
  part(new THREE.ConeGeometry(1.3, 2.2, 6), 0x2f9e44, 0, 2.0, 0),
  part(new THREE.ConeGeometry(1.0, 1.8, 6), 0x40c057, 0, 3.0, 0),
]);
const roundTreeGeo = merge([
  part(cyl(0.22, 0.3, 1.4, 5), 0x8b5a2b, 0, 0.7, 0),
  part(new THREE.IcosahedronGeometry(1.3, 0), 0x94d82d, 0, 2.3, 0),
]);
const bushGeo = merge([part(new THREE.IcosahedronGeometry(0.8, 0), 0x51cf66, 0, 0.45, 0)]);

// ---- Desert
const cactusGeo = merge([
  part(cyl(0.35, 0.4, 3.2, 7), 0x2b9348, 0, 1.6, 0),
  part(new THREE.SphereGeometry(0.35, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x2b9348, 0, 3.2, 0),
  part(cyl(0.22, 0.22, 0.9, 6), 0x2b9348, 0.6, 1.4, 0, 0, 0, Math.PI / 2),
  part(cyl(0.22, 0.22, 1.1, 6), 0x2b9348, 1.0, 1.9, 0),
  part(cyl(0.2, 0.2, 0.7, 6), 0x2b9348, -0.5, 1.9, 0, 0, 0, Math.PI / 2),
  part(cyl(0.2, 0.2, 0.9, 6), 0x2b9348, -0.8, 2.3, 0),
  part(new THREE.SphereGeometry(0.14, 6, 4), 0xff5d8f, 0, 3.5, 0),
]);
const rockGeo = merge([
  part(new THREE.DodecahedronGeometry(0.9, 0), 0xc97b4a, 0, 0.5, 0),
  part(new THREE.DodecahedronGeometry(0.55, 0), 0xb5651d, 0.8, 0.3, 0.3),
]);
const dryBushGeo = merge([
  part(new THREE.IcosahedronGeometry(0.6, 0), 0xa3a33a, 0, 0.35, 0),
  part(new THREE.IcosahedronGeometry(0.45, 0), 0xbfb54a, 0.5, 0.25, 0.2),
]);

// ---- Night
function buildNightBuilding() {
  const p = [part(box(1, 1, 1), 0x1b1f3b, 0, 0.5, 0)];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let face = 0; face < 4; face++) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 3; c++) {
        const lit = rnd() < 0.6;
        const col = lit ? (rnd() < 0.8 ? 0xffd166 : 0x9bf6ff) : 0x2b2f55;
        const u = -0.3 + c * 0.3;
        const y = 0.12 + r * 0.12;
        const g = box(0.16, 0.06, 0.02);
        const ang = (face * Math.PI) / 2;
        const x = Math.sin(ang) * 0.505 + Math.cos(ang) * u;
        const z = Math.cos(ang) * 0.505 - Math.sin(ang) * u;
        p.push(part(g, col, x, y, z, 0, ang, 0));
      }
    }
  }
  p.push(part(box(0.06, 0.25, 0.06), 0x555577, 0.3, 1.12, 0.2)); // antenna
  p.push(part(box(0.08, 0.08, 0.08), 0xff3b5c, 0.3, 1.27, 0.2));
  return merge(p);
}
const lampGeo = merge([
  part(box(0.16, 5, 0.16), 0x4a4e69, 0, 2.5, 0),
  part(box(1.6, 0.12, 0.14), 0x4a4e69, -0.75, 5.0, 0),
  part(box(0.6, 0.14, 0.34), 0xfff1a8, -1.4, 4.9, 0),
]);
const LAMP_PERIOD = 24;
const lampCount = Math.round(WRAP_LEN / LAMP_PERIOD) * 2;
const lampInit = (it, i, first) => {
  const right = i % 2 === 0;
  it.x = right ? 5.7 : -5.7;
  it.ry = right ? 0 : Math.PI;
  if (first) it.z = WRAP_MIN + Math.floor(i / 2) * (WRAP_LEN / (lampCount / 2)) + (right ? 0 : LAMP_PERIOD / 2);
};
const poolGeo = new THREE.CircleGeometry(1.9, 18);
poolGeo.rotateX(-Math.PI / 2);
const poolInit = (it, i, first) => {
  lampInit(it, i, first);
  it.x = i % 2 === 0 ? 3.0 : -3.0;
  it.y = 0.015;
  it.ry = 0;
};

// ---- Snow
const snowPineGeo = merge([
  part(cyl(0.22, 0.3, 1.2, 5), 0x6b4423, 0, 0.6, 0),
  part(new THREE.ConeGeometry(1.4, 2.2, 6), 0x1b5e3b, 0, 2.0, 0),
  part(new THREE.ConeGeometry(0.95, 0.7, 6), 0xffffff, 0, 2.75, 0),
  part(new THREE.ConeGeometry(1.0, 1.8, 6), 0x2d6a4f, 0, 3.0, 0),
  part(new THREE.ConeGeometry(0.55, 0.7, 6), 0xffffff, 0, 3.6, 0),
]);
const snowmanGeo = merge([
  part(new THREE.IcosahedronGeometry(0.75, 1), 0xffffff, 0, 0.7, 0),
  part(new THREE.IcosahedronGeometry(0.55, 1), 0xffffff, 0, 1.65, 0),
  part(new THREE.IcosahedronGeometry(0.4, 1), 0xffffff, 0, 2.35, 0),
  part(new THREE.ConeGeometry(0.08, 0.4, 5), 0xff7b00, 0, 2.35, 0.55, Math.PI / 2),
  part(cyl(0.3, 0.3, 0.06, 8), 0x222222, 0, 2.7, 0),
  part(cyl(0.2, 0.2, 0.35, 8), 0x222222, 0, 2.9, 0),
  part(box(0.9, 0.12, 0.14), 0xe63946, 0, 1.95, 0),
  part(box(0.08, 0.08, 0.04), 0x111111, -0.13, 2.45, 0.37),
  part(box(0.08, 0.08, 0.04), 0x111111, 0.13, 2.45, 0.37),
]);
const snowMoundGeo = merge([
  part(new THREE.IcosahedronGeometry(0.9, 0), 0xe8f1ff, 0, 0.25, 0),
  part(new THREE.IcosahedronGeometry(0.6, 0), 0xdbe8fb, 0.9, 0.15, 0.2),
]);
function buildHouse(bodyColor) {
  return merge([
    part(box(1, 0.7, 1), bodyColor, 0, 0.35, 0),
    part(new THREE.ConeGeometry(0.82, 0.55, 4), 0xffffff, 0, 0.97, 0, 0, Math.PI / 4),
    part(box(0.2, 0.3, 0.02), 0x6b4423, 0, 0.15, 0.51),
    part(box(0.18, 0.16, 0.02), 0xffd166, 0.28, 0.42, 0.51),
    part(box(0.18, 0.16, 0.02), 0xffd166, -0.28, 0.42, 0.51),
    part(box(0.12, 0.3, 0.12), 0x8d5524, 0.25, 1.1, 0.1),
  ]);
}

// Houses face the road
function placeHouses(it, i, first) {
  placeBlocks(19, 30, 5, 6, 1, 1.2)(it, i, first);
  it.ry = it.x > 0 ? -Math.PI / 2 : Math.PI / 2;
}

const SCENERY = {
  city: [
    new Scroller(pineGeo, vcMat, 34, placeScenery(7, 16, 0.8, 1.4)),
    new Scroller(roundTreeGeo, vcMat, 28, placeScenery(7, 18, 0.8, 1.3)),
    new Scroller(bushGeo, vcMat, 30, placeScenery(5.8, 9, 0.6, 1.2)),
    new Scroller(unitBox, new THREE.MeshLambertMaterial({ flatShading: true }), 26, placeBlocks(21, 34, 5, 9, 0.8, 3), {
      colors: [0xffadad, 0xffd6a5, 0xfdffb6, 0xcaffbf, 0x9bf6ff, 0xa0c4ff, 0xbdb2ff, 0xffc6ff],
    }),
  ],
  desert: [
    new Scroller(cactusGeo, vcMat, 30, placeScenery(6.5, 18, 0.8, 1.3)),
    new Scroller(rockGeo, vcMat, 26, placeScenery(6, 20, 0.6, 1.8)),
    new Scroller(dryBushGeo, vcMat, 26, placeScenery(5.8, 12, 0.6, 1.2)),
    new Scroller(unitBox, new THREE.MeshLambertMaterial({ flatShading: true }), 18, placeBlocks(24, 40, 9, 16, 0.4, 0.9), {
      colors: [0xe07a3f, 0xd9663b, 0xf4a261, 0xc8553d, 0xe9c46a],
    }),
  ],
  night: [
    new Scroller(pineGeo, vcMat, 26, placeScenery(8, 16, 0.8, 1.3)),
    new Scroller(buildNightBuilding(), vcBasic, 30, placeBlocks(18, 32, 5, 8, 1, 3.2)),
    new Scroller(lampGeo, vcBasic, lampCount, lampInit),
    new Scroller(poolGeo, new THREE.MeshBasicMaterial({ color: 0xffa62b, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), lampCount, poolInit),
  ],
  snow: [
    new Scroller(snowPineGeo, vcMat, 40, placeScenery(7, 18, 0.8, 1.4)),
    new Scroller(snowmanGeo, vcMat, 8, placeScenery(6.5, 10, 0.9, 1.1, false)),
    new Scroller(snowMoundGeo, vcMat, 26, placeScenery(5.8, 14, 0.6, 1.4)),
    new Scroller(buildHouse(0xb5523b), vcMat, 12, placeHouses),
    new Scroller(buildHouse(0x4895ef), vcMat, 12, placeHouses),
  ],
};

// Clouds
const cloudGeo = merge([
  part(new THREE.IcosahedronGeometry(3, 0), 0xffffff, 0, 0, 0),
  part(new THREE.IcosahedronGeometry(2.3, 0), 0xffffff, 2.8, -0.4, 0.5),
  part(new THREE.IcosahedronGeometry(2.1, 0), 0xffffff, -2.7, -0.6, -0.3),
]);
const cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
const clouds = [];
for (let i = 0; i < 7; i++) {
  const c = new THREE.Mesh(cloudGeo, cloudMat);
  c.position.set(-90 + i * 30 + Math.random() * 10, 28 + Math.random() * 14, -230 - Math.random() * 30);
  const s = 1.2 + Math.random() * 1.2;
  c.scale.set(s * 1.4, s * 0.8, s);
  scene.add(c);
  clouds.push(c);
}

// Night sky stars + moon
const starGeo = new THREE.BufferGeometry();
{
  const n = 260;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI - Math.PI;
    const e = 0.08 + Math.random() * 0.9;
    arr[i * 3] = Math.cos(a) * Math.cos(e) * 250;
    arr[i * 3 + 1] = Math.sin(e) * 250;
    arr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 250;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
}
const nightSky = new THREE.Group();
nightSky.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false })));
const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshBasicMaterial({ color: 0xfff6d5, fog: false }));
moon.position.set(60, 70, -220);
nightSky.add(moon);
scene.add(nightSky);

// Falling snow
const SNOW_N = 360;
const snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N; i++) {
  snowPos[i * 3] = (Math.random() - 0.5) * 34;
  snowPos[i * 3 + 1] = Math.random() * 16;
  snowPos[i * 3 + 2] = -70 + Math.random() * 70;
}
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowfall = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.13 }));
snowfall.frustumCulled = false;
scene.add(snowfall);
function updateSnow(dt, dz) {
  if (!snowfall.visible) return;
  const t = performance.now() * 0.001;
  for (let i = 0; i < SNOW_N; i++) {
    const k = i * 3;
    snowPos[k + 1] -= dt * (2 + (i % 5) * 0.4);
    snowPos[k] += Math.sin(t + i) * dt * 0.6;
    snowPos[k + 2] += dz * 0.7;
    if (snowPos[k + 1] < 0 || snowPos[k + 2] > 1) {
      snowPos[k + 1] = 10 + Math.random() * 6;
      snowPos[k + 2] = -70 + Math.random() * 68;
      snowPos[k] = (Math.random() - 0.5) * 34;
    }
  }
  snowGeo.attributes.position.needsUpdate = true;
}

let currentTheme = null;
function applyTheme(key) {
  if (currentTheme === key) return;
  currentTheme = key;
  const t = THEMES[key];
  scene.background.set(t.sky);
  scene.fog.color.set(t.sky);
  scene.fog.near = t.fogNear;
  scene.fog.far = t.fogFar;
  groundMat.color.set(t.ground);
  roadMat.color.set(t.road);
  hemi.color.set(t.hemi[0]);
  hemi.groundColor.set(t.hemi[1]);
  hemi.intensity = t.hemi[2];
  sun.color.set(t.sun[0]);
  sun.intensity = t.sun[1];
  setCurbColors(t.curbA, t.curbB);
  for (const k of THEME_KEYS) for (const s of SCENERY[k]) s.visible = k === key;
  for (const c of clouds) c.visible = t.clouds;
  cloudMat.color.set(key === 'desert' ? 0xfff4e6 : 0xffffff);
  nightSky.visible = key === 'night';
  snowfall.visible = key === 'snow';
  beam.visible = key === 'night';
  coinMat.emissive.set(key === 'night' ? 0xb07a00 : 0x6b4a00);
}

/* =========================================================
   Player
   ========================================================= */
const player = new THREE.Mesh(playerGeos[save.selected], vcMat);
scene.add(player);
// Fake headlight beams (night only): additive trapezoid on the road ahead of the car
const beamGeo = new THREE.BufferGeometry();
beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.8, 0, -2, 0.8, 0, -2, -2.6, 0, -16, 0.8, 0, -2, 2.6, 0, -16, -2.6, 0, -16]), 3));
{
  const n = [0.42, 0.38, 0.22]; // warm near the car, fading to nothing far away
  beamGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([...n, ...n, 0, 0, 0, ...n, 0, 0, 0, 0, 0, 0]), 3));
}
const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
beam.position.y = 0.03;
beam.visible = false;
player.add(beam);

/* =========================================================
   Traffic
   ========================================================= */
const carTypes = [
  buildSedan(0x4cc9f0),
  buildSedan(0x7b2cbf, { stripe: 0xffffff }),
  buildSedan(0x80ed99),
  buildSedan(0xff9f1c),
  buildSedan(0xffd60a, { taxi: true }),
  buildSedan(0xf1f3f5, { roof: 0x3a86ff }),
  buildVan(0x3a86ff),
  buildVan(0xffffff),
  buildTruck(0xe63946, 0xf1faee),
  buildTruck(0x2a9d8f, 0xffb703),
];
const TRUCKS_FROM = 8;

const traffic = [];
function getCar() {
  for (const c of traffic) if (!c.active) return c;
  const mesh = new THREE.Mesh(carTypes[0].geo, vcMat);
  scene.add(mesh);
  const c = { mesh, active: false, halfL: 2, halfW: 0.85, lane: 0, wobble: 0 };
  traffic.push(c);
  return c;
}
function spawnCar(lane, z) {
  const c = getCar();
  const idx = Math.random() < 0.18 ? TRUCKS_FROM + Math.floor(Math.random() * 2) : Math.floor(Math.random() * TRUCKS_FROM);
  const t = carTypes[idx];
  c.mesh.geometry = t.geo;
  c.halfL = t.halfL;
  c.halfW = t.halfW;
  c.lane = lane;
  c.active = true;
  c.wobble = Math.random() * Math.PI * 2;
  c.nm = false; // near miss already awarded for this car
  c.mesh.position.set(LANES[lane], 0, z);
  c.mesh.rotation.set(0, Math.PI, 0);
  c.mesh.visible = true;
}

/* =========================================================
   Coins (instanced)
   ========================================================= */
const MAX_COINS = 60;
const coinGeo = merge([
  part(cyl(0.62, 0.62, 0.16, 14), 0xffc300, 0, 0, 0, Math.PI / 2),
  part(cyl(0.42, 0.42, 0.2, 14), 0xffe066, 0, 0, 0, Math.PI / 2),
  part(box(0.12, 0.42, 0.22), 0xffb000, 0, 0, 0),
]);
const coinMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x6b4a00 });
const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, MAX_COINS);
coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
coinMesh.frustumCulled = false;
scene.add(coinMesh);
const coins = [];
for (let i = 0; i < MAX_COINS; i++) coins.push({ active: false, x: 0, z: 0, phase: 0 });
function spawnCoin(lane, z) {
  for (const c of coins) {
    if (!c.active) {
      c.active = true;
      c.x = LANES[lane];
      c.z = z;
      c.phase = z * 0.4;
      return;
    }
  }
}

/* =========================================================
   Particles (instanced cubes)
   ========================================================= */
const MAX_PARTS = 160;
const partMesh = new THREE.InstancedMesh(box(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial(), MAX_PARTS);
partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
partMesh.frustumCulled = false;
scene.add(partMesh);
const parts = [];
for (let i = 0; i < MAX_PARTS; i++) {
  parts.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, s: 1 });
  partMesh.setColorAt(i, tmpColor.set(0xffffff));
}
let partCursor = 0;
const CONFETTI = [0xff3864, 0xffd60a, 0x4cc9f0, 0x80ed99, 0xb5179e, 0xff9f1c];
function burst(x, y, z, n, palette, power = 6, size = 1) {
  for (let k = 0; k < n; k++) {
    const i = partCursor;
    const p = parts[i];
    partCursor = (partCursor + 1) % MAX_PARTS;
    p.x = x;
    p.y = y;
    p.z = z;
    const a = Math.random() * Math.PI * 2;
    const sp = power * (0.4 + Math.random() * 0.8);
    p.vx = Math.cos(a) * sp;
    p.vz = Math.sin(a) * sp * 0.6;
    p.vy = power * (0.5 + Math.random());
    p.max = p.life = 0.5 + Math.random() * 0.5;
    p.r = Math.random() * 6;
    p.s = size * (0.6 + Math.random() * 0.8);
    partMesh.setColorAt(i, tmpColor.set(palette[k % palette.length]));
  }
  partMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt, worldDz) {
  for (let i = 0; i < MAX_PARTS; i++) {
    const p = parts[i];
    if (p.life > 0) {
      p.life -= dt;
      p.vy -= 22 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt + worldDz * 0.5;
      if (p.y < 0.1) {
        p.y = 0.1;
        p.vy *= -0.4;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      p.r += dt * 10;
      const k = Math.max(0, p.life / p.max) * p.s;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.r, p.r * 0.7, 0);
      dummy.scale.set(k, k, k);
    } else {
      dummy.position.set(0, -10, 0);
      dummy.scale.set(0, 0, 0);
    }
    dummy.updateMatrix();
    partMesh.setMatrixAt(i, dummy.matrix);
  }
  partMesh.instanceMatrix.needsUpdate = true;
}

/* =========================================================
   Power-up pickups + shield glow
   ========================================================= */
const puGeos = {
  magnet: merge([
    part(box(0.3, 0.6, 0.3), 0xff3b5c, -0.32, 0.0, 0),
    part(box(0.3, 0.6, 0.3), 0xff3b5c, 0.32, 0.0, 0),
    part(box(0.94, 0.3, 0.3), 0xff3b5c, 0, -0.42, 0),
    part(box(0.3, 0.22, 0.3), 0xffffff, -0.32, 0.41, 0),
    part(box(0.3, 0.22, 0.3), 0xffffff, 0.32, 0.41, 0),
  ]),
  shield: (() => {
    const o = new THREE.OctahedronGeometry(0.72, 0);
    o.scale(1, 1.1, 0.45);
    return merge([part(o, 0x3a86ff), part(box(0.16, 0.7, 0.72), 0xffffff), part(box(0.6, 0.16, 0.72), 0xffffff, 0, 0.1, 0)]);
  })(),
  double: merge([
    part(cyl(0.42, 0.42, 0.14, 12), 0xffc300, -0.2, 0.14, 0.1, Math.PI / 2),
    part(cyl(0.28, 0.28, 0.16, 12), 0xffe066, -0.2, 0.14, 0.1, Math.PI / 2),
    part(cyl(0.42, 0.42, 0.14, 12), 0xffc300, 0.2, -0.14, -0.1, Math.PI / 2),
    part(cyl(0.28, 0.28, 0.16, 12), 0xffe066, 0.2, -0.14, -0.1, Math.PI / 2),
  ]),
};
const puBubbleGeo = new THREE.IcosahedronGeometry(1.05, 1);
const puBubbleMats = {};
for (const k of PU_KEYS) {
  puBubbleMats[k] = new THREE.MeshBasicMaterial({ color: POWERUPS[k].color, transparent: true, opacity: 0.32, depthWrite: false });
}
const pickups = [];
for (let i = 0; i < 3; i++) {
  const group = new THREE.Group();
  const icon = new THREE.Mesh(puGeos.magnet, vcBasic);
  const bubble = new THREE.Mesh(puBubbleGeo, puBubbleMats.magnet);
  group.add(icon, bubble);
  group.visible = false;
  scene.add(group);
  pickups.push({ group, icon, bubble, active: false, type: 'magnet' });
}
function spawnPickup(type, lane, z) {
  const pk = pickups.find((q) => !q.active);
  if (!pk) return false;
  pk.active = true;
  pk.type = type;
  pk.icon.geometry = puGeos[type];
  pk.bubble.material = puBubbleMats[type];
  pk.group.position.set(LANES[lane], 1.25, z);
  pk.group.visible = true;
  return true;
}

const shieldGlow = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
);
// bright wireframe shell so it reads as a force field in every theme
shieldGlow.add(
  new THREE.Mesh(shieldGlow.geometry, new THREE.MeshBasicMaterial({ color: 0xbdf0ff, wireframe: true, transparent: true, opacity: 0.7, depthWrite: false, fog: false }))
);
shieldGlow.position.y = 0.8;
shieldGlow.visible = false;
player.add(shieldGlow);

/* =========================================================
   Game state
   ========================================================= */
const state = {
  mode: 'loading', // menu | levels | garage | playing | paused | crashing | over | completing | complete
  level: null, // level object or null for endless
  params: ENDLESS_PARAMS,
  car: carById(save.selected),
  lane: 1,
  x: 0,
  speed: 14,
  elapsed: 0,
  distance: 0,
  coins: 0,
  spawnTimer: 0,
  lastFree: [true, true, true],
  timer: 0,
  slow: 1,
  shake: 0,
  shield: 0, // permanent shield charges (Titan armor, daily free shield)
  fx: { magnet: 0, shield: 0, double: 0 }, // seconds left on each power-up
  fxMax: { magnet: 1, shield: 1, double: 1 },
  puTimer: 0,
  time: 0, // seconds since the run started (keeps running during the tutorial)
  nearMisses: 0,
  leftLane: -1, // lane the player most recently swerved out of...
  leftAt: -9, // ...and when (state.time)
  tutorial: 0, // 0 off, 1 waiting for swipes, 2 "well done" message
  tutSwipes: 0,
  tutTimer: 0,
  invuln: 0,
  shownScore: -1,
  shownCoins: -1,
  hitCar: null,
  result: null,
};
let garageIndex = 0;
let garageReturn = 'menu';
let infoLevel = null;

function clearWorld() {
  for (const c of traffic) {
    c.active = false;
    c.mesh.visible = false;
  }
  for (const c of coins) c.active = false;
  for (const p of parts) p.life = 0;
  for (const pk of pickups) {
    pk.active = false;
    pk.group.visible = false;
  }
  for (const k of PU_KEYS) state.fx[k] = 0;
  shieldGlow.visible = false;
  refreshPowerHUD();
  state.tutorial = 0;
  $('tutorial').classList.add('hidden');
  $('nearmiss').classList.remove('show');
}

/* ---------- Daily missions ---------- */
function ensureMissions() {
  const today = dateStr(new Date());
  if (save.missions && save.missions.date === today) return;
  const types = Object.keys(MISSION_DEFS);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  save.missions = {
    date: today,
    list: types.slice(0, 3).map((type) => {
      const tiers = MISSION_DEFS[type].tiers;
      const [target, reward] = tiers[Math.floor(Math.random() * tiers.length)];
      return { type, target, reward, progress: 0, claimed: false };
    }),
  };
  persist();
}
function missionProgress(type, value) {
  const ms = save.missions;
  if (!ms) return;
  for (const m of ms.list) {
    if (m.type !== type || m.progress >= m.target) continue;
    m.progress = Math.min(m.target, MISSION_DEFS[type].max ? Math.max(m.progress, value) : m.progress + value);
    if (m.progress >= m.target) {
      toast('🎯 Mission complete!');
      refreshMissionBadge();
    }
  }
}
function refreshMissionBadge() {
  const n = save.missions ? save.missions.list.filter((m) => m.progress >= m.target && !m.claimed).length : 0;
  $('btn-missions').classList.toggle('badge', n > 0);
}
function openMissions() {
  ensureMissions();
  state.mode = 'missions';
  showHUD(false);
  showScreen('missions');
  renderMissions();
}
function renderMissions() {
  const list = $('mission-list');
  list.innerHTML = '';
  save.missions.list.forEach((m) => {
    const def = MISSION_DEFS[m.type];
    const done = m.progress >= m.target;
    const card = document.createElement('div');
    card.className = 'up-card mission' + (m.claimed ? ' claimed' : '');
    card.style.setProperty('--pu', done ? '#2fbf71' : '#4361ee');
    card.innerHTML = `
      <div class="up-icon">${def.icon}</div>
      <div class="up-body">
        <div class="up-name">${def.text(m.target)}</div>
        <div class="m-bar"><i style="width:${(m.progress / m.target) * 100}%"></i></div>
        <div class="up-dur">${m.progress} / ${m.target}</div>
      </div>`;
    const btn = document.createElement('button');
    btn.className = 'cta small up-buy';
    if (m.claimed) {
      btn.textContent = '✓ Done';
      btn.disabled = true;
    } else {
      btn.innerHTML = `<span class="coin-icon"></span>${done ? 'Claim ' : ''}${m.reward}`;
      btn.disabled = !done;
      btn.addEventListener('click', () => {
        Sound.init();
        if (m.claimed || m.progress < m.target) return;
        m.claimed = true;
        save.coins += m.reward;
        persist();
        Sound.buy();
        toast(`+${m.reward} coins!`);
        refreshWallets();
        refreshMissionBadge();
        renderMissions();
      });
    }
    card.appendChild(btn);
    list.appendChild(card);
  });
}
/** Called once whenever a run ends (crash, level complete or quit). */
function endRunMissions() {
  const dist = Math.floor(state.distance);
  missionProgress('distance', dist);
  if (!state.level) missionProgress('endless', dist);
}

/* ---------- Settings ---------- */
function renderSettings() {
  document.querySelectorAll('#settings .switch').forEach((b) => {
    const on = settings[b.dataset.setting];
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
  });
}
function openSettings() {
  renderSettings();
  $('settings').classList.remove('hidden');
}

/* ---------- First-time tutorial ---------- */
function startTutorial() {
  state.tutorial = 1;
  state.tutSwipes = 0;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  $('tut-text').textContent = coarse ? 'Swipe left or right to change lanes' : 'Swipe, or press ← → to change lanes';
  $('tutorial').classList.remove('hidden', 'done');
}
function tutorialSwipe() {
  if (state.tutorial !== 1) return;
  state.tutSwipes++;
  if (state.tutSwipes >= 2) {
    state.tutorial = 2;
    state.tutTimer = 1.8;
    $('tut-text').textContent = 'Nice! Dodge the cars and grab the coins';
    $('tutorial').classList.add('done');
  }
}
function finishTutorial() {
  state.tutorial = 0;
  $('tutorial').classList.add('hidden');
  state.spawnTimer = 0.4;
  if (!save.tutorialDone) {
    save.tutorialDone = true;
    persist();
  }
}

/* ---------- Near miss ---------- */
function nearMiss(c) {
  c.nm = true;
  state.nearMisses++;
  state.coins += NEAR_MISS_BONUS;
  missionProgress('nearmiss', 1);
  Sound.nearMiss();
  vibrate(25);
  burst(c.mesh.position.x, 1.2, player.position.z, 8, [0xffffff, 0xffd60a], 5, 0.8);
  const el = $('nearmiss');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/* ---------- Power-up effects ---------- */
const puEls = {};
for (const k of PU_KEYS) {
  const el = document.createElement('div');
  el.className = 'pu hidden';
  el.style.setProperty('--pu', POWERUPS[k].css);
  el.innerHTML = `<span class="pu-icon">${POWERUPS[k].icon}</span><div class="pu-bar"><i></i></div>`;
  $('powerups').appendChild(el);
  puEls[k] = { el, fill: el.querySelector('i'), shown: false };
}
function refreshPowerHUD() {
  for (const k of PU_KEYS) {
    const on = state.fx[k] > 0;
    const e = puEls[k];
    if (on !== e.shown) {
      e.shown = on;
      e.el.classList.toggle('hidden', !on);
    }
    if (on) {
      e.fill.style.transform = `scaleX(${Math.min(1, state.fx[k] / state.fxMax[k])})`;
      e.el.classList.toggle('ending', state.fx[k] < 2);
    }
  }
}
function activatePower(type) {
  missionProgress('powerups', 1);
  const d = puDuration(type);
  state.fx[type] = d;
  state.fxMax[type] = d;
  Sound.power();
  burst(player.position.x, 1.4, player.position.z - 1, 18, [POWERUPS[type].color, 0xffffff], 7, 1);
  refreshPowerHUD();
}

function resetPlayerPose() {
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  player.visible = true;
  state.lane = 1;
  state.x = 0;
}

function showHUD(on) {
  ui.hud.classList.toggle('hidden', !on);
  ui.pause.classList.toggle('hidden', !on);
}

/* ---------- Menus ---------- */
function goMenu() {
  state.mode = 'menu';
  clearWorld();
  resetPlayerPose();
  state.slow = 1;
  player.geometry = playerGeos[save.selected];
  applyTheme(LEVELS[save.unlocked].theme);
  showHUD(false);
  showScreen('menu');
  ensureMissions();
  refreshMissionBadge();
  checkDaily();
}

/* ---------- Upgrades shop ---------- */
function openUpgrades() {
  state.mode = 'upgrades';
  showHUD(false);
  showScreen('upgrades');
  renderUpgrades();
}
function renderUpgrades() {
  const list = $('upgrade-list');
  list.innerHTML = '';
  for (const k of PU_KEYS) {
    const pu = POWERUPS[k];
    const lvl = save.upgrades[k];
    const maxed = lvl >= MAX_UPGRADE;
    const card = document.createElement('div');
    card.className = 'up-card';
    card.style.setProperty('--pu', pu.css);
    const pips = Array.from({ length: MAX_UPGRADE }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
    const dur = puDurationAt(k, lvl).toFixed(1).replace('.0', '');
    const next = maxed ? '' : ` <span class="up-next">→ ${puDurationAt(k, lvl + 1).toFixed(1).replace('.0', '')}s</span>`;
    card.innerHTML = `
      <div class="up-icon">${pu.icon}</div>
      <div class="up-body">
        <div class="up-name">${pu.name} <small>Lv ${lvl}/${MAX_UPGRADE}</small></div>
        <div class="up-desc">${pu.desc}</div>
        <div class="up-pips">${pips}</div>
        <div class="up-dur">Lasts ${dur}s${next}</div>
      </div>`;
    const btn = document.createElement('button');
    btn.className = 'cta small up-buy';
    if (maxed) {
      btn.textContent = 'MAX';
      btn.disabled = true;
    } else {
      const cost = UPGRADE_COSTS[lvl];
      btn.innerHTML = `<span class="coin-icon"></span>${cost}`;
      btn.addEventListener('click', () => {
        Sound.init();
        if (save.coins < cost) {
          Sound.click();
          toast(`Need ${cost - save.coins} more coins`);
          return;
        }
        save.coins -= cost;
        save.upgrades[k] = lvl + 1;
        persist();
        Sound.buy();
        refreshWallets();
        renderUpgrades();
        toast(`${pu.icon} ${pu.name} upgraded to Lv ${lvl + 1}!`);
      });
    }
    card.appendChild(btn);
    list.appendChild(card);
  }
}

/* ---------- Daily reward ---------- */
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
let dailyDay = 0; // streak day waiting to be claimed (0 = nothing pending)
function checkDaily() {
  const now = new Date();
  const today = dateStr(now);
  if (save.daily.last === today) return;
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const consecutive = save.daily.last === dateStr(y) && save.daily.streak >= 1;
  dailyDay = consecutive ? (save.daily.streak % 7) + 1 : 1; // after day 7 the cycle restarts
  $('daily-sub').textContent = consecutive ? `Day ${dailyDay} in a row. Keep it going!` : 'Come back every day for bigger rewards!';
  $('daily-grid').innerHTML = DAILY_REWARDS.map((coinsN, i) => {
    const d = i + 1;
    const cls = d < dailyDay ? 'done' : d === dailyDay ? 'today' : '';
    return `<div class="day ${cls}${d === 7 ? ' big' : ''}"><span class="day-n">${d < dailyDay ? '✓' : 'Day ' + d}</span><span class="day-r"><span class="coin-icon"></span>${coinsN}</span>${d === 7 ? '<span class="day-x">+ 🛡️ free shield</span>' : ''}</div>`;
  }).join('');
  $('daily-claim').textContent = `Claim ${DAILY_REWARDS[dailyDay - 1]} coins${dailyDay === 7 ? ' + 🛡️' : ''}`;
  $('daily').classList.remove('hidden');
}
function claimDaily() {
  if (!dailyDay) return;
  const reward = DAILY_REWARDS[dailyDay - 1];
  save.coins += reward;
  if (dailyDay === 7) save.freeShields += 1;
  save.daily = { last: dateStr(new Date()), streak: dailyDay };
  persist();
  Sound.buy();
  burst(0, 2, -2, 50, CONFETTI, 9, 1.2);
  toast(dailyDay === 7 ? `+${reward} coins and a free shield!` : `+${reward} coins!`);
  dailyDay = 0;
  $('daily').classList.add('hidden');
  refreshWallets();
}

function buildLevelList() {
  const list = ui.levelList;
  list.innerHTML = '';
  THEME_KEYS.forEach((key, w) => {
    const t = THEMES[key];
    const sec = document.createElement('section');
    sec.className = `world ${key}`;
    const worldStars = save.stars.slice(w * 5, w * 5 + 5).reduce((a, b) => a + b, 0);
    const locked = save.unlocked < w * 5;
    sec.innerHTML = `<div class="world-head"><span>${t.emoji} ${t.name}${locked ? ' 🔒' : ''}</span><span>⭐ ${worldStars}/15</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'world-grid';
    for (let i = w * 5; i < w * 5 + 5; i++) {
      const b = document.createElement('button');
      const unlocked = i <= save.unlocked;
      b.className = 'lvl' + (unlocked ? '' : ' locked') + (unlocked && i === save.unlocked && save.stars[i] === 0 ? ' current' : '');
      if (unlocked) {
        const st = [0, 1, 2].map((k) => `<span class="${k < save.stars[i] ? 'on' : ''}">★</span>`).join('');
        b.innerHTML = `${i + 1}<span class="st">${st}</span>`;
        b.addEventListener('click', () => {
          Sound.click();
          openLevelInfo(LEVELS[i]);
        });
      } else {
        b.innerHTML = '🔒';
        b.disabled = true;
      }
      grid.appendChild(b);
    }
    sec.appendChild(grid);
    list.appendChild(sec);
  });
}

function openLevels() {
  state.mode = 'levels';
  clearWorld();
  resetPlayerPose();
  player.geometry = playerGeos[save.selected];
  showHUD(false);
  buildLevelList();
  showScreen('levels');
  const cur = ui.levelList.querySelector('.world:nth-child(' + (Math.floor(save.unlocked / 5) + 1) + ')');
  if (cur) ui.levelList.scrollTop = Math.max(0, cur.offsetTop - 70);
}

function openLevelInfo(lvl) {
  infoLevel = lvl;
  applyTheme(lvl.theme);
  $('li-world').textContent = `${THEMES[lvl.theme].emoji} ${THEMES[lvl.theme].name}`;
  $('li-world').style.background = { city: '#4895ef', desert: '#e76f51', night: '#3a0ca3', snow: '#8eaccd' }[lvl.theme];
  $('li-title').textContent = `Level ${lvl.num}`;
  $('li-goal').textContent = goalText(lvl);
  const got = save.stars[lvl.index];
  $('li-stars').innerHTML = starRules(lvl)
    .map((r, k) => `<li class="${k < got ? 'got' : ''}">${'★'.repeat(k + 1)}${'☆'.repeat(2 - k)} ${r}</li>`)
    .join('');
  $('li-car').textContent = carById(save.selected).name;
  ui.levelInfo.classList.remove('hidden');
}

function openGarage(returnTo) {
  garageReturn = returnTo;
  state.mode = 'garage';
  clearWorld();
  resetPlayerPose();
  showHUD(false);
  garageIndex = CARS.findIndex((c) => c.id === save.selected);
  showScreen('garage');
  $('g-dots').innerHTML = CARS.map(() => '<i></i>').join('');
  renderGarage();
}

function renderGarage() {
  const car = CARS[garageIndex];
  player.geometry = playerGeos[car.id];
  $('g-name').textContent = car.name;
  $('g-perk').textContent = car.perk;
  $('g-speed').style.width = car.bars[0] * 20 + '%';
  $('g-handling').style.width = car.bars[1] * 20 + '%';
  $('g-size').style.width = car.bars[2] * 20 + '%';
  [...$('g-dots').children].forEach((d, i) => d.classList.toggle('on', i === garageIndex));
  const btn = $('g-action');
  const owned = save.owned.includes(car.id);
  btn.disabled = false;
  if (save.selected === car.id) {
    btn.textContent = '✓ Selected';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Select';
  } else if (!carUnlocked(car)) {
    btn.textContent = `🔒 Unlocks at Level ${car.unlock}`;
    btn.disabled = true;
  } else {
    btn.textContent = `Buy · ${car.price} coins`;
  }
}

function garageAction() {
  const car = CARS[garageIndex];
  if (save.owned.includes(car.id)) {
    save.selected = car.id;
    Sound.click();
  } else if (carUnlocked(car)) {
    if (save.coins < car.price) {
      toast(`Need ${car.price - save.coins} more coins`);
      Sound.click();
      return;
    }
    save.coins -= car.price;
    save.owned.push(car.id);
    save.selected = car.id;
    Sound.buy();
    burst(0, 1.5, 0, 50, CONFETTI, 8, 1.2);
    toast(`${car.name} is yours!`);
  }
  persist();
  refreshWallets();
  renderGarage();
}

function closeGarage() {
  player.geometry = playerGeos[save.selected];
  player.rotation.set(0, 0, 0);
  if (garageReturn === 'levels') {
    openLevels();
    if (infoLevel) openLevelInfo(infoLevel);
  } else {
    goMenu();
  }
}

/* ---------- Runs ---------- */
function startRun(level) {
  Sound.init();
  clearWorld();
  state.level = level;
  state.params = level ? level.params : ENDLESS_PARAMS;
  state.car = carById(save.selected);
  applyTheme(level ? level.theme : 'city');
  player.geometry = playerGeos[state.car.id];
  resetPlayerPose();
  Object.assign(state, {
    mode: 'playing',
    speed: state.params.startSpeed,
    elapsed: 0,
    distance: 0,
    coins: 0,
    spawnTimer: 0.8,
    lastFree: [true, true, true],
    timer: 0,
    slow: 1,
    shake: 0,
    shield: state.car.shield ? 1 : 0,
    puTimer: 5 + Math.random() * 4,
    time: 0,
    nearMisses: 0,
    leftLane: -1,
    leftAt: -9,
    invuln: 0,
    shownScore: -1,
    shownCoins: -1,
    hitCar: null,
  });
  if (save.freeShields > 0) {
    // daily reward: a free shield that lasts until it is hit
    save.freeShields -= 1;
    persist();
    state.shield += 1;
    toast('🛡️ Free shield active!');
  }
  shieldGlow.scale.set(state.car.halfW + 0.95, 1.45, state.car.halfL + 0.9);
  showScreen(null);
  showHUD(true);
  ui.score.textContent = '0';
  ui.coins.textContent = '0';
  ui.shield.classList.toggle('hidden', !state.shield);
  if (level) {
    ui.thirdLabel.textContent = 'LEVEL';
    ui.best.textContent = level.num;
    ui.goal.classList.remove('hidden');
    ui.goalLabel.textContent = goalText(level);
    updateGoalUI();
  } else {
    ui.thirdLabel.textContent = 'BEST';
    ui.best.textContent = save.best;
    ui.goal.classList.add('hidden');
  }
  Sound.engineStart();
  ensureMissions();
  if (!save.tutorialDone) startTutorial();
}

function goalProgress() {
  const lvl = state.level;
  return lvl.type === 'distance' ? Math.floor(state.distance) : state.coins;
}
function updateGoalUI() {
  const lvl = state.level;
  const p = Math.min(goalProgress(), lvl.target);
  ui.goalCount.textContent = `${p} / ${lvl.target}${lvl.type === 'distance' ? ' m' : ''}`;
  ui.goalFill.style.width = (p / lvl.target) * 100 + '%';
}

function crash(car) {
  state.mode = 'crashing';
  state.timer = 1.1;
  state.shake = 0.9;
  state.hitCar = car;
  showHUD(false);
  ui.hud.classList.remove('hidden');
  Sound.engineStop();
  Sound.crash();
  vibrate([60, 40, 120]);
  burst(player.position.x, 1, player.position.z - 1.5, 40, [0xff3864, 0xffffff, 0xffd60a, 0x333333, 0xff9f1c], 9, 1.4);
}

function absorbHit(car) {
  // The timed power-up shield is used up first, then permanent charges.
  if (state.fx.shield > 0) state.fx.shield = 0;
  else state.shield -= 1;
  refreshPowerHUD();
  state.invuln = 1.2;
  state.shake = 0.5;
  ui.shield.classList.toggle('hidden', state.shield <= 0);
  vibrate(40);
  Sound.shield();
  burst(car.mesh.position.x, 1.2, car.mesh.position.z, 40, [0x3a86ff, 0xffffff, 0x9bf6ff, 0x333333], 10, 1.3);
  car.active = false;
  car.mesh.visible = false;
  toast('🛡️ Shield broken!');
}

function showOver() {
  state.mode = 'over';
  ui.hud.classList.add('hidden');
  const score = Math.floor(state.distance);
  save.coins += state.coins;
  endRunMissions();
  const lvl = state.level;
  $('final-score').textContent = score;
  $('final-coins').textContent = state.coins;
  if (lvl) {
    $('over-goal-row').classList.remove('hidden');
    $('over-goal-label').textContent = lvl.type === 'distance' ? 'Distance' : 'Coins';
    $('over-goal').textContent = `${Math.min(goalProgress(), lvl.target)} / ${lvl.target}`;
    $('over-best-row').classList.add('hidden');
    $('new-best').classList.add('hidden');
    $('again').textContent = '↻ Retry';
    $('over-menu').textContent = 'Levels';
  } else {
    const isBest = score > save.best;
    if (isBest) save.best = score;
    $('over-goal-row').classList.add('hidden');
    $('over-best-row').classList.remove('hidden');
    $('final-best').textContent = save.best;
    $('new-best').classList.toggle('hidden', !isBest);
    $('again').textContent = 'Play Again';
    $('over-menu').textContent = 'Menu';
  }
  persist();
  showScreen('over');
}

function completeLevel() {
  const lvl = state.level;
  state.mode = 'completing';
  state.timer = 1.0;
  ui.pause.classList.add('hidden');
  for (const pk of pickups) {
    pk.active = false;
    pk.group.visible = false;
  }
  for (const c of coins) {
    if (c.active && c.z > -70) burst(c.x, 1, c.z, 4, [0xffd60a, 0xfff3b0], 4, 0.7);
    c.active = false;
  }
  Sound.engineStop();
  Sound.fanfare();
  burst(player.position.x, 2, player.position.z - 2, 60, CONFETTI, 10, 1.2);
  // Celebrate: nearby traffic pops into confetti
  for (const c of traffic) {
    if (c.active && c.mesh.position.z > -70) {
      burst(c.mesh.position.x, 1, c.mesh.position.z, 12, CONFETTI, 7, 1);
      c.active = false;
      c.mesh.visible = false;
    }
  }
  const stars = computeStars(lvl, state.coins, state.elapsed);
  const bonus = stars * (10 + lvl.index * 3);
  const prevUnlocked = save.unlocked;
  save.stars[lvl.index] = Math.max(save.stars[lvl.index], stars);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, lvl.index + 1));
  save.coins += state.coins + bonus;
  missionProgress('levels', 1);
  missionProgress('stars', stars);
  endRunMissions();
  persist();
  const unlockMsgs = [];
  if (save.unlocked > prevUnlocked) {
    if (save.unlocked % 5 === 0) unlockMsgs.push(`${THEMES[LEVELS[save.unlocked].theme].emoji} New world: ${THEMES[LEVELS[save.unlocked].theme].name}!`);
    for (const car of CARS) {
      if (car.unlock - 1 > prevUnlocked && car.unlock - 1 <= save.unlocked) unlockMsgs.push(`🚗 ${car.name} now in the garage!`);
    }
  }
  if (lvl.index === LEVELS.length - 1 && save.stars[lvl.index] > 0) unlockMsgs.push('🏆 You beat all 20 levels!');
  state.result = { stars, bonus, unlockMsgs };
}

function showComplete() {
  state.mode = 'complete';
  ui.hud.classList.add('hidden');
  const lvl = state.level;
  const r = state.result;
  $('c-level').textContent = lvl.num;
  $('c-coins').textContent = state.coins;
  $('c-bonus').textContent = '+' + r.bonus;
  $('c-total').textContent = state.coins + r.bonus;
  const msgEl = $('c-unlock');
  msgEl.innerHTML = r.unlockMsgs.join('<br />');
  msgEl.classList.toggle('hidden', r.unlockMsgs.length === 0);
  const starEls = document.querySelectorAll('#complete .bstar');
  starEls.forEach((el, i) => {
    el.classList.toggle('on', i < r.stars);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
  for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.star(i), 200 + i * 200);
  const next = $('c-next');
  const last = lvl.index >= LEVELS.length - 1;
  next.disabled = last;
  next.textContent = last ? '🏆 All levels done!' : 'Next Level ▶';
  showScreen('complete');
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  Sound.engineStop();
  showScreen('paused');
  ui.pause.classList.add('hidden');
}
function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  clock.getDelta();
  showScreen(null);
  ui.pause.classList.remove('hidden');
  Sound.engineStart();
}
function quitRun() {
  save.coins += state.coins;
  endRunMissions();
  persist();
  Sound.click();
  if (state.level) openLevels();
  else goMenu();
}

function changeLane(dir) {
  if (state.mode !== 'playing') return;
  const nl = THREE.MathUtils.clamp(state.lane + dir, 0, 2);
  if (nl !== state.lane) {
    state.leftLane = state.lane;
    state.leftAt = state.time;
    state.lane = nl;
    Sound.swoosh();
    tutorialSwipe();
  }
}

/* ---------- Spawning ---------- */
function rowInterval() {
  const p = state.params;
  return Math.max(p.intMin, p.intStart - state.elapsed * p.intDecay);
}
function worldSpeed() {
  return state.speed * state.car.speedMul;
}

function spawnRow() {
  const p = state.params;
  const doubleProb = Math.min(p.dblMax, p.dblBase + state.elapsed * p.dblGain);
  const free = [true, true, true];
  if (Math.random() < doubleProb) {
    // two cars, one free lane reachable from a previously free lane
    const options = [0, 1, 2].filter((l) => state.lastFree.some((f, i) => f && Math.abs(i - l) <= 1));
    const keep = options[Math.floor(Math.random() * options.length)];
    for (let l = 0; l < 3; l++) {
      if (l !== keep) {
        free[l] = false;
        spawnCar(l, SPAWN_Z + (Math.random() - 0.5) * 1.5);
      }
    }
  } else {
    const l = Math.floor(Math.random() * 3);
    free[l] = false;
    spawnCar(l, SPAWN_Z);
  }
  state.lastFree = free;

  // Coins sit behind this row (further away), in a lane that is safe for this row.
  const interval = rowInterval();
  const gap = interval * (worldSpeed() + TRAFFIC_OWN_SPEED);
  const coinChance = state.level && state.level.type === 'coins' ? 0.8 : 0.6;
  const freeLanes = [0, 1, 2].filter((l) => free[l]);
  const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
  const count = Math.min(6, Math.floor((gap - 10) / 3) + 1);
  // Now and then a power-up takes the first slot of the coin line.
  let first = 0;
  if (state.puTimer <= 0 && count >= 1) {
    const type = PU_KEYS[Math.floor(Math.random() * PU_KEYS.length)];
    if (spawnPickup(type, lane, SPAWN_Z - 4.5)) {
      state.puTimer = 9 + Math.random() * 7;
      first = 1;
    }
  }
  if (first || Math.random() < coinChance) {
    for (let i = first; i < count; i++) spawnCoin(lane, SPAWN_Z - 4.5 - i * 3);
  }
  return interval;
}

/* =========================================================
   Input
   ========================================================= */
let touchX = 0;
let touchY = 0;
let touchActive = false;
const SWIPE_PX = 28;

window.addEventListener(
  'touchstart',
  (e) => {
    Sound.init();
    const t = e.changedTouches[0];
    touchX = t.clientX;
    touchY = t.clientY;
    touchActive = true;
  },
  { passive: true }
);
window.addEventListener(
  'touchmove',
  (e) => {
    if (state.mode === 'playing') e.preventDefault();
    if (!touchActive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      if (state.mode === 'garage' && !e.target.closest('button')) {
        cycleGarage(dx > 0 ? -1 : 1);
      } else {
        changeLane(dx > 0 ? 1 : -1);
      }
      touchActive = false;
    }
  },
  { passive: false }
);
window.addEventListener('touchend', () => {
  touchActive = false;
});

// Mouse drag swipe for desktop testing
let mouseDown = false;
let mouseX = 0;
window.addEventListener('mousedown', (e) => {
  mouseDown = true;
  mouseX = e.clientX;
});
window.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  const dx = e.clientX - mouseX;
  if (Math.abs(dx) > 40) {
    changeLane(dx > 0 ? 1 : -1);
    mouseDown = false;
  }
});
window.addEventListener('mouseup', () => {
  mouseDown = false;
});

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      if (state.mode === 'garage') cycleGarage(-1);
      else changeLane(-1);
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      if (state.mode === 'garage') cycleGarage(1);
      else changeLane(1);
      e.preventDefault();
      break;
    case 'Escape':
    case 'KeyP':
      if (state.mode === 'playing') pauseGame();
      else if (state.mode === 'paused') resumeGame();
      break;
  }
});

function cycleGarage(dir) {
  garageIndex = (garageIndex + dir + CARS.length) % CARS.length;
  Sound.swoosh();
  renderGarage();
}

const on = (id, fn) =>
  $(id).addEventListener('click', (e) => {
    e.stopPropagation();
    Sound.init();
    fn(e);
  });

on('btn-levels', () => {
  Sound.click();
  openLevels();
});
on('btn-endless', () => startRun(null));
on('btn-garage', () => {
  Sound.click();
  openGarage('menu');
});
document.querySelectorAll('[data-back]').forEach((b) =>
  b.addEventListener('click', () => {
    Sound.click();
    if (state.mode === 'garage') closeGarage();
    else goMenu();
  })
);
on('li-close', () => {
  ui.levelInfo.classList.add('hidden');
  infoLevel = null;
});
ui.levelInfo.addEventListener('click', (e) => {
  if (e.target === ui.levelInfo) {
    ui.levelInfo.classList.add('hidden');
    infoLevel = null;
  }
});
on('li-play', () => {
  const lvl = infoLevel;
  infoLevel = null;
  if (lvl) startRun(lvl);
});
on('li-change', () => openGarage('levels'));
on('btn-upgrades', () => {
  Sound.click();
  openUpgrades();
});
on('daily-claim', claimDaily);
on('g-prev', () => cycleGarage(-1));
on('g-next', () => cycleGarage(1));
on('g-action', garageAction);
on('again', () => {
  if (state.mode === 'over') startRun(state.level);
});
on('over-menu', () => {
  Sound.click();
  if (state.level) openLevels();
  else goMenu();
});
on('c-next', () => {
  const n = state.level.index + 1;
  if (n < LEVELS.length) startRun(LEVELS[n]);
});
on('c-retry', () => startRun(state.level));
on('c-levels', () => {
  Sound.click();
  openLevels();
});
on('pause', pauseGame);
on('p-resume', resumeGame);
on('p-quit', quitRun);

on('btn-missions', () => {
  Sound.click();
  openMissions();
});
on('btn-settings', () => {
  Sound.click();
  openSettings();
});
on('p-settings', openSettings);
on('settings-close', () => $('settings').classList.add('hidden'));
$('settings').addEventListener('click', (e) => {
  if (e.target.id === 'settings') e.target.classList.add('hidden');
});
document.querySelectorAll('#settings .switch').forEach((b) =>
  b.addEventListener('click', () => {
    const k = b.dataset.setting;
    settings[k] = !settings[k];
    persist();
    Sound.init();
    Sound.applySettings();
    if (k === 'vibration') vibrate(30);
    else Sound.click();
    renderSettings();
  })
);
['touchstart', 'mousedown'].forEach((ev) => {
  ui.pause.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
});

/* =========================================================
   Main loop
   ========================================================= */
const clock = new THREE.Clock();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsChecks = 0;
let garageSpin = 0;

document.addEventListener('visibilitychange', () => {
  clock.getDelta();
  if (document.hidden) {
    if (state.mode === 'playing') pauseGame();
    Sound.engineStop();
    Sound.musicStop();
  } else {
    Sound.musicStart();
  }
});

function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function update(dt) {
  const mode = state.mode;
  if (mode === 'paused') return;

  // --- Speed ---
  let ws;
  if (mode === 'playing') {
    const p = state.params;
    state.time += dt;
    if (state.tutorial === 2) {
      state.tutTimer -= dt;
      if (state.tutTimer <= 0) finishTutorial();
    }
    if (!state.tutorial) state.elapsed += dt; // the clock (and traffic) wait for the tutorial
    state.speed = Math.min(p.maxSpeed, p.startSpeed + state.elapsed * p.speedGain);
    ws = worldSpeed();
    state.distance += ws * dt;
    Sound.engineUpdate(ws);
  } else if (mode === 'menu' || mode === 'levels' || mode === 'upgrades' || mode === 'missions') {
    ws = 14;
  } else if (mode === 'garage') {
    ws = 0;
  } else {
    state.slow = Math.max(0, state.slow - dt * 2.5);
    ws = worldSpeed() * state.slow * state.slow;
  }
  const trafficK = mode === 'playing' ? 1 : state.slow * state.slow;
  const roadDz = ws * dt;
  const trafficDz = mode === 'garage' ? 0 : ws * dt + TRAFFIC_OWN_SPEED * dt * trafficK;

  // --- World scroll ---
  dashes.update(roadDz);
  updateCurbs(roadDz);
  for (const s of SCENERY[currentTheme]) s.update(roadDz);
  for (const c of clouds) {
    c.position.x += dt * 0.6;
    if (c.position.x > 120) c.position.x = -120;
  }
  updateSnow(dt, roadDz);

  // --- Spawning ---
  if (mode === 'playing' && !state.tutorial) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) state.spawnTimer += spawnRow();
  }

  // --- Player ---
  const car = state.car;
  if (mode === 'garage') {
    garageSpin += dt * 0.7;
    player.rotation.set(0, garageSpin, 0);
    player.position.set(0, CARS[garageIndex].id === 'comet' ? 0.15 + Math.sin(garageSpin * 3) * 0.08 : 0, 0);
  } else if (mode === 'playing' || mode === 'menu' || mode === 'levels' || mode === 'upgrades' || mode === 'missions') {
    const prevX = state.x;
    const handling = mode === 'playing' ? car.handling : 13;
    state.x += (LANES[state.lane] - state.x) * Math.min(1, dt * handling);
    const vx = (state.x - prevX) / Math.max(dt, 1e-4);
    player.position.x = state.x;
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, -vx * 0.02, Math.min(1, dt * 12));
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -vx * 0.012, Math.min(1, dt * 12));
    const hover = player.geometry === playerGeos.comet ? 0.15 + Math.sin(performance.now() * 0.006) * 0.06 : 0;
    player.position.y = hover + Math.sin(performance.now() * 0.05) * 0.015;
    if (state.invuln > 0) {
      state.invuln -= dt;
      player.visible = state.invuln <= 0 || Math.floor(state.invuln * 12) % 2 === 0;
    }
  } else if (mode === 'crashing' || mode === 'over') {
    player.visible = true;
    player.rotation.y += dt * 9 * state.slow;
    player.position.y = Math.max(0, player.position.y + (state.slow - 0.4) * dt * 3);
    player.position.z += dt * 4 * state.slow;
  } else {
    player.visible = true;
  }

  const spin = performance.now() * 0.004;

  // --- Traffic ---
  const halfW = car.halfW;
  const halfL = car.halfL;
  for (const c of traffic) {
    if (!c.active) continue;
    const m = c.mesh;
    m.position.z += trafficDz;
    if (c === state.hitCar) {
      m.rotation.y += dt * 4 * state.slow;
      m.position.z -= trafficDz * 1.5;
    } else {
      c.wobble += dt * 3;
      m.position.x = LANES[c.lane] + Math.sin(c.wobble) * 0.06;
    }
    if (m.position.z - c.halfL > DESPAWN_Z) {
      c.active = false;
      m.visible = false;
      continue;
    }
    if (mode === 'playing' && state.invuln <= 0) {
      const dx = Math.abs(m.position.x - state.x);
      const dz = Math.abs(m.position.z - player.position.z);
      if (dx < c.halfW + halfW - 0.1 && dz < c.halfL + halfL - 0.15) {
        if (state.shield > 0 || state.fx.shield > 0) absorbHit(c);
        else crash(c);
      } else if (!c.nm && dz < c.halfL + halfL - 0.15) {
        // Near miss: the car is alongside us right now (so it can no longer hit us head-on)
        // and either we are squeezing past it mid lane-change, or we swerved out of its
        // lane a split second ago.
        const gap = dx - (c.halfW + halfW);
        const lateDodge = c.lane === state.leftLane && state.time - state.leftAt < 0.4;
        if (gap < 0.85 || lateDodge) nearMiss(c);
      }
    }
  }

  // --- Coins ---
  // --- Power-ups: timers, pickups, shield glow ---
  if (mode === 'playing') {
    state.puTimer -= dt;
    let any = false;
    for (const k of PU_KEYS) {
      if (state.fx[k] > 0) {
        any = true;
        state.fx[k] -= dt;
        if (state.fx[k] <= 0) {
          state.fx[k] = 0;
          Sound.powerEnd();
        }
      }
    }
    if (any) refreshPowerHUD();
  }
  for (const pk of pickups) {
    if (!pk.active) continue;
    const g = pk.group;
    g.position.z += trafficDz;
    g.position.y = 1.25 + Math.sin(spin * 1.3) * 0.15;
    pk.icon.rotation.y = spin * 0.8;
    const pulse = 1 + Math.sin(spin * 2.5) * 0.08;
    pk.bubble.scale.set(pulse, pulse, pulse);
    if (g.position.z > DESPAWN_Z) {
      pk.active = false;
      g.visible = false;
    } else if (mode === 'playing' && Math.abs(g.position.x - state.x) < 1.4 && Math.abs(g.position.z - player.position.z) < halfL + 0.3) {
      pk.active = false;
      g.visible = false;
      activatePower(pk.type);
    }
  }
  const shielded = (mode === 'playing' || mode === 'paused') && (state.shield > 0 || state.fx.shield > 0);
  if (shielded) {
    // blink when only the timed shield is left and it is about to run out
    const ending = state.shield <= 0 && state.fx.shield < 2;
    shieldGlow.visible = !ending || Math.floor(state.fx.shield * 8) % 2 === 0;
    shieldGlow.material.opacity = 0.26 + Math.sin(spin * 2) * 0.08;
    shieldGlow.rotation.y = -player.rotation.y + spin * 0.3;
  } else if (shieldGlow.visible) {
    shieldGlow.visible = false;
  }

  const fxMagnet = mode === 'playing' && state.fx.magnet > 0;
  const magnet = fxMagnet || (mode === 'playing' && car.magnet);
  const magRange = fxMagnet ? 7 : 4.5; // the power-up reaches every lane
  const magDepth = fxMagnet ? -24 : -16;
  const coinValue = state.fx.double > 0 ? 2 : 1;
  for (let i = 0; i < MAX_COINS; i++) {
    const c = coins[i];
    if (c.active) {
      c.z += trafficDz;
      if (magnet && c.z > magDepth && c.z < 3 && Math.abs(c.x - state.x) < magRange) {
        c.x += (state.x - c.x) * Math.min(1, dt * 7);
      }
      if (c.z > DESPAWN_Z) c.active = false;
      else if (mode === 'playing' && Math.abs(c.x - state.x) < 1.3 && Math.abs(c.z - player.position.z) < halfL - 0.25) {
        c.active = false;
        state.coins += coinValue;
        missionProgress('coins', coinValue);
        vibrate(10, 70);
        Sound.coin();
        burst(c.x, 1.0, c.z, 10, [0xffd60a, 0xfff3b0, 0xffb703], 5, 0.8);
      }
    }
    if (c.active) {
      dummy.position.set(c.x, 1.0 + Math.sin(spin * 1.5 + c.phase) * 0.15, c.z);
      dummy.rotation.set(0, spin + c.phase, 0);
      dummy.scale.set(1, 1, 1);
    } else {
      dummy.position.set(0, -10, 0);
      dummy.scale.set(0, 0, 0);
    }
    dummy.updateMatrix();
    coinMesh.setMatrixAt(i, dummy.matrix);
  }
  coinMesh.instanceMatrix.needsUpdate = true;

  updateParticles(dt, roadDz);

  // --- Level goal ---
  if (state.mode === 'playing' && state.level && goalProgress() >= state.level.target) completeLevel();

  // --- Timed transitions ---
  if (state.mode === 'crashing' || state.mode === 'completing') {
    state.timer -= dt;
    if (state.timer <= 0) {
      if (state.mode === 'crashing') showOver();
      else showComplete();
    }
  }

  // --- Camera ---
  if (mode === 'garage') {
    camera.position.set(0, 2.6, 6.4);
    camera.lookAt(0, -0.9, 0);
    if (Math.abs(camera.fov - baseFov) > 0.05) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
  } else {
    const camX = player.position.x * 0.55;
    camera.position.x += (camX - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y = 5.6;
    camera.position.z = 8.6;
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 1.6);
      const s = state.shake * state.shake * 0.6;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.lookAt(camera.position.x * 0.4, 0.6, -14);
    const p = state.params;
    const speedK = mode === 'playing' ? (state.speed - p.startSpeed) / Math.max(1, p.maxSpeed - p.startSpeed) : 0;
    const fov = baseFov + speedK * 8;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
  }

  // --- HUD ---
  if (state.mode === 'playing') {
    const sc = Math.floor(state.distance);
    if (sc !== state.shownScore) {
      state.shownScore = sc;
      ui.score.textContent = sc;
      if (!state.level && sc > save.best) ui.best.textContent = sc;
      if (state.level && state.level.type === 'distance') updateGoalUI();
    }
    if (state.coins !== state.shownCoins) {
      if (state.shownCoins >= 0) bump(ui.coins);
      state.shownCoins = state.coins;
      ui.coins.textContent = state.coins;
      if (state.level && state.level.type === 'coins') updateGoalUI();
    }
  }
}

function adaptQuality(dt) {
  if (fpsChecks > 6) return;
  fpsAccum += dt;
  fpsFrames++;
  if (fpsAccum > 2) {
    const avg = fpsAccum / fpsFrames;
    fpsAccum = 0;
    fpsFrames = 0;
    fpsChecks++;
    if (avg > 1 / 48 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
  }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 20);
  update(dt);
  renderer.render(scene, camera);
  if (state.mode === 'playing') adaptQuality(dt);
}

// Boot
window.__laneRushBooted = true;
window.__laneRush = { state, save, LEVELS, CARS, traffic, pickups, spawnPickup }; // handy for debugging
goMenu();
ui.loading.classList.add('hidden');
loop();
