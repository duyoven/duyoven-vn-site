// ============================================================
// MÔ HÌNH MÔ PHỎNG — minh họa trực quan, sát thực tế vận hành
// ============================================================
(function () {
  const STEP_MIN = 2; // bước tích phân: 2 phút

  function lerp(a, b, t) { return a + (b - a) * t; }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r) {
    return '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }
  // Nội suy màu trên thang [[stop, '#hex'], ...]
  function colorScale(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const t = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        const a = hexToRgb(stops[i - 1][1]), b = hexToRgb(stops[i][1]);
        return rgbToHex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
      }
    }
    return stops[stops.length - 1][1];
  }

  // Nhiệt khoang mục tiêu từ lửa: củi nạp (kg/h) × độ mở van gió
  function pitSetpoint(fuelRate, vent, ambient) {
    const ventFactor = 0.30 + 0.70 * vent;
    return ambient + 52 * Math.pow(fuelRate, 0.85) * ventFactor;
  }

  // Chất lượng khói theo van gió + lửa
  function smokeQuality(vent, fuelRate) {
    if (vent < 0.35) return 'dirty';   // thiếu oxy → khói trắng đục, vị đắng
    if (vent > 0.85 && fuelRate > 3) return 'hot';
    return 'clean';                    // "thin blue smoke" — khói xanh mỏng
  }

  // Mô phỏng toàn phiên → mảng mẫu theo thời gian
  // params: { meatId, units, rackId, zoneId, vent(0-1), fuelRate(kg/h), ambient, hours, wrap }
  function simulate(p) {
    const meat = window.MEATS[p.meatId];
    const zone = window.ZONES.find((z) => z.id === p.zoneId);
    const rack = window.RACKS.find((r) => r.id === p.rackId);
    const setpoint = pitSetpoint(p.fuelRate, p.vent, p.ambient);
    const tauH = 0.45; // hằng số thời gian gia nhiệt lò
    const totalMin = Math.round(p.hours * 60);
    const loadKg = meat.kgPerUnit * p.units;
    // tải nhiệt: nhiều thịt → lò ì hơn một chút
    const loadDrag = 1 - Math.min(0.18, loadKg * 0.008);

    const samples = [];
    let T = 5;        // lõi thịt từ tủ mát
    let bark = 0;     // tích lũy lớp vỏ khói (0..1+)
    let ring = 0;     // vòng khói, mm
    let wrappedAt = null;

    for (let m = 0; m <= totalMin; m += STEP_MIN) {
      const h = m / 60;
      const pit = p.ambient + (setpoint - p.ambient) * (1 - Math.exp(-h / tauH)) * loadDrag;
      const zoneT = pit + (h > 0.1 ? zone.tempOffset + rack.tempOffset : 0) * Math.min(1, h / 0.7);

      // truyền nhiệt vào lõi, có "stall" (khựng nhiệt do bốc hơi)
      let k = meat.k;
      const wrapped = p.wrap && meat.wrapAt != null && T >= meat.wrapAt;
      if (wrapped && wrappedAt == null) wrappedAt = m;
      if (meat.stall && T >= meat.stall.lo && T <= meat.stall.hi) {
        k *= wrapped ? 0.75 : meat.stall.factor;
      }
      const dT = k * (zoneT - T) * (STEP_MIN / 60);
      T = Math.min(zoneT - 1, T + Math.max(0, dT) + Math.min(0, dT) * 0.2);

      // vỏ khói: cần nhiệt bề mặt >90°C và khói; bọc giấy làm mềm vỏ, ngừng lên màu
      const smoky = wrapped ? 0.15 : 1;
      bark += Math.max(0, (zoneT - 88) / 55) * smoky * (STEP_MIN / 60) * 0.16;
      // vòng khói chỉ hình thành khi lõi còn lạnh (<60°C) và không bọc
      if (T < 60 && !wrapped) ring = Math.min(9, ring + 1.45 * (STEP_MIN / 60));

      samples.push({ min: m, pit: Math.round(pit), zoneT: Math.round(zoneT), internal: T, bark: Math.min(1.15, bark), ring, wrapped });
    }
    return { samples, setpoint: Math.round(setpoint), wrappedAtMin: wrappedAt, meat, zone, rack };
  }

  function sampleAt(sim, minute) {
    const i = Math.min(sim.samples.length - 1, Math.max(0, Math.round(minute / STEP_MIN)));
    return sim.samples[i];
  }

  // Màu thịt tại một mẫu thời gian
  function meatColors(meat, s) {
    const pal = window.MEAT_COLORS[meat.family];
    return {
      exterior: colorScale(pal.exterior, Math.min(1, s.bark)),
      interior: colorScale(pal.interior, s.internal),
      ring: pal.ringColor,
      ringMm: s.ring,
      raw: pal.raw,
    };
  }

  // Đánh giá chất lượng tại thời điểm — T là bộ dịch (window.makeT)
  function verdict(meat, s, hours, T) {
    const t = T || window.makeT('vi');
    const mShort = t.meat(meat.id, 'short');
    const Tc = s.internal;
    const tgt = meat.internalTarget;
    if (Tc < tgt - 12) return { grade: 'raw', label: t.s('v_raw'), color: '#e25555', text: t.s('v_raw_t', { T: Tc.toFixed(0), tgt: tgt }) };
    if (Tc < tgt - 3) return { grade: 'almost', label: t.s('v_almost'), color: '#e8a13c', text: t.s('v_almost_t', { T: Tc.toFixed(0), d: (tgt - Tc).toFixed(0) }) };
    if (Tc <= tgt + 5 && !(meat.id === 'salmon' && hours > 4.5)) return { grade: 'perfect', label: t.s('v_perfect'), color: '#4cc472', text: t.s('v_perfect_t', { T: Tc.toFixed(0), doneFeel: t.meat(meat.id, 'doneFeel') }) };
    return { grade: 'over', label: t.s('v_over'), color: '#e25555', text: meat.id === 'salmon' ? t.s('v_over_salmon_t', { x: (hours - meat.recommendedHours).toFixed(1), rec: meat.recommendedHours }) : t.s('v_over_t', { T: Tc.toFixed(0) }) };
  }

  // Tính nhiên liệu cho cả phiên
  function fuelPlan(p, setpoint) {
    const meat = window.MEATS[p.meatId];
    const F = window.FUELS;
    const loadKg = meat.kgPerUnit * p.units;
    const coldPenalty = p.ambient < 20 ? 1.12 : 1;
    const burnPerHour = p.fuelRate * coldPenalty * (1 + loadKg * 0.006);
    const totalBurn = burnPerHour * p.hours;
    // chia: ~70% gỗ sồi vụn tạo khói + ~30% than đước giữ nền
    const oakKg = totalBurn * 0.70;
    const charcoalKgTotal = F.charcoalBaseKg + totalBurn * 0.30;
    const oakHandfuls = Math.max(3, Math.ceil(oakKg / F.oakHandfulKg));
    // nhịp thêm gỗ sồi vụn (cháy nhanh hơn khúc → thường xuyên hơn)
    const oakPerHour = (burnPerHour * 0.70) / F.oakHandfulKg;     // nắm/giờ
    const feedEveryMin = Math.min(45, Math.max(20, Math.round(60 / Math.max(1, oakPerHour))));
    // nhịp thêm than đước để giữ nền nhiệt
    const charBurnPerHour = burnPerHour * 0.30;
    const charcoalEveryMin = Math.min(150, Math.max(60, Math.round(F.charcoalRefillKg / Math.max(0.4, charBurnPerHour) * 60)));
    const charcoalRefills = Math.max(0, Math.floor((p.hours * 60 - 45) / charcoalEveryMin));
    return {
      loadKg,
      charcoalKg: Math.round(charcoalKgTotal * 10) / 10,
      oakKg: Math.round(oakKg * 10) / 10,
      oakHandfuls,
      feedEveryMin,
      charcoalEveryMin,
      charcoalRefills,
      bags: Math.ceil(charcoalKgTotal / F.charcoalBagKg * 10) / 10,
    };
  }

  window.SIM = { simulate, sampleAt, meatColors, verdict, fuelPlan, pitSetpoint, smokeQuality, colorScale, STEP_MIN };
})();
