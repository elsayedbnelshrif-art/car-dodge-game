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
    sky: 0x1b2d70, // dark blue, not black
    fogNear: 50,
    fogFar: 170,
    ground: 0x2f7a5c,
    road: 0x4a5070,
    curbA: 0xffd60a,
    curbB: 0x4a5078,
    hemi: [0xcbd7ff, 0x3d5080, 1.85],
    sun: [0xbccaff, 1.35],
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
Object.assign(THEMES, {
  rain: {
    name: 'Rain',
    emoji: '🌧️',
    sky: 0x8496a8,
    fogNear: 40,
    fogFar: 150,
    ground: 0x4f8a5b,
    road: 0x2b3038,
    curbA: 0xd94a5c,
    curbB: 0xdfe6ee,
    hemi: [0xdfe8f2, 0x5b7a66, 1.4],
    sun: [0xdde6f0, 0.9],
    clouds: true,
  },
  mountain: {
    name: 'Mountain',
    emoji: '⛰️',
    sky: 0xa6d8ff,
    fogNear: 55,
    fogFar: 170,
    ground: 0x6fae5c,
    road: 0x444a52,
    curbA: 0xffffff,
    curbB: 0xff3b5c,
    hemi: [0xffffff, 0x6f8f5f, 1.6],
    sun: [0xffffff, 1.9],
    clouds: true,
  },
  tunnel: {
    name: 'Tunnel',
    emoji: '🚇',
    sky: 0xbfe3ff,
    fogNear: 55,
    fogFar: 165,
    ground: 0xb9a27a,
    road: 0x3f434c,
    curbA: 0xffd60a,
    curbB: 0x2b2b2b,
    hemi: [0xffffff, 0xa08f6e, 1.6],
    sun: [0xffffff, 1.8],
    clouds: true,
  },
  highway: {
    name: 'Highway',
    emoji: '🛣️',
    sky: 0x7fc8ff,
    fogNear: 60,
    fogFar: 175,
    ground: 0x9fc45e,
    road: 0x474b55,
    curbA: 0xe9ecef,
    curbB: 0xadb5bd,
    hemi: [0xffffff, 0x8fae5c, 1.65],
    sun: [0xffffff, 1.9],
    clouds: true,
  },
});
THEMES.city.css = '#4895ef';
THEMES.desert.css = '#e76f51';
THEMES.night.css = '#3a0ca3';
THEMES.snow.css = '#8eaccd';
THEMES.rain.css = '#5c7285';
THEMES.mountain.css = '#4f8a5b';
THEMES.tunnel.css = '#6c584c';
THEMES.highway.css = '#495057';
const THEME_KEYS = Object.keys(THEMES);

// Worlds in play order. The first four keep their original 5 levels; later worlds have 10.
// After the last one, "Beyond" generates levels forever.
const WORLDS = [
  { key: 'city', start: 0, count: 5, fx: [] },
  { key: 'desert', start: 5, count: 5, fx: [] },
  { key: 'night', start: 10, count: 5, fx: [] },
  { key: 'snow', start: 15, count: 5, fx: [] },
  { key: 'rain', start: 20, count: 10, fx: ['rain'], blurb: 'Wet road: the car slides when you change lanes' },
  { key: 'mountain', start: 30, count: 10, fx: ['hills'], blurb: 'Winding roads that climb and dive' },
  { key: 'tunnel', start: 40, count: 10, fx: ['tunnels'], blurb: 'Sudden dark tunnels and blinding exits' },
  { key: 'highway', start: 50, count: 10, fx: ['trucks'], blurb: 'Big trucks that change lanes' },
  { key: 'beyond', start: 60, count: Infinity, fx: [], name: 'Beyond', emoji: '♾️', blurb: 'Endless levels that mix every world and keep getting harder' },
];
const CAMPAIGN_LEVELS = 60;
const BEYOND = WORLDS.length - 1;
const worldIndexOf = (i) => (i >= CAMPAIGN_LEVELS ? BEYOND : WORLDS.findIndex((w) => i < w.start + w.count));
const worldName = (w) => WORLDS[w].name || THEMES[WORLDS[w].key].name;
const worldEmoji = (w) => WORLDS[w].emoji || THEMES[WORLDS[w].key].emoji;
const FX_LABELS = { rain: '🌧️ Slippery', hills: '⛰️ Hills', tunnels: '🚇 Tunnels', trucks: '🚛 Lane-changing trucks', boss: '🚓 Police chase' };

/* =========================================================
   Levels
   ========================================================= */
const round50 = (v) => Math.round(v / 50) * 50;
// Deterministic pseudo-random number in [0, 1) so generated levels are the same every time.
function seeded(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const BOSS_TARGETS = [1000, 1400, 1800, 2200];
const levelCache = new Map();
/** Level `i` (0-based). Levels 0..59 are the campaign; everything after is generated. */
function getLevel(i) {
  if (levelCache.has(i)) return levelCache.get(i);
  const w = worldIndexOf(i);
  const world = WORLDS[w];
  const beyond = w === BEYOND;
  const n = i - CAMPAIGN_LEVELS; // how deep into Beyond
  // Difficulty: the first 20 levels are unchanged; new worlds restart a little easier
  // (their mechanics add the challenge) and Beyond keeps creeping up.
  const d = i < 20 ? i / 19 : beyond ? 1 + n * 0.02 : 0.55 + (0.45 * (i - 20)) / 39;
  const pos = beyond ? n % 10 : i - world.start;
  const last = beyond ? pos === 9 : pos === world.count - 1;
  const type = last ? 'boss' : pos % 5 === 1 || pos % 5 === 3 ? 'coins' : 'distance';
  const theme = beyond ? THEME_KEYS[Math.floor(seeded(i, 1) * THEME_KEYS.length)] : world.key;

  const fx = { rain: false, hills: false, tunnels: false, trucks: false, boss: type === 'boss' };
  if (beyond) {
    // mix 1-3 mechanics from all worlds
    const pool = ['rain', 'hills', 'tunnels', 'trucks'].sort((a, b) => seeded(i, a.length + a.charCodeAt(0)) - seeded(i, b.length + b.charCodeAt(0)));
    const count = 1 + Math.floor(seeded(i, 2) * 2.4);
    for (const k of pool.slice(0, count)) fx[k] = true;
  } else {
    for (const k of world.fx) fx[k] = true;
  }
  if (theme === 'rain') fx.rain = true;
  if (theme === 'mountain') fx.hills = true;

  let target;
  if (type === 'boss') target = i < 20 ? BOSS_TARGETS[w] : beyond ? Math.min(6000, 3500 + n * 60) : 2400 + (w - 4) * 300;
  else if (type === 'distance') target = i < 20 ? round50(400 + i * 250) : beyond ? Math.min(8000, round50(4000 + n * 100)) : round50(2400 + (i - 20) * 60);
  else target = i < 20 ? 12 + i * 5 : beyond ? Math.min(220, 110 + n * 3) : 60 + (i - 20) * 2;

  const lvl = {
    index: i,
    num: i + 1,
    world: w,
    theme,
    type,
    target,
    fx,
    params: {
      startSpeed: 18 + 12 * Math.min(d, 1.3),
      speedGain: 0.3 + 0.3 * Math.min(d, 1.2),
      maxSpeed: Math.min(80, 42 + 24 * d),
      intStart: Math.max(0.7, 1.3 - 0.45 * d),
      intMin: Math.max(0.42, 0.8 - 0.25 * d),
      intDecay: 0.006 + 0.004 * Math.min(d, 1.5),
      dblBase: Math.min(0.45, 0.05 + 0.3 * d),
      dblGain: 0.004 + 0.004 * Math.min(d, 1.5),
      dblMax: Math.min(0.7, 0.25 + 0.35 * d),
    },
  };
  const p = lvl.params;
  if (theme === 'night') {
    // Night is harder to read, so traffic is a little slower and sparser.
    p.startSpeed *= 0.92;
    p.speedGain *= 0.9;
    p.maxSpeed *= 0.9;
    p.intStart *= 1.2;
    p.intMin *= 1.2;
    p.dblBase *= 0.7;
    p.dblMax *= 0.75;
  }
  if (fx.boss) {
    // The police car is the main threat: thin the traffic out.
    p.intStart *= 1.35;
    p.intMin *= 1.35;
    p.dblBase = 0;
    p.dblMax *= 0.3;
  }
  if (fx.tunnels) {
    p.intStart *= 1.1;
    p.intMin *= 1.1;
  }
  if (type === 'coins') {
    lvl.s2 = Math.round(target * 0.95); // seconds for the 2nd star
    lvl.s3 = Math.round(target * 0.7); // seconds for the "fast" challenge
  } else {
    lvl.s2 = Math.round(target / (i < 20 ? 16 : 24)); // coins for the 2nd star
  }
  // 3rd star: a challenge, rotated so neighbouring levels differ.
  const kinds = type === 'coins' ? ['fast', 'nearMiss', 'noPower'] : ['coinsPct', 'nearMiss', 'noPower'];
  lvl.challenge = { kind: kinds[i % 3], n: Math.min(8, 3 + Math.floor(Math.min(d, 2) * 3)) };
  levelCache.set(i, lvl);
  return lvl;
}

function goalText(lvl) {
  if (lvl.type === 'boss') return `Escape the police: ${lvl.target} m`;
  return lvl.type === 'distance' ? `Reach ${lvl.target} m` : `Collect ${lvl.target} coins`;
}
function challengeText(lvl) {
  switch (lvl.challenge.kind) {
    case 'fast':
      return `Finish in under ${lvl.s3}s`;
    case 'nearMiss':
      return `Do ${lvl.challenge.n} near misses`;
    case 'noPower':
      return "Don't pick up any power-ups";
    default:
      return 'Collect at least 80% of the coins';
  }
}
function challengeDone(lvl) {
  switch (lvl.challenge.kind) {
    case 'fast':
      return state.elapsed <= lvl.s3;
    case 'nearMiss':
      return state.nearMisses >= lvl.challenge.n;
    case 'noPower':
      return state.powerUsed === 0;
    default:
      return state.coinsGot > 0 && state.coinsGot / (state.coinsGot + state.coinsMissed) >= 0.8;
  }
}
/** The three star objectives, in order. */
function starRules(lvl) {
  const second = lvl.type === 'coins' ? `Finish in under ${lvl.s2}s` : `Collect ${lvl.s2}+ coins`;
  return [lvl.type === 'boss' ? 'Reach the finish line' : 'Reach the goal', second, challengeText(lvl)];
}
function secondStarDone(lvl) {
  return lvl.type === 'coins' ? state.elapsed <= lvl.s2 : state.coins >= lvl.s2;
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
// Special cars: free, but only once you have earned enough stars in total.
CARS.push(
  { id: 'aurora', name: 'Aurora', stars: 40, price: 0, speedMul: 1.15, handling: 20, halfW: 0.72, halfL: 1.75, bars: [4, 5, 2], perk: '✨ Near misses pay double', nearMissMul: 2 },
  { id: 'legend', name: 'Legend', stars: 100, price: 0, speedMul: 1.2, handling: 20, halfW: 0.78, halfL: 1.9, bars: [5, 5, 3], perk: '👑 Coin magnet and armor built in', magnet: true, shield: true }
);
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
    stars: Array(CAMPAIGN_LEVELS).fill(0),
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
      // Stars are a growing list: 60 campaign levels plus however far the player got in Beyond.
      const rs = Array.isArray(raw.stars) ? raw.stars : [];
      s.stars = Array.from({ length: Math.max(CAMPAIGN_LEVELS, Math.min(rs.length, 5000)) }, (_, i) => Math.max(0, Math.min(3, rs[i] | 0)));
      if (!Array.isArray(s.owned) || !s.owned.includes('rookie')) s.owned = ['rookie', ...(Array.isArray(s.owned) ? s.owned : [])];
      if (!s.owned.includes(s.selected)) s.selected = 'rookie';
      s.unlocked = Math.max(0, Math.min(4999, s.unlocked | 0));
      // Earlier versions stopped at level 20: anyone who finished their last level moves on.
      while (s.stars[s.unlocked] > 0) s.unlocked++;
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
const carUnlocked = (car) => (car.stars ? totalStars() >= car.stars : save.unlocked >= car.unlock - 1);

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
    worlds: $('worlds'),
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
const RUN_MODES = ['playing', 'paused', 'crashing', 'completing'];
/** Small, short-lived message under the HUD. Used for everything that pops up during a run so nothing covers the road. */
function notice(msg, kind = '') {
  const el = $('notice');
  el.textContent = msg;
  el.className = 'notice ' + kind;
  void el.offsetWidth; // restart the animation
  el.classList.add('show');
}
function toast(msg) {
  if (RUN_MODES.includes(state.mode)) {
    notice(msg);
    return;
  }
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

  function siren(high, urgent) {
    if (!ctx) return;
    tone(high ? 960 : 720, ctx.currentTime, urgent ? 0.14 : 0.36, 'square', urgent ? 0.05 : 0.022);
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

  return { init, siren, applySettings, musicStart, musicStop, nearMiss, coin, swoosh, click, crash, shield, fanfare, star, buy, power, powerEnd, engineStart, engineUpdate, engineStop };
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

// Curved world: every material bends geometry sideways / up-down with the square of its
// distance from the camera. Gameplay stays on a straight road; only the picture curves.
const bendUniform = { value: new THREE.Vector2(0, 0) };
const bendTarget = new THREE.Vector2(0, 0);
THREE.ShaderChunk.common = 'uniform vec2 uBend;\n' + THREE.ShaderChunk.common;
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace(
  'gl_Position = projectionMatrix * mvPosition;',
  'mvPosition.xy += uBend * ( mvPosition.z * mvPosition.z );\n\tgl_Position = projectionMatrix * mvPosition;'
);
THREE.Material.prototype.onBeforeCompile = function (shader) {
  shader.uniforms.uBend = bendUniform;
};

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
PLAYER_BUILDERS.aurora = () => {
  const p = [];
  const body = 0x00d4c8;
  p.push(part(box(1.9, 0.02, 4.0), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(1.6, 0.42, 3.7), body, 0, 0.52, 0));
  p.push(part(box(1.2, 0.2, 1.3), body, 0, 0.6, -2.2)); // pointed nose
  p.push(part(box(1.25, 0.36, 1.5), GLASS, 0, 0.9, 0.2));
  p.push(part(box(1.3, 0.08, 1.0), 0xb5179e, 0, 1.1, 0.3));
  p.push(part(box(0.3, 0.02, 3.72), 0xb5179e, 0, 0.74, 0));
  p.push(part(box(0.1, 0.5, 0.8), 0xb5179e, -0.75, 0.95, 1.5)); // twin fins
  p.push(part(box(0.1, 0.5, 0.8), 0xb5179e, 0.75, 0.95, 1.5));
  p.push(part(box(1.7, 0.07, 0.45), 0x111111, 0, 1.22, 1.6));
  p.push(part(box(1.4, 0.1, 0.06), 0xff4d6d, 0, 0.62, 1.86));
  p.push(part(box(0.4, 0.1, 0.06), 0xfff6c4, -0.5, 0.6, -2.86));
  p.push(part(box(0.4, 0.1, 0.06), 0xfff6c4, 0.5, 0.6, -2.86));
  addWheels(p, 0.82, [-1.2, 1.25], 0.36, 0.3, 0xb5179e);
  return merge(p);
};
PLAYER_BUILDERS.legend = () => {
  const p = [];
  const body = 0xffc300;
  p.push(part(box(2.1, 0.02, 4.5), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(1.85, 0.45, 4.2), body, 0, 0.55, 0));
  p.push(part(box(1.7, 0.18, 1.5), body, 0, 0.82, -1.2));
  p.push(part(box(1.35, 0.38, 1.6), GLASS, 0, 0.95, 0.35));
  p.push(part(box(1.4, 0.1, 1.2), 0x111111, 0, 1.18, 0.4));
  p.push(part(box(0.5, 0.02, 4.22), 0x111111, 0, 0.79, 0));
  p.push(part(box(0.12, 0.45, 0.12), 0x111111, -0.7, 0.98, 1.95));
  p.push(part(box(0.12, 0.45, 0.12), 0x111111, 0.7, 0.98, 1.95));
  p.push(part(box(2.0, 0.1, 0.55), body, 0, 1.24, 1.95));
  for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) p.push(part(box(0.16, 0.22, 0.16), 0xffffff, x, 1.38, 1.95)); // crown
  p.push(part(box(1.7, 0.12, 0.06), 0xff1030, 0, 0.66, 2.11));
  p.push(part(box(0.45, 0.12, 0.06), 0xfff6c4, -0.6, 0.62, -2.11));
  p.push(part(box(0.45, 0.12, 0.06), 0xfff6c4, 0.6, 0.62, -2.11));
  p.push(part(box(1.95, 0.14, 0.24), 0x111111, 0, 0.36, -2.1));
  addWheels(p, 0.94, [-1.3, 1.35], 0.42, 0.34, 0xffffff);
  return merge(p);
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

const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (const s of [-1, 1]) {
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 420), edgeMat);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(s * 4.55, 0.01, -150);
  scene.add(edge);
}

const dummy = new THREE.Object3D();
// The current tunnel (if any). Declared early because scenery hides itself inside it.
const tun = { active: false, z: 0, len: 0, cooldown: 0 };

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
      if (this.tunnelHide && tun.active && it.z < tun.z + 3 && it.z > tun.z - tun.len - 3) dummy.scale.set(0, 0, 0); // inside the rock
      else dummy.scale.set(it.s, it.s * it.sy, it.s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Lane dashes
const DASH_PERIOD = 9;
const dashCount = Math.ceil(WRAP_LEN / DASH_PERIOD);
const dashes = new Scroller(box(0.18, 0.02, 3), dashMat, dashCount * 2, (it, i, first) => {
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

// ---- New worlds
const greyRockGeo = merge([
  part(new THREE.DodecahedronGeometry(0.9, 0), 0x8a9099, 0, 0.5, 0),
  part(new THREE.DodecahedronGeometry(0.55, 0), 0x6f7680, 0.8, 0.3, 0.3),
]);
const peakGeo = merge([
  part(new THREE.ConeGeometry(1, 1.6, 6), 0x7d8590, 0, 0.8, 0),
  part(new THREE.ConeGeometry(0.42, 0.68, 6), 0xffffff, 0, 1.27, 0),
]);
const billboardGeo = (panel) =>
  merge([
    part(box(0.3, 5, 0.3), 0x6c757d, -1.8, 2.5, 0),
    part(box(0.3, 5, 0.3), 0x6c757d, 1.8, 2.5, 0),
    part(box(5.6, 2.8, 0.25), 0xf8f9fa, 0, 6.2, 0),
    part(box(5.1, 2.3, 0.3), panel, 0, 6.2, 0),
    part(box(3.2, 0.35, 0.34), 0xffffff, -0.5, 6.6, 0),
    part(box(2.0, 0.35, 0.34), 0xffffff, -1.1, 5.9, 0),
  ]);
const puddleGeo = new THREE.CircleGeometry(1, 10);
puddleGeo.rotateX(-Math.PI / 2);
const blockMat = () => new THREE.MeshLambertMaterial({ flatShading: true });
Object.assign(SCENERY, {
  rain: [
    new Scroller(pineGeo, vcMat, 28, placeScenery(7, 16, 0.8, 1.4)),
    new Scroller(roundTreeGeo, vcMat, 22, placeScenery(7, 18, 0.8, 1.3)),
    new Scroller(unitBox, blockMat(), 22, placeBlocks(21, 34, 5, 9, 0.8, 3), { colors: [0x8d99ae, 0xa3b1c2, 0x778da9, 0xb8c4d0, 0x9a8c98] }),
    // puddles on the wet road
    new Scroller(puddleGeo, new THREE.MeshBasicMaterial({ color: 0xb9cde0, transparent: true, opacity: 0.2, depthWrite: false }), 18, (it, i, first) => {
      it.x = (Math.random() - 0.5) * 7.6;
      if (first) it.z = WRAP_MIN + Math.random() * WRAP_LEN;
      it.y = 0.012;
      it.s = 0.7 + Math.random() * 1.3;
    }),
  ],
  mountain: [
    new Scroller(pineGeo, vcMat, 40, placeScenery(7, 20, 0.8, 1.5)),
    new Scroller(greyRockGeo, vcMat, 26, placeScenery(6, 22, 0.7, 2.2)),
    new Scroller(bushGeo, vcMat, 18, placeScenery(5.8, 10, 0.6, 1.1)),
    new Scroller(peakGeo, vcMat, 16, placeBlocks(34, 75, 16, 30, 0.8, 1.3)),
  ],
  tunnel: [
    new Scroller(rockGeo, vcMat, 30, placeScenery(6, 22, 0.7, 2)),
    new Scroller(dryBushGeo, vcMat, 22, placeScenery(5.8, 13, 0.6, 1.2)),
    new Scroller(pineGeo, vcMat, 12, placeScenery(8, 18, 0.8, 1.2)),
    new Scroller(unitBox, blockMat(), 18, placeBlocks(18, 42, 8, 16, 0.5, 1.4), { colors: [0xa68a64, 0x936639, 0xb6ad90, 0x7f5539, 0xc2a878] }),
  ],
  highway: [
    new Scroller(billboardGeo(0xe63946), vcMat, 5, placeScenery(10, 15, 1, 1.15, false)),
    new Scroller(billboardGeo(0x4361ee), vcMat, 5, placeScenery(10, 15, 1, 1.15, false)),
    new Scroller(lampGeo, vcMat, lampCount, lampInit),
    new Scroller(bushGeo, vcMat, 22, placeScenery(6, 12, 0.6, 1.2)),
    new Scroller(roundTreeGeo, vcMat, 14, placeScenery(16, 26, 0.9, 1.4)),
    new Scroller(unitBox, blockMat(), 14, placeBlocks(34, 50, 6, 10, 1.2, 3.5), { colors: [0xced4da, 0xadb5bd, 0xdee2e6, 0xa5b4c3] }),
  ],
});

for (const k of THEME_KEYS) for (const sc of SCENERY[k]) sc.tunnelHide = true;

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
  cloudMat.color.set(key === 'desert' ? 0xfff4e6 : key === 'rain' ? 0x9aa6b2 : 0xffffff);
  nightSky.visible = key === 'night';
  snowfall.visible = key === 'snow';
  const night = key === 'night';
  beam.visible = night;
  headlight.visible = night;
  for (const c of beamCones) c.visible = night;
  carGlow.visible = night;
  // Reflective road paint: at night the markings ignore fog, so they glow into the distance.
  for (const m of [edgeMat, dashMat]) {
    if (m.fog === night) {
      m.fog = !night;
      m.needsUpdate = true;
    }
  }
  edgeMat.color.set(night ? 0xffe9a0 : 0xffffff);
  curbs.material.emissive.set(night ? 0x4a3f12 : 0x000000);
  coinMat.emissive.set(night ? 0xb07a00 : 0x6b4a00);
  amb.sky.set(t.sky);
  amb.fogNear = t.fogNear;
  amb.fogFar = t.fogFar;
  amb.hemi = t.hemi[2];
  amb.sun = t.sun[1];
  amb.night = night;
  amb.dirty = true;
}
// Base ambience of the current theme; tunnels darken it and exits flash it.
const amb = { sky: new THREE.Color(), fogNear: 55, fogFar: 165, hemi: 1.6, sun: 1.8, night: false, dark: 0, flash: 0, dirty: true };

/* =========================================================
   Player
   ========================================================= */
const player = new THREE.Mesh(playerGeos[save.selected], vcMat);
scene.add(player);
// Fake headlight beams (night only): additive trapezoid on the road ahead of the car
const beamGeo = new THREE.BufferGeometry();
beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.8, 0, -2, 0.8, 0, -2, -3.4, 0, -26, 0.8, 0, -2, 3.4, 0, -26, -3.4, 0, -26]), 3));
{
  const n = [0.3, 0.27, 0.16]; // warm near the car, fading to nothing far away
  beamGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([...n, ...n, 0, 0, 0, ...n, 0, 0, 0, 0, 0, 0]), 3));
}
const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
beam.position.y = 0.03;
beam.visible = false;
player.add(beam);

// Real spotlight so the road, curbs and oncoming cars light up ahead of the car (night only).
// It sits well above the car: a lamp at bumper height would hit the flat road at a grazing
// angle and barely light it.
const headlight = new THREE.SpotLight(0xfff0c8, 9, 80, 0.55, 0.8, 0);
headlight.position.set(0, 7, -2);
headlight.target.position.set(0, 0, -24);
headlight.visible = false;
player.add(headlight, headlight.target);

// Visible light shafts: two faint additive cones fading out with distance.
const beamCones = [];
{
  const g = new THREE.ConeGeometry(1.5, 15, 12, 1, true).toNonIndexed();
  g.translate(0, -7.5, 0); // apex at the origin
  g.rotateX(Math.PI / 2 - 0.045); // point forward (-Z), tilted slightly down
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, 1 + pos.getZ(i) / 15) * 0.04; // bright at the lamp, black at the far end
    col[i * 3] = k;
    col[i * 3 + 1] = k * 0.92;
    col[i * 3 + 2] = k * 0.62;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (const x of [-0.6, 0.6]) {
    const cone = new THREE.Mesh(g, m);
    cone.position.set(x, 0.7, -1.9);
    cone.visible = false;
    player.add(cone);
    beamCones.push(cone);
  }
}

// Glowing head and tail lights (night only): soft additive sprites that ignore fog,
// so cars can be spotted from far away.
const GLOW_MAX = 24; // cars
const glowPos = new Float32Array((GLOW_MAX * 4 + 2) * 3).fill(-999);
const glowCol = new Float32Array((GLOW_MAX * 4 + 2) * 3);
const glowGeo = new THREE.BufferGeometry();
glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3));
const glowTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr;
  g2.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
})();
const carGlow = new THREE.Points(
  glowGeo,
  new THREE.PointsMaterial({ map: glowTex, size: 1.9, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
);
carGlow.frustumCulled = false;
carGlow.visible = false;
scene.add(carGlow);
function setGlow(i, x, y, z, r, g, b) {
  glowPos[i * 3] = x;
  glowPos[i * 3 + 1] = y;
  glowPos[i * 3 + 2] = z;
  glowCol[i * 3] = r;
  glowCol[i * 3 + 1] = g;
  glowCol[i * 3 + 2] = b;
}
function updateCarGlow() {
  if (!carGlow.visible) return;
  let n = 0;
  for (let k = 0; k < traffic.length && k < GLOW_MAX; k++) {
    const c = traffic[k];
    if (!c.active) continue;
    const p = c.mesh.position;
    const w = c.halfW - 0.28;
    // Full strength far away (that is where they are needed); dimmer up close, where the
    // sprites get large on screen and our own headlights already light the car.
    const gk = Math.min(1, Math.max(0.22, -p.z / 45));
    // oncoming cars: headlights face the player (+Z), tail lights at the back
    setGlow(n++, p.x - w, 0.78, p.z + c.halfL, gk, gk * 0.95, gk * 0.7);
    setGlow(n++, p.x + w, 0.78, p.z + c.halfL, gk, gk * 0.95, gk * 0.7);
    setGlow(n++, p.x - w, 0.8, p.z - c.halfL, gk, gk * 0.1, gk * 0.1);
    setGlow(n++, p.x + w, 0.8, p.z - c.halfL, gk, gk * 0.1, gk * 0.1);
  }
  if (player.visible) {
    const pp = player.position;
    const hl = state.car.halfL + 0.12;
    setGlow(n++, pp.x - 0.55, pp.y + 0.7, pp.z + hl, 0.3, 0.02, 0.04);
    setGlow(n++, pp.x + 0.55, pp.y + 0.7, pp.z + hl, 0.3, 0.02, 0.04);
  }
  glowGeo.setDrawRange(0, n);
  glowGeo.attributes.position.needsUpdate = true;
  glowGeo.attributes.color.needsUpdate = true;
}

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
function buildBigRig(cab, trailer) {
  const p = [];
  p.push(part(box(2.4, 0.02, 9.6), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(2.1, 1.7, 1.9), cab, 0, 1.3, -3.7));
  p.push(part(box(2.12, 0.6, 0.8), 0x23324d, 0, 1.75, -4.25));
  p.push(part(box(2.2, 2.5, 6.6), trailer, 0, 1.85, 0.9));
  p.push(part(box(2.22, 0.3, 6.62), 0xffffff, 0, 1.3, 0.9));
  p.push(part(box(1.7, 0.3, 9.0), 0x333338, 0, 0.5, 0));
  p.push(part(box(2.16, 0.26, 0.24), 0xdadde5, 0, 0.5, -4.7));
  p.push(part(box(0.4, 0.22, 0.06), 0xfff6c4, -0.75, 0.9, -4.67));
  p.push(part(box(0.4, 0.22, 0.06), 0xfff6c4, 0.75, 0.9, -4.67));
  p.push(part(box(0.25, 0.9, 0.25), 0x8a8f99, -0.9, 2.6, -2.9)); // exhaust stacks
  p.push(part(box(0.25, 0.9, 0.25), 0x8a8f99, 0.9, 2.6, -2.9));
  addWheels(p, 1.0, [-3.6, -2.2, 2.4, 3.6], 0.48, 0.4);
  return { geo: merge(p), halfL: 4.7, halfW: 1.05 };
}
const BIG_RIGS = [buildBigRig(0x1d3557, 0xf1faee), buildBigRig(0xd00000, 0xffba08), buildBigRig(0x2b9348, 0xdee2e6)];

const policeGeo = (() => {
  const p = [];
  p.push(part(box(2.0, 0.02, 4.3), ROAD_SHADOW, 0, 0.015, 0));
  p.push(part(box(1.75, 0.6, 3.9), 0x111418, 0, 0.62, 0));
  p.push(part(box(1.77, 0.5, 1.5), 0xffffff, 0, 0.66, 0.15)); // white doors
  p.push(part(box(1.4, 0.42, 1.9), 0x23324d, 0, 1.13, 0.2));
  p.push(part(box(1.46, 0.12, 1.7), 0xffffff, 0, 1.38, 0.2));
  p.push(part(box(1.2, 0.1, 0.3), 0x222222, 0, 1.47, 0.2)); // light bar base
  p.push(part(box(1.9, 0.3, 0.3), 0x333338, 0, 0.5, -2.0)); // push bar
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, -0.55, 0.74, -1.96));
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, 0.55, 0.74, -1.96));
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, -0.6, 0.72, 1.96));
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, 0.6, 0.72, 1.96));
  addWheels(p, 0.84, [-1.2, 1.2]);
  return merge(p);
})();

const traffic = [];
function getCar() {
  for (const c of traffic) if (!c.active) return c;
  const mesh = new THREE.Mesh(carTypes[0].geo, vcMat);
  scene.add(mesh);
  // blinking indicator, only shown on trucks that are about to change lanes
  const ind = new THREE.Mesh(indGeo, indMat);
  ind.visible = false;
  mesh.add(ind);
  const c = { mesh, ind, active: false, halfL: 2, halfW: 0.85, lane: 0, wobble: 0, mover: null };
  traffic.push(c);
  return c;
}
const indGeo = box(0.75, 0.55, 0.4);
const indMat = new THREE.MeshBasicMaterial({ color: 0xff9100, fog: false });
function killCar(c) {
  c.active = false;
  c.mover = null;
  c.mesh.visible = false;
  c.ind.visible = false;
}
/** `moveTo` (a lane) makes it a big rig that switches to that lane as it approaches. */
function spawnCar(lane, z, moveTo = -1) {
  const c = getCar();
  const idx = Math.random() < 0.18 ? TRUCKS_FROM + Math.floor(Math.random() * 2) : Math.floor(Math.random() * TRUCKS_FROM);
  const t = moveTo >= 0 ? BIG_RIGS[Math.floor(Math.random() * BIG_RIGS.length)] : carTypes[idx];
  c.mover = moveTo >= 0 ? { from: lane, to: moveTo, t: 0, started: false } : null;
  c.ind.visible = false;
  if (c.mover) c.ind.position.set(-Math.sign(moveTo - lane) * 0.85, 3.2, -t.halfL + 0.9); // car is rotated 180°, so local -x is world +x
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
   World mechanics: rain, tunnels, lane-changing trucks, police boss
   ========================================================= */
const NO_FX = { rain: false, hills: false, tunnels: false, trucks: false, boss: false };
const runFx = () => (state.level && RUN_MODES.includes(state.mode) ? state.level.fx : NO_FX);

// ---- Rain streaks
const RAIN_N = 260;
const rainPos = new Float32Array(RAIN_N * 6);
const rainDrops = [];
for (let i = 0; i < RAIN_N; i++) rainDrops.push({ x: (Math.random() - 0.5) * 34, y: Math.random() * 16, z: -58 + Math.random() * 62 });
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xd6e6f5, transparent: true, opacity: 0.55, fog: false }));
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);
function updateRain(dt, dz) {
  for (let i = 0; i < RAIN_N; i++) {
    const d = rainDrops[i];
    d.y -= dt * 40;
    d.x -= dt * 5;
    d.z += dz * 0.8;
    if (d.y < 0 || d.z > 5) {
      d.y = 12 + Math.random() * 6;
      d.x = (Math.random() - 0.5) * 34;
      d.z = -58 + Math.random() * 60;
    }
    const k = i * 6;
    rainPos[k] = d.x;
    rainPos[k + 1] = d.y;
    rainPos[k + 2] = d.z;
    rainPos[k + 3] = d.x + 0.16;
    rainPos[k + 4] = d.y + 1.3;
    rainPos[k + 5] = d.z;
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ---- Tunnel: a rock ridge with a bore through it, lamps inside, a bright exit
const TUN_W = 5.75;
const TUN_H = 9.6;
const tunnelMesh = new THREE.Mesh(
  merge([
    part(box(72, 34, 1), 0x6f7480, -(TUN_W + 36), 17, -0.5),
    part(box(72, 34, 1), 0x6f7480, TUN_W + 36, 17, -0.5),
    part(box(TUN_W * 2, 34 - TUN_H, 1), 0x646974, 0, TUN_H + (34 - TUN_H) / 2, -0.5),
    part(box(0.12, 0.5, 1), 0xf1f3f5, -(TUN_W - 0.07), 1.6, -0.5), // wall stripes
    part(box(0.12, 0.5, 1), 0xf1f3f5, TUN_W - 0.07, 1.6, -0.5),
    part(box(0.12, 0.25, 1), 0xffd60a, -(TUN_W - 0.07), 0.9, -0.5),
    part(box(0.12, 0.25, 1), 0xffd60a, TUN_W - 0.07, 0.9, -0.5),
  ]),
  vcMat
);
tunnelMesh.frustumCulled = false;
tunnelMesh.visible = false;
scene.add(tunnelMesh);
const TUN_LAMPS = 44;
const TUN_LAMP_GAP = 9;
const tunnelLamps = new THREE.InstancedMesh(box(1.8, 0.16, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff1b0, fog: false }), TUN_LAMPS * 2);
tunnelLamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
tunnelLamps.frustumCulled = false;
tunnelLamps.visible = false;
scene.add(tunnelLamps);
const tunnelExit = new THREE.Mesh(
  new THREE.PlaneGeometry(TUN_W * 2, TUN_H),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })
);
tunnelExit.position.y = TUN_H / 2;
tunnelExit.visible = false;
scene.add(tunnelExit);
function spawnTunnel() {
  tun.active = true;
  tun.z = -245;
  tun.len = 230 + Math.random() * 130;
  tunnelMesh.scale.z = tun.len;
  tunnelMesh.visible = tunnelLamps.visible = tunnelExit.visible = true;
}
function endTunnel() {
  tun.active = false;
  tunnelMesh.visible = tunnelLamps.visible = tunnelExit.visible = false;
}
function updateTunnel(dt, dz, spawning) {
  if (!tun.active) {
    if (spawning) {
      tun.cooldown -= dz;
      if (tun.cooldown <= 0) spawnTunnel();
    }
    return false;
  }
  tun.z += dz;
  tunnelMesh.position.z = tun.z;
  tunnelExit.position.z = tun.z - tun.len + 0.6;
  for (let i = 0; i < TUN_LAMPS; i++) {
    const lz = tun.z - 5 - i * TUN_LAMP_GAP;
    const on = lz > tun.z - tun.len + 3;
    for (let side = 0; side < 2; side++) {
      dummy.position.set(side ? 2.6 : -2.6, TUN_H - 0.1, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(on ? 1 : 0);
      dummy.updateMatrix();
      tunnelLamps.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  tunnelLamps.instanceMatrix.needsUpdate = true;
  const camZ = camera.position.z;
  const inside = tun.z > camZ + 0.5 && tun.z - tun.len < camZ - 0.5;
  if (tun.z - tun.len > camZ + 25) {
    endTunnel();
    tun.cooldown = 200 + Math.random() * 240;
  }
  return inside;
}

/** Blend the theme's light and fog with tunnel darkness and the exit flash. */
const DARK_COL = new THREE.Color(0x07080d);
const WHITE_COL = new THREE.Color(0xffffff);
function updateAmbience(dt, inside) {
  const wasDark = amb.dark > 0.5;
  amb.dark += ((inside ? 1 : 0) - amb.dark) * Math.min(1, dt * 7);
  if (amb.dark < 0.002) amb.dark = 0;
  if (wasDark && !inside && amb.flash < 0.5) amb.flash = 1; // burst into daylight
  if (amb.flash > 0) amb.flash = Math.max(0, amb.flash - dt * 1.1);
  if (!amb.dirty && amb.dark === 0 && amb.flash === 0) return;
  amb.dirty = amb.dark !== 0 || amb.flash !== 0; // run once more after settling
  const dk = amb.dark;
  const fl = amb.flash * amb.flash;
  const col = scene.fog.color;
  col.copy(amb.sky).lerp(DARK_COL, dk).lerp(WHITE_COL, fl * 0.85);
  scene.background.copy(col);
  scene.fog.near = (amb.fogNear + (22 - amb.fogNear) * dk) * (1 - 0.7 * fl);
  scene.fog.far = (amb.fogFar + (125 - amb.fogFar) * dk) * (1 - 0.45 * fl);
  hemi.intensity = amb.hemi * (1 - 0.7 * dk) + fl * 1.3;
  sun.intensity = amb.sun * (1 - 0.92 * dk) + fl;
  const lit = amb.night || dk > 0.4;
  headlight.intensity = amb.night ? 9 : 9 * dk;
  beam.visible = lit;
  for (const c of beamCones) c.visible = lit;
  carGlow.visible = lit;
  tunnelExit.material.opacity = 0.6 * dk;
}

// ---- Police boss
const police = { mesh: new THREE.Mesh(policeGeo, vcMat), active: false, x: 0, z: 16, lane: 1, phase: 'off', timer: 0, threat: false, nm: false, sirenT: 0, sirenHi: false };
police.mesh.visible = false;
scene.add(police.mesh);
const policeLights = [0xff1744, 0x2979ff].map((color, i) => {
  const m = new THREE.Mesh(box(0.5, 0.22, 0.3), new THREE.MeshBasicMaterial({ color, fog: false }));
  m.position.set(i ? 0.32 : -0.32, 1.63, 0.2);
  police.mesh.add(m);
  return m;
});
// red strip on the road showing the lane the police car is about to charge down
const policeWarn = new THREE.Mesh(
  new THREE.PlaneGeometry(2.5, 16),
  new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.4, depthWrite: false, fog: false })
);
policeWarn.rotation.x = -Math.PI / 2;
policeWarn.visible = false;
scene.add(policeWarn);
const POLICE_Z = 6.4; // cruising distance behind the player
const POLICE_HALF_L = 1.95;
const POLICE_HALF_W = 0.87;
function startPolice() {
  Object.assign(police, { active: true, x: 0, z: 22, lane: 1, phase: 'arrive', timer: 2.4, threat: false, nm: false, sirenT: 0 });
  police.mesh.visible = true;
}
function stopPolice() {
  police.active = false;
  police.phase = 'off';
  police.threat = false;
  police.mesh.visible = false;
  policeWarn.visible = false;
}
function policeFollowTime() {
  const d = Math.min(1.5, state.level.index / 40);
  return Math.max(1.5, 3.4 - d) + Math.random() * 1.2;
}
function updatePolice(dt) {
  const P = police;
  const playing = state.mode === 'playing';
  const t = performance.now();
  policeLights[0].visible = Math.floor(t / 140) % 2 === 0;
  policeLights[1].visible = !policeLights[0].visible;
  if (!playing) {
    // level over: fall back (finished) or stop (crashed)
    if (state.mode === 'completing' || state.mode === 'complete') P.z += dt * 14;
    policeWarn.visible = false;
  } else if (!state.tutorial) {
    P.timer -= dt;
    P.sirenT -= dt;
    if (P.sirenT <= 0) {
      P.sirenHi = !P.sirenHi;
      P.sirenT = P.phase === 'warn' ? 0.16 : 0.42;
      Sound.siren(P.sirenHi, P.phase === 'warn');
    }
    const laneX = LANES[P.lane];
    switch (P.phase) {
      case 'arrive':
        P.z += (POLICE_Z - P.z) * Math.min(1, dt * 2.2);
        P.x += (state.x - P.x) * Math.min(1, dt * 2);
        if (P.timer <= 0) {
          P.phase = 'follow';
          P.timer = policeFollowTime();
        }
        break;
      case 'follow':
        P.z += (POLICE_Z - P.z) * Math.min(1, dt * 4);
        P.x += (state.x - P.x) * Math.min(1, dt * 2.6); // tails the player with a little lag
        if (P.timer <= 0) {
          P.phase = 'warn';
          P.lane = state.lane;
          P.timer = Math.max(0.5, 0.85 - Math.min(0.3, state.level.index / 200));
          P.threat = true;
          P.nm = false;
        }
        break;
      case 'warn':
        P.x += (laneX - P.x) * Math.min(1, dt * 12);
        P.z = POLICE_Z + Math.sin(t / 30) * 0.08;
        if (P.timer <= 0) {
          P.phase = 'lunge';
          P.timer = 0.3;
        }
        break;
      case 'lunge':
        P.x = laneX;
        P.z += (0.5 - P.z) * Math.min(1, dt * 14);
        if (P.timer <= 0) {
          P.phase = 'hold';
          P.timer = 0.85;
        }
        break;
      case 'hold':
        P.z += (0.5 - P.z) * Math.min(1, dt * 10);
        if (P.timer <= 0) {
          P.phase = 'back';
          P.timer = 0.8;
        }
        break;
      default: // back
        P.z += (POLICE_Z - P.z) * Math.min(1, dt * 4.5);
        if (P.timer <= 0) {
          P.phase = 'follow';
          P.timer = policeFollowTime();
          P.threat = false;
        }
    }
    policeWarn.visible = P.phase === 'warn' && Math.floor(t / 90) % 2 === 0;
    if (policeWarn.visible) policeWarn.position.set(laneX, 0.02, -1.5);
    // Ramming: only possible while the police car is level with the player.
    if (state.invuln <= 0 && Math.abs(P.z - player.position.z) < POLICE_HALF_L + state.car.halfL - 0.15) {
      if (Math.abs(P.x - state.x) < POLICE_HALF_W + state.car.halfW - 0.1) {
        if (state.shield > 0 || state.fx.shield > 0) {
          absorbHit(null);
          burst(P.x, 1.2, P.z, 30, [0x3a86ff, 0xffffff, 0x111418], 9, 1.2);
          P.phase = 'back';
          P.timer = 1.6;
          P.z = POLICE_Z + 3;
        } else {
          state.busted = true;
          crash(null);
        }
      } else if (!P.nm && P.lane === state.leftLane && state.time - state.leftAt < 0.6) {
        nearMiss(P);
      }
    }
  }
  P.mesh.position.set(P.x, 0, P.z);
  P.mesh.rotation.y = (P.x - LANES[P.lane]) * (P.phase === 'warn' ? 0.06 : 0);
}

// ---- Finish line (boss levels)
const finishGate = new THREE.Mesh(
  (() => {
    const p = [part(box(0.5, 10.6, 0.5), 0xf8f9fa, -5.6, 5.3, 0), part(box(0.5, 10.6, 0.5), 0xf8f9fa, 5.6, 5.3, 0)];
    for (let ix = 0; ix < 14; ix++) for (let iy = 0; iy < 2; iy++) p.push(part(box(0.8, 0.8, 0.3), (ix + iy) % 2 ? 0x111111 : 0xffffff, -5.2 + ix * 0.8, 9.4 + iy * 0.8, 0));
    for (let ix = 0; ix < 12; ix++) for (let iz = 0; iz < 2; iz++) p.push(part(box(0.8, 0.02, 0.8), (ix + iz) % 2 ? 0x111111 : 0xffffff, -4.4 + ix * 0.8, 0.02, -0.4 + iz * 0.8));
    return merge(p);
  })(),
  vcMat
);
finishGate.frustumCulled = false;
finishGate.visible = false;
scene.add(finishGate);

function resetMechanics() {
  endTunnel();
  tun.cooldown = 130 + Math.random() * 80;
  stopPolice();
  finishGate.visible = false;
  amb.dark = 0;
  amb.flash = 0;
  amb.dirty = true;
  headlight.visible = amb.night;
}
function updateMechanics(dt, roadDz, mode) {
  const fx = runFx();
  const playing = mode === 'playing';
  // hills and curves
  if (fx.hills && playing) {
    const dist = state.distance;
    const ramp = Math.min(1, dist / 220);
    bendTarget.set((Math.sin(dist * 0.011) * 0.004 + Math.sin(dist * 0.027 + 1) * 0.0013) * ramp, Math.sin(dist * 0.017 + 2) * 0.0021 * ramp);
  } else if (!fx.hills) {
    bendTarget.set(0, 0);
  }
  bendUniform.value.lerp(bendTarget, Math.min(1, dt * 2.5));
  // tunnels + ambience
  const inside = updateTunnel(dt, roadDz, playing && fx.tunnels && !state.tutorial);
  updateAmbience(dt, inside);
  // rain (also on the menus of the rain world)
  const raining = (RUN_MODES.includes(mode) ? fx.rain : currentTheme === 'rain' && mode !== 'garage') && amb.dark < 0.5;
  if (rain.visible !== raining) rain.visible = raining;
  if (raining) updateRain(dt, roadDz);
  if (amb.dark > 0.5 && snowfall.visible) snowfall.visible = false;
  else if (amb.dark <= 0.5 && currentTheme === 'snow' && !snowfall.visible) snowfall.visible = true;
  // police + finish line
  if (police.active) updatePolice(dt);
  if (fx.boss && state.level) {
    const left = state.level.target - state.distance;
    finishGate.visible = left < 200;
    finishGate.position.z = -left;
  }
}

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
  coinsGot: 0, // coins picked up / missed (for the 80% challenge)
  coinsMissed: 0,
  powerUsed: 0,
  leftLane: -1, // lane the player most recently swerved out of...
  leftAt: -9, // ...and when (state.time)
  vx: 0, // sideways speed (only used on wet roads)
  busted: false,
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
  for (const c of traffic) killCar(c);
  for (const c of coins) c.active = false;
  for (const p of parts) p.life = 0;
  for (const pk of pickups) {
    pk.active = false;
    pk.group.visible = false;
  }
  for (const k of PU_KEYS) state.fx[k] = 0;
  shieldGlow.visible = false;
  refreshPowerHUD();
  resetMechanics();
  state.tutorial = 0;
  $('tutorial').classList.add('hidden');
  $('notice').classList.remove('show');
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
  const bonus = NEAR_MISS_BONUS * (state.car.nearMissMul || 1);
  state.coins += bonus;
  missionProgress('nearmiss', 1);
  Sound.nearMiss();
  vibrate(25);
  burst(c.mesh.position.x, 1.2, player.position.z, 8, [0xffffff, 0xffd60a], 5, 0.8);
  notice(`NEAR MISS! +${bonus}`, 'gold');
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
  state.powerUsed++;
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
  applyTheme(getLevel(save.unlocked).theme);
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

let viewWorld = 0; // world shown on the level grid
const worldUnlocked = (w) => save.unlocked >= WORLDS[w].start;
function worldStars(w) {
  const wd = WORLDS[w];
  let n = 0;
  const end = w === BEYOND ? save.stars.length : wd.start + wd.count;
  for (let i = wd.start; i < end; i++) n += save.stars[i] || 0;
  return n;
}

/* World select: every world, locked ones say how to unlock them. */
function openWorlds() {
  state.mode = 'worlds';
  clearWorld();
  resetPlayerPose();
  player.geometry = playerGeos[save.selected];
  showHUD(false);
  const list = $('world-list');
  list.innerHTML = '';
  const current = worldIndexOf(save.unlocked);
  WORLDS.forEach((wd, w) => {
    const open = worldUnlocked(w);
    const card = document.createElement('button');
    card.className = `world-card world ${wd.key}` + (open ? '' : ' locked') + (w === current ? ' current' : '');
    const range = w === BEYOND ? `Level ${wd.start + 1}+` : `Levels ${wd.start + 1}–${wd.start + wd.count}`;
    const starsTxt = w === BEYOND ? `⭐ ${worldStars(w)}` : `⭐ ${worldStars(w)}/${wd.count * 3}`;
    const sub = open ? wd.blurb || range : `🔒 Finish Level ${wd.start} to unlock`;
    card.innerHTML = `
      <span class="wc-emoji">${worldEmoji(w)}</span>
      <span class="wc-body"><span class="wc-name">${worldName(w)}</span><span class="wc-sub">${sub}</span></span>
      <span class="wc-side"><span>${open ? starsTxt : ''}</span><small>${range}</small></span>`;
    card.addEventListener('click', () => {
      Sound.init();
      Sound.click();
      if (open) openLevels(w);
      else toast(`Finish Level ${wd.start} to unlock ${worldName(w)}`);
    });
    list.appendChild(card);
  });
  showScreen('worlds');
  const cur = list.children[current];
  if (cur) list.scrollTop = Math.max(0, cur.offsetTop - 120);
}

function buildLevelList() {
  const w = viewWorld;
  const wd = WORLDS[w];
  const list = ui.levelList;
  list.innerHTML = '';
  $('levels-title').textContent = `${worldEmoji(w)} ${worldName(w)}`;
  const sec = document.createElement('section');
  sec.className = `world ${wd.key}`;
  let from = wd.start;
  let to = wd.start + wd.count;
  if (w === BEYOND) {
    // show the most recent stretch plus a few locked ones ahead
    from = Math.max(wd.start, Math.floor((save.unlocked - 20) / 5) * 5);
    to = Math.max(save.unlocked + 5, wd.start + 10);
    to = Math.ceil(to / 5) * 5;
  }
  const head = w === BEYOND ? `⭐ ${worldStars(w)}` : `⭐ ${worldStars(w)}/${wd.count * 3}`;
  sec.innerHTML = `<div class="world-head"><span>${wd.blurb || 'Levels ' + (wd.start + 1) + '–' + (wd.start + wd.count)}</span><span>${head}</span></div>`;
  const grid = document.createElement('div');
  grid.className = 'world-grid';
  for (let i = from; i < to; i++) {
    const b = document.createElement('button');
    const unlocked = i <= save.unlocked;
    const stars = save.stars[i] || 0;
    const boss = getLevel(i).type === 'boss';
    b.className = 'lvl' + (unlocked ? '' : ' locked') + (boss ? ' boss' : '') + (unlocked && i === save.unlocked && stars === 0 ? ' current' : '');
    if (unlocked) {
      const st = [0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">★</span>`).join('');
      b.innerHTML = `${boss ? '<small>🚓</small>' : ''}${i + 1}<span class="st">${st}</span>`;
      b.addEventListener('click', () => {
        Sound.click();
        openLevelInfo(getLevel(i));
      });
    } else {
      b.innerHTML = boss ? '🚓' : '🔒';
      b.disabled = true;
    }
    grid.appendChild(b);
  }
  sec.appendChild(grid);
  list.appendChild(sec);
}

function openLevels(w) {
  if (typeof w === 'number') viewWorld = w;
  if (!worldUnlocked(viewWorld)) viewWorld = worldIndexOf(save.unlocked);
  state.mode = 'levels';
  clearWorld();
  resetPlayerPose();
  player.geometry = playerGeos[save.selected];
  showHUD(false);
  buildLevelList();
  showScreen('levels');
  const cur = ui.levelList.querySelector('.lvl.current');
  if (cur) ui.levelList.scrollTop = Math.max(0, cur.offsetTop - 200);
}

function openLevelInfo(lvl) {
  infoLevel = lvl;
  applyTheme(lvl.theme);
  const badge = $('li-world');
  badge.textContent = (lvl.world === BEYOND ? '♾️ Beyond · ' : '') + `${THEMES[lvl.theme].emoji} ${THEMES[lvl.theme].name}`;
  badge.style.background = THEMES[lvl.theme].css;
  $('li-title').textContent = (lvl.type === 'boss' ? '🚓 Boss · ' : '') + `Level ${lvl.num}`;
  $('li-goal').textContent = goalText(lvl);
  const fxs = Object.keys(FX_LABELS).filter((k) => lvl.fx[k]);
  $('li-fx').textContent = fxs.map((k) => FX_LABELS[k]).join(' · ');
  $('li-fx').classList.toggle('hidden', fxs.length === 0);
  const got = save.stars[lvl.index] || 0;
  const rules = starRules(lvl);
  $('li-stars').innerHTML =
    rules.slice(0, 2).map((r) => `<li>★ ${r}</li>`).join('') +
    `<li class="chal">🏆 <b>Challenge:</b> ${rules[2]}</li>` +
    `<li class="best">Your best: ${'★'.repeat(got)}${'☆'.repeat(3 - got)}</li>`;
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
    btn.textContent = car.stars ? `⭐ Needs ${car.stars} stars (you have ${totalStars()})` : `🔒 Unlocks at Level ${car.unlock}`;
    btn.disabled = true;
  } else {
    btn.textContent = car.price > 0 ? `Buy · ${car.price} coins` : '⭐ Claim for free';
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
    coinsGot: 0,
    coinsMissed: 0,
    powerUsed: 0,
    vx: 0,
    busted: false,
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
  if (level && level.fx.tunnels) headlight.visible = true; // stays on (dimmed to zero outside) so shaders are not rebuilt at every portal
  if (level && level.fx.boss) {
    startPolice();
    notice('🚓 Police! Reach the finish line', 'gold');
  }
  Sound.engineStart();
  ensureMissions();
  if (!save.tutorialDone) startTutorial();
}

function goalProgress() {
  const lvl = state.level;
  return lvl.type !== 'coins' ? Math.floor(state.distance) : state.coins;
}
function updateGoalUI() {
  const lvl = state.level;
  const p = Math.min(goalProgress(), lvl.target);
  ui.goalCount.textContent = `${p} / ${lvl.target}${lvl.type !== 'coins' ? ' m' : ''}`;
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
  if (car) burst(car.mesh.position.x, 1.2, car.mesh.position.z, 40, [0x3a86ff, 0xffffff, 0x9bf6ff, 0x333333], 10, 1.3);
  if (car) killCar(car);
  toast('🛡️ Shield broken!');
}

function showOver() {
  state.mode = 'over';
  document.querySelector('#over .crash-title').textContent = state.busted ? 'BUSTED!' : 'CRASH!';
  ui.hud.classList.add('hidden');
  const score = Math.floor(state.distance);
  save.coins += state.coins;
  endRunMissions();
  const lvl = state.level;
  $('final-score').textContent = score;
  $('final-coins').textContent = state.coins;
  if (lvl) {
    $('over-goal-row').classList.remove('hidden');
    $('over-goal-label').textContent = lvl.type !== 'coins' ? 'Distance' : 'Coins';
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
      killCar(c);
    }
  }
  const second = secondStarDone(lvl);
  const challenge = challengeDone(lvl);
  const stars = 1 + (second ? 1 : 0) + (challenge ? 1 : 0);
  const bonus = stars * (10 + Math.min(lvl.index, 80) * 3);
  const prevUnlocked = save.unlocked;
  const prevStars = totalStars();
  while (save.stars.length <= lvl.index) save.stars.push(0);
  save.stars[lvl.index] = Math.max(save.stars[lvl.index], stars);
  save.unlocked = Math.max(save.unlocked, lvl.index + 1);
  save.coins += state.coins + bonus;
  missionProgress('levels', 1);
  missionProgress('stars', stars);
  endRunMissions();
  persist();
  const unlockMsgs = [];
  if (save.unlocked > prevUnlocked) {
    const nw = WORLDS.findIndex((wd) => wd.start === save.unlocked);
    if (nw > 0) unlockMsgs.push(`${worldEmoji(nw)} New world: ${worldName(nw)}!`);
    for (const car of CARS) {
      if (car.unlock && car.unlock - 1 > prevUnlocked && car.unlock - 1 <= save.unlocked) unlockMsgs.push(`🚗 ${car.name} now in the garage!`);
    }
  }
  for (const car of CARS) {
    if (car.stars && prevStars < car.stars && totalStars() >= car.stars) unlockMsgs.push(`⭐ ${car.name} unlocked in the garage!`);
  }
  state.result = { stars, bonus, unlockMsgs, challenge };
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
  $('c-chal-text').textContent = '🏆 ' + challengeText(lvl);
  $('c-chal').textContent = r.challenge ? '✓' : '✗';
  $('c-chal').className = r.challenge ? 'ok' : 'no';
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
  if (state.level) openLevels(state.level.world);
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
    if (state.level && state.level.fx.trucks && Math.random() < 0.45) {
      // a big rig that will swing into a neighbouring lane: both lanes count as taken
      const to = l === 0 ? 1 : l === 2 ? 1 : Math.random() < 0.5 ? 0 : 2;
      free[to] = false;
      spawnCar(l, SPAWN_Z, to);
    } else {
      spawnCar(l, SPAWN_Z);
    }
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
  openWorlds();
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
    else if (state.mode === 'levels') openWorlds();
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
  if (state.level) openLevels(state.level.world);
  else goMenu();
});
on('c-next', () => {
  const n = state.level.index + 1;
  startRun(getLevel(n));
});
on('c-retry', () => startRun(state.level));
on('c-levels', () => {
  Sound.click();
  openLevels(state.level.world);
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
  } else if (mode === 'menu' || mode === 'levels' || mode === 'upgrades' || mode === 'missions' || mode === 'worlds') {
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
  updateMechanics(dt, roadDz, mode);

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
  } else if (mode === 'playing' || mode === 'menu' || mode === 'levels' || mode === 'upgrades' || mode === 'missions' || mode === 'worlds') {
    const prevX = state.x;
    const handling = mode === 'playing' ? car.handling : 13;
    if (mode === 'playing' && state.level && state.level.fx.rain) {
      // wet road: a soft spring, so the car is slower to bite and slides a little past the lane
      const k = 70 * (handling / 13);
      state.vx += ((LANES[state.lane] - state.x) * k - state.vx * 9.5) * dt;
      state.x += state.vx * dt;
    } else {
      state.x += (LANES[state.lane] - state.x) * Math.min(1, dt * handling);
    }
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
    } else if (c.mover) {
      // big rig changing lanes: indicator blinks from far away, then it swings across
      const mv = c.mover;
      c.ind.visible = Math.floor(performance.now() / 160) % 2 === 0;
      if (!mv.started && m.position.z > -82) mv.started = true;
      if (mv.started) {
        mv.t = Math.min(1, mv.t + dt / 0.8);
        const e = mv.t * mv.t * (3 - 2 * mv.t);
        m.position.x = LANES[mv.from] + (LANES[mv.to] - LANES[mv.from]) * e;
        m.rotation.y = Math.PI - Math.sin(mv.t * Math.PI) * 0.16 * Math.sign(mv.to - mv.from);
        if (mv.t >= 1) {
          c.lane = mv.to;
          c.mover = null;
          c.ind.visible = false;
          m.rotation.y = Math.PI;
        }
      }
    } else {
      c.wobble += dt * 3;
      m.position.x = LANES[c.lane] + Math.sin(c.wobble) * 0.06;
    }
    if (m.position.z - c.halfL > DESPAWN_Z) {
      killCar(c);
      continue;
    }
    if (police.active && m.position.z > police.z - c.halfL - 2.3 && Math.abs(m.position.x - police.x) < 1.75) {
      // the police car shoves traffic out of its way
      burst(m.position.x, 1, m.position.z, 14, [0xffffff, 0x3a86ff, 0xff1744, 0x333333], 8, 1);
      killCar(c);
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
      if (c.z > DESPAWN_Z) {
        c.active = false;
        if (mode === 'playing') state.coinsMissed++;
      } else if (mode === 'playing' && Math.abs(c.x - state.x) < 1.3 && Math.abs(c.z - player.position.z) < halfL - 0.25) {
        c.active = false;
        state.coins += coinValue;
        state.coinsGot++;
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
  if (mode !== 'garage') updateCarGlow();
  else if (carGlow.visible) glowGeo.setDrawRange(0, 0);

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
    // boss levels pull the camera back so the police car behind is in view
    const bossCam = police.active ? 1 : 0;
    camera.position.y += (5.6 + bossCam * 1.2 - camera.position.y) * Math.min(1, dt * 3);
    camera.position.z += (8.6 + bossCam * 3.6 - camera.position.z) * Math.min(1, dt * 3);
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
      if (state.level && state.level.type !== 'coins') updateGoalUI();
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
window.__laneRush = { state, save, getLevel, startRun, WORLDS, CARS, police, tun, amb, bendUniform, bendTarget, traffic, pickups, spawnPickup }; // handy for debugging
goMenu();
ui.loading.classList.add('hidden');
loop();
