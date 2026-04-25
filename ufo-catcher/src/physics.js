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
    floor: new CANNON.Material('floor'),
    wall:  new CANNON.Material('wall'),
    bar:   new CANNON.Material('bar'),    // 하시와타시 봉
    claw:  new CANNON.Material('claw'),
    prize: new CANNON.Material('prize'),
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
  // 하시와타시 핵심: 봉↔경품 마찰. 작을수록 미끄러져 봉 사이로 잘 빠짐.
  const prizeBar = new CANNON.ContactMaterial(materials.prize, materials.bar, {
    friction: 0.4,
    restitution: 0.05,
  });
  for (const m of [clawPrize, prizePrize, prizeFloor, prizeWall, prizeBar]) {
    world.addContactMaterial(m);
  }

  return {
    world, materials,
    contacts: { clawPrize, prizePrize, prizeFloor, prizeWall, prizeBar },
  };
}
