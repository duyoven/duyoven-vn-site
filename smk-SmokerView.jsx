// ============================================================
// SmokerView — mặt cắt lò offset Duy's Oven (SVG tỉ lệ thật) + khói canvas
// Tỉ lệ: 3px = 1cm
// ============================================================

const PX = (cm) => 24 + cm * 3;
const PY = (h) => 540 - h * 3;
const VIEW_W = 660, VIEW_H = 580;

// ---- Khói: canvas hạt ----
function SmokeCanvas({ quality, intensity, running }) {
  const ref = React.useRef(null);
  const stateRef = React.useRef({ parts: [], quality, intensity, running });
  stateRef.current.quality = quality;
  stateRef.current.intensity = intensity;
  stateRef.current.running = running;

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let raf, alive = true;

    function spawn(st) {
      const q = st.quality;
      const dirty = q === 'dirty';
      st.parts.push({
        x: 408 + Math.random() * 50,
        y: 350 + Math.random() * 25,
        r: dirty ? 7 + Math.random() * 9 : 2.5 + Math.random() * 3.5,
        a: dirty ? 0.30 + Math.random() * 0.14 : 0.10 + Math.random() * 0.07,
        col: dirty ? '228,224,212' : q === 'hot' ? '205,205,205' : '168,192,224',
        vx: 0, vy: 0, life: 0,
        wob: Math.random() * Math.PI * 2,
      });
    }

    function step() {
      if (!alive) return;
      const st = stateRef.current;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      const speed = st.quality === 'dirty' ? 0.55 : st.quality === 'hot' ? 1.5 : 1.0;
      if (st.running) {
        const n = st.intensity * (st.quality === 'dirty' ? 1.6 : 1);
        for (let i = 0; i < n; i++) if (Math.random() < n - i + 1) spawn(st);
      }
      st.parts = st.parts.filter((p) => p.a > 0.005 && p.y > -30);
      for (const p of st.parts) {
        p.life += 1; p.wob += 0.08;
        if (p.x > 372) {                       // trong khoang đốt: bốc lên, hút sang trái
          p.vx = lerpTo(p.vx, -0.5 * speed, 0.05);
          p.vy = lerpTo(p.vy, -0.9, 0.06);
          if (p.y < 270) p.vx -= 0.06 * speed; // luồn qua họng lò
        } else if (p.x > 95 || p.y > 245) {    // trong khoang xông khói: trôi ngang
          const targetY = 210 + Math.sin(p.wob) * 20;
          p.vx = lerpTo(p.vx, -1.15 * speed, 0.04);
          p.vy = lerpTo(p.vy, (targetY - p.y) * 0.02, 0.08);
          p.r += 0.025;
        }
        if (p.x <= 95 && p.y <= 245) {         // vào ống khói: hút thẳng lên
          p.vx = lerpTo(p.vx, (60 - p.x) * 0.08, 0.2);
          p.vy = lerpTo(p.vy, -1.7 * speed, 0.1);
          if (p.y < 56) { p.vx = lerpTo(p.vx, -0.25, 0.05); p.vy = -1.1; p.r += 0.14; p.a *= 0.975; }
        }
        p.x += p.vx; p.y += p.vy;
        if (p.life > 240) p.a *= 0.97;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.col},${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  return (
    <canvas ref={ref} width={VIEW_W} height={VIEW_H}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></canvas>
  );
}
function lerpTo(v, target, f) { return v + (target - v) * f; }

// ---- Thịt trên vỉ ----
function MeatOnRack({ x, y, units, colors }) {
  const n = Math.min(units, 4);
  const w = 36, gap = 6;
  const total = n * w + (n - 1) * gap;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <rect x={x - total / 2 + i * (w + gap)} y={y - 15} width={w} height={15} rx={6}
            fill={colors.exterior} stroke="#000" strokeOpacity="0.4"></rect>
          <rect x={x - total / 2 + i * (w + gap) + 4} y={y - 13} width={w - 14} height={4} rx={2}
            fill="#fff" opacity="0.08"></rect>
        </g>
      ))}
      {units > 4 ? <text x={x + total / 2 + 8} y={y - 4} className="sv-tiny" fill="#9b9588">+{units - 4}</text> : null}
    </g>
  );
}

// ---- Tay nắm lò xo (spring handle) ----
function SpringHandle({ x, y, w, angle }) {
  const coils = Math.floor(w / 7);
  return (
    <g transform={`translate(${x},${y}) rotate(${angle || 0})`}>
      <line x1={-w / 2 - 6} y1={0} x2={w / 2 + 6} y2={0} stroke="#1a1612" strokeWidth="7" strokeLinecap="round"></line>
      {Array.from({ length: coils }).map((_, i) => (
        <line key={i} x1={-w / 2 + i * 7} y1={-4.5} x2={-w / 2 + i * 7 + 3.5} y2={4.5} stroke="#b8b0a2" strokeWidth="1.4"></line>
      ))}
    </g>
  );
}

// ---- Mặt cắt lò ----
function SmokerView({ s, sim, params, zoneTemps, showDims, smoke }) {
  const T = window.useT ? window.useT() : window.makeT('vi');
  const meat = sim.meat;
  const colors = SIM.meatColors(meat, s);
  const ventDeg = -80 * params.vent;
  const fireScale = 0.4 + 0.6 * Math.min(1, (params.fuelRate / 4) * (0.4 + 0.6 * params.vent));
  const heatOpacity = Math.max(0, Math.min(0.42, (s.pit - params.ambient) / 320));
  const quality = SIM.smokeQuality(params.vent, params.fuelRate);
  const rackY = params.rackId === 'lower' ? PY(88) : PY(106);
  const zoneX = { near: 330, mid: 222, far: 116 }[params.zoneId];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="heatGrad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#ff5a1f" stopOpacity={heatOpacity}></stop>
            <stop offset="0.5" stopColor="#ff7a2a" stopOpacity={heatOpacity * 0.55}></stop>
            <stop offset="1" stopColor="#ff9a3c" stopOpacity={heatOpacity * 0.3}></stop>
          </linearGradient>
          <radialGradient id="fireGlow" cx="0.5" cy="0.7" r="0.6">
            <stop offset="0" stopColor="#ffb84d" stopOpacity="0.9"></stop>
            <stop offset="0.45" stopColor="#ff6b1a" stopOpacity="0.55"></stop>
            <stop offset="1" stopColor="#ff4d00" stopOpacity="0"></stop>
          </radialGradient>
          <clipPath id="chamberClip">
            <rect x={PX(16)} y={PY(120)} width={300} height={150} rx={72}></rect>
          </clipPath>
          <clipPath id="fireboxClip">
            <rect x={PX(116)} y={PY(94.5)} width={120} height={135} rx={54}></rect>
          </clipPath>
        </defs>

        {/* ── mặt đất ── */}
        <line x1="10" y1="541" x2="650" y2="541" stroke="#2c261f" strokeWidth="2"></line>

        {/* ── chân chữ A bên trái + kệ dưới + trục bánh xe ── */}
        <g stroke="#46403a" strokeWidth="6" strokeLinecap="round">
          <line x1={126} y1={306} x2={84} y2={538}></line>
          <line x1={126} y1={306} x2={162} y2={538}></line>
          <line x1={PX(100)} y1={PY(75)} x2={PX(104)} y2={478}></line>
        </g>
        {/* kệ dưới dạng thanh nan */}
        <g stroke="#3c362f" strokeWidth="4">
          <line x1={104} y1={450} x2={330} y2={450}></line>
          <line x1={104} y1={460} x2={330} y2={460}></line>
          {[130, 165, 200, 235, 270, 305].map((x) => (
            <line key={x} x1={x} y1={446} x2={x} y2={464} strokeWidth="2.5"></line>
          ))}
        </g>
        {/* bánh xe wagon — bánh sau mờ + bánh trước */}
        <g transform={`translate(${PX(104) + 20},480)`} stroke="#3a342d" fill="none" opacity="0.55">
          <circle r="55" strokeWidth="4"></circle>
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <line key={a} x1={-55 * Math.cos(a * Math.PI / 180)} y1={-55 * Math.sin(a * Math.PI / 180)}
              x2={55 * Math.cos(a * Math.PI / 180)} y2={55 * Math.sin(a * Math.PI / 180)} strokeWidth="2"></line>
          ))}
        </g>
        <g transform={`translate(${PX(104)},480)`} stroke="#6a6156" fill="none">
          <circle r="58" strokeWidth="4.5"></circle>
          <circle r="50" strokeWidth="1.5" opacity="0.5"></circle>
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <line key={a} x1={-58 * Math.cos(a * Math.PI / 180)} y1={-58 * Math.sin(a * Math.PI / 180)}
              x2={58 * Math.cos(a * Math.PI / 180)} y2={58 * Math.sin(a * Math.PI / 180)} strokeWidth="2.2"></line>
          ))}
          <circle r="7" fill="#6a6156"></circle>
        </g>

        {/* ── ống khói cao bên hông trái ── */}
        <rect x={45} y={60} width={30} height={178} fill="#181410" stroke="#7a7165" strokeWidth="2.5" rx={2}></rect>
        <rect x={40} y={52} width={40} height={9} fill="#23201b" stroke="#7a7165" strokeWidth="2" rx={2}></rect>
        {/* cút nối vào đầu khoang */}
        <rect x={45} y={212} width={48} height={28} fill="#181410" stroke="#7a7165" strokeWidth="2.5" rx={3}></rect>

        {/* ── khoang đốt (firebox) ── */}
        <rect x={PX(116)} y={PY(94.5)} width={120} height={135} rx={54} fill="#141009" stroke="#7a7165" strokeWidth="2.5"></rect>
        <g clipPath="url(#fireboxClip)">
          {/* than đước */}
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={392 + (i % 3) * 26 + (i > 2 ? 12 : 0)} y={378 - Math.floor(i / 3) * 9} width={22} height={10} rx={3}
                fill="#1c1410" stroke="#ff6b1a" strokeOpacity={0.25 + 0.5 * fireScale} strokeWidth="1"></rect>
            ))}
          </g>
          {/* khúc sồi */}
          <rect x={398} y={356} width={58} height={13} rx={6} fill="#4a2e16" stroke="#6b4423" strokeWidth="1.5"></rect>
          <rect x={412} y={344} width={50} height={12} rx={6} fill="#3d2511" stroke="#5e3a1c" strokeWidth="1.5"></rect>
          {/* lửa */}
          <g className="flicker" transform={`translate(432,362) scale(${fireScale})`}>
            <path d="M0,0 C-14,-12 -8,-30 0,-44 C3,-28 14,-26 12,-10 C20,-18 22,-8 14,2 Z" fill="#ff8c2a" opacity="0.9"></path>
            <path d="M2,-2 C-6,-10 -3,-22 2,-30 C5,-18 10,-16 8,-6 Z" fill="#ffd24d"></path>
          </g>
          <ellipse cx={432} cy={355} rx={85} ry={60} fill="url(#fireGlow)" className="flicker" opacity={fireScale}></ellipse>
        </g>
        {/* tay nắm trên + tay lò xo cửa khoang đốt */}
        <path d="M 402 252 Q 435 230 466 252" fill="none" stroke="#46403a" strokeWidth="5" strokeLinecap="round"></path>
        <SpringHandle x={452} y={300} w={34} angle={-32}></SpringHandle>
        {/* van gió khoang đốt */}
        <g transform={`translate(${PX(156) - 2},${PY(60)})`}>
          <circle r="14" fill="#0c0a08" stroke="#7a7165" strokeWidth="2"></circle>
          <g transform={`rotate(${ventDeg})`}>
            <ellipse rx="11" ry="4.5" fill="none" stroke="#ff7a2a" strokeWidth="2.5"></ellipse>
          </g>
          <text x="20" y="-18" className="sv-tiny" fill="#8d8678">{T.s('sv_vent', { v: Math.round(params.vent * 100) })}</text>
        </g>

        {/* ── khoang xông khói ── */}
        <rect x={PX(16)} y={PY(120)} width={300} height={150} rx={72} fill="#161109" stroke="#9a9184" strokeWidth="3"></rect>
        <g clipPath="url(#chamberClip)">
          <rect x={PX(16)} y={PY(120)} width={300} height={150} fill="url(#heatGrad)"></rect>
          {/* vỉ 2 tầng */}
          {[PY(106), PY(88)].map((y, idx) => (
            <g key={idx} stroke="#7d7466" strokeWidth="2">
              <line x1={81} y1={y} x2={363} y2={y}></line>
              {Array.from({ length: 24 }).map((_, i) => (
                <line key={i} x1={84 + i * 12} y1={y} x2={84 + i * 12} y2={y + 4} strokeWidth="1"></line>
              ))}
            </g>
          ))}
          {/* họng thông khoang đốt */}
          <rect x={356} y={PY(108)} width={20} height={54} fill="#0c0a08"></rect>
          <MeatOnRack x={zoneX} y={rackY} units={params.units} colors={colors}></MeatOnRack>
        </g>

        {/* bản lề nắp + tay nắm lò xo + thanh ngang mặt trước */}
        <rect x={178} y={170} width={18} height={9} rx={2} fill="#23201b" stroke="#6a6156" strokeWidth="1.5"></rect>
        <rect x={248} y={170} width={18} height={9} rx={2} fill="#23201b" stroke="#6a6156" strokeWidth="1.5"></rect>
        <SpringHandle x={222} y={213} w={48} angle={0}></SpringHandle>
        <rect x={82} y={294} width={282} height={6} rx={3} fill="#1f1a14" stroke="#6a6156" strokeWidth="1.5"></rect>

        {/* dây que đo lõi thịt */}
        <path d={`M 232 380 C 232 330, ${zoneX} ${rackY + 34}, ${zoneX} ${rackY - 8}`} fill="none"
          stroke="#c9c1b4" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65"></path>
        <g>
          <rect x={160} y={378} width={144} height={26} rx={5} fill="#0c0a08" stroke="#3a332a"></rect>
          <circle cx={174} cy={391} r="3.5" fill="#e0564f"></circle>
          <text x={184} y={395} className="sv-probe">{T.s('sv_core', { meat: T.meat(meat.id, 'short'), T: Math.round(s.internal) })}</text>
        </g>

        {/* ── kệ trên nắp + lan can ── */}
        <g stroke="#46403a" strokeWidth="5" strokeLinecap="round">
          <line x1={150} y1={PY(120) + 4} x2={150} y2={PY(146)}></line>
          <line x1={294} y1={PY(120) + 4} x2={294} y2={PY(146)}></line>
        </g>
        <rect x={118} y={PY(155)} width={208} height={20} rx={3} fill="#23201b" stroke="#46403a" strokeWidth="2"></rect>
        {/* lan can mỏng */}
        <g stroke="#5a5248" strokeWidth="2.5" strokeLinecap="round">
          <line x1={128} y1={150} x2={300} y2={150}></line>
          {[138, 180, 264].map((x) => (
            <line key={x} x1={x} y1={150} x2={x} y2={179} strokeWidth="2"></line>
          ))}
        </g>

        {/* ── huy hiệu Duy's Oven ── */}
        <g transform="translate(222,148)">
          <ellipse rx="30" ry="11" fill="#ddd6c8" stroke="#6f685c" strokeWidth="1.5"></ellipse>
          <ellipse rx="26" ry="8" fill="none" stroke="#8a8276" strokeWidth="0.8"></ellipse>
          <text x="0" y="3" textAnchor="middle" className="sv-badge">DUY'S OVEN</text>
        </g>

        {/* ── nhiệt kế nắp + chỉ số ── */}
        <g transform={`translate(222,${PY(120)})`}>
          <circle r="21" fill="#0c0a08" stroke="#c9c1b4" strokeWidth="2.5"></circle>
          <circle r="15" fill="none" stroke="#3a332a" strokeWidth="1"></circle>
          {(() => {
            const ang = -120 + 240 * Math.max(0, Math.min(1, s.pit / 260));
            return <line x1="0" y1="0" x2={13 * Math.sin(ang * Math.PI / 180)} y2={-13 * Math.cos(ang * Math.PI / 180)}
              stroke="#ff7a2a" strokeWidth="2.5" strokeLinecap="round"></line>;
          })()}
          <circle r="2.5" fill="#e8e2d6"></circle>
        </g>
        <line x1={245} y1={180} x2={312} y2={167} stroke="#3a332a" strokeWidth="1"></line>
        <g>
          <rect x={312} y={148} width={96} height={38} rx={5} fill="#0c0a08" stroke="#3a332a"></rect>
          <text x={360} y={166} textAnchor="middle" className="sv-pit">{s.pit}°C</text>
          <text x={360} y={180} textAnchor="middle" className="sv-tiny" fill="#8d8678">{T.s('sv_pit')}</text>
        </g>

        {/* nhiệt 3 vùng tại vỉ */}
        {window.ZONES.map((z) => {
          const zx = { near: 330, mid: 222, far: 116 }[z.id];
          const active = params.zoneId === z.id;
          return (
            <g key={z.id} transform={`translate(${zx},${PY(70)})`} opacity={active ? 1 : 0.55}>
              <line x1="0" y1="-14" x2="0" y2="-2" stroke="#ff7a2a" strokeWidth="1" strokeDasharray="2 2"></line>
              <text x="0" y="12" textAnchor="middle" className="sv-zone" fill={active ? '#ffb066' : '#8d8678'}>{zoneTemps[z.id]}°C</text>
              <text x="0" y="25" textAnchor="middle" className="sv-tiny" fill="#6f685c">{T.s(z.id === 'near' ? 'zs_near' : z.id === 'mid' ? 'zs_mid' : 'zs_far')}</text>
            </g>
          );
        })}

        {/* ── chú thích kích thước ── */}
        {showDims ? (
          <g className="dims" stroke="#ff7a2a" fill="#ff9a4d" strokeWidth="1" opacity="0.75">
            <line x1={PX(20)} y1={118} x2={PX(116)} y2={118} strokeDasharray="4 3"></line>
            <text x={228} y={110} textAnchor="middle" className="sv-dim" stroke="none">{T.s('sv_dim_chamber')}</text>
            <line x1={PX(116)} y1={PY(98) - 14} x2={PX(156)} y2={PY(98) - 14} strokeDasharray="4 3"></line>
            <text x={PX(136)} y={PY(98) - 22} textAnchor="middle" className="sv-dim" stroke="none">{T.s('sv_dim_firebox')}</text>
            <line x1={28} y1={56} x2={28} y2={540} strokeDasharray="4 3"></line>
            <text x={22} y={300} textAnchor="middle" className="sv-dim" stroke="none" transform="rotate(-90 22 300)">{T.s('sv_dim_height')}</text>
            <text x={80} y={566} className="sv-dim" stroke="none">{T.s('sv_dim_racks')}</text>
          </g>
        ) : null}
      </svg>
      {smoke !== false ? <SmokeCanvas quality={quality} intensity={0.5 + params.fuelRate * 0.55} running={s.pit > params.ambient + 15}></SmokeCanvas> : null}
    </div>
  );
}

Object.assign(window, { SmokerView });
