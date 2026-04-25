// 물리 월드 + 재질 정의 (Cannon-es)
// 단위: m, kg, s. 중력 -9.81 m/s².
import * as CANNON from 'cannon-es';

export function createWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 24;            // 스택 안정성을 위해 높게
  world.solver.tolerance = 0.001;
  world.defaultContactMaterial.restitution = 0.05;
  world.defaultContactMaterial.contactEquationStiffness = 1e8;

  const materials = {
    floor: new CANNON.Material('floor'),
    wall:  new CANNON.Material('wall'),
    claw:  new CANNON.Material('claw'),
    prize: new CANNON.Material('prize'),
  };

  // 발톱 ↔ 경품: 시뮬레이션의 핵심. settings.friction 으로 런타임 변경됨.
  const clawPrize = new CANNON.ContactMaterial(materials.claw, materials.prize, {
    friction: 0.5,
    restitution: 0.02,
  });
  // 경품 ↔ 경품: 더미 안에서 굴러다니는 거
  const prizePrize = new CANNON.ContactMaterial(materials.prize, materials.prize, {
    friction: 0.4,
    restitution: 0.05,
  });
  // 경품 ↔ 바닥/벽
  const prizeFloor = new CANNON.ContactMaterial(materials.prize, materials.floor, {
    friction: 0.6,
    restitution: 0.05,
  });
  const prizeWall  = new CANNON.ContactMaterial(materials.prize, materials.wall, {
    friction: 0.3,
    restitution: 0.1,
  });
  for (const m of [clawPrize, prizePrize, prizeFloor, prizeWall]) {
    world.addContactMaterial(m);
  }

  return { world, materials, contacts: { clawPrize, prizePrize, prizeFloor, prizeWall } };
}
