// ============================================================
// App — Mô phỏng lò xông khói OFFSET 10050
// ============================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#ff7a2a",
  "showDims": true,
  "smoke": true
}/*EDITMODE-END*/;

const DEFAULT_PARAMS = {
  meatId: 'brisket', units: 1, rackId: 'lower', zoneId: 'mid',
  vent: 0.6, fuelRate: 2.5, ambient: 30, hours: 12, wrap: true,
};

const LS_KEY = 'smoker-sim-state-v1';

const GUIDE_TEXT = 'Chào mừng đến với mô phỏng lò xông khói Duy’s Oven, Ôp-xét mười nghìn không trăm năm mươi. Bên phải là bảng điều khiển: chọn loại thịt, số lượng, tầng vỉ và vị trí đặt thịt. Kéo van gió và lượng củi để giữ nhiệt khoang quanh mức chuẩn của từng món. Nhấn nút chạy để xem diễn biến: khói, nhiệt độ, màu thịt và vòng khói thay đổi theo thời gian. Theo dõi lịch trình phía dưới để biết khi nào thêm củi, bọc giấy và lấy thịt ra. Chúc bạn xông khói chuẩn Texas!';

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

// ---- Biểu đồ nhiệt theo thời gian ----
function TempChart({ simResult, nowMin, hours, meat }) {
  const T = window.useT();
  const W = 600, H = 170, padL = 40, padB = 22, padT = 12;
  const maxT = 220;
  const xs = (min) => padL + (min / (hours * 60)) * (W - padL - 8);
  const ys = (t) => padT + (1 - t / maxT) * (H - padT - padB);
  const pts = (key) => simResult.samples.filter((_, i) => i % 4 === 0)
    .map((s) => `${xs(s.min).toFixed(1)},${ys(s[key === 'internal' ? 'internal' : 'pit']).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {[50, 100, 150, 200].map((t) => (
        <g key={t}>
          <line x1={padL} y1={ys(t)} x2={W - 8} y2={ys(t)} stroke="#272218" strokeWidth="1"></line>
          <text x={padL - 6} y={ys(t) + 3} textAnchor="end" className="chart-tick">{t}°</text>
        </g>
      ))}
      {Array.from({ length: Math.floor(hours) + 1 }).map((_, h) => (
        h % 2 === 0 ? <text key={h} x={xs(h * 60)} y={H - 6} textAnchor="middle" className="chart-tick">{h}h</text> : null
      ))}
      <line x1={padL} y1={ys(meat.internalTarget)} x2={W - 8} y2={ys(meat.internalTarget)}
        stroke="#4cc472" strokeWidth="1" strokeDasharray="5 4" opacity="0.7"></line>
      <text x={W - 10} y={ys(meat.internalTarget) - 5} textAnchor="end" className="chart-tick" fill="#4cc472">{T.s('ch_target', { tgt: meat.internalTarget })}</text>
      <polyline points={pts('pit')} fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.85"></polyline>
      <polyline points={pts('internal')} fill="none" stroke="#e0564f" strokeWidth="2.5"></polyline>
      <line x1={xs(nowMin)} y1={padT} x2={xs(nowMin)} y2={H - padB} stroke="#e8e2d6" strokeWidth="1" strokeDasharray="2 3"></line>
      <circle cx={xs(nowMin)} cy={ys(SIM.sampleAt(simResult, nowMin).internal)} r="4" fill="#e0564f" stroke="#0c0a08" strokeWidth="1.5"></circle>
      <g className="chart-legend">
        <rect x={padL + 6} y={padT + 2} width={170} height={18} rx={4} fill="#0c0a08" opacity="0.7"></rect>
        <circle cx={padL + 16} cy={padT + 11} r="3.5" fill="var(--accent)"></circle>
        <text x={padL + 24} y={padT + 14} className="chart-tick" fill="#c9c1b4">{T.s('ch_pit')}</text>
        <circle cx={padL + 100} cy={padT + 11} r="3.5" fill="#e0564f"></circle>
        <text x={padL + 108} y={padT + 14} className="chart-tick" fill="#c9c1b4">{T.s('ch_core')}</text>
      </g>
    </svg>
  );
}

// ---- Thanh thời gian / transport ----
function SoundIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 L6 9 H3 v6 h3 l5 4 Z" fill="currentColor" stroke="none"></path>
      {on ? <path d="M15.5 8.5 a5 5 0 0 1 0 7 M18 6 a8.5 8.5 0 0 1 0 12"></path> : <path d="M16 9 l5 6 M21 9 l-5 6"></path>}
    </svg>
  );
}
function VoiceIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={on ? 'currentColor' : 'none'}></rect>
      <path d="M5 11 a7 7 0 0 0 14 0 M12 18 v3"></path>
      {on ? null : <path d="M4 4 L20 20"></path>}
    </svg>
  );
}

function Transport({ nowMin, totalMin, playing, speed, onScrub, onPlay, onSpeed, sound, onToggleSfx, onToggleVoice, voiceList, voiceName, onVoice }) {
  const T = window.useT();
  const spLabel = { 15: T.s('sp_slow'), 45: T.s('sp_mid'), 120: T.s('sp_fast') };
  return (
    <div className="transport">
      <button className="play-btn" onClick={onPlay} aria-label={playing ? T.s('t_pause') : T.s('t_play')}>
        {playing ? (
          <svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="4" width="5" height="16" fill="currentColor"></rect><rect x="14" y="4" width="5" height="16" fill="currentColor"></rect></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 4 L20 12 L6 20 Z" fill="currentColor"></path></svg>
        )}
      </button>
      <div className="clock">{fmtClock(nowMin)}<small> / {fmtClock(totalMin)}</small></div>
      <input className="scrub" type="range" min={0} max={totalMin} step={2} value={nowMin}
        onChange={(e) => onScrub(parseFloat(e.target.value))}></input>
      <div className="speed-seg">
        {[15, 45, 120].map((s) => (
          <button key={s} className={speed === s ? 'on' : ''} onClick={() => onSpeed(s)}>{spLabel[s]}</button>
        ))}
      </div>
      <button className={'icon-btn' + (sound.sfx ? ' on' : '')} onClick={onToggleSfx}
        title={T.s('t_sfx')} aria-label={T.s('t_sfx')}>
        <SoundIcon on={sound.sfx}></SoundIcon>
      </button>
      <button className={'icon-btn' + (sound.voice ? ' on' : '')} onClick={onToggleVoice}
        title={T.s('t_voice')} aria-label={T.s('t_voice')}>
        <VoiceIcon on={sound.voice}></VoiceIcon>
      </button>
      {voiceList && voiceList.length > 0 ? (
        <select className="voice-select" value={voiceName || ''} title={T.s('t_voicesel')}
          onChange={(e) => onVoice(e.target.value)}>
          {voiceList.map((v) => (
            <option key={v.name} value={v.name}>{v.name.replace(/Microsoft\s|Google\s/, '').slice(0, 30)}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const saved = React.useMemo(loadSaved, []);
  const [lang, setLang] = React.useState(() => (saved && saved.lang) || 'vi');
  const T = React.useMemo(() => window.makeT(lang), [lang]);
  React.useEffect(() => { AUDIOX.setLang(lang); document.documentElement.setAttribute('lang', lang); }, [lang]);
  const [p, setP] = React.useState(() => ({ ...DEFAULT_PARAMS, ...(saved && saved.params) }));
  const [nowMin, setNowMin] = React.useState(() => (saved && typeof saved.nowMin === 'number' ? saved.nowMin : 150));
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(45); // phút mô phỏng / giây thực
  const [sound, setSound] = React.useState(() => ({ sfx: true, voice: true, ...(saved && saved.sound) }));

  const meat = MEATS[p.meatId];
  const totalMin = Math.round(p.hours * 60);

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

  // mô phỏng đầy đủ — tính lại khi tham số đổi
  const simResult = React.useMemo(() => SIM.simulate(p), [JSON.stringify(p)]);
  const plan = React.useMemo(() => SIM.fuelPlan(p, simResult.setpoint), [JSON.stringify(p)]);
  const events = React.useMemo(() => buildSchedule(simResult, p, plan, T), [simResult, plan, T]);
  const s = SIM.sampleAt(simResult, Math.min(nowMin, totalMin));

  // nhiệt 3 vùng tại thời điểm hiện tại
  const zoneTemps = React.useMemo(() => {
    const out = {};
    const rackOff = RACKS.find((r) => r.id === p.rackId).tempOffset;
    for (const z of ZONES) out[z.id] = Math.round(s.pit + (z.tempOffset + rackOff) * Math.min(1, nowMin / 42));
    return out;
  }, [s.pit, p.rackId, nowMin]);

  // đồng hồ mô phỏng
  React.useEffect(() => {
    if (!playing) return;
    let last = performance.now(), raf;
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      setNowMin((m) => {
        const next = m + dt * speed;
        if (next >= totalMin) { setPlaying(false); return totalMin; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, totalMin]);

  // lưu trạng thái
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ params: p, nowMin: Math.round(nowMin), sound, lang })); } catch (e) {}
    }, 400);
    return () => clearTimeout(id);
  }, [p, sound, lang, Math.round(nowMin / 4)]);

  React.useEffect(() => { if (nowMin > totalMin) setNowMin(totalMin); }, [totalMin]);
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', tw.accent);
  }, [tw.accent]);

  const tips = liveTips(p, s, meat, nowMin / 60, T);
  const simHours = nowMin / 60;

  // ====== ÂM THANH + LỜI ĐỌC ======
  const fireLevel = Math.min(1, (p.fuelRate / 4) * (0.4 + 0.6 * p.vent));
  const qualityNow = SIM.smokeQuality(p.vent, p.fuelRate);
  const verdictNow = SIM.verdict(meat, s, simHours, T);

  // tiếng lửa nền theo độ lớn lửa
  React.useEffect(() => {
    if (playing && sound.sfx) AUDIOX.fireOn(fireLevel);
    else AUDIOX.fireOff();
  }, [playing, sound.sfx, Math.round(fireLevel * 10)]);
  React.useEffect(() => () => { AUDIOX.fireOff(); AUDIOX.stopSpeak(); }, []);

  // đọc từng bước lịch trình khi đồng hồ chạy qua
  const lastMinRef = React.useRef(nowMin);
  React.useEffect(() => {
    const prev = lastMinRef.current; lastMinRef.current = nowMin;
    if (!playing || nowMin <= prev || nowMin - prev > 240) return;
    const crossed = events.filter((e) => e.min > prev && e.min <= nowMin);
    if (!crossed.length) return;
    const e = crossed[crossed.length - 1];
    if (sound.sfx) AUDIOX.ding();
    if (sound.voice) AUDIOX.speak(T.s('sp_hour', { clock: fmtClock(e.min) }) + e.text);
  }, [nowMin]);

  // cảnh báo khói bẩn
  const lastQualRef = React.useRef(qualityNow);
  React.useEffect(() => {
    if (qualityNow === lastQualRef.current) return;
    lastQualRef.current = qualityNow;
    if (qualityNow === 'dirty') {
      if (sound.sfx) AUDIOX.warn();
      if (sound.voice) AUDIOX.speak(T.s('sp_warn_dirty'));
    }
  }, [qualityNow]);

  // báo khi thịt đạt chuẩn
  const lastGradeRef = React.useRef(verdictNow.grade);
  React.useEffect(() => {
    if (verdictNow.grade === lastGradeRef.current) return;
    lastGradeRef.current = verdictNow.grade;
    if (verdictNow.grade === 'perfect' && playing) {
      if (sound.sfx) AUDIOX.ding();
      if (sound.voice) AUDIOX.speak(T.s('sp_perfect', { meat: T.meat(meat.id, 'short'), T: Math.round(s.internal) }));
    }
  }, [verdictNow.grade]);

  const toggleSfx = () => { AUDIOX.ensureCtx(); setSound((sd) => { const v = !sd.sfx; if (v) AUDIOX.click(); else AUDIOX.fireOff(); return { ...sd, sfx: v }; }); };
  const toggleVoice = () => { AUDIOX.ensureCtx(); setSound((sd) => { const v = !sd.voice; if (!v) AUDIOX.stopSpeak(); else AUDIOX.speak(T.s('sp_voice_on')); return { ...sd, voice: v }; }); };
  const speakStep = (e) => {
    AUDIOX.ensureCtx();
    if (AUDIOX.speaking()) { AUDIOX.stopSpeak(); return; }
    AUDIOX.speak(e ? T.s('sp_step_now', { clock: fmtClock(e.min) }) + e.text : T.s('sp_no_step'));
  };
  const speakAll = () => {
    AUDIOX.ensureCtx();
    if (AUDIOX.speaking()) { AUDIOX.stopSpeak(); return; }
    const mains = events.filter((e) => !e.minor);
    let txt = T.s('sp_all_intro', { name: T.meat(meat.id, 'name'), n: p.units, unit: T.meat(meat.id, 'unit'), hours: p.hours });
    txt += T.s('sp_all_prep', { char: plan.charcoalKg, logs: plan.oakLogs });
    txt += mains.map((e) => T.s('sp_all_hour', { clock: fmtClock(e.min) }) + e.text).join(' ');
    txt += T.s('sp_all_outro', { feed: plan.feedEveryMin });
    AUDIOX.speak(txt);
  };

  // danh sách giọng đọc theo ngôn ngữ hiện tại
  const [voiceList, setVoiceList] = React.useState(() => AUDIOX.getVoicesFor(lang));
  const [voiceName, setVoiceName] = React.useState(() => { const v = AUDIOX.currentVoiceFor(lang); return v ? v.name : ''; });
  React.useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => {
      setVoiceList(AUDIOX.getVoicesFor(lang));
      const v = AUDIOX.currentVoiceFor(lang); setVoiceName(v ? v.name : '');
    };
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, [lang]);
  const pickVoice = (name) => {
    AUDIOX.setVoice(name); setVoiceName(name);
    AUDIOX.ensureCtx(); AUDIOX.speak(T.s('sp_voice_changed'));
  };
  const changeLang = (lng) => {
    setLang(lng); AUDIOX.setLang(lng); AUDIOX.stopSpeak();
    const v = AUDIOX.currentVoiceFor(lng); setVoiceName(v ? v.name : '');
    setVoiceList(AUDIOX.getVoicesFor(lng));
  };

  return (
    <window.LangCtx.Provider value={T}>
    <div className="page">
      <header className="masthead">
        <div>
          <a className="back-btn" href="sp-offset-10050.html">{T.s('back_btn')}</a>
          <div className="mast-kicker">{T.s('mast_kicker')}</div>
          <h1>Duy's Oven <span>Offset 10050</span></h1>
          <button className="guide-btn" onClick={() => { AUDIOX.ensureCtx(); if (AUDIOX.speaking()) AUDIOX.stopSpeak(); else AUDIOX.speak(T.s('sp_guide')); }}>
            <VoiceIcon on={true}></VoiceIcon> {T.s('guide_btn')}
          </button>
        </div>
        <div className="mast-right">
          <select className="lang-select" value={lang} aria-label="Language"
            onChange={(e) => changeLang(e.target.value)}>
            {['vi','en','ko','zh','th','de'].map((code) => (
              <option key={code} value={code}>{window.LANG_META[code].flag + ' ' + window.LANG_META[code].label}</option>
            ))}
          </select>
          <div className="mast-spec">
            {T.s('mast_spec1')}<br></br>
            {T.s('mast_spec2')}
          </div>
        </div>
      </header>

      <div className="layout">
        <div className="col-main">
          <Card className="card-smoker" kicker={T.s('card_smoker_kicker')} title={null}>
            <SmokerView s={{ ...s, pit: zoneShownPit(s, nowMin) }} sim={simResult} params={p}
              zoneTemps={zoneTemps} showDims={tw.showDims && true} smoke={tw.smoke}></SmokerView>
            <Transport nowMin={Math.min(nowMin, totalMin)} totalMin={totalMin} playing={playing} speed={speed}
              onScrub={(v) => { setNowMin(v); }} onPlay={() => { AUDIOX.ensureCtx(); if (sound.sfx) AUDIOX.click(); setPlaying(!playing); }} onSpeed={setSpeed}
              sound={sound} onToggleSfx={toggleSfx} onToggleVoice={toggleVoice}
              voiceList={voiceList} voiceName={voiceName} onVoice={pickVoice}></Transport>
            <div className="tips">
              {tips.map((tip, i) => (
                <div key={i} className={'tip tip-' + tip.kind}><i></i><span>{tip.text}</span></div>
              ))}
            </div>
          </Card>
          <Card kicker={T.s('card_chart_kicker')} title={T.s('card_chart_title')}>
            <TempChart simResult={simResult} nowMin={Math.min(nowMin, totalMin)} hours={p.hours} meat={meat}></TempChart>
          </Card>
        </div>

        <div className="col-side">
          <ControlPanel p={p} set={set} meat={meat}></ControlPanel>
        </div>

        <div className="row-bottom">
          <MeatCard meat={meat} s={s} hours={p.hours} simHours={simHours}></MeatCard>
          <FuelCard plan={plan} p={p}></FuelCard>
          <SchedulePanel events={events} nowMin={nowMin} onSpeakStep={speakStep} onSpeakAll={speakAll}></SchedulePanel>
        </div>
      </div>

      <footer className="foot">
        {T.s('foot')}
      </footer>

      <TweaksPanel>
        <TweakSection label={T.s('tw_section')}></TweakSection>
        <TweakColor label={T.s('tw_accent')} value={tw.accent} options={['#ff7a2a', '#e8a13c', '#d94f30']}
          onChange={(v) => setTweak('accent', v)}></TweakColor>
        <TweakToggle label={T.s('tw_dims')} value={tw.showDims} onChange={(v) => setTweak('showDims', v)}></TweakToggle>
        <TweakToggle label={T.s('tw_smoke')} value={tw.smoke} onChange={(v) => setTweak('smoke', v)}></TweakToggle>
      </TweaksPanel>
    </div>
    </window.LangCtx.Provider>
  );
}

function zoneShownPit(s, nowMin) { return s.pit; }

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
