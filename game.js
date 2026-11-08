import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* =========================================================
   Lane Rush — 3D endless car game
   ========================================================= */

// ---------- Tunables ----------
const LANES = [-3, 0, 3];
const SPAWN_Z = -165;
const DESPAWN_Z = 18;
const WRAP_MIN = -191;
const WRAP_MAX = 25;
const WRAP_LEN = WRAP_MAX - WRAP_MIN;
const TRAFFIC_OWN_SPEED = 8; // oncoming cars drive toward the player
const START_SPEED = 20;
const MAX_SPEED = 64;
const SPEED_GAIN = 0.45; // units / s^2
const PLAYER_HALF_W = 0.8;
const PLAYER_HALF_L = 1.85;
const SKY = 0x8fdcff;

const COLORS = {
  road: 0x3d4250,
  roadShadow: 0x2a2d38,
  grass: 0x7bd85a,
  dash: 0xffffff,
  curbA: 0xff3b5c,
  curbB: 0xffffff,
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'),
  score: $('score'),
  coins: $('coins'),
  best: $('best'),
  start: $('start'),
  startBest: $('start-best'),
  over: $('over'),
  finalScore: $('final-score'),
  finalCoins: $('final-coins'),
  finalBest: $('final-best'),
  newBest: $('new-best'),
  again: $('again'),
  mute: $('mute'),
  loading: $('loading'),
};

// ---------- Storage ----------
const store = {
  get(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v;
    } catch (e) {
      return def;
    }
  },
  set(key, v) {
    try {
      localStorage.setItem(key, String(v));
    } catch (e) {
      /* ignore */
    }
  },
};
let best = parseInt(store.get('laneRush.best', '0'), 10) || 0;
let muted = store.get('laneRush.muted', '0') === '1';

/* =========================================================
   Audio (Web Audio API)
   ========================================================= */
const Sound = (() => {
  let ctx = null;
  let master = null;
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
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function setMuted(m) {
    if (!master) return;
    master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02);
  }

  function tone(freq, start, dur, type = 'square', vol = 0.12) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur + 0.02);
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
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5, 0.2);
  }

  function crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // noisy smash
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3500, t);
    f.frequency.exponentialRampToValueAtTime(150, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.85);
    // low thump
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
    // glass tinkle
    for (let i = 0; i < 5; i++) {
      tone(2000 + Math.random() * 2500, t + 0.05 + i * 0.04, 0.08, 'triangle', 0.03);
    }
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

  return { init, setMuted, coin, swoosh, crash, engineStart, engineUpdate, engineStop };
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
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 55, 165);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 300);
let baseFov = 60;

scene.add(new THREE.HemisphereLight(0xffffff, 0x6aa84f, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(-6, 12, 6);
scene.add(sun);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Keep the whole road visible in narrow portrait screens.
  const wantHalfWidth = 6.2; // world units visible at ~12 units from camera
  const hHalf = Math.atan(wantHalfWidth / 12);
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
  let g = geo.index ? geo.toNonIndexed() : geo;
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
const wheelGeo = () => new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function addWheels(parts, halfW, zs, r = 0.38) {
  for (const z of zs) {
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(r, r, 0.3, 10);
      parts.push(part(g, 0x1f1f24, s * halfW, r, z, 0, 0, Math.PI / 2));
      parts.push(part(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.32, 6), 0xd8dce6, s * halfW, r, z, 0, 0, Math.PI / 2));
    }
  }
}

// All cars are built facing -Z (front at -Z).
function buildSedan(color, opts = {}) {
  const p = [];
  p.push(part(box(2.0, 0.02, 4.3), COLORS.roadShadow, 0, 0.015, 0));
  p.push(part(box(1.7, 0.6, 3.8), color, 0, 0.62, 0));
  p.push(part(box(1.36, 0.42, 1.9), 0x23324d, 0, 1.13, 0.25)); // glass band
  p.push(part(box(1.42, 0.12, 1.7), opts.roof || color, 0, 1.38, 0.25)); // roof
  p.push(part(box(1.78, 0.18, 0.22), 0xdadde5, 0, 0.42, -1.92)); // front bumper
  p.push(part(box(1.78, 0.18, 0.22), 0xdadde5, 0, 0.42, 1.92)); // rear bumper
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, -0.55, 0.72, -1.91)); // headlights
  p.push(part(box(0.38, 0.16, 0.06), 0xfff6c4, 0.55, 0.72, -1.91));
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, -0.6, 0.72, 1.91)); // taillights
  p.push(part(box(0.38, 0.14, 0.06), 0xff2a3d, 0.6, 0.72, 1.91));
  if (opts.taxi) {
    p.push(part(box(0.6, 0.22, 0.32), 0xffffff, 0, 1.55, 0.25));
    p.push(part(box(1.72, 0.1, 3.0), 0x222222, 0, 0.75, 0)); // checker band
  }
  if (opts.stripe) p.push(part(box(0.35, 0.02, 3.82), opts.stripe, 0, 0.93, 0));
  addWheels(p, 0.82, [-1.2, 1.2]);
  return { geo: merge(p), halfL: 1.95, halfW: 0.85 };
}

function buildVan(color) {
  const p = [];
  p.push(part(box(2.1, 0.02, 4.7), COLORS.roadShadow, 0, 0.015, 0));
  p.push(part(box(1.8, 1.45, 4.3), color, 0, 1.05, 0.05));
  p.push(part(box(1.82, 0.5, 0.9), 0x23324d, 0, 1.35, -1.75)); // windshield band
  p.push(part(box(1.84, 0.12, 4.32), 0xffffff, 0, 0.6, 0.05)); // stripe
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
  p.push(part(box(2.3, 0.02, 6.6), COLORS.roadShadow, 0, 0.015, 0));
  p.push(part(box(2.0, 1.5, 1.7), cabColor, 0, 1.15, -2.3)); // cab
  p.push(part(box(2.02, 0.55, 0.8), 0x23324d, 0, 1.5, -2.75)); // windshield
  p.push(part(box(2.1, 2.1, 4.4), cargoColor, 0, 1.55, 0.9)); // cargo box
  p.push(part(box(2.12, 0.18, 4.42), 0xffffff, 0, 2.2, 0.9));
  p.push(part(box(1.6, 0.25, 6.2), 0x333338, 0, 0.5, 0)); // chassis
  p.push(part(box(2.06, 0.22, 0.22), 0xdadde5, 0, 0.45, -3.18));
  p.push(part(box(0.4, 0.2, 0.06), 0xfff6c4, -0.7, 0.8, -3.16));
  p.push(part(box(0.4, 0.2, 0.06), 0xfff6c4, 0.7, 0.8, -3.16));
  addWheels(p, 0.95, [-2.3, 1.0, 2.3], 0.45);
  return { geo: merge(p), halfL: 3.2, halfW: 1.0 };
}

function buildPlayer() {
  const p = [];
  const body = 0xff3864;
  p.push(part(box(2.0, 0.02, 4.4), COLORS.roadShadow, 0, 0.015, 0));
  p.push(part(box(1.8, 0.5, 4.0), body, 0, 0.55, 0));
  p.push(part(box(1.7, 0.2, 1.3), body, 0, 0.88, -1.25)); // hood rise
  p.push(part(box(1.4, 0.4, 1.6), 0x1d2a44, 0, 1.0, 0.25)); // canopy glass
  p.push(part(box(1.44, 0.1, 1.2), body, 0, 1.23, 0.35)); // roof
  p.push(part(box(0.4, 0.02, 4.02), 0xffffff, -0.3, 0.81, 0)); // racing stripes
  p.push(part(box(0.4, 0.02, 4.02), 0xffffff, 0.3, 0.81, 0));
  p.push(part(box(0.14, 0.4, 0.14), 0x222228, -0.7, 1.0, 1.85)); // spoiler posts
  p.push(part(box(0.14, 0.4, 0.14), 0x222228, 0.7, 1.0, 1.85));
  p.push(part(box(1.9, 0.1, 0.5), 0x222228, 0, 1.24, 1.85)); // spoiler wing
  p.push(part(box(0.5, 0.14, 0.06), 0xff1030, -0.55, 0.65, 2.01)); // taillights
  p.push(part(box(0.5, 0.14, 0.06), 0xff1030, 0.55, 0.65, 2.01));
  p.push(part(box(0.25, 0.12, 0.25), 0x8a8f99, -0.4, 0.35, 2.05)); // exhausts
  p.push(part(box(0.25, 0.12, 0.25), 0x8a8f99, 0.4, 0.35, 2.05));
  p.push(part(box(1.9, 0.16, 0.24), 0x222228, 0, 0.36, -2.0)); // front lip
  addWheels(p, 0.9, [-1.25, 1.3], 0.4);
  return merge(p);
}

/* =========================================================
   World: ground, road, curbs, dashes, scenery
   ========================================================= */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 420),
  new THREE.MeshLambertMaterial({ color: COLORS.grass })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, -150);
scene.add(ground);

const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), new THREE.MeshLambertMaterial({ color: COLORS.road }));
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
const dashes = new Scroller(
  new THREE.BoxGeometry(0.18, 0.02, 3),
  new THREE.MeshBasicMaterial({ color: COLORS.dash }),
  dashCount * 2,
  (it, i, first) => {
    if (first) {
      it.x = i % 2 === 0 ? -1.5 : 1.5;
      it.z = WRAP_MIN + Math.floor(i / 2) * DASH_PERIOD;
    }
    it.y = 0.01;
  }
);

// Curbs (red / white blocks)
const CURB_PERIOD = 2;
const curbCount = Math.ceil(WRAP_LEN / CURB_PERIOD) * 2;
const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 2), new THREE.MeshLambertMaterial(), curbCount);
curbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
curbs.frustumCulled = false;
const curbZ = [];
for (let i = 0; i < curbCount; i++) {
  const k = Math.floor(i / 2);
  curbZ.push(WRAP_MIN + k * CURB_PERIOD);
  curbs.setColorAt(i, tmpColor.set(k % 2 === 0 ? COLORS.curbA : COLORS.curbB));
}
scene.add(curbs);
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
// make the curb count line up with the wrap length so colors alternate seamlessly
updateCurbs(0);

// Scenery
function sideX(min, max) {
  return (Math.random() < 0.5 ? -1 : 1) * (min + Math.random() * (max - min));
}
function placeScenery(min, max, sMin, sMax) {
  return (it, i, first) => {
    it.x = sideX(min, max);
    if (first) it.z = WRAP_MIN + Math.random() * WRAP_LEN;
    it.s = sMin + Math.random() * (sMax - sMin);
    it.ry = Math.random() * Math.PI * 2;
  };
}

const pineGeo = merge([
  part(new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5), 0x8b5a2b, 0, 0.6, 0),
  part(new THREE.ConeGeometry(1.3, 2.2, 6), 0x2f9e44, 0, 2.0, 0),
  part(new THREE.ConeGeometry(1.0, 1.8, 6), 0x40c057, 0, 3.0, 0),
]);
const roundTreeGeo = merge([
  part(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 5), 0x8b5a2b, 0, 0.7, 0),
  part(new THREE.IcosahedronGeometry(1.3, 0), 0x94d82d, 0, 2.3, 0),
]);
const bushGeo = merge([part(new THREE.IcosahedronGeometry(0.8, 0), 0x51cf66, 0, 0.45, 0)]);
const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
buildingGeo.translate(0, 0.5, 0);

const sceneryList = [
  new Scroller(pineGeo, vcMat, 34, placeScenery(7, 16, 0.8, 1.4)),
  new Scroller(roundTreeGeo, vcMat, 28, placeScenery(7, 18, 0.8, 1.3)),
  new Scroller(bushGeo, vcMat, 30, placeScenery(5.8, 9, 0.6, 1.2)),
  new Scroller(
    buildingGeo,
    new THREE.MeshLambertMaterial({ flatShading: true }),
    26,
    (it, i, first) => {
      it.x = sideX(21, 34);
      if (first) it.z = WRAP_MIN + Math.random() * WRAP_LEN;
      it.s = 5 + Math.random() * 4;
      it.sy = 0.8 + Math.random() * 2.2;
      it.ry = 0;
    },
    { colors: [0xffadad, 0xffd6a5, 0xfdffb6, 0xcaffbf, 0x9bf6ff, 0xa0c4ff, 0xbdb2ff, 0xffc6ff] }
  ),
];

// Clouds (no fog, very far away, gently drifting)
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

/* =========================================================
   Player
   ========================================================= */
const player = new THREE.Mesh(buildPlayer(), vcMat);
scene.add(player);

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
  mesh.rotation.y = Math.PI; // face the player (oncoming)
  scene.add(mesh);
  const c = { mesh, active: false, halfL: 2, halfW: 0.85, lane: 0, wobble: 0 };
  traffic.push(c);
  return c;
}
function spawnCar(lane, z) {
  const c = getCar();
  // trucks are rarer
  const idx = Math.random() < 0.18 ? TRUCKS_FROM + Math.floor(Math.random() * 2) : Math.floor(Math.random() * TRUCKS_FROM);
  const t = carTypes[idx];
  c.mesh.geometry = t.geo;
  c.halfL = t.halfL;
  c.halfW = t.halfW;
  c.lane = lane;
  c.active = true;
  c.wobble = Math.random() * Math.PI * 2;
  c.mesh.position.set(LANES[lane], 0, z);
  c.mesh.rotation.set(0, Math.PI, 0);
  c.mesh.visible = true;
}

/* =========================================================
   Coins (instanced)
   ========================================================= */
const MAX_COINS = 60;
const coinGeo = merge([
  part(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 14), 0xffc300, 0, 0, 0, Math.PI / 2),
  part(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 14), 0xffe066, 0, 0, 0, Math.PI / 2),
  part(box(0.12, 0.42, 0.22), 0xffb000, 0, 0, 0),
]);
const coinMat = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
  emissive: 0x6b4a00,
});
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
const MAX_PARTS = 120;
const partMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial(), MAX_PARTS);
partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
partMesh.frustumCulled = false;
scene.add(partMesh);
const parts = [];
for (let i = 0; i < MAX_PARTS; i++) {
  parts.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, s: 1 });
  partMesh.setColorAt(i, tmpColor.set(0xffffff));
}
let partCursor = 0;
function burst(x, y, z, n, palette, power = 6, size = 1) {
  for (let k = 0; k < n; k++) {
    const p = parts[partCursor];
    const i = partCursor;
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
   Game state
   ========================================================= */
const state = {
  mode: 'loading', // menu | playing | crashing | over
  lane: 1,
  x: 0,
  speed: 14,
  elapsed: 0,
  distance: 0,
  coins: 0,
  spawnTimer: 0,
  lastFree: [true, true, true],
  crashTimer: 0,
  slow: 1,
  shake: 0,
  shownScore: -1,
  shownCoins: -1,
  hitCar: null,
};

function setBestUI() {
  ui.best.textContent = best;
  ui.startBest.textContent = best;
}
setBestUI();

function clearWorld() {
  for (const c of traffic) {
    c.active = false;
    c.mesh.visible = false;
  }
  for (const c of coins) c.active = false;
  for (const p of parts) p.life = 0;
}

function startGame() {
  Sound.init();
  clearWorld();
  Object.assign(state, {
    mode: 'playing',
    lane: 1,
    x: 0,
    speed: START_SPEED,
    elapsed: 0,
    distance: 0,
    coins: 0,
    spawnTimer: 0.8,
    lastFree: [true, true, true],
    crashTimer: 0,
    slow: 1,
    shake: 0,
    shownScore: -1,
    shownCoins: -1,
    hitCar: null,
  });
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  ui.start.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  Sound.engineStart();
}

function crash(car) {
  state.mode = 'crashing';
  state.crashTimer = 1.1;
  state.shake = 0.9;
  state.hitCar = car;
  Sound.engineStop();
  Sound.crash();
  if (navigator.vibrate) {
    try {
      navigator.vibrate([60, 40, 120]);
    } catch (e) {
      /* ignore */
    }
  }
  burst(player.position.x, 1, player.position.z - 1.5, 40, [0xff3864, 0xffffff, 0xffd60a, 0x333333, 0xff9f1c], 9, 1.4);
}

function gameOver() {
  state.mode = 'over';
  const score = Math.floor(state.distance);
  const isBest = score > best;
  if (isBest) {
    best = score;
    store.set('laneRush.best', best);
  }
  setBestUI();
  ui.finalScore.textContent = score;
  ui.finalCoins.textContent = state.coins;
  ui.finalBest.textContent = best;
  ui.newBest.classList.toggle('hidden', !isBest);
  ui.hud.classList.add('hidden');
  ui.over.classList.remove('hidden');
}

function changeLane(dir) {
  if (state.mode !== 'playing') return;
  const nl = THREE.MathUtils.clamp(state.lane + dir, 0, 2);
  if (nl !== state.lane) {
    state.lane = nl;
    Sound.swoosh();
  }
}

/* ---------- Spawning ---------- */
function spawnRow() {
  const t = state.elapsed;
  const doubleProb = Math.min(0.55, 0.12 + t * 0.006);
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

  // Coins in the gap behind this row, in a lane that is safe for this row
  const interval = rowInterval();
  const gap = interval * (state.speed + TRAFFIC_OWN_SPEED);
  if (Math.random() < 0.6) {
    const freeLanes = [0, 1, 2].filter((l) => free[l]);
    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const count = Math.min(6, Math.floor((gap - 10) / 3) + 1);
    for (let i = 0; i < count; i++) spawnCoin(lane, SPAWN_Z - 4.5 - i * 3);
  }
  // NOTE: coins sit *behind* the row (further away). The next row spawns after
  // `gap` units of travel, which always leaves clearance for the coin line.
  return interval;
}

function rowInterval() {
  return Math.max(0.55, 1.2 - state.elapsed * 0.0075);
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
      changeLane(dx > 0 ? 1 : -1);
      // allow chaining: reset origin so a long swipe can be followed by another
      touchX = t.clientX;
      touchY = t.clientY;
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
      changeLane(-1);
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      changeLane(1);
      e.preventDefault();
      break;
    case 'Space':
    case 'Enter':
      if (state.mode === 'menu' || state.mode === 'over') {
        e.preventDefault();
        startGame();
      }
      break;
  }
});

ui.start.addEventListener('click', () => {
  if (state.mode === 'menu') startGame();
});
ui.again.addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.mode === 'over') startGame();
});

function renderMute() {
  ui.mute.textContent = muted ? '🔇' : '🔊';
}
renderMute();
ui.mute.addEventListener('click', (e) => {
  e.stopPropagation();
  muted = !muted;
  store.set('laneRush.muted', muted ? '1' : '0');
  Sound.init();
  Sound.setMuted(muted);
  renderMute();
});
['touchstart', 'mousedown'].forEach((ev) => ui.mute.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));

/* =========================================================
   Main loop
   ========================================================= */
const clock = new THREE.Clock();
let fpsAccum = 0;
let fpsFrames = 0;
let fpsChecks = 0;

document.addEventListener('visibilitychange', () => {
  clock.getDelta(); // swallow the pause
  if (document.hidden) Sound.engineStop();
  else if (state.mode === 'playing') Sound.engineStart();
});

function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function update(dt) {
  const mode = state.mode;

  // --- Speed / slow-down ---
  if (mode === 'playing') {
    state.elapsed += dt;
    state.speed = Math.min(MAX_SPEED, START_SPEED + state.elapsed * SPEED_GAIN);
    state.distance += state.speed * dt;
    Sound.engineUpdate(state.speed);
  } else if (mode === 'menu') {
    state.speed = 14;
  } else {
    state.slow = Math.max(0, state.slow - dt * 2.5);
  }
  const slow = mode === 'crashing' || mode === 'over' ? state.slow * state.slow : 1;
  const roadDz = state.speed * dt * slow;
  const trafficDz = (state.speed + TRAFFIC_OWN_SPEED) * dt * slow;

  // --- World scroll ---
  dashes.update(roadDz);
  updateCurbs(roadDz);
  for (const s of sceneryList) s.update(roadDz);
  for (const c of clouds) {
    c.position.x += dt * 0.6;
    if (c.position.x > 120) c.position.x = -120;
  }

  // --- Spawning ---
  if (mode === 'playing') {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) state.spawnTimer += spawnRow();
  }

  // --- Player movement ---
  const targetX = LANES[state.lane];
  if (mode === 'playing' || mode === 'menu') {
    const prevX = state.x;
    state.x += (targetX - state.x) * Math.min(1, dt * 13);
    const vx = (state.x - prevX) / Math.max(dt, 1e-4);
    player.position.x = state.x;
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, -vx * 0.02, Math.min(1, dt * 12));
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -vx * 0.012, Math.min(1, dt * 12));
    // subtle engine vibration
    player.position.y = Math.sin(performance.now() * 0.05) * 0.015;
  } else if (mode === 'crashing') {
    player.rotation.y += dt * 9 * state.slow;
    player.position.y = Math.max(0, player.position.y + (state.slow - 0.4) * dt * 3);
    player.position.z += dt * 4 * state.slow;
  }

  // --- Traffic ---
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
    if (mode === 'playing') {
      const dx = Math.abs(m.position.x - state.x);
      const dz = Math.abs(m.position.z - player.position.z);
      if (dx < c.halfW + PLAYER_HALF_W - 0.1 && dz < c.halfL + PLAYER_HALF_L - 0.15) {
        crash(c);
      }
    }
  }

  // --- Coins ---
  const spin = performance.now() * 0.004;
  for (let i = 0; i < MAX_COINS; i++) {
    const c = coins[i];
    if (c.active) {
      c.z += trafficDz;
      if (c.z > DESPAWN_Z) c.active = false;
      else if (mode === 'playing' && Math.abs(c.x - state.x) < 1.3 && Math.abs(c.z - player.position.z) < 1.6) {
        c.active = false;
        state.coins++;
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

  // --- Crash sequence ---
  if (mode === 'crashing') {
    state.crashTimer -= dt;
    if (state.crashTimer <= 0) gameOver();
  }

  // --- Camera ---
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
  const speedK = mode === 'playing' ? (state.speed - START_SPEED) / (MAX_SPEED - START_SPEED) : 0;
  const fov = baseFov + speedK * 8;
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }

  // --- HUD ---
  if (mode === 'playing') {
    const sc = Math.floor(state.distance);
    if (sc !== state.shownScore) {
      state.shownScore = sc;
      ui.score.textContent = sc;
      if (sc > best) ui.best.textContent = sc;
    }
    if (state.coins !== state.shownCoins) {
      if (state.shownCoins >= 0) bump(ui.coins);
      state.shownCoins = state.coins;
      ui.coins.textContent = state.coins;
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
  adaptQuality(dt);
}

// Boot
window.__laneRushBooted = true;
state.mode = 'menu';
ui.loading.classList.add('hidden');
loop();
