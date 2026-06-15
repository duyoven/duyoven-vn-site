// ============================================================
// AUDIOX — hiệu ứng âm thanh (WebAudio) + lời đọc (SpeechSynthesis)
// Không dùng file ngoài — mọi âm thanh được tổng hợp tại chỗ.
// ============================================================
(function () {
  let ctx = null;
  let fireGain = null, fireSrc = null, fireFilter = null;
  let crackleTimer = null;
  let teardownTimer = null;
  let fireLevel = 0;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ---- nền lửa: brown noise + lọc trầm ----
  function makeNoiseBuffer(seconds, brown) {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * seconds, sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }

  function fireOn(level) {
    if (!ensureCtx()) return;
    fireLevel = Math.max(0, Math.min(1, level));
    if (teardownTimer) { clearTimeout(teardownTimer); teardownTimer = null; }
    if (!fireSrc) {
      fireSrc = ctx.createBufferSource();
      fireSrc.buffer = makeNoiseBuffer(3, true);
      fireSrc.loop = true;
      fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.value = 420;
      fireGain = ctx.createGain();
      fireGain.gain.value = 0;
      fireSrc.connect(fireFilter); fireFilter.connect(fireGain); fireGain.connect(ctx.destination);
      fireSrc.start();
    }
    if (!crackleTimer) {
      crackleTimer = setInterval(() => {
        if (fireLevel > 0.05 && Math.random() < 0.35 + fireLevel * 0.5) crackle();
      }, 260);
    }
    fireGain.gain.setTargetAtTime(0.028 + 0.075 * fireLevel, ctx.currentTime, 0.4);
  }

  function fireOff() {
    if (fireGain && ctx) fireGain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    if (crackleTimer) { clearInterval(crackleTimer); crackleTimer = null; }
    if (teardownTimer) clearTimeout(teardownTimer);
    teardownTimer = setTimeout(() => {
      try { if (fireSrc) fireSrc.stop(); } catch (e) {}
      fireSrc = null; fireGain = null; fireFilter = null; teardownTimer = null;
    }, 700);
  }

  // tiếng nổ lách tách
  function crackle() {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(0.06, false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 2500;
    const g = ctx.createGain();
    const v = (0.02 + Math.random() * 0.05) * (0.4 + fireLevel);
    g.gain.setValueAtTime(v, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05 + Math.random() * 0.06);
    src.connect(hp); hp.connect(g); g.connect(ctx.destination);
    src.start();
  }

  function tone(freq, dur, type, vol, when) {
    if (!ensureCtx()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t = ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const click = () => tone(880, 0.07, 'triangle', 0.06);
  const ding = () => { tone(784, 0.25, 'sine', 0.12); tone(1175, 0.45, 'sine', 0.10, 0.13); };
  const warn = () => { tone(196, 0.3, 'sawtooth', 0.07); tone(185, 0.35, 'sawtooth', 0.06, 0.18); };

  // ---- lời đọc đa ngôn ngữ ----
  let voices = [];
  let curLang = 'vi';          // mã ngôn ngữ hiện tại (vi/en/ko/zh/th/de)
  const BCP = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN', th: 'th-TH', de: 'de-DE' };
  let chosen = {};             // { langPrefix: voiceName }
  try { chosen = JSON.parse(localStorage.getItem('smoker-sim-voices') || '{}') || {}; } catch (e) { chosen = {}; }

  function refreshVoices() { if (window.speechSynthesis) voices = speechSynthesis.getVoices(); }
  // chấm điểm độ tự nhiên cho prefix ngôn ngữ cho trước
  function voiceScore(v, prefix) {
    if (!v.lang || !v.lang.toLowerCase().startsWith(prefix)) return -1;
    const n = v.name.toLowerCase();
    let s = 1;
    if (n.includes('natural')) s += 5;
    if (n.includes('neural')) s += 5;
    if (n.includes('online')) s += 2;
    if (n.includes('google')) s += 3;
    if (n.includes('premium') || n.includes('enhanced')) s += 2;
    if (n.includes('hoaimy') || n.includes('namminh')) s += 2;
    return s;
  }
  function getVoicesFor(prefix) {
    return voices.filter((v) => voiceScore(v, prefix) >= 0).sort((a, b) => voiceScore(b, prefix) - voiceScore(a, prefix));
  }
  function currentVoiceFor(prefix) {
    const list = getVoicesFor(prefix);
    const name = chosen[prefix];
    if (name) { const f = list.find((v) => v.name === name); if (f) return f; }
    return list[0] || null;
  }
  function setLang(lang) { curLang = lang || 'vi'; }
  // API tương thích cũ + mới
  function getViVoices() { return getVoicesFor(curLang); }
  function currentVoice() { return currentVoiceFor(curLang); }
  function setVoice(name) {
    chosen[curLang] = name;
    try { localStorage.setItem('smoker-sim-voices', JSON.stringify(chosen)); } catch (e) {}
  }
  if (window.speechSynthesis) {
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function speak(text) {
    if (!window.speechSynthesis) return false;
    speechSynthesis.cancel();
    const v = currentVoiceFor(curLang);
    const bcp = BCP[curLang] || 'vi-VN';
    // chia theo câu — đọc mượt và không bị ngắt giữa chừng trên Chrome
    const parts = String(text).match(/[^.!?…。！？]+[.!?…。！？]*\s*/g) || [String(text)];
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      const u = new SpeechSynthesisUtterance(t);
      u.lang = bcp;
      if (v) u.voice = v;
      u.rate = 1.0; u.pitch = 1.0;
      speechSynthesis.speak(u);
    }
    return true;
  }
  const stopSpeak = () => { if (window.speechSynthesis) speechSynthesis.cancel(); };
  const speaking = () => !!(window.speechSynthesis && speechSynthesis.speaking);
  const hasViVoice = () => !!currentVoiceFor(curLang);

  window.AUDIOX = { ensureCtx, fireOn, fireOff, click, ding, warn, speak, stopSpeak, speaking, hasViVoice, getViVoices, currentVoice, setVoice, setLang, getVoicesFor, currentVoiceFor };
})();
