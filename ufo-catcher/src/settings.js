// UI 슬라이더 ↔ 런타임 설정 바인딩 (4봉 하시와타시).
export function createSettings(callbacks = {}) {
  const settings = {
    armForce: 3.0,
    friction: 0.5,            // claw ↔ prize
    liftSpeed: 0.4,
    moveSpeed: 0.5,
    prizeMass: 0.20,
    prizeSize: 0.10,
    prizeCount: 1,

    // 봉 (4개 구성)
    innerGap: 0.060,          // 안쪽 봉 사이 간격 (떨어지는 갭)
    outerWidth: 0.220,        // 바깥 봉 사이 거리 (가드 레일 폭)
    outerOffset: 0.008,       // 바깥 봉이 안쪽보다 높은 정도
    barRadius: 0.008,
    innerFriction: 0.50,      // 안쪽 봉 ↔ 경품 (높음 = 안정)
    outerFriction: 0.10,      // 바깥 봉 ↔ 경품 (낮음 = 매끈)

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

  bindRange('armForce',      'armForce',      parseFloat,             (v) => v.toFixed(1));
  bindRange('friction',      'friction',      parseFloat,             (v) => v.toFixed(2));
  bindRange('liftSpeed',     'liftSpeed',     parseFloat,             (v) => v.toFixed(2));
  bindRange('moveSpeed',     'moveSpeed',     parseFloat,             (v) => v.toFixed(2));
  bindRange('prizeMass',     'prizeMass',     parseFloat,             (v) => v.toFixed(2));
  bindRange('prizeSize',     'prizeSize',     parseFloat,             (v) => v.toFixed(3));
  bindRange('prizeCount',    'prizeCount',    (v) => parseInt(v, 10), (v) => String(v));

  bindRange('innerGap',      'innerGap',      parseFloat,             (v) => v.toFixed(3));
  bindRange('outerWidth',    'outerWidth',    parseFloat,             (v) => v.toFixed(3));
  bindRange('outerOffset',   'outerOffset',   parseFloat,             (v) => v.toFixed(3));
  bindRange('barRadius',     'barRadius',     parseFloat,             (v) => v.toFixed(3));
  bindRange('innerFriction', 'innerFriction', parseFloat,             (v) => v.toFixed(2));
  bindRange('outerFriction', 'outerFriction', parseFloat,             (v) => v.toFixed(2));

  bindRange('assistForce',   'assistForce',   parseFloat,             (v) => v.toFixed(1));
  bindRange('assistAfter',   'assistAfter',   (v) => parseInt(v, 10), (v) => String(v));
  bindCheckbox('assistEnabled', 'assistEnabled');

  return settings;
}
