// ============================================================
// DỮ LIỆU CHUẨN TEXAS BBQ — Lò offset Duy's Oven OFFSET 10050
// Nhiên liệu: gỗ sồi (oak) + than đước Việt Nam
// ============================================================

window.SMOKER_GEO = {
  totalWidthCm: 145,
  totalHeightCm: 160,
  depthCm: 60,
  chamber: { lengthCm: 100, diaCm: 50 },     // Khoang xông khói
  firebox: { lengthCm: 40, diaCm: 45 },      // Khoang nhiên liệu
  rackUpper: { wCm: 94, dCm: 34 },           // Vỉ tầng trên
  rackLower: { wCm: 94, dCm: 47 },           // Vỉ tầng dưới
  weightKg: 100,
};

window.MEATS = {
  brisket: {
    id: 'brisket', family: 'beef', unit: 'tảng', kgPerUnit: 5.5, maxUnits: 2,
    pitTarget: 121, internalTarget: 96, usdaSafe: 63, wrapAt: 74, recommendedHours: 12, k: 0.21,
    stall: { lo: 69, hi: 79, factor: 0.16 },
  },
  porkbutt: {
    id: 'porkbutt', family: 'pork', unit: 'tảng', kgPerUnit: 4.0, maxUnits: 3,
    pitTarget: 121, internalTarget: 94, usdaSafe: 63, wrapAt: 71, recommendedHours: 10, k: 0.23,
    stall: { lo: 68, hi: 77, factor: 0.18 },
  },
  beefribs: {
    id: 'beefribs', family: 'beef', unit: 'dải', kgPerUnit: 2.5, maxUnits: 4,
    pitTarget: 135, internalTarget: 93, usdaSafe: 63, wrapAt: null, recommendedHours: 8, k: 0.27,
    stall: { lo: 70, hi: 78, factor: 0.25 },
  },
  porkribs: {
    id: 'porkribs', family: 'pork', unit: 'dải', kgPerUnit: 1.6, maxUnits: 6,
    pitTarget: 121, internalTarget: 91, usdaSafe: 63, wrapAt: 71, recommendedHours: 6, k: 0.40,
    stall: { lo: 68, hi: 76, factor: 0.35 },
  },
  chicken: {
    id: 'chicken', family: 'poultry', unit: 'con', kgPerUnit: 1.6, maxUnits: 6,
    pitTarget: 150, internalTarget: 74, usdaSafe: 74, wrapAt: null, recommendedHours: 4, k: 0.33,
    stall: { lo: 62, hi: 68, factor: 0.55 },
  },
  turkey: {
    id: 'turkey', family: 'poultry', unit: 'con', kgPerUnit: 5.0, maxUnits: 2,
    pitTarget: 150, internalTarget: 74, usdaSafe: 74, wrapAt: null, recommendedHours: 7, k: 0.20,
    stall: { lo: 62, hi: 70, factor: 0.45 },
  },
  duck: {
    id: 'duck', family: 'duck', unit: 'con', kgPerUnit: 2.2, maxUnits: 4,
    pitTarget: 135, internalTarget: 77, usdaSafe: 74, wrapAt: null, recommendedHours: 5, k: 0.24,
    stall: { lo: 65, hi: 71, factor: 0.5 },
  },
  salmon: {
    id: 'salmon', family: 'fish', unit: 'phi lê', kgPerUnit: 1.2, maxUnits: 8,
    pitTarget: 95, internalTarget: 60, usdaSafe: 63, wrapAt: null, recommendedHours: 3, k: 0.38,
    stall: null,
  },
};

// Bảng màu thịt theo trạng thái — [nhiệt lõi °C, màu]
window.MEAT_COLORS = {
  beef: {
    raw: '#a92637',
    interior: [[5,'#a92637'],[45,'#b13a40'],[57,'#bc5a50'],[66,'#b4715c'],[74,'#a67b5e'],[84,'#96714f'],[98,'#7e5c3e']],
    exterior: [[0,'#c4766a'],[0.22,'#a3522f'],[0.45,'#71321a'],[0.7,'#3f1d0e'],[1,'#190d07']],
    ringColor: '#c2485a',
  },
  pork: {
    raw: '#d98d8f',
    interior: [[5,'#d98d8f'],[50,'#d99a87'],[63,'#cfa183'],[72,'#c5a07a'],[82,'#b8956c'],[95,'#a3815a']],
    exterior: [[0,'#dba08e'],[0.22,'#b06535'],[0.45,'#83401d'],[0.7,'#4e2510'],[1,'#241208']],
    ringColor: '#d56d72',
  },
  poultry: {
    raw: '#e7b9a0',
    interior: [[5,'#e7b9a0'],[45,'#ecc6a8'],[60,'#efd2b0'],[74,'#ecd2ad'],[85,'#dcc096']],
    exterior: [[0,'#e8b48c'],[0.22,'#c8823f'],[0.45,'#9c5a26'],[0.7,'#6b3a18'],[1,'#3e210e']],
    ringColor: '#e08a64',
  },
  fish: {
    raw: '#fb8a64',
    interior: [[5,'#fb8a64'],[40,'#f99466'],[50,'#f5a172'],[58,'#f0ad84'],[65,'#e0a382'],[80,'#bd8668']],
    exterior: [[0,'#f9986d'],[0.22,'#d96e3a'],[0.45,'#a84d24'],[0.7,'#7c3a1c'],[1,'#5a2a14']],
    ringColor: '#e8784f',
  },
  duck: {
    raw: '#b04050',
    interior: [[5,'#b04050'],[50,'#b25554'],[62,'#ab6a55'],[72,'#9d7152'],[85,'#8a6243']],
    exterior: [[0,'#c98a70'],[0.22,'#a85a2c'],[0.45,'#7c3d17'],[0.7,'#532a10'],[1,'#2e180a']],
    ringColor: '#c25563',
  },
};

// Nhiên liệu
window.FUELS = {
  oakHandfulKg: 0.4,      // 1 nắm/vùa gỗ sồi vụn (chips/chunks) ≈ 0.4kg
  charcoalBaseKg: 4,      // mồi nền than đước
  charcoalRefillKg: 2,    // mỗi lần thêm than đước ≈ 2kg
  charcoalBagKg: 10,
};

// Ảnh minh họa từng loại thịt (đã đóng gói được khi xuất file offline)
(function () {
  const RES = (id, fallback) => (window.__resources && window.__resources[id]) || fallback;
  window.MEAT_PHOTOS = {
    brisket: RES('photoBrisket', 'smk-brisket.png'),
    porkbutt: RES('photoPorkbutt', 'smk-suon-heo.png'),
    beefribs: RES('photoBeefribs', 'smk-suon-bo.png'),
    porkribs: RES('photoPorkribs', 'smk-suon-heo.png'),
    chicken: RES('photoChicken', 'smk-vit.png'),
    turkey: RES('photoTurkey', 'smk-vit.png'),
    duck: RES('photoDuck', 'smk-vit.png'),
    salmon: RES('photoSalmon', 'smk-ca-hoi.png'),
  };
})();

// Vị trí đặt thịt trong khoang
window.ZONES = [
  { id: 'near', name: 'Gần khoang đốt', tempOffset: +16 },
  { id: 'mid',  name: 'Giữa khoang',    tempOffset: 0 },
  { id: 'far',  name: 'Xa khoang đốt',  tempOffset: -12 },
];
window.RACKS = [
  { id: 'lower', name: 'Tầng dưới (94×47cm)', tempOffset: +5 },
  { id: 'upper', name: 'Tầng trên (94×34cm)', tempOffset: 0 },
];
