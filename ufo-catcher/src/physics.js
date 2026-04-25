// 물리 월드 + 재질 정의 (Cannon-es)
// 단위: m, kg, s. 중력 -9.81 m/s².
import * as CANNON from 'cannon-es';

export function createWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 24;
  world.solver.tolerance = 0.001;
  world.defaultContactMaterial.restitution = 0.05;
  world.defaultContactMaterial.contactEquationStiffness = 1e8;

  const materials = {
    floor:    new CANNON.Material('floor'),
    wall:     new CANNON.Material('wall'),
    barInner: new CANNON.Material('barInner'),  // 안쪽 봉 (고마찰, 경품을 받침)
    barOuter: new CANNON.Material('barOuter'),  // 바깥 봉 (저마찰, 가드 레일)
    claw:     new CANNON.Material('claw'),
    prize:    new CANNON.Material('prize'),
  };

  const clawPrize = new CANNON.ContactMaterial(materials.claw, materials.prize, {
    friction: 0.5,
    restitution: 0.02,
  });
  const prizePrize = new CANNON.ContactMaterial(materials.prize, materials.prize, {
    friction: 0.4,
    restitution: 0.05,
  });
  const prizeFloor = new CANNON.ContactMaterial(materials.prize, materials.floor, {
    friction: 0.6,
    restitution: 0.05,
  });
  const prizeWall = new CANNON.ContactMaterial(materials.prize, materials.wall, {
    friction: 0.3,
    restitution: 0.1,
  });
  // 안쪽 봉: 경품을 안정적으로 받쳐야 함 → 마찰 높음
  const prizeBarInner = new CANNON.ContactMaterial(materials.prize, materials.barInner, {
    friction: 0.50,
    restitution: 0.04,
  });
  // 바깥 봉: 측면 가드. 매끈해서 경품이 미끄러져 안 걸림
  const prizeBarOuter = new CANNON.ContactMaterial(materials.prize, materials.barOuter, {
    friction: 0.10,
    restitution: 0.04,
  });
  for (const m of [clawPrize, prizePrize, prizeFloor, prizeWall, prizeBarInner, prizeBarOuter]) {
    world.addContactMaterial(m);
  }

  return {
    world, materials,
    contacts: { clawPrize, prizePrize, prizeFloor, prizeWall, prizeBarInner, prizeBarOuter },
  };
}
