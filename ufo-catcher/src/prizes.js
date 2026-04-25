// 경품 — 봉 위에 얹힌 상태로 1개 스폰.
// 사이즈는 봉 간격보다 살짝 큼 (양쪽 봉에 걸쳐짐).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CABINET } from './cabinet.js';

const COLORS = [0xff5757, 0x57c2ff, 0xffce57, 0x9d57ff, 0x57ff8a, 0xff9357];

export function createPrizeSpawner(scene, world, materials) {
  const prizes = []; // { body, mesh, size }

  function spawnOne({ size, mass, x, z }) {
    const half = size / 2;
    const shape = new CANNON.Box(new CANNON.Vec3(half, half, half));
    const body = new CANNON.Body({
      mass,
      shape,
      material: materials.prize,
      linearDamping: 0.05,
      angularDamping: 0.15,
      allowSleep: true,
      sleepSpeedLimit: 0.04,
      sleepTimeLimit: 0.5,
    });
    // 봉 위에 약간 띄워 놓음 (떨어지면서 봉에 안착)
    const yOnBars = CABINET.BAR_HEIGHT + 0.02 + half;
    body.position.set(x, yOnBars, z);
    world.addBody(body);

    const color = COLORS[prizes.length % COLORS.length];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const prize = { body, mesh, size };
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

  function spawn({ count, size, mass }) {
    clearAll();
    // 봉 위에 일렬로 배치 (Z 방향)
    const span = CABINET.D - 0.10;
    for (let i = 0; i < count; i++) {
      const z = count === 1 ? 0 : -span / 2 + (i + 0.5) * (span / count);
      spawnOne({ size, mass, x: 0, z });
    }
  }

  function syncMeshes() {
    for (const p of prizes) {
      p.mesh.position.copy(p.body.position);
      p.mesh.quaternion.copy(p.body.quaternion);
    }
  }

  return { spawn, spawnOne, clearAll, syncMeshes, prizes };
}
