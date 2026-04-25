// UI 슬라이더 ↔ 런타임 설정 바인딩.
export function createSettings(callbacks = {}) {
  const settings = {
    armForce: 3.0,
    friction: 0.5,            // claw ↔ prize
    barFriction: 0.4,         // bar ↔ prize (하시와타시 핵심 변수)
    liftSpeed: 0.4,
    moveSpeed: 0.5,
    prizeMass: 0.20,
    prizeSize: 0.10,          // 경품 한 변 길이
    prizeCount: 1,
    barGap: 0.06,             // 봉 사이 간격
    barRadius: 0.008,         // 봉 굵기 (반지름)
    assistEnabled: false,
    assistForce: 8.0,
    assistAfter: 10,
  };

  function bindRange(id, key, parser = parseFloat, fmt = (v) => v.toFixed(2)) {
    const el = document.getElementById(id);
    const out = document.getElementById(id + 'Val');
    if (!el || !out) return;
    el.value = String(settings[key]);
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

  bindRange('armForce',    'armForce',    parseFloat,             (v) => v.toFixed(1));
  bindRange('friction',    'friction',    parseFloat,             (v) => v.toFixed(2));
  bindRange('barFriction', 'barFriction', parseFloat,             (v) => v.toFixed(2));
  bindRange('liftSpeed',   'liftSpeed',   parseFloat,             (v) => v.toFixed(2));
  bindRange('moveSpeed',   'moveSpeed',   parseFloat,             (v) => v.toFixed(2));
  bindRange('prizeMass',   'prizeMass',   parseFloat,             (v) => v.toFixed(2));
  bindRange('prizeSize',   'prizeSize',   parseFloat,             (v) => v.toFixed(3));
  bindRange('prizeCount',  'prizeCount',  (v) => parseInt(v, 10), (v) => String(v));
  bindRange('barGap',      'barGap',      parseFloat,             (v) => v.toFixed(3));
  bindRange('barRadius',   'barRadius',   parseFloat,             (v) => v.toFixed(3));
  bindRange('assistForce', 'assistForce', parseFloat,             (v) => v.toFixed(1));
  bindRange('assistAfter', 'assistAfter', (v) => parseInt(v, 10), (v) => String(v));
  bindCheckbox('assistEnabled', 'assistEnabled');

  return settings;
}
