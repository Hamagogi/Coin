// 경품 스폰 — 박스 형태로 캐비닛 안에 무작위 배치.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CABINET } from './cabinet.js';

const PRIZE_SIZE = 0.085;  // 한 변

const COLORS = [0xff5757, 0x57c2ff, 0xffce57, 0x9d57ff, 0x57ff8a, 0xff9357, 0xff57c8];

export function createPrizeSpawner(scene, world, materials) {
  const prizes = []; // { body, mesh }

  function spawnOne(mass) {
    const half = PRIZE_SIZE / 2;
    const shape = new CANNON.Box(new CANNON.Vec3(half, half, half));
    const body = new CANNON.Body({
      mass,
      shape,
      material: materials.prize,
      linearDamping: 0.05,
      angularDamping: 0.1,
      allowSleep: true,
      sleepSpeedLimit: 0.05,
      sleepTimeLimit: 0.5,
    });
    // 캐비닛 안 무작위 위치 (구멍 영역 피함 — 전반부 X쪽으로)
    const x = (Math.random() - 0.5) * (CABINET.W - 0.2);
    const y = 0.4 + Math.random() * 0.2;
    const z = (Math.random() - 0.5) * (CABINET.D - 0.2);
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    world.addBody(body);

    const color = COLORS[prizes.length % COLORS.length];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(PRIZE_SIZE, PRIZE_SIZE, PRIZE_SIZE),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const prize = { body, mesh, _grabbedBy: 0 };
    prizes.push(prize);
    return prize;
  }

  function clearAll() {
    for (const p of prizes) {
      world.removeBody(p.body);
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    prizes.length = 0;
  }

  function spawn(count, mass) {
    clearAll();
    for (let i = 0; i < count; i++) spawnOne(mass);
  }

  function syncMeshes() {
    for (const p of prizes) {
      p.mesh.position.copy(p.body.position);
      p.mesh.quaternion.copy(p.body.quaternion);
    }
  }

  return { spawn, clearAll, syncMeshes, prizes };
}

export { PRIZE_SIZE };
