// 게임 상태 머신 (橋渡し / 하시와타시 모드)
//
// 흐름:
//   IDLE     : 사용자 입력 대기. 방향키로 X·Z 이동, Space 드롭.
//   DROPPING : 클로 -Y 하강. 봉 위 경품 가까이 가면 → CLOSING.
//   CLOSING  : 발톱 닫힘 (잠깐).
//   LIFTING  : 클로 +Y 상승.
//   RELEASING: 발톱 열림 (잡힌 게 있다면 떨어짐).
//   SETTLE   : 1.5초 대기 (물리 안정화). 끝나면 win 판정 후 IDLE.
//
// Win 조건: 어떤 경품의 Y 위치가 봉 높이 - margin 이하 = 봉 사이로 떨어짐.
import { CABINET } from './cabinet.js';

export const STATE = {
  IDLE: 'IDLE',
  DROPPING: 'DROPPING',
  CLOSING: 'CLOSING',
  LIFTING: 'LIFTING',
  RELEASING: 'RELEASING',
  SETTLE: 'SETTLE',
};

const KOREAN_STATE = {
  IDLE: '대기 중 (방향키 이동 / Space 드롭)',
  DROPPING: '하강 중',
  CLOSING: '발톱 닫힘',
  LIFTING: '상승 중',
  RELEASING: '발톱 열림',
  SETTLE: '결과 확인 중…',
};

export function createGame({ claw, prizes, settings, onPlayEnd }) {
  let state = STATE.IDLE;
  let timer = 0;
  const HOME = { x: 0, y: CABINET.H - 0.1, z: -CABINET.D / 2 + 0.10 };
  const hub = { ...HOME };
  const TOP_Y = CABINET.H - 0.1;
  // 봉 위에서 살짝 위 (발톱이 경품 옆구리를 잡거나 밀 수 있는 높이)
  const DROP_TARGET_Y = CABINET.BAR_HEIGHT + 0.18;

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
    claw.open();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function update(dt) {
    const moveSpeed = settings.moveSpeed;
    const liftSpeed = settings.liftSpeed;

    if (state === STATE.IDLE) {
      hub.x += (keys.right - keys.left) * moveSpeed * dt;
      hub.z += (keys.down - keys.up) * moveSpeed * dt;
      hub.x = clamp(hub.x, -CABINET.W / 2 + 0.05, CABINET.W / 2 - 0.05);
      hub.z = clamp(hub.z, -CABINET.D / 2 + 0.05, CABINET.D / 2 - 0.05);
      claw.open();
    }
    else if (state === STATE.DROPPING) {
      hub.y -= liftSpeed * dt;
      claw.open();
      if (hub.y <= DROP_TARGET_Y) {
        hub.y = DROP_TARGET_Y;
        state = STATE.CLOSING;
        timer = 0.6;
      }
    }
    else if (state === STATE.CLOSING) {
      claw.close();
      timer -= dt;
      if (timer <= 0) {
        state = STATE.LIFTING;
        claw.hold();
      }
    }
    else if (state === STATE.LIFTING) {
      hub.y += liftSpeed * dt;
      claw.hold();
      if (hub.y >= TOP_Y) {
        hub.y = TOP_Y;
        state = STATE.RELEASING;
        timer = 0.5;
      }
    }
    else if (state === STATE.RELEASING) {
      claw.open();
      timer -= dt;
      if (timer <= 0) {
        state = STATE.SETTLE;
        timer = 1.5;     // 물리 안정화 대기
      }
    }
    else if (state === STATE.SETTLE) {
      claw.open();
      timer -= dt;
      if (timer <= 0) {
        // 봉 사이로 떨어진 경품이 있는가?
        let win = false;
        for (const p of prizes.prizes) {
          if (p.body.position.y < CABINET.BAR_HEIGHT - 0.05) {
            win = true; break;
          }
        }
        if (onPlayEnd) onPlayEnd(win);

        // 홈 복귀
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

  return {
    update, triggerDrop, bindKeyboard, getStateLabel, setHomePosition,
    get state() { return state; },
  };
}
