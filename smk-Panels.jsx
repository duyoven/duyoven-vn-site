// ============================================================
// Panels — điều khiển, thẻ thịt (mặt cắt), nhiên liệu, lịch vận hành
// ============================================================

function Card({ title, kicker, children, className }) {
  return (
    <section className={'card ' + (className || '')}>
      {kicker ? <div className="card-kicker">{kicker}</div> : null}
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  );
}

function SliderRow({ label, value, display, min, max, step, onChange, hint }) {
  return (
    <div className="ctl-row">
      <div className="ctl-label-line">
        <label>{label}</label>
        <span className="ctl-value">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}></input>
      {hint ? <div className="ctl-hint">{hint}</div> : null}
    </div>
  );
}

function SegRow({ label, options, value, onChange }) {
  return (
    <div className="ctl-row">
      <div className="ctl-label-line"><label>{label}</label></div>
      <div className="seg">
        {options.map((o) => (
          <button key={o.id} className={'seg-btn' + (value === o.id ? ' on' : '')}
            onClick={() => onChange(o.id)}>{o.name}</button>
        ))}
      </div>
    </div>
  );
}

// ---- Bảng điều khiển ----
function ControlPanel({ p, set, meat }) {
  const T = window.useT();
  const racksLoc = RACKS.map((r) => ({ id: r.id, name: T.rack(r.id) }));
  const zonesLoc = ZONES.map((z) => ({ id: z.id, name: T.zone(z.id) }));
  return (
    <Card kicker={T.s('panel_kicker')} title={T.s('panel_title')} className="card-controls">
      <div className="ctl-row">
        <div className="ctl-label-line"><label>{T.s('lbl_meat')}</label></div>
        <select className="meat-select" value={p.meatId}
          onChange={(e) => { const m = MEATS[e.target.value]; set({ meatId: m.id, hours: Math.max(6, m.recommendedHours), units: 1 }); }}>
          {Object.values(MEATS).map((m) => (
            <option key={m.id} value={m.id}>{T.meat(m.id, 'short')} — {T.s('meatbtn_sub', { rec: m.recommendedHours, tgt: m.internalTarget })}</option>
          ))}
        </select>
        <div className="meat-anno">
          <div className="anno-row"><span className="anno-k">{T.s('anno_usda')}</span><b>{meat.usdaSafe}°C</b></div>
          <div className="anno-row"><span className="anno-k">{T.s('anno_pull')}</span><b>{meat.internalTarget}°C</b></div>
          <div className="anno-row"><span className="anno-k">{T.s('anno_pit')}</span><b>{meat.pitTarget}°C</b></div>
          <div className="anno-row"><span className="anno-k">{T.s('anno_time')}</span><b>~{meat.recommendedHours}h</b></div>
        </div>
        <div className="ctl-hint">{T.meat(meat.id, 'note')}</div>
        <div className="ctl-note"><i></i><span>{T.s('anno_usda_note', { safe: meat.usdaSafe })}</span></div>
      </div>

      <div className="ctl-row">
        <div className="ctl-label-line">
          <label>{T.s('lbl_units')}</label>
          <span className="ctl-value">{T.s('units_display', { n: p.units, unit: T.meat(meat.id, 'unit'), kg: (p.units * meat.kgPerUnit).toFixed(1) })}</span>
        </div>
        <div className="stepper">
          <button onClick={() => set({ units: Math.max(1, p.units - 1) })}>−</button>
          <span>{p.units}</span>
          <button onClick={() => set({ units: Math.min(meat.maxUnits, p.units + 1) })}>+</button>
        </div>
      </div>

      <SegRow label={T.s('lbl_rack')} options={racksLoc} value={p.rackId} onChange={(v) => set({ rackId: v })}></SegRow>
      <SegRow label={T.s('lbl_zone')} options={zonesLoc} value={p.zoneId} onChange={(v) => set({ zoneId: v })}></SegRow>

      <SliderRow label={T.s('lbl_vent')} value={p.vent} min={0.1} max={1} step={0.05}
        display={Math.round(p.vent * 100) + '%'} onChange={(v) => set({ vent: v })}
        hint={p.vent < 0.35 ? T.s('hint_vent_low') : T.s('hint_vent_ok')}></SliderRow>

      <SliderRow label={T.s('lbl_fuel')} value={p.fuelRate} min={1} max={4} step={0.25}
        display={p.fuelRate.toFixed(2) + ' ' + T.s('unit_kgph')} onChange={(v) => set({ fuelRate: v })}></SliderRow>

      <SliderRow label={T.s('lbl_ambient')} value={p.ambient} min={12} max={40} step={1}
        display={p.ambient + '°C'} onChange={(v) => set({ ambient: v })}></SliderRow>

      <SliderRow label={T.s('lbl_hours')} value={p.hours} min={6} max={18} step={0.5}
        display={p.hours + ' ' + T.s('unit_hours')} onChange={(v) => set({ hours: v })}
        hint={meat.recommendedHours < 6 ? T.s('hint_hours_short', { meat: T.meat(meat.id, 'short'), rec: meat.recommendedHours, tgt: meat.internalTarget }) : T.s('hint_hours_ok', { meat: T.meat(meat.id, 'short'), rec: meat.recommendedHours })}></SliderRow>

      {meat.wrapAt != null ? (
        <div className="ctl-row">
          <div className="ctl-label-line">
            <label>{T.s('lbl_wrap')}</label>
            <button className={'toggle' + (p.wrap ? ' on' : '')} onClick={() => set({ wrap: !p.wrap })}>
              <span className="knob"></span>
            </button>
          </div>
          <div className="ctl-hint">{T.s('hint_wrap', { wrapAt: meat.wrapAt })}</div>
        </div>
      ) : null}
    </Card>
  );
}

// ---- Mặt cắt miếng thịt ----
function MeatCrossSection({ colors, bark }) {
  const rx = 96, ry = 50, cx = 110, cy = 62;
  const barkW = 3 + Math.min(1, bark) * 6;
  const ringW = colors.ringMm * 2.0;
  return (
    <svg viewBox="0 0 220 124" style={{ width: '100%', display: 'block' }}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={colors.exterior}></ellipse>
      <ellipse cx={cx} cy={cy} rx={rx - barkW} ry={ry - barkW * 0.8} fill={colors.ring}></ellipse>
      <ellipse cx={cx} cy={cy} rx={Math.max(8, rx - barkW - ringW)} ry={Math.max(5, ry - barkW * 0.8 - ringW * 0.8)} fill={colors.interior}></ellipse>
      <ellipse cx={cx - 20} cy={cy - 16} rx={40} ry={14} fill="#fff" opacity="0.05"></ellipse>
      {/* thớ thịt */}
      {[-18, -6, 6, 18].map((dy) => (
        <path key={dy} d={`M ${cx - 55} ${cy + dy} q 28 ${dy > 0 ? 5 : -5} 110 0`} stroke="#000" strokeOpacity="0.10" fill="none" strokeWidth="1.5"></path>
      ))}
    </svg>
  );
}

function MeatCard({ meat, s, hours, simHours }) {
  const T = window.useT();
  const colors = SIM.meatColors(meat, s);
  const v = SIM.verdict(meat, s, simHours, T);
  return (
    <Card kicker={T.s('mc_kicker')} title={T.meat(meat.id, 'name')}>
      <image-slot id={'photo-' + meat.id} shape="rounded" radius="8"
        src={window.MEAT_PHOTOS[meat.id]}
        placeholder={T.s('mc_drop', { name: T.meat(meat.id, 'name') })}
        style={{ width: '100%', height: '130px', display: 'block', marginBottom: '12px' }}></image-slot>
      <MeatCrossSection colors={colors} bark={s.bark}></MeatCrossSection>
      <div className="legend">
        <span><i style={{ background: colors.exterior }}></i>{T.s('lg_bark')}</span>
        <span><i style={{ background: colors.ring }}></i>{T.s('lg_ring', { mm: s.ring.toFixed(1) })}</span>
        <span><i style={{ background: colors.interior }}></i>{T.s('lg_inside')}</span>
      </div>
      <div className="meat-stats">
        <div><b>{s.internal.toFixed(0)}°C</b><span>{T.s('st_core', { tgt: meat.internalTarget })}</span></div>
        <div><b>{Math.round(Math.min(1, s.bark) * 100)}%</b><span>{T.s('st_bark')}</span></div>
        <div><b>{s.wrapped ? T.s('wrap_on') : T.s('wrap_off')}</b><span>{T.s('st_wrap')}</span></div>
      </div>
      <div className="verdict" style={{ borderColor: v.color }}>
        <b style={{ color: v.color }}>{v.label}</b>
        <p>{v.text}</p>
      </div>
    </Card>
  );
}

// ---- Nhiên liệu ----
function FuelCard({ plan, p }) {
  const T = window.useT();
  return (
    <Card kicker={T.s('fuel_kicker')} title={T.s('fuel_title', { kg: plan.loadKg.toFixed(1), hours: p.hours })}>
      <div className="fuel-grid">
        <div className="fuel-item">
          <div className="fuel-num">{plan.charcoalKg}<small> {T.s('fuel_u_kg')}</small></div>
          <div className="fuel-name">{T.s('fuel_charcoal')}</div>
          <div className="fuel-sub">{T.s('fuel_charcoal_sub', { base: FUELS.charcoalBaseKg, bags: plan.bags })}</div>
        </div>
        <div className="fuel-item">
          <div className="fuel-num">{plan.oakHandfuls}<small> {T.s('fuel_u_handful')}</small></div>
          <div className="fuel-name">{T.s('fuel_oak')}</div>
          <div className="fuel-sub">{T.s('fuel_oak_sub', { kg: plan.oakKg })}</div>
        </div>
        <div className="fuel-item">
          <div className="fuel-num">{plan.feedEveryMin}<small> {T.s('fuel_u_min')}</small></div>
          <div className="fuel-name">{T.s('fuel_feed')}</div>
          <div className="fuel-sub">{T.s('fuel_feed_sub')}</div>
        </div>
        <div className="fuel-item">
          <div className="fuel-num">{plan.charcoalEveryMin}<small> {T.s('fuel_u_min')}</small></div>
          <div className="fuel-name">{T.s('fuel_charcoal_feed')}</div>
          <div className="fuel-sub">{T.s('fuel_charcoal_feed_sub', { kg: FUELS.charcoalRefillKg, n: plan.charcoalRefills })}</div>
        </div>
      </div>
      <div className="ctl-hint" style={{ marginTop: 10 }}>
        {T.s('fuel_hint', { kg: plan.loadKg.toFixed(1), amb: p.ambient, cold: p.ambient < 20 ? T.s('fuel_hint_cold') : '' })}
      </div>
    </Card>
  );
}

// ---- Lịch vận hành ----
function buildSchedule(simResult, p, plan, T) {
  const meat = simResult.meat;
  const ev = [];
  ev.push({ min: 0, text: T.s('sch_e0', { base: FUELS.charcoalBaseKg }) });
  ev.push({ min: 35, text: T.s('sch_e35', { vent: Math.round(p.vent * 100) }) });
  ev.push({ min: 45, text: T.s('sch_e45', { rack: T.rack(p.rackId, true), zone: T.zone(p.zoneId) }) });
  for (let m = 45 + plan.feedEveryMin; m < p.hours * 60; m += plan.feedEveryMin) {
    ev.push({ min: m, text: T.s('sch_feed'), minor: true });
  }
  for (let m = 45 + plan.charcoalEveryMin; m < p.hours * 60 - 30; m += plan.charcoalEveryMin) {
    ev.push({ min: m, text: T.s('sch_charcoal', { kg: FUELS.charcoalRefillKg }), minor: true, kind: 'char' });
  }
  if (p.wrap && simResult.wrappedAtMin != null) {
    ev.push({ min: simResult.wrappedAtMin, text: T.s('sch_wrap', { wrapAt: meat.wrapAt }) });
  }
  const doneS = simResult.samples.find((x) => x.internal >= meat.internalTarget);
  if (doneS) ev.push({ min: doneS.min, text: T.s('sch_done', { tgt: meat.internalTarget }) });
  return ev.sort((a, b) => a.min - b.min);
}

function fmtClock(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h + ':' + String(m).padStart(2, '0');
}

function SchedulePanel({ events, nowMin, onSpeakStep, onSpeakAll }) {
  const T = window.useT();
  const ref = React.useRef(null);
  const activeIdx = events.reduce((acc, e, i) => (e.min <= nowMin ? i : acc), -1);
  React.useEffect(() => {
    const el = ref.current && ref.current.querySelector('.sched-row.now');
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - 90;
  }, [activeIdx]);
  return (
    <Card kicker={T.s('sch_kicker')} title={T.s('sch_title')} className="card-sched">
      <div className="sched-actions">
        {onSpeakStep ? (
          <button className="guide-btn" style={{ marginTop: 0 }}
            onClick={() => onSpeakStep(activeIdx >= 0 ? events[activeIdx] : null)}>
            {T.s('sch_speak_step')}
          </button>
        ) : null}
        {onSpeakAll ? (
          <button className="guide-btn" style={{ marginTop: 0 }} onClick={onSpeakAll}>
            {T.s('sch_speak_all')}
          </button>
        ) : null}
      </div>
      <div className="sched-list" ref={ref}>
        {events.map((e, i) => (
          <div key={i} className={'sched-row' + (i === activeIdx ? ' now' : '') + (e.min <= nowMin ? ' past' : '') + (e.minor ? ' minor' : '') + (e.kind === 'char' ? ' char' : '')}>
            <span className="sched-time">{fmtClock(e.min)}</span>
            <span className="sched-text">{e.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Cảnh báo trực tiếp ----
function liveTips(p, s, meat, simHours, T) {
  const tips = [];
  const q = SIM.smokeQuality(p.vent, p.fuelRate);
  const mShort = T.meat(meat.id, 'short');
  if (q === 'dirty') tips.push({ kind: 'bad', text: T.s('tip_dirty') });
  if (q === 'hot') tips.push({ kind: 'warn', text: T.s('tip_hot') });
  const diff = s.pit - meat.pitTarget;
  if (diff > 18) tips.push({ kind: 'warn', text: T.s('tip_high', { pit: s.pit, tgt: meat.pitTarget, meat: mShort }) });
  if (diff < -18 && s.pit > p.ambient + 25) tips.push({ kind: 'warn', text: T.s('tip_low', { pit: s.pit, tgt: meat.pitTarget }) });
  if (q === 'clean' && Math.abs(diff) <= 18) tips.push({ kind: 'good', text: T.s('tip_clean', { tgt: meat.pitTarget }) });
  if (meat.id === 'salmon' && simHours > 4) tips.push({ kind: 'bad', text: T.s('tip_salmonlong') });
  if (meat.stall && s.internal >= meat.stall.lo && s.internal <= meat.stall.hi && !s.wrapped) {
    tips.push({ kind: 'info', text: T.s('tip_stall', { T: Math.round(s.internal) }) });
  }
  return tips;
}

Object.assign(window, { Card, SliderRow, SegRow, ControlPanel, MeatCard, FuelCard, SchedulePanel, buildSchedule, liveTips, fmtClock, MeatCrossSection });
