// UI 슬라이더 ↔ 런타임 설정 바인딩.
// 변경 즉시 settings 객체에 반영, 일부는 onChange 콜백으로 외부에 전파.
export function createSettings(callbacks = {}) {
  const settings = {
    armForce: 3.0,            // Nm — claw 모터 maxForce
    friction: 0.5,            // claw ↔ prize 마찰계수
    liftSpeed: 0.4,           // m/s — claw 상승/하강 속도
    moveSpeed: 0.5,           // m/s — claw X·Z 이동 속도
    prizeMass: 0.20,          // kg
    prizeCount: 12,
    assistEnabled: false,
    assistForce: 8.0,
    assistAfter: 10,
  };

  function bindRange(id, key, parser = parseFloat, fmt = (v) => v.toFixed(2)) {
    const el = document.getElementById(id);
    const out = document.getElementById(id + 'Val');
    if (!el || !out) return;
    el.addEventListener('input', () => {
      settings[key] = parser(el.value);
      out.textContent = fmt(settings[key]);
      if (callbacks[key]) callbacks[key](settings[key]);
    });
    out.textContent = fmt(settings[key]);
  }

  function bindCheckbox(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!settings[key];
    el.addEventListener('change', () => {
      settings[key] = el.checked;
      if (callbacks[key]) callbacks[key](settings[key]);
    });
  }

  bindRange('armForce',   'armForce',   parseFloat, (v) => v.toFixed(1));
  bindRange('friction',   'friction',   parseFloat, (v) => v.toFixed(2));
  bindRange('liftSpeed',  'liftSpeed',  parseFloat, (v) => v.toFixed(2));
  bindRange('moveSpeed',  'moveSpeed',  parseFloat, (v) => v.toFixed(2));
  bindRange('prizeMass',  'prizeMass',  parseFloat, (v) => v.toFixed(2));
  bindRange('prizeCount', 'prizeCount', (v) => parseInt(v, 10), (v) => String(v));
  bindRange('assistForce','assistForce',parseFloat, (v) => v.toFixed(1));
  bindRange('assistAfter','assistAfter',(v) => parseInt(v, 10), (v) => String(v));
  bindCheckbox('assistEnabled', 'assistEnabled');

  return settings;
}
