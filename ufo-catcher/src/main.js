// 메인 — 橋渡し(하시와타시) 모드.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { createWorld } from './physics.js';
import { createCabinet, CABINET } from './cabinet.js';
import { createClaw } from './claw.js';
import { createPrizeSpawner } from './prizes.js';
import { createGame } from './game.js';
import { createSettings } from './settings.js';

// ─── Three.js ───────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);
scene.fog = new THREE.Fog(0x0e1116, 2.5, 8);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 50);
camera.position.set(1.0, 0.7, 1.2);
camera.lookAt(0, 0.35, 0);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.35, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.7;
controls.maxDistance = 3.5;

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(2, 3, 2);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 0.1;
key.shadow.camera.far = 8;
key.shadow.camera.left = -1.5;
key.shadow.camera.right = 1.5;
key.shadow.camera.top = 1.5;
key.shadow.camera.bottom = -1.5;
scene.add(key);
const fill = new THREE.DirectionalLight(0xa0c0ff, 0.3);
fill.position.set(-2, 1, -1);
scene.add(fill);
const inside = new THREE.PointLight(0xfff8d6, 0.6, 1.5);
inside.position.set(0, CABINET.H - 0.1, 0);
scene.add(inside);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.3;
ground.receiveShadow = true;
scene.add(ground);

// ─── 물리 ────────────────────────────────────────────────────────
const { world, materials, contacts } = createWorld();
const cabinet = createCabinet(scene, world, materials);
const prizes = createPrizeSpawner(scene, world, materials);

// 클로 초기 위치 — 캐비닛 중앙 위쪽
const initialClawPos = { x: 0, y: CABINET.H - 0.1, z: -CABINET.D / 2 + 0.10 };
const claw = createClaw(scene, world, materials, initialClawPos);

// ─── 설정 ───────────────────────────────────────────────────────
const stats = { plays: 0, wins: 0, lastWin: null, consecutiveLosses: 0 };

function rebuildBars() {
  cabinet.buildBars(settings.barGap, settings.barRadius);
}
function respawnPrizes() {
  prizes.spawn({
    count: settings.prizeCount,
    size: settings.prizeSize,
    mass: settings.prizeMass,
  });
}

const settings = createSettings({
  friction:    (v) => { contacts.clawPrize.friction = v; },
  barFriction: (v) => { contacts.prizeBar.friction = v; },
  prizeMass: (v) => {
    for (const p of prizes.prizes) {
      p.body.mass = v;
      p.body.updateMassProperties();
    }
  },
  prizeSize: () => respawnPrizes(),
  prizeCount: () => respawnPrizes(),
  barGap:    () => { rebuildBars(); respawnPrizes(); },
  barRadius: () => { rebuildBars(); respawnPrizes(); },
});

// 초기 봉 + 경품
rebuildBars();
respawnPrizes();

// ─── 게임 ────────────────────────────────────────────────────────
function applyArmForce() {
  let force = settings.armForce;
  if (settings.assistEnabled && stats.consecutiveLosses >= settings.assistAfter) {
    force = settings.assistForce;
  }
  claw.setForce(force);
}

const game = createGame({
  claw, prizes, settings,
  onPlayEnd: (win) => {
    stats.plays += 1;
    stats.lastWin = win;
    if (win) {
      stats.wins += 1;
      stats.consecutiveLosses = 0;
      // win 후 경품 재배치
      setTimeout(() => respawnPrizes(), 400);
    } else {
      stats.consecutiveLosses += 1;
      // 경품이 캐비닛 밖으로 떨어진 경우(= y 매우 낮음) 자동 보충
      let needsRespawn = false;
      for (const p of prizes.prizes) {
        if (p.body.position.y < -0.2) { needsRespawn = true; break; }
      }
      if (needsRespawn) respawnPrizes();
    }
    updateStatsUI();
  },
});
game.bindKeyboard();

// ─── 통계 UI ────────────────────────────────────────────────────
const ui = {
  state: document.getElementById('state'),
  plays: document.getElementById('statPlays'),
  wins: document.getElementById('statWins'),
  rate: document.getElementById('statRate'),
  last: document.getElementById('statLast'),
};
function updateStatsUI() {
  ui.plays.textContent = stats.plays;
  ui.wins.textContent = stats.wins;
  const rate = stats.plays === 0 ? 0 : (stats.wins / stats.plays) * 100;
  ui.rate.textContent = rate.toFixed(1) + '%';
  ui.last.textContent = stats.lastWin === null ? '—' : (stats.lastWin ? '획득 ✓' : '실패');
}
updateStatsUI();

document.getElementById('btn-drop').addEventListener('click', () => game.triggerDrop());
document.getElementById('btn-refill').addEventListener('click', respawnPrizes);
document.getElementById('btn-reset').addEventListener('click', () => {
  stats.plays = 0; stats.wins = 0; stats.lastWin = null; stats.consecutiveLosses = 0;
  updateStatsUI();
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ─── 루프 ────────────────────────────────────────────────────────
const FIXED_DT = 1 / 60;
let last = performance.now() / 1000;
let acc = 0;

function tick() {
  const now = performance.now() / 1000;
  let dt = now - last;
  last = now;
  if (dt > 0.1) dt = 0.1;
  acc += dt;

  game.update(dt);
  applyArmForce();
  claw.applyMotor(dt);

  while (acc >= FIXED_DT) {
    world.step(FIXED_DT);
    acc -= FIXED_DT;
  }

  claw.syncMeshes();
  prizes.syncMeshes();

  ui.state.textContent = game.getStateLabel();

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
