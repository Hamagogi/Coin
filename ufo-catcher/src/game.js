// 게임 상태 머신 + 입력 처리
//
// 상태 흐름:
//   IDLE     : 사용자 입력으로 X·Z 이동 가능. Space → DROPPING.
//   DROPPING : 클로가 -Y로 하강. 바닥 근처 도달 → CLOSING.
//   CLOSING  : 발톱 닫힘. 일정 시간 후 → LIFTING.
//   LIFTING  : 키네매틱 hub 상승. 천장 근처 → MOVING_TO_HOLE.
//   MOVING   : 구멍 위로 X·Z 이동. 도착 → RELEASING.
//   RELEASING: 발톱 열림. 일정 시간 후 → IDLE.
//
// 각 단계 사이의 timeout은 _timer로 관리, dt로 감소.
import { CABINET } from './cabinet.js';
import { PRIZE_SIZE } from './prizes.js';

export const STATE = {
  IDLE: 'IDLE',
  DROPPING: 'DROPPING',
  CLOSING: 'CLOSING',
  LIFTING: 'LIFTING',
  MOVING: 'MOVING',
  RELEASING: 'RELEASING',
};

const KOREAN_STATE = {
  IDLE: '대기 중 (방향키 이동 / Space 드롭)',
  DROPPING: '하강 중',
  CLOSING: '발톱 닫힘',
  LIFTING: '상승 중',
  MOVING: '구멍으로 이동',
  RELEASING: '발톱 열림 (낙하)',
};

export function createGame({ claw, prizes, settings, holeCenter, onPlayEnd }) {
  let state = STATE.IDLE;
  let timer = 0;
  // 클로 hub 목표 위치 (매 프레임 setHubPosition 호출됨)
  const hub = { x: -CABINET.W / 2 + 0.12, y: CABINET.H - 0.1, z: -CABINET.D / 2 + 0.12 };
  const HOME = { ...hub };
  const TOP_Y = CABINET.H - 0.1;
  const BOTTOM_Y = 0.12;       // 발톱 끝이 바닥에 거의 닿는 높이
  const RELEASE_Y = 0.5;       // 구멍 위에서 해제하는 높이
  let playReleased = false;    // 이번 플레이에서 경품을 떨어뜨렸는지 (구멍 도달 무관)

  // 방향키 상태
  const keys = { up: 0, down: 0, left: 0, right: 0 };

  function bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = 1;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = 1;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = 1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = 1;
      if (e.code === 'Space') { e.preventDefault(); triggerDrop(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = 0;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = 0;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = 0;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = 0;
    });
  }

  function triggerDrop() {
    if (state !== STATE.IDLE) return;
    state = STATE.DROPPING;
    timer = 0;
    playReleased = false;
    claw.open();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // 매 프레임 호출. dt=초.
  function update(dt) {
    const moveSpeed = settings.moveSpeed;
    const liftSpeed = settings.liftSpeed;

    if (state === STATE.IDLE) {
      hub.x += (keys.right - keys.left) * moveSpeed * dt;
      hub.z += (keys.down - keys.up) * moveSpeed * dt;   // up = -z (앞쪽)
      hub.x = clamp(hub.x, -CABINET.W / 2 + 0.05, CABINET.W / 2 - 0.05);
      hub.z = clamp(hub.z, -CABINET.D / 2 + 0.05, CABINET.D / 2 - 0.05);
      claw.open();
    }
    else if (state === STATE.DROPPING) {
      hub.y -= liftSpeed * dt;
      claw.open();
      if (hub.y <= BOTTOM_Y) {
        hub.y = BOTTOM_Y;
        state = STATE.CLOSING;
        timer = 0.6;
      }
    }
    else if (state === STATE.CLOSING) {
      claw.close();
      timer -= dt;
      if (timer <= 0) {
        state = STATE.LIFTING;
        claw.hold();              // 모터를 닫힘 유지
      }
    }
    else if (state === STATE.LIFTING) {
      hub.y += liftSpeed * dt;
      claw.hold();
      if (hub.y >= TOP_Y) {
        hub.y = TOP_Y;
        state = STATE.MOVING;
      }
    }
    else if (state === STATE.MOVING) {
      const dx = holeCenter.x - hub.x;
      const dz = holeCenter.z - hub.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.01) {
        state = STATE.RELEASING;
        timer = 0.7;
        playReleased = true;
      } else {
        const step = Math.min(dist, moveSpeed * dt);
        hub.x += (dx / dist) * step;
        hub.z += (dz / dist) * step;
        claw.hold();
      }
    }
    else if (state === STATE.RELEASING) {
      claw.open();
      timer -= dt;
      if (timer <= 0) {
        // 결과 확정: 구멍 영역에 있는 경품이 있으면 win.
        // 단순화: 이번 플레이에서 떨어뜨린 후 1.0초 정도 더 시뮬했어야 정확하지만
        // 여기선 release 직후 chute 위(즉, 구멍 사각형 내부 + y < 0.05)에 있는 경품이 있는지 검사.
        let win = false;
        for (const p of prizes.prizes) {
          const px = p.body.position.x;
          const pz = p.body.position.z;
          const py = p.body.position.y;
          if (py < 0.05 &&
              Math.abs(px - holeCenter.x) < CABINET.HOLE_W / 2 &&
              Math.abs(pz - holeCenter.z) < CABINET.HOLE_D / 2) {
            win = true; break;
          }
        }
        if (onPlayEnd) onPlayEnd(win);
        // 홈 포지션으로 복귀
        hub.x = HOME.x; hub.y = HOME.y; hub.z = HOME.z;
        state = STATE.IDLE;
      }
    }

    claw.setHubPosition(hub.x, hub.y, hub.z);
  }

  function getStateLabel() { return KOREAN_STATE[state]; }
  function setHomePosition() {
    hub.x = HOME.x; hub.y = HOME.y; hub.z = HOME.z;
    claw.setHubPosition(hub.x, hub.y, hub.z);
  }

  return { update, triggerDrop, bindKeyboard, getStateLabel, setHomePosition,
           get state() { return state; } };
}
