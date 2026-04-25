// 캐비닛 (橋渡し / 하시와타시 — 4봉 구성)
//
// 봉 배치 (X축 기준, Z축으로 길게 누움):
//   바깥 좌  안쪽 좌  안쪽 우  바깥 우
//   ●        ●        ●        ●
//   매끈     고마찰   고마찰    매끈
//   살짝높음 기준높이 기준높이  살짝높음
//
// 안쪽 두 봉이 경품을 받치고, 바깥 두 봉은 측면 가드 역할 (살짝 높아 경품의 측면 이탈 방지).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const CABINET = {
  W: 0.7,
  D: 0.7,
  H: 0.8,
  WALL_T: 0.02,
  BAR_HEIGHT: 0.30,        // 안쪽 봉 중심 높이
};

export function createCabinet(scene, world, materials) {
  const { W, D, H, WALL_T } = CABINET;
  const halfW = W / 2;
  const halfD = D / 2;

  const wallVisMat = new THREE.MeshPhysicalMaterial({
    color: 0x66bbff, transparent: true, opacity: 0.10,
    roughness: 0.05, metalness: 0, transmission: 0.92, thickness: 0.5,
    side: THREE.DoubleSide,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.85 });

  // ─── 바닥 (평탄, 구멍 없음) ──────────────────────────────────────
  const floorShape = new CANNON.Box(new CANNON.Vec3(W / 2, WALL_T / 2, D / 2));
  const floorBody = new CANNON.Body({ mass: 0, material: materials.floor, shape: floorShape });
  floorBody.position.set(0, WALL_T / 2, 0);
  world.addBody(floorBody);

  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(W, WALL_T, D), floorMat);
  floorMesh.position.copy(floorBody.position);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // ─── 벽 4면 ────────────────────────────────────────────────────
  const walls = [
    { sx: WALL_T, sy: H, sz: D, cx: -halfW, cy: H / 2, cz: 0 },
    { sx: WALL_T, sy: H, sz: D, cx: +halfW, cy: H / 2, cz: 0 },
    { sx: W, sy: H, sz: WALL_T, cx: 0, cy: H / 2, cz: +halfD },
    { sx: W, sy: H, sz: WALL_T, cx: 0, cy: H / 2, cz: -halfD },
  ];
  for (const w of walls) {
    const shape = new CANNON.Box(new CANNON.Vec3(w.sx / 2, w.sy / 2, w.sz / 2));
    const body = new CANNON.Body({ mass: 0, material: materials.wall, shape });
    body.position.set(w.cx, w.cy, w.cz);
    world.addBody(body);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.sx, w.sy, w.sz), wallVisMat);
    mesh.position.copy(body.position);
    scene.add(mesh);
  }

  // 상단 프레임 (시각만)
  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.04, 0.04, D + 0.04),
    frameMat,
  );
  topFrame.position.set(0, H + 0.02, 0);
  scene.add(topFrame);

  // ─── 봉 (4개) ─────────────────────────────────────────────────
  const barRefs = { bodies: [], meshes: [] };

  function buildBars({ innerGap, outerWidth, outerOffset, radius }) {
    // 기존 제거
    for (const b of barRefs.bodies) world.removeBody(b);
    for (const m of barRefs.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    barRefs.bodies = [];
    barRefs.meshes = [];

    const length = D - 0.02;             // 캐비닛 깊이에 살짝 못 미치게

    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xc0c4cc, roughness: 0.55, metalness: 0.7,    // 살짝 거친 질감
    });
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf2, roughness: 0.10, metalness: 0.95,   // 매끈하고 광택
    });

    const definitions = [
      { x: -innerGap / 2,   y: CABINET.BAR_HEIGHT,                 mat: materials.barInner, vmat: innerMat, kind: 'inner' },
      { x: +innerGap / 2,   y: CABINET.BAR_HEIGHT,                 mat: materials.barInner, vmat: innerMat, kind: 'inner' },
      { x: -outerWidth / 2, y: CABINET.BAR_HEIGHT + outerOffset,   mat: materials.barOuter, vmat: outerMat, kind: 'outer' },
      { x: +outerWidth / 2, y: CABINET.BAR_HEIGHT + outerOffset,   mat: materials.barOuter, vmat: outerMat, kind: 'outer' },
    ];

    for (const d of definitions) {
      // Cannon Cylinder는 기본 Y축 정렬. X축으로 -π/2 회전 시 Z축 정렬.
      const shape = new CANNON.Cylinder(radius, radius, length, 16);
      const body = new CANNON.Body({ mass: 0, material: d.mat, shape });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
      body.quaternion.copy(q);
      body.position.set(d.x, d.y, 0);
      world.addBody(body);

      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 24),
        d.vmat,
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(d.x, d.y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      barRefs.bodies.push(body);
      barRefs.meshes.push(mesh);
    }
  }

  return {
    buildBars,
    barRefs,
    barHeight: CABINET.BAR_HEIGHT,
  };
}
