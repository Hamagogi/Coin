// 2발톱 클로 어셈블리.
// 구조:
//   - hub: 키네매틱 바디 (코드로 직접 위치 제어, 물리 영향 받지 않음)
//   - prong L/R: 다이내믹 바디. hub와 hinge 조인트로 결합.
//   - hinge에 motor를 걸어 열림/닫힘 제어. 모터 토크 = settings.armForce.
//
// 키네매틱 hub를 움직이면 hinge를 통해 prong이 따라가며,
// 모터 토크가 작으면 경품 무게에 밀려 발톱이 벌어지면서 미끄러짐.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const CLAW = {
  HUB_R: 0.025,
  HUB_H: 0.04,
  PRONG_LEN: 0.13,
  PRONG_W: 0.012,
  PRONG_T: 0.012,
  PIVOT_OFFSET: 0.022,    // hub 중심에서 hinge 축까지 거리
  OPEN_ANGLE: 0.95,       // rad. 열렸을 때 prong이 안쪽으로 기운 각도(0=수직)
  CLOSE_ANGLE: 0.05,      // rad. 닫혔을 때 prong이 거의 수직
};

export function createClaw(scene, world, materials, initialPos) {
  const group = new THREE.Group();
  scene.add(group);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.85 });
  const prongMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.3, metalness: 0.9 });

  // ─── Hub (키네매틱) ───────────────────────────────────────────────
  const hubShape = new CANNON.Cylinder(CLAW.HUB_R, CLAW.HUB_R, CLAW.HUB_H, 16);
  const hubBody = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    shape: hubShape,
    material: materials.claw,
  });
  hubBody.position.set(initialPos.x, initialPos.y, initialPos.z);
  world.addBody(hubBody);

  const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(CLAW.HUB_R, CLAW.HUB_R, CLAW.HUB_H, 24),
    metalMat,
  );
  hubMesh.castShadow = true;
  scene.add(hubMesh);

  // 케이블 시각화
  const cableMat = new THREE.LineBasicMaterial({ color: 0x888888 });
  const cableGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const cable = new THREE.Line(cableGeom, cableMat);
  scene.add(cable);

  // ─── Prongs ───────────────────────────────────────────────────────
  // 각 prong은 박스 모양. 위쪽 끝(아래로 -Y 방향에서 hub와 가장 가까운 부분)이 hinge 축.
  // 로컬 좌표: prong 중심을 (0, -PRONG_LEN/2, 0)에 배치, prong은 -Y 방향 막대.
  function makeProng(side /* +1 right, -1 left */) {
    const shape = new CANNON.Box(new CANNON.Vec3(
      CLAW.PRONG_W / 2, CLAW.PRONG_LEN / 2, CLAW.PRONG_T / 2,
    ));
    const body = new CANNON.Body({
      mass: 0.05,                // 가벼움
      shape,
      material: materials.claw,
      linearDamping: 0.2,
      angularDamping: 0.4,
    });
    // 초기 위치: hub 옆에 매달림
    body.position.set(
      hubBody.position.x + side * CLAW.PIVOT_OFFSET,
      hubBody.position.y - CLAW.PRONG_LEN / 2,
      hubBody.position.z,
    );
    world.addBody(body);

    // Hinge 조인트: hub의 (side*PIVOT_OFFSET, -HUB_H/2, 0) ↔ prong의 (0, +PRONG_LEN/2, 0)
    // 회전축은 z축 (prong이 xy 평면 안에서 안/밖으로 흔들림)
    const hinge = new CANNON.HingeConstraint(hubBody, body, {
      pivotA: new CANNON.Vec3(side * CLAW.PIVOT_OFFSET, -CLAW.HUB_H / 2, 0),
      pivotB: new CANNON.Vec3(0, CLAW.PRONG_LEN / 2, 0),
      axisA:  new CANNON.Vec3(0, 0, 1),
      axisB:  new CANNON.Vec3(0, 0, 1),
      collideConnected: false,
    });
    hinge.enableMotor();
    world.addConstraint(hinge);

    // 시각화
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(CLAW.PRONG_W, CLAW.PRONG_LEN, CLAW.PRONG_T),
      prongMat,
    );
    mesh.castShadow = true;
    scene.add(mesh);

    return { body, hinge, mesh, side };
  }

  const prongL = makeProng(-1);
  const prongR = makeProng(+1);

  // ─── 컨트롤 헬퍼 ──────────────────────────────────────────────────
  let openness = 1.0;          // 0 = 닫힘, 1 = 열림 (UI용 시각 상태)
  let motorForce = 3.0;        // settings.armForce가 갱신
  let mode = 'OPEN';           // OPEN | CLOSE | HOLD

  function applyMotor(dt) {
    // 목표 각속도: OPEN/CLOSE에 따라 부호. HOLD는 0을 유지하려 함.
    // motor force(maxForce) = 외부 토크 한계 → 경품에 밀리면 prong이 외부 회전을 못 막음.
    const targetVel = mode === 'OPEN' ? +1.5 :
                      mode === 'CLOSE' ? -1.5 : 0;
    // side에 따라 부호 반전 (왼/오 prong은 닫는 방향이 반대)
    prongL.hinge.setMotorSpeed(targetVel * +1);
    prongR.hinge.setMotorSpeed(targetVel * -1);
    prongL.hinge.setMotorMaxForce(motorForce);
    prongR.hinge.setMotorMaxForce(motorForce);
  }

  function setHubPosition(x, y, z) {
    // 키네매틱 바디는 velocity로 움직이는 것이 안정적.
    // 단, 이 시뮬레이터는 위치 직접 설정으로 충분.
    hubBody.position.set(x, y, z);
  }

  function setHubVelocity(vx, vy, vz) {
    hubBody.velocity.set(vx, vy, vz);
  }

  function open()  { mode = 'OPEN'; }
  function close() { mode = 'CLOSE'; }
  function hold()  { mode = 'HOLD'; }
  function setForce(n) { motorForce = n; }

  function syncMeshes() {
    hubMesh.position.copy(hubBody.position);
    hubMesh.quaternion.copy(hubBody.quaternion);
    prongL.mesh.position.copy(prongL.body.position);
    prongL.mesh.quaternion.copy(prongL.body.quaternion);
    prongR.mesh.position.copy(prongR.body.position);
    prongR.mesh.quaternion.copy(prongR.body.quaternion);

    // 케이블: 캐비닛 천장 → hub 상단
    const top = new THREE.Vector3(hubBody.position.x, 1.0, hubBody.position.z);
    const bot = new THREE.Vector3(hubBody.position.x, hubBody.position.y + CLAW.HUB_H / 2, hubBody.position.z);
    cable.geometry.setFromPoints([top, bot]);
  }

  return {
    hubBody, prongL, prongR,
    setHubPosition, setHubVelocity,
    open, close, hold, setForce,
    applyMotor, syncMeshes,
    get mode() { return mode; },
    get prongBodies() { return [prongL.body, prongR.body]; },
  };
}
