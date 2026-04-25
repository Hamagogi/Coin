// 캐비닛(외함) — 바닥 4분할로 한 모서리에 구멍을 만든다.
// 모서리 구멍 좌표는 (+x, +z) 코너. 그 아래로 떨어지면 획득 판정.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const CABINET = {
  W: 0.7,          // x폭
  D: 0.7,          // z깊이
  H: 0.8,          // y높이
  WALL_T: 0.02,    // 벽 두께
  HOLE_W: 0.16,    // 구멍 가로
  HOLE_D: 0.16,    // 구멍 깊이
};

export function createCabinet(scene, world, materials) {
  const { W, D, H, WALL_T, HOLE_W, HOLE_D } = CABINET;
  const halfW = W / 2;
  const halfD = D / 2;

  const wallVisMat = new THREE.MeshPhysicalMaterial({
    color: 0x66bbff, transparent: true, opacity: 0.12,
    roughness: 0.05, metalness: 0, transmission: 0.9, thickness: 0.5,
    side: THREE.DoubleSide,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.8 });
  const holeMat  = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });

  // ─── 바닥 (구멍 4분할) ────────────────────────────────────────────
  // 구멍은 (+x 끝, +z 끝) 모서리.
  const holeMinX = halfW - HOLE_W;
  const holeMinZ = halfD - HOLE_D;

  const floorPieces = [
    // 1) 큰 구역 — x: [-W/2, holeMinX], z: 전체
    { sx: holeMinX + halfW, sz: D, cx: (-halfW + holeMinX) / 2, cz: 0 },
    // 2) 우측 좁은 띠 — x: [holeMinX, +W/2], z: [-D/2, holeMinZ]
    { sx: HOLE_W, sz: holeMinZ + halfD, cx: (holeMinX + halfW) / 2, cz: (-halfD + holeMinZ) / 2 },
  ];
  for (const p of floorPieces) {
    const shape = new CANNON.Box(new CANNON.Vec3(p.sx / 2, WALL_T / 2, p.sz / 2));
    const body = new CANNON.Body({ mass: 0, material: materials.floor, shape });
    body.position.set(p.cx, WALL_T / 2, p.cz);
    world.addBody(body);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.sx, WALL_T, p.sz), floorMat);
    mesh.position.copy(body.position);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // 구멍 자리 시각화 (검정 사각형)
  const holeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(HOLE_W, HOLE_D),
    holeMat,
  );
  holeMesh.rotation.x = -Math.PI / 2;
  holeMesh.position.set(holeMinX + HOLE_W / 2, 0.001, holeMinZ + HOLE_D / 2);
  scene.add(holeMesh);

  // ─── 벽 (4면, 유리 시각화) ────────────────────────────────────────
  const walls = [
    // 좌
    { sx: WALL_T, sy: H, sz: D, cx: -halfW, cy: H / 2, cz: 0 },
    // 우
    { sx: WALL_T, sy: H, sz: D, cx: +halfW, cy: H / 2, cz: 0 },
    // 뒤(z+)
    { sx: W, sy: H, sz: WALL_T, cx: 0, cy: H / 2, cz: +halfD },
    // 앞(z-)
    { sx: W, sy: H, sz: WALL_T, cx: 0, cy: H / 2, cz: -halfD },
  ];
  for (const w of walls) {
    const shape = new CANNON.Box(new CANNON.Vec3(w.sx / 2, w.sy / 2, w.sz / 2));
    const body = new CANNON.Body({ mass: 0, material: materials.wall, shape });
    body.position.set(w.cx, w.cy, w.cz);
    world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w.sx, w.sy, w.sz),
      wallVisMat,
    );
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

  // ─── 슈트 콜렉터 (구멍 아래) ─────────────────────────────────────
  // 구멍 아래에 트리거 박스: 경품이 닿으면 win 카운트.
  // 콜리전은 받지만 탄성은 0 으로 해서 즉시 정지.
  const chuteY = -0.15;
  const chuteShape = new CANNON.Box(new CANNON.Vec3(HOLE_W / 2, 0.01, HOLE_D / 2));
  const chuteBody = new CANNON.Body({ mass: 0, material: materials.floor, shape: chuteShape });
  chuteBody.position.set(holeMinX + HOLE_W / 2, chuteY, holeMinZ + HOLE_D / 2);
  chuteBody.userData = { isChute: true };
  world.addBody(chuteBody);

  return {
    holeCenter: new THREE.Vector3(
      holeMinX + HOLE_W / 2,
      0,
      holeMinZ + HOLE_D / 2,
    ),
    chuteBody,
  };
}
