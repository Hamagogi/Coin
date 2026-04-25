// 2발톱 클로 어셈블리.
//
// 실제 SEGA UFO Catcher 2발톱 형상을 흉내냄:
//   - 상단 직선부 (knuckle 부근)
//   - 안쪽으로 굴곡 (~32°)
//   - 하단 굴곡부 + 손톱(fingernail) 평면 팁
//
// 구조:
//   - hub: 키네매틱 바디 (코드로 직접 위치 제어)
//   - prong L/R: 다이내믹 컴파운드 바디 (upper box + lower bent box + tip plate)
//                 hub와 hinge(z축) + motor.
//   - 키네매틱 hub는 매 프레임 angularVelocity·quaternion 리셋해 회전 방지.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const CLAW = {
  HUB_R: 0.025,
  HUB_H: 0.04,
  // 발톱 분절 길이
  UPPER_LEN: 0.085,        // 상단 직선부
  LOWER_LEN: 0.055,        // 하단 굴곡부
  TIP_LEN:   0.022,        // 손톱(fingernail) 길이
  PRONG_W: 0.014,
  PRONG_T: 0.014,
  TIP_W:   0.022,          // 손톱 폭 (살짝 넓음)
  TIP_T:   0.005,          // 손톱 두께 (얇은 평판)
  BEND_ANGLE: Math.PI / 5.6,   // 약 32°
  PIVOT_OFFSET: 0.024,     // hub 중심에서 hinge 축까지
  OPEN_ANGLE: 0.95,
  CLOSE_ANGLE: 0.05,
};

export function createClaw(scene, world, materials, initialPos) {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.30, metalness: 0.88 });
  const prongMat = new THREE.MeshStandardMaterial({ color: 0xeef0f5, roughness: 0.22, metalness: 0.93 });
  const tipMat   = new THREE.MeshStandardMaterial({ color: 0xfafbfd, roughness: 0.18, metalness: 0.96 });
  const knuckleMat = new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.55, metalness: 0.4 });

  // ─── Hub (키네매틱) + 너트 형태 ────────────────────────────────
  const hubShape = new CANNON.Cylinder(CLAW.HUB_R, CLAW.HUB_R, CLAW.HUB_H, 16);
  const hubBody = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    shape: hubShape,
    material: materials.claw,
  });
  hubBody.position.set(initialPos.x, initialPos.y, initialPos.z);
  world.addBody(hubBody);

  const hubGroup = new THREE.Group();
  // 메인 실린더
  const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(CLAW.HUB_R, CLAW.HUB_R, CLAW.HUB_H, 24),
    metalMat,
  );
  hubMesh.castShadow = true;
  hubGroup.add(hubMesh);
  // 상단 캡 (육각 너트 느낌)
  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(CLAW.HUB_R * 1.2, CLAW.HUB_R * 1.2, 0.012, 6),
    knuckleMat,
  );
  hubCap.position.y = CLAW.HUB_H / 2 + 0.006;
  hubGroup.add(hubCap);
  // 하단 디스크 (knuckle 베어링 느낌)
  const hubDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(CLAW.HUB_R * 1.05, CLAW.HUB_R * 1.05, 0.008, 24),
    knuckleMat,
  );
  hubDisk.position.y = -CLAW.HUB_H / 2 - 0.004;
  hubGroup.add(hubDisk);
  scene.add(hubGroup);

  // 케이블
  const cableMat = new THREE.LineBasicMaterial({ color: 0x888888 });
  const cableGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0),
  ]);
  const cable = new THREE.Line(cableGeom, cableMat);
  scene.add(cable);

  // ─── Prongs (컴파운드 + 그룹) ────────────────────────────────────
  function makeProng(side /* +1 right, -1 left */) {
    // 굴곡 방향 (안쪽). 좌측 발톱은 +X(=오른쪽), 우측 발톱은 -X(=왼쪽)으로 굽음.
    const bendDir = -side;
    const bend = CLAW.BEND_ANGLE;
    const w = CLAW.PRONG_W, t = CLAW.PRONG_T;
    const ul = CLAW.UPPER_LEN, ll = CLAW.LOWER_LEN, tl = CLAW.TIP_LEN;

    // 컴파운드 바디 — local 원점은 hinge 회전 축점.
    // 상단 직선부: 원점에서 -Y로 내려감.
    // 굴곡 시작점: (0, -ul, 0)
    // 하단 분절: 굴곡 시작점에서 (sin(bend)*ll, -cos(bend)*ll) 방향으로 ll 길이.
    // 손톱: 하단 끝에서 더 안쪽 방향으로 tl.
    const lowerStart = { x: 0, y: -ul, z: 0 };
    const lowerEnd = {
      x: bendDir * Math.sin(bend) * ll,
      y: -ul - Math.cos(bend) * ll,
      z: 0,
    };
    // 손톱은 하단 분절을 살짝 더 길게 연장한 방향. 단순화를 위해 동일 각도 유지.
    const tipEnd = {
      x: lowerEnd.x + bendDir * Math.sin(bend) * tl,
      y: lowerEnd.y - Math.cos(bend) * tl,
      z: 0,
    };

    const body = new CANNON.Body({
      mass: 0.06,
      material: materials.claw,
      linearDamping: 0.2,
      angularDamping: 0.4,
    });

    // (1) 상단 직선 박스
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(w / 2, ul / 2, t / 2)),
      new CANNON.Vec3(0, -ul / 2, 0),
    );

    // (2) 하단 굴곡 박스
    const lowerCenter = new CANNON.Vec3(
      (lowerStart.x + lowerEnd.x) / 2,
      (lowerStart.y + lowerEnd.y) / 2,
      0,
    );
    const lowerQuat = new CANNON.Quaternion();
    lowerQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), bendDir * bend);
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(w / 2, ll / 2, t / 2)),
      lowerCenter,
      lowerQuat,
    );

    // (3) 손톱 — 얇은 평판. 굴곡 방향 그대로 더 안쪽으로 내밂.
    const tipCenter = new CANNON.Vec3(
      (lowerEnd.x + tipEnd.x) / 2,
      (lowerEnd.y + tipEnd.y) / 2,
      0,
    );
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(CLAW.TIP_W / 2, tl / 2, CLAW.TIP_T / 2)),
      tipCenter,
      lowerQuat,
    );

    // 바디 위치: hinge anchor가 hub 바닥에 오도록.
    body.position.set(
      hubBody.position.x + side * CLAW.PIVOT_OFFSET,
      hubBody.position.y - CLAW.HUB_H / 2,
      hubBody.position.z,
    );
    body.quaternion.set(0, 0, 0, 1);
    world.addBody(body);

    // Hinge: pivotA on hub, pivotB at body 원점(=hinge axis)
    const hinge = new CANNON.HingeConstraint(hubBody, body, {
      pivotA: new CANNON.Vec3(side * CLAW.PIVOT_OFFSET, -CLAW.HUB_H / 2, 0),
      pivotB: new CANNON.Vec3(0, 0, 0),
      axisA:  new CANNON.Vec3(0, 0, 1),
      axisB:  new CANNON.Vec3(0, 0, 1),
      collideConnected: false,
    });
    hinge.enableMotor();
    world.addConstraint(hinge);

    // ─── 시각 메시 (그룹 = 바디 origin 기준) ─────────────────────
    const group = new THREE.Group();

    // knuckle (hinge 부근 검은 베어링)
    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 16, 12),
      knuckleMat,
    );
    knuckle.position.set(0, 0, 0);
    group.add(knuckle);

    // 상단 박스
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(w, ul, t),
      prongMat,
    );
    upper.position.set(0, -ul / 2, 0);
    upper.castShadow = true;
    group.add(upper);

    // 굴곡 지점에 작은 베벨 (knuckle 느낌)
    const bevel = new THREE.Mesh(
      new THREE.SphereGeometry(0.010, 16, 12),
      prongMat,
    );
    bevel.position.set(lowerStart.x, lowerStart.y, 0);
    group.add(bevel);

    // 하단 박스
    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(w, ll, t),
      prongMat,
    );
    lower.position.set(lowerCenter.x, lowerCenter.y, 0);
    lower.rotation.z = bendDir * bend;
    lower.castShadow = true;
    group.add(lower);

    // 손톱 (얇은 평판, 살짝 넓음 — 경품 받침면)
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(CLAW.TIP_W, tl, CLAW.TIP_T),
      tipMat,
    );
    tip.position.set(tipCenter.x, tipCenter.y, 0);
    tip.rotation.z = bendDir * bend;
    tip.castShadow = true;
    group.add(tip);

    scene.add(group);

    return { body, hinge, group, side };
  }

  const prongL = makeProng(-1);
  const prongR = makeProng(+1);

  // ─── 컨트롤 ───────────────────────────────────────────────────
  let motorForce = 3.0;
  let mode = 'OPEN';

  function applyMotor() {
    const targetVel = mode === 'OPEN' ? +1.5 :
                      mode === 'CLOSE' ? -1.5 : 0;
    prongL.hinge.setMotorSpeed(targetVel * +1);
    prongR.hinge.setMotorSpeed(targetVel * -1);
    prongL.hinge.setMotorMaxForce(motorForce);
    prongR.hinge.setMotorMaxForce(motorForce);
  }

  function setHubPosition(x, y, z) {
    hubBody.position.set(x, y, z);
    hubBody.velocity.set(0, 0, 0);
    hubBody.angularVelocity.set(0, 0, 0);
    hubBody.quaternion.set(0, 0, 0, 1);
  }
  function setHubVelocity(vx, vy, vz) { hubBody.velocity.set(vx, vy, vz); }
  function open()  { mode = 'OPEN'; }
  function close() { mode = 'CLOSE'; }
  function hold()  { mode = 'HOLD'; }
  function setForce(n) { motorForce = n; }

  function syncMeshes() {
    hubGroup.position.copy(hubBody.position);
    hubGroup.quaternion.copy(hubBody.quaternion);
    prongL.group.position.copy(prongL.body.position);
    prongL.group.quaternion.copy(prongL.body.quaternion);
    prongR.group.position.copy(prongR.body.position);
    prongR.group.quaternion.copy(prongR.body.quaternion);

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
