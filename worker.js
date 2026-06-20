// Duy's Oven — duyoven.vn Worker
// 1) Reverse-proxies heavy/cross-origin assets (Academy sims + catalog/manual PDFs)
//    from duyoven.com under same-origin paths, stripping framing headers.
// 2) Protects the internal quote tool (/bao-gia.html) with HTTP Basic Auth.
//    Staff accounts are read from the secret env var STAFF_AUTH, formatted as
//    "user1:pass1,user2:pass2". Set it in Cloudflare → Worker → Settings → Variables.

const PROXY = {
  "/academy-sim/tach-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duyoven-mophong-than-tach-khoi-v2.html",
  "/academy-sim/xong-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duys-oven-mo-phong-lo-xong-khoi-1.html",
  "/tai-lieu/catalog-2026-vi.pdf":
    "https://duyoven.com/wp-content/uploads/2026/06/DuysOven-Catalog-2026.pdf",
  "/tai-lieu/catalog-2026-en.pdf":
    "https://duyoven.com/wp-content/uploads/2026/06/DuysOven-Catalog-2026-EN.pdf",
  "/tai-lieu/hdsd-tach-khoi.pdf":
    "https://duyoven.com/wp-content/uploads/2025/07/HDSD_Nhanh_LoThanTachKhoi.pdf",
  "/tai-lieu/hdsd-pantina.pdf":
    "https://duyoven.com/wp-content/uploads/2025/07/HDSD_Nhanh_Pantina.pdf",
  "/tai-lieu/hdsd-fastgrill.pdf":
    "https://duyoven.com/wp-content/uploads/2026/03/HDSD_FastGrill.pdf",
};

const INTERNAL = new Set(["/bao-gia.html", "/bao-gia", "/hop-dong.html", "/hop-dong", "/quan-tri.html", "/quan-tri", "/quan-ly.html", "/quan-ly", "/quan-ly-kho.html", "/quan-ly-kho", "/ban-giao-nghiem-thu.html", "/ban-giao-nghiem-thu", "/vat-tu.html", "/vat-tu"]);

const AI_SYS = [
  "Bạn là trợ lý tư vấn của Duy's Oven (duyoven.vn) — thương hiệu Việt Nam chuyên lò nướng than tách khói, lò BBQ, lò xông khói (smoker) và lò pizza, sản xuất từ thép, sơn chịu nhiệt chuẩn Mỹ 600°C, vỉ inox.",
  "Cơ chế tách khói: than cháy ở khu vực riêng, vỉ tách dầu hình chữ V hứng mỡ nên mỡ không rơi vào than → không sinh khói khét; có quạt gió (DC 12V/USB-C) giúp than cháy đều, nướng được trong nhà.",
  "Bảng model & giá tham khảo (đã gồm VAT): Pantina 7.700.000đ (nhỏ gọn ~3 con gà); Tách khói 65L 12.100.000đ; 80L 15.400.000đ; 85L 16.500.000đ; 125L/125L Pro/250L (liên hệ); Hybrid than+gas 65L 15.400.000đ, 80L 18.700.000đ, 125L 27.500.000đ; Lò xông khói Hybrid 10050 33.000.000đ; Offset Smoker 10050 24.200.000đ; Lò Pizza Wood&Gas 126.500.000đ; Argentina Grill, Fastgrill, lò quay (liên hệ).",
  "Nhiệm vụ: hỏi nhu cầu (số người ăn, trong nhà/sân vườn/camping, loại món, ngân sách) rồi gợi ý model phù hợp, giải thích ngắn gọn lý do, nêu giá. Có thể tư vấn đặt lò theo kích thước riêng.",
  "NGÔN NGỮ: luôn trả lời bằng ĐÚNG ngôn ngữ mà khách dùng trong tin nhắn gần nhất của họ — khách viết tiếng Anh thì đáp tiếng Anh, tiếng Hàn đáp tiếng Hàn, tiếng Trung/Thái/Đức tương tự; nếu không chắc thì dùng tiếng Việt. Thân thiện, ngắn gọn, thực tế. Không bịa thông số. Khi cần chốt đơn/giá chính xác, mời liên hệ Hotline 090 169 1717 hoặc trang Báo giá.",
  "QUAN TRỌNG về định dạng: khung chat chỉ hiển thị VĂN BẢN THUẦN, KHÔNG render Markdown. Vì vậy TUYỆT ĐỐI không dùng dấu Markdown: không dùng # hay ## (tiêu đề), không dùng ** hay __ (in đậm), không bảng. Trả lời như tin nhắn tự nhiên, 2–5 câu. Nếu cần liệt kê thì xuống dòng và bắt đầu bằng dấu gạch '– '. Tên model và giá viết thẳng trong câu, ví dụ: Lò Tách khói 65L giá 12.100.000đ."
].join(" ");

const QUOTE_SYS = [
  "Bạn là TRỢ LÝ BÁO GIÁ NỘI BỘ cho nhân viên sale của Duy's Oven (lò nướng than tách khói, lò BBQ, lò xông khói, lò pizza). Nhân viên mô tả nhu cầu khách bằng ngôn ngữ tự nhiên; bạn đề xuất sản phẩm phù hợp và soạn nháp đơn báo giá để điền vào hệ thống.",
  "BẢNG GIÁ (VND, đã gồm VAT). Chỉ dùng đúng các mức giá này, TUYỆT ĐỐI không bịa giá khác:",
  "- Pantina (nhỏ gọn, ~3 con gà): 7700000",
  "- Lò Tách khói 65L: 12100000 | 80L: 15400000 | 85L: 16500000",
  "- Lò Tách khói 125L / 125L Pro / 250L: cần báo giá riêng (đặt p=0)",
  "- Hybrid than+gas 65L: 15400000 | 80L: 18700000 | 125L: 27500000",
  "- Lò xông khói Hybrid 10050: 33000000",
  "- Offset Smoker 10050: 24200000",
  "- Lò Pizza Wood&Gas: 126500000",
  "- Argentina Grill / Fastgrill / Lò quay / Eco: cần báo giá riêng (đặt p=0)",
  "QUY TẮC: chọn 1–3 sản phẩm hợp nhu cầu (số người ăn, trong nhà/sân vườn/camping, ngân sách). Số lượng mặc định 1 trừ khi khách cần nhiều suất/nhiều chi nhánh. Với mặt hàng 'cần báo giá riêng' đặt p=0 và nhắc nhân viên tự điền giá trong 'reply'. Tôn trọng ngân sách khách nếu nêu.",
  "THÔNG TIN KHÁCH: nếu nhân viên có mô tả tên khách, số điện thoại, công ty, mã số thuế, email, người liên hệ, hay địa chỉ giao hàng thì BÓC ra và điền vào object 'cust'. Trường nào không có thì để chuỗi rỗng \"\". TUYỆT ĐỐI không bịa thông tin khách (không tự tạo SĐT/email/tên giả).",
  "CHỈ trả về MỘT đối tượng JSON hợp lệ, KHÔNG kèm chữ nào khác, KHÔNG markdown, KHÔNG ```. Cấu trúc đúng: {\"items\":[{\"n\":\"Lò Tách khói 65L\",\"desc\":\"mô tả/quy cách: kích thước, chất liệu, đặc tính (mỗi ý một dòng)\",\"unit\":\"Cái\",\"p\":12100000,\"q\":1}],\"cust\":{\"name\":\"\",\"phone\":\"\",\"contact\":\"\",\"email\":\"\",\"company\":\"\",\"tax\":\"\",\"addr\":\"\"},\"note\":\"ghi chú/điều khoản gợi ý ngắn\",\"deliv\":\"7-10 ngày\",\"warr\":\"12 tháng\",\"valid\":30,\"reply\":\"giải thích ngắn 2-3 câu bằng tiếng Việt cho nhân viên: vì sao chọn các model này\"}. 'desc' là mô tả chi tiết hàng (nếu có); nếu là nội dung trích từ báo giá cũ thì GIỮ NGUYÊN đầy đủ mô tả. Giá 'p' là số nguyên VND, không dấu phân cách, không chữ. Nếu thiếu thông tin cứ đề xuất phương án hợp lý nhất và nêu giả định trong 'reply'."
].join("\n");

const IMPORT_SYS = [
  "Bạn là trợ lý ĐỌC & SỐ HÓA BÁO GIÁ CŨ cho Duy's Oven. Người dùng gửi ẢNH hoặc PDF một bản báo giá/đơn hàng đã có. Hãy ĐỌC thật kỹ và trích xuất ĐÚNG nội dung trong tài liệu — KHÔNG bịa, KHÔNG thêm thông tin ngoài tài liệu.",
  "DÙNG ĐÚNG dữ liệu trong tài liệu: từng dòng sản phẩm gồm TÊN và toàn bộ MÔ TẢ CHI TIẾT (kích thước, chất liệu, màu, đặc tính, nhiên liệu… — giữ NGUYÊN VĂN, mỗi ý một dòng), ĐVT, số lượng, đơn giá; thông tin khách hàng (tên, công ty, MST, SĐT, email, người liên hệ, địa chỉ); và điều khoản nếu có (thanh toán, thời gian giao, bảo hành, hiệu lực). Đơn giá lấy ĐÚNG số trong báo giá, bỏ dấu phân cách, ra số nguyên VND. Ô nào không đọc được thì để rỗng hoặc 0.",
  "CHỈ trả về MỘT JSON hợp lệ, KHÔNG markdown. Cấu trúc: {\"items\":[{\"n\":\"tên ngắn\",\"desc\":\"toàn bộ mô tả chi tiết, giữ nguyên các dòng kích thước/chất liệu/đặc tính\",\"unit\":\"Cái\",\"p\":0,\"q\":1}],\"cust\":{\"name\":\"\",\"phone\":\"\",\"contact\":\"\",\"email\":\"\",\"company\":\"\",\"tax\":\"\",\"addr\":\"\"},\"note\":\"\",\"deliv\":\"\",\"warr\":\"\",\"valid\":30,\"reply\":\"tóm tắt ngắn tiếng Việt: đã đọc được mấy mục hàng, tên khách\"}. 'n' là tên ngắn của hàng; 'desc' chứa đầy đủ phần mô tả chi tiết còn lại."
].join("\n");

const CONTRACT_SYS = [
  "Bạn là TRỢ LÝ LẬP HỢP ĐỒNG MUA BÁN nội bộ cho Duy's Oven. Nhân viên mô tả yêu cầu bằng ngôn ngữ tự nhiên (khách hàng, đơn hàng, điều kiện giao/thanh toán). Bạn ĐỌC kỹ và tự bóc tách rồi điền vào đúng các trường của hợp đồng.",
  "QUY ƯỚC: Bên A = BÊN MUA = khách hàng. Bên B = BÊN BÁN = Duy's Oven. Nếu nhân viên KHÔNG nêu Bên B khác thì để toàn bộ object B rỗng (hệ thống tự dùng HARMONIA mặc định).",
  "BẢNG GIÁ tham khảo (VND): Pantina 7700000; Lò Tách khói 65L 12100000, 80L 15400000, 85L 16500000; Hybrid 65L 15400000, 80L 18700000, 125L 27500000; Xông khói Hybrid 10050 33000000; Offset 10050 24200000; Lò Pizza Wood&Gas 126500000; hàng đặt riêng/khác đặt p=0. Nếu nhân viên nêu đơn giá cụ thể (giá dự án) thì DÙNG ĐÚNG số đó. Không bịa giá.",
  "CHỈ trả về MỘT đối tượng JSON hợp lệ, KHÔNG kèm chữ nào khác, KHÔNG markdown. Cấu trúc: {\"A\":{\"name\":\"\",\"addr\":\"\",\"phone\":\"\",\"email\":\"\",\"tax\":\"\",\"rep\":\"\",\"title\":\"\",\"bank\":\"\"},\"B\":{\"name\":\"\",\"addr\":\"\",\"phone\":\"\",\"email\":\"\",\"tax\":\"\",\"rep\":\"\",\"title\":\"\",\"bank\":\"\"},\"items\":[{\"n\":\"tên ngắn\",\"desc\":\"mô tả/quy cách: model, kích thước, chất liệu, đặc tính\",\"unit\":\"bộ\",\"p\":0,\"q\":1}],\"project\":\"\",\"delivery\":\"Đợt 1: ...\\nĐợt 2: ...\",\"payment\":\"Đợt 1: 30% ...\\nĐợt 2: ...\",\"warr\":24,\"reply\":\"giải thích ngắn 2-3 câu tiếng Việt cho nhân viên\"}. 'rep' ghi kèm kính ngữ ví dụ 'ông Nguyễn Văn A'. 'desc' là mô tả chi tiết hàng hóa (nếu nhân viên có nêu, không thì để rỗng). 'delivery' và 'payment' mỗi đợt một dòng. KHÔNG bịa thông tin khách (tên/SĐT/MST/email) — thiếu thì để chuỗi rỗng. 'warr' là số tháng (mặc định 24)."
].join("\n");

const LANG_NAMES = { en: "English", zh: "Simplified Chinese", ko: "Korean", ja: "Japanese", th: "Thai", de: "German" };

const IMG_STYLE =
  ", professional studio product photography, matte black powder-coated steel, stainless steel grates, " +
  "dramatic warm rim lighting, glowing orange charcoal embers, dark charcoal-grey seamless backdrop, " +
  "premium, photorealistic, ultra detailed, sharp focus, centered, no text, no watermark";
function imgPrompt(m) {
  m = (m || "").toLowerCase();
  if (m.indexOf("pantina") === 0) return "A compact small smokeless charcoal BBQ oven, single chamber, short sturdy legs, small glass ember window on the front";
  if (m.indexOf("hybrid") === 0 || m.indexOf("hy") === 0) return "A smokeless charcoal-and-gas hybrid BBQ oven cabinet with two control knobs, a chimney and a glass ember window, on caster wheels";
  if (m.indexOf("offset") !== -1) return "A classic offset barrel smoker with a side firebox and a tall chimney, on two wheels";
  if (m.indexOf("xong") !== -1 || m.indexOf("smoker") !== -1) return "A large vertical hybrid smoker oven with a chimney, heavy steel body, double doors";
  if (m.indexOf("pizza") !== -1) return "A premium wood-fired pizza oven with an arched dome chamber and flames glowing inside";
  if (m.indexOf("argentina") !== -1) return "An Argentine-style grill with an adjustable height grate and a side brasero, flames and embers";
  if (m.indexOf("fastgrill") !== -1) return "A sleek portable charcoal grill with glowing embers";
  if (m.indexOf("eco") !== -1) return "A compact minimalist eco charcoal grill";
  if (m.indexOf("quay") !== -1) return "A charcoal rotisserie oven with a rotating spit and glowing embers";
  if (m === "hero") return "A flagship premium smokeless charcoal BBQ oven, hero shot, cinematic, glowing embers, dramatic atmosphere";
  return "A smokeless charcoal BBQ box oven cabinet with a chimney and a glass ember window, standing on slim legs";
}
function seedFrom(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h % 100000; }

async function sha1hex(s) {
  const b = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// ===== Lưu/đọc JSON trên GitHub (dùng cho danh sách thiết bị tin cậy) =====
function _ghCfg(env, path) {
  const repo = env.GH_REPO || "duyoven/duyoven-vn-site";
  return { api: "https://api.github.com/repos/" + repo + "/contents/" + path, headers: { "Authorization": "Bearer " + (env.GH_TOKEN || ""), "Accept": "application/vnd.github+json", "User-Agent": "duyoven-cms" } };
}
async function ghGetJson(env, path, branch) {
  if (!env.GH_TOKEN) return { obj: null, sha: undefined };
  branch = branch || "main";
  const c = _ghCfg(env, path);
  const r = await fetch(c.api + "?ref=" + branch, { headers: c.headers });
  if (r.status === 404) return { obj: null, sha: undefined };
  if (!r.ok) throw new Error("GitHub " + r.status);
  const j = await r.json();
  const txt = decodeURIComponent(escape(atob((j.content || "").replace(/\n/g, ""))));
  let obj = null; try { obj = JSON.parse(txt); } catch (e) {}
  return { obj, sha: j.sha };
}
async function ghPutJson(env, path, obj, msg, sha, branch) {
  const c = _ghCfg(env, path);
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
  const r = await fetch(c.api, { method: "PUT", headers: { ...c.headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, content: b64, sha, branch: branch || "main" }) });
  return r.ok;
}
// Đọc-sửa-ghi NGUYÊN TỬ có kiểm tra phiên bản (rev). mutate(store) sửa store tại chỗ và trả:
//  {reject:<resp>}  → xung đột phiên bản, KHÔNG ghi (trả resp cho client tải lại)
//  {skip:true,result}→ không có gì để ghi
//  {msg,result}     → đã sửa, sẽ ghi (rev tự +1). Conflict ghi (sha cũ) → đọc lại & thử lại.
async function ghUpdate(env, path, branch, mutate, retries) {
  retries = (retries == null) ? 5 : retries;
  for (let i = 0; i <= retries; i++) {
    let cur; try { cur = await ghGetJson(env, path, branch); } catch (e) { return { error: true }; }
    const store = (cur.obj && typeof cur.obj === "object") ? cur.obj : {};
    const res = mutate(store) || {};
    if (res.reject) return { rejected: res.reject, store };
    if (res.skip) return { ok: true, skipped: true, store, result: res.result };
    store.rev = (Number(store.rev) || 0) + 1;
    store.updatedAt = new Date().toISOString();
    const ok = await ghPutJson(env, path, store, res.msg || "update", cur.sha, branch);
    if (ok) return { ok: true, store, result: res.result };
  }
  return { error: true };
}
function uaLabel(request) {
  const ua = request.headers.get("User-Agent") || "";
  let os = "Máy"; if (/iPhone/i.test(ua)) os = "iPhone"; else if (/iPad/i.test(ua)) os = "iPad"; else if (/Android/i.test(ua)) os = "Android"; else if (/Macintosh|Mac OS/i.test(ua)) os = "Mac"; else if (/Windows/i.test(ua)) os = "Windows"; else if (/Linux/i.test(ua)) os = "Linux";
  let br = ""; if (/CriOS/i.test(ua)) br = "Chrome"; else if (/Edg/i.test(ua)) br = "Edge"; else if (/FxiOS|Firefox/i.test(ua)) br = "Firefox"; else if (/Chrome/i.test(ua)) br = "Chrome"; else if (/Safari/i.test(ua)) br = "Safari";
  return (os + (br ? " " + br : "")).trim();
}
function maskEmailW(e) { e = String(e || ""); const at = e.indexOf("@"); if (at < 1) return e; return e[0] + "***" + e.slice(at); }

// ===== Khoá thiết bị tin cậy =====
const DEVFILE = "staff-devices.json";
async function deviceGate(env, request, email, deviceId) {
  if (!env.GH_TOKEN) return { state: "ok" }; // không có nơi lưu → không khoá được
  if (!deviceId) return { state: "pending" };
  let read; try { read = await ghGetJson(env, DEVFILE); } catch (e) { return { state: "ok" }; } // lỗi đọc → không khoá nhầm người
  let store = read.obj; const sha = read.sha;
  if (!store || typeof store !== "object") store = { trusted: [], pending: [] };
  store.trusted = Array.isArray(store.trusted) ? store.trusted : [];
  store.pending = Array.isArray(store.pending) ? store.pending : [];
  const u = await sha256hex(email.toLowerCase());
  const d = await sha256hex(deviceId);
  const mine = store.trusted.filter((t) => t && t.u === u);
  if (mine.some((t) => t.d === d)) return { state: "ok" };
  if (mine.length === 0) { // bootstrap: tin cậy máy đầu tiên của người này
    store.trusted.push({ u, d, label: uaLabel(request), ts: new Date().toISOString() });
    try { await ghPutJson(env, DEVFILE, store, "device: tin cay may dau (" + maskEmailW(email) + ")", sha); } catch (e) {}
    return { state: "ok" };
  }
  if (!store.pending.some((p) => p && p.u === u && p.d === d)) { // máy mới → chờ duyệt
    store.pending.push({ u, d, label: uaLabel(request), email: maskEmailW(email), ts: new Date().toISOString() });
    try { await ghPutJson(env, DEVFILE, store, "device: cho duyet may moi (" + maskEmailW(email) + ")", sha); } catch (e) {}
  }
  return { state: "pending" };
}
function isOwnerUser(who, env) {
  if (who === "chu@duyoven") return true;
  const allowedE = (env.GLOGIN_ALLOWED || "vinhduynguyen@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowedE.indexOf(String(who || "").toLowerCase()) !== -1;
}

// ===== Nhật ký hành động (audit log) — lưu trên nhánh appdata (không build) =====
const AUDITFILE = "audit-log.json";
async function auditLog(env, who, action, detail) {
  if (!env.GH_TOKEN) return;
  const entry = { ts: new Date().toISOString(), who: who || "?", action: (action || "").slice(0, 80), detail: (detail || "").slice(0, 300) };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await ghGetJson(env, AUDITFILE, "appdata");
      let arr = (r.obj && Array.isArray(r.obj.entries)) ? r.obj.entries : [];
      arr.unshift(entry);
      arr = arr.slice(0, 1000);
      const ok = await ghPutJson(env, AUDITFILE, { entries: arr }, "audit", r.sha, "appdata");
      if (ok) return;
    } catch (e) { return; }
  }
}

const CHAT_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

async function callClaude(env, msgs) {
  const sys = (msgs.find((m) => m.role === "system") || {}).content || AI_SYS;
  const conv = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  if (!conv.length) return "";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || "claude-haiku-4-5",
      max_tokens: 700,
      system: sys,
      messages: conv,
    }),
  });
  if (!r.ok) throw new Error("anthropic " + r.status + " " + (await r.text()).slice(0, 200));
  const j = await r.json();
  return (j.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
}

function staffUser(request, env) {
  const hdr = request.headers.get("Authorization") || "";
  if (!hdr.startsWith("Basic ")) return null;
  let dec = "";
  try { dec = atob(hdr.slice(6)); } catch (e) { return null; }
  const list = (env.STAFF_AUTH || "").split(",").map(s => s.trim()).filter(Boolean);
  if (list.indexOf(dec) !== -1) return dec.split(":")[0];
  return null;
}

// ===== Phiên đăng nhập (cookie ký HMAC) — thay cho bảng Basic Auth =====
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
function _b64urlEnc(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function _b64urlDec(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; const bin = atob(str); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
async function _hmac(env, msg) {
  const keyStr = env.SESSION_SECRET || env.GH_TOKEN || "duyoven-session-fallback";
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return _b64urlEnc(new Uint8Array(sig));
}
async function signSession(user, env) {
  const payload = _b64urlEnc(new TextEncoder().encode(user + "|" + (Date.now() + SESSION_TTL_MS)));
  return payload + "." + (await _hmac(env, payload));
}
async function sessionUser(request, env) {
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)dq_sess=([^;]+)/);
  if (!m) return null;
  const val = m[1], dot = val.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = val.slice(0, dot), sig = val.slice(dot + 1);
  if (sig !== (await _hmac(env, payload))) return null;
  let dec; try { dec = new TextDecoder().decode(_b64urlDec(payload)); } catch (e) { return null; }
  const sep = dec.lastIndexOf("|");
  if (sep < 0) return null;
  const exp = parseInt(dec.slice(sep + 1), 10);
  if (!exp || Date.now() > exp) return null;
  return dec.slice(0, sep) || "staff";
}
// Ưu tiên phiên đăng nhập Google (cookie); Basic Auth cũ chỉ dùng khi KHÔNG có phiên
// (trình duyệt từng lưu Basic Auth "duy:…" vẫn tự gửi header — không được để nó đè lên Google).
async function authUser(request, env) { return (await sessionUser(request, env)) || staffUser(request, env); }
async function loginResponse(obj, user, env) {
  const cookie = "dq_sess=" + (await signSession(user, env)) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + Math.floor(SESSION_TTL_MS / 1000);
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store", "Set-Cookie": cookie } });
}

// ===== TOTP (Google Authenticator) =====
function base32decode(s) {
  s = (s || "").replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < s.length; i++) { const v = alpha.indexOf(s[i]); if (v < 0) continue; bits += v.toString(2).padStart(5, "0"); }
  const bytes = [];
  for (let j = 0; j + 8 <= bits.length; j += 8) bytes.push(parseInt(bits.substr(j, 8), 2));
  return new Uint8Array(bytes);
}
async function totpHotp(keyBytes, counter) {
  const buf = new ArrayBuffer(8); const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 4294967296), false); dv.setUint32(4, counter >>> 0, false);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const off = sig[19] & 0xf;
  const bin = ((sig[off] & 0x7f) << 24) | ((sig[off + 1] & 0xff) << 16) | ((sig[off + 2] & 0xff) << 8) | (sig[off + 3] & 0xff);
  return (bin % 1000000).toString().padStart(6, "0");
}
async function verifyTOTP(secret, code) {
  const key = base32decode(secret); if (!key.length) return false;
  const t = Math.floor(Date.now() / 1000 / 30);
  for (let w = -1; w <= 1; w++) { if (await totpHotp(key, t + w) === code) return true; }
  return false;
}


// ===== APP XEP LASER (Duy's Oven): kich hoat key + AI, khoa theo may =====
const LASER_LIC = "laser-licenses.json"; // tren nhanh appdata (khong trigger build)
const LASER_SYS = "Ban la tro ly AI trong phan mem 'Xep Laser - Duy's Oven' giup tho co khi xep ban ve AutoCAD len tam ton (sat/inox) de cat laser. Phan mem tu tach chi tiet theo do day, xep N bo len kho tam (mac dinh 1250x2500mm), tach net CAT (layer CUT mau do) va net CHAN/gap (layer CHAN_KHONG_CAT mau xanh, KHONG duoc cat), xuat file DXF mo thang tren may cat. Tra loi NGAN GON, tieng Viet, thuc te cho tho. Hieu biet: do day ton sat/inox pho bien, hao hut khi cat laser, cach xep tiet kiem ton, vi sao file khong tach duoc chi tiet (sai don vi khong phai mm, net ho), an toan. KHONG bia dat con so.";
async function signLaser(env, device, key) {
  const exp = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const payload = _b64urlEnc(new TextEncoder().encode(device + "|" + key + "|" + exp));
  return payload + "." + (await _hmac(env, "laser:" + payload));
}
async function verifyLaser(env, token, device) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf("."); if (dot < 0) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  if (sig !== (await _hmac(env, "laser:" + payload))) return null;
  let dec; try { dec = new TextDecoder().decode(_b64urlDec(payload)); } catch (e) { return null; }
  const p = dec.split("|");
  if (p[0] !== device) return null;
  if (Date.now() > Number(p[2] || 0)) return null;
  return { device: p[0], key: p[1] };
}
async function laserDeviceOk(env, device, key) {
  // Token (HMAC) DA chung minh may kich hoat hop le voi key nay. O day chi
  // ENFORCE THU HOI: chan khi key bi tat (active:false) hoac may nam trong
  // danh sach revoked[]. KHONG dua vao devices[] (tranh ket qua sai do GitHub
  // doc-sau-ghi tre ngay sau khi kich hoat).
  try {
    const d = await sha256hex(device);
    const r = await ghGetJson(env, LASER_LIC, "appdata");
    const keys = (r.obj && Array.isArray(r.obj.keys)) ? r.obj.keys : [];
    const k = keys.find((x) => x && String(x.key).toUpperCase() === String(key).toUpperCase());
    if (!k) return false;
    if (k.active === false) return false;
    const revoked = Array.isArray(k.revoked) ? k.revoked : [];
    if (revoked.indexOf(d) !== -1) return false;
    return true;
  } catch (e) { return false; }
}

// ===== Google Drive (OAuth REFRESH TOKEN cua Duy) — luu PHIEN xep cua app laser =====
// Org Policy chan tao khoa service account -> dung cach CAP QUYEN 1 LAN cua chu Drive.
// Can bien Worker: GOOGLE_CLIENT_SECRET (secret) + GOOGLE_REFRESH_TOKEN (secret).
// GOOGLE_CLIENT_ID mac dinh = client bao gia (cong khai); thu muc DuyNestPro tu tao trong Drive.
const GD_CLIENT_ID_DEFAULT = "692061670720-n836gc68b3k5q5ceq8jb8bcb7nvt50on.apps.googleusercontent.com";
let _gdTokCache = null;
async function gdAccessToken(env) {
  const rt = env.GOOGLE_REFRESH_TOKEN;
  const cid = env.GOOGLE_CLIENT_ID || GD_CLIENT_ID_DEFAULT;
  const cs = env.GOOGLE_CLIENT_SECRET;
  if (!rt || !cid || !cs) return null;
  const now = Math.floor(Date.now() / 1000);
  if (_gdTokCache && _gdTokCache.exp > now + 60) return _gdTokCache.tok;
  const resp = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt) +
      "&client_id=" + encodeURIComponent(cid) + "&client_secret=" + encodeURIComponent(cs) });
  const j = await resp.json();
  if (!j.access_token) return null;
  _gdTokCache = { tok: j.access_token, exp: now + (Number(j.expires_in) || 3600) };
  return j.access_token;
}
let _gdRootCache = null;
async function gdRootFolder(tok, env) {
  if (env.GDRIVE_LASER_FOLDER) return env.GDRIVE_LASER_FOLDER;
  if (_gdRootCache) return _gdRootCache;
  _gdRootCache = await gdFindOrCreateFolder(tok, "DuyNestPro", "root");  // tu tao trong My Drive
  return _gdRootCache;
}
async function gdFindOrCreateFolder(tok, name, parent) {
  const safe = String(name).replace(/'/g, "\\'");
  const q = "mimeType='application/vnd.google-apps.folder' and trashed=false and name='" +
    safe + "' and '" + parent + "' in parents";
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=files(id)&q=" +
    encodeURIComponent(q) + "&supportsAllDrives=true&includeItemsFromAllDrives=true",
    { headers: { Authorization: "Bearer " + tok } });
  const j = await r.json();
  if (j.files && j.files.length) return j.files[0].id;
  const cr = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
    { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(name), mimeType: "application/vnd.google-apps.folder", parents: [parent] }) });
  const cj = await cr.json();
  return cj.id || null;
}
async function gdUploadFile(tok, name, parent, bytes, mime) {
  const boundary = "duynest" + Math.random().toString(36).slice(2);
  const pre = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify({ name: String(name), parents: [parent] }) +
    "\r\n--" + boundary + "\r\nContent-Type: " + mime + "\r\n\r\n";
  const post = "\r\n--" + boundary + "--";
  const te = new TextEncoder();
  const preB = te.encode(pre), postB = te.encode(post);
  const body = new Uint8Array(preB.length + bytes.length + postB.length);
  body.set(preB, 0); body.set(bytes, preB.length); body.set(postB, preB.length + bytes.length);
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
    { method: "POST", headers: { Authorization: "Bearer " + tok,
      "Content-Type": "multipart/related; boundary=" + boundary }, body });
  return await r.json();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- AI: tư vấn (chat) ---
    if (url.pathname === "/api/ai/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const hist = Array.isArray(body.messages) ? body.messages : [];
        const msgs = [{ role: "system", content: AI_SYS }];
        hist.slice(-8).forEach((m) => {
          if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
            msgs.push({ role: m.role, content: m.content.slice(0, 1500) });
          }
        });
        let reply = "", used = "", lastErr = "";
        // 1) Ưu tiên Claude (thông minh hơn hẳn) nếu đã cấu hình API key.
        if (env.ANTHROPIC_API_KEY) {
          try {
            reply = await callClaude(env, msgs);
            if (reply) used = env.CLAUDE_MODEL || "claude-haiku-4-5";
          } catch (err) { lastErr = "Claude: " + String(err); }
        }
        // 2) Dự phòng: Workers AI (llama) nếu chưa có key hoặc Claude lỗi.
        if (!reply) {
          for (const model of CHAT_MODELS) {
            try {
              const r = await env.AI.run(model, { messages: msgs, max_tokens: 512 });
              if (r && r.response) { reply = r.response; used = model; break; }
            } catch (err) { lastErr = (lastErr ? lastErr + " | " : "") + String(err); }
          }
        }
        if (!reply) return jsonResp({ error: "Không có model khả dụng. " + lastErr }, 502);
        return jsonResp({ reply, model: used });
      } catch (e) { return jsonResp({ error: String(e) }, 500); }
    }


    // --- APP XEP LASER: kich hoat key (khoa vao may) ---
    if (url.pathname === "/api/laser-activate" && request.method === "POST") {
      try {
        const b = await request.json();
        const key = String(b.key || "").trim().toUpperCase();
        const device = String(b.device || "").trim();
        const name = String(b.name || "").slice(0, 60);
        if (!key || !device) return jsonResp({ ok: false, reason: "Thieu key hoac ma may." }, 400);
        if (!env.GH_TOKEN) return jsonResp({ ok: false, reason: "May chu chua cau hinh." }, 503);
        const d = await sha256hex(device);
        const res = await ghUpdate(env, LASER_LIC, "appdata", (store) => {
          if (!Array.isArray(store.keys)) store.keys = [];
          const k = store.keys.find((x) => x && String(x.key).toUpperCase() === key);
          if (!k) return { reject: jsonResp({ ok: false, reason: "Key khong dung." }) };
          if (k.active === false) return { reject: jsonResp({ ok: false, reason: "Key da bi thu hoi." }) };
          if (!Array.isArray(k.devices)) k.devices = [];
          const max = Number(k.maxDevices || 1);
          const has = k.devices.find((dev) => dev && dev.d === d);
          if (!has) {
            if (k.devices.length >= max) return { reject: jsonResp({ ok: false, reason: "Key da dung het so may cho phep (" + max + "). Bao anh Duy." }) };
            k.devices.push({ d, name, ts: new Date().toISOString() });
          } else { has.name = name; has.ts = new Date().toISOString(); }
          return { msg: "laser: kich hoat " + key + " (" + name + ")", result: { label: k.label || "" } };
        });
        if (res.rejected) return res.rejected;
        if (!res.ok) return jsonResp({ ok: false, reason: "Loi luu kich hoat, thu lai." }, 500);
        const token = await signLaser(env, device, key);
        try { ctx && ctx.waitUntil && ctx.waitUntil(auditLog(env, "laser:" + name, "Kich hoat app laser", key)); } catch (e) {}
        return jsonResp({ ok: true, token, label: (res.result && res.result.label) || "" });
      } catch (e) { return jsonResp({ ok: false, reason: String(e) }, 500); }
    }

    // --- APP XEP LASER: QUAN LY (chu xem may dang hoat dong, thu hoi) ---
    if (url.pathname === "/api/laser-admin" && request.method === "POST") {
      try {
        const b = await request.json();
        const h = String((b && b.h) || "");
        const OWNER = "af73d138ab9df9df801490bd5beef3426d98616e21a79207a8fc18d9f7f1bf63"; // sha256("oven2026")
        const ok = (h === OWNER) || (!!env.OWNER_PW_HASH && h === env.OWNER_PW_HASH) || (!!env.LASER_ADMIN_HASH && h === env.LASER_ADMIN_HASH);
        if (!ok) return jsonResp({ ok: false, reason: "Sai mat khau quan ly." }, 401);
        if (!env.GH_TOKEN) return jsonResp({ ok: false, reason: "May chu chua cau hinh." }, 503);
        const act = (b && b.act) || "list";
        if (act === "list") {
          const r = await ghGetJson(env, LASER_LIC, "appdata");
          const keys = (r.obj && Array.isArray(r.obj.keys)) ? r.obj.keys : [];
          const out = keys.map((k) => {
            const rev = Array.isArray(k.revoked) ? k.revoked : [];
            const devs = (Array.isArray(k.devices) ? k.devices : []).map((d) => ({ d: d.d, name: d.name || "", ts: d.ts || "", revoked: rev.indexOf(d.d) !== -1 }));
            return { key: k.key, label: k.label || "", active: k.active !== false, maxDevices: Number(k.maxDevices || 1), used: devs.filter((d) => !d.revoked).length, devices: devs };
          });
          const totalActive = out.reduce((s, k) => s + k.used, 0);
          return jsonResp({ ok: true, keys: out, totalActive, updatedAt: (r.obj && r.obj.updatedAt) || "" });
        }
        if (act === "revoke" || act === "free") {
          const key = String(b.key || "").toUpperCase();
          const dhash = String(b.d || "");
          const res = await ghUpdate(env, LASER_LIC, "appdata", (store) => {
            const k = (Array.isArray(store.keys) ? store.keys : []).find((x) => x && String(x.key).toUpperCase() === key);
            if (!k) return { reject: jsonResp({ ok: false, reason: "Khong thay key." }) };
            if (act === "revoke") { k.revoked = Array.isArray(k.revoked) ? k.revoked : []; if (k.revoked.indexOf(dhash) === -1) k.revoked.push(dhash); }
            k.devices = (Array.isArray(k.devices) ? k.devices : []).filter((d) => d && d.d !== dhash);
            return { msg: "laser-admin: " + act + " " + key, result: {} };
          });
          if (res.rejected) return res.rejected;
          return jsonResp({ ok: !!res.ok });
        }
        return jsonResp({ ok: false, reason: "act?" }, 400);
      } catch (e) { return jsonResp({ ok: false, reason: String(e) }, 500); }
    }

    // --- APP XEP LASER: AI (chat / phan tich / nhan dien / giai thich loi) ---
    if (url.pathname === "/api/laser-ai" && request.method === "POST") {
      try {
        if (!env.ANTHROPIC_API_KEY) return jsonResp({ ok: false, reason: "May chu chua cau hinh AI." }, 503);
        const b = await request.json();
        const device = String(b.device || "").trim();
        const v = await verifyLaser(env, String(b.token || ""), device);
        if (!v) return jsonResp({ ok: false, reason: "Chua kich hoat hoac token sai." }, 401);
        if (!(await laserDeviceOk(env, device, v.key))) return jsonResp({ ok: false, reason: "May khong duoc phep (key da bi thu hoi)." }, 403);
        const mode = String(b.mode || "chat");
        const context = (b.context && typeof b.context === "object") ? b.context : {};
        const hist = Array.isArray(b.messages) ? b.messages : [];
        let ctxStr = "";
        if (context.report) ctxStr = "Ket qua xep gan nhat (JSON): " + JSON.stringify(context.report).slice(0, 1500);
        let sysContent = LASER_SYS;
        const msgs = [{ role: "system", content: sysContent }];
        if (mode === "analyze") {
          msgs.push({ role: "user", content: "Phan tich ket qua xep tam sau, goi y tiet kiem ton va canh bao tam phi, tieng Viet ngan gon gach dau dong. " + ctxStr });
        } else if (mode === "explain") {
          const err = (hist[0] && hist[0].content) || JSON.stringify(context);
          msgs.push({ role: "user", content: "Phan mem bao loi sau khi xep tam. Giai thich vi sao + cach sua, tieng Viet de hieu cho tho co khi:\n" + String(err).slice(0, 800) });
        } else if (mode === "detect") {
          msgs.push({ role: "user", content: "Cac nhom do day doc tu ban ve (JSON): " + JSON.stringify(context.groups || []) + ". Voi moi nhom suy ra vat lieu (SAT hoac INOX) va do day mm (1 trong: 0.8,1.0,1.2,1.4,1.5,2.0,2.5,3.0,4.0,5.0). Nhan ghi INOX/SUS -> INOX, mac dinh SAT. CHI tra ve JSON array [{\"index\":0,\"material\":\"SAT\",\"thickness\":\"2.0\"}], khong giai thich." });
        } else if (mode === "solve") {
          msgs.push({ role: "user", content: "Day la ket qua phan tich + canh bao khi xep tam cat laser (JSON): " + JSON.stringify(context.analysis || {}).slice(0, 2200) + ". Dong vai ky su co khi, de xuat CACH SUA cho TUNG canh bao, tieng Viet NGAN GON, gach dau dong. Voi MOI loi neu ro: TEN chi tiet (neu co) + kich thuoc, VI SAO loi (vd cat se mat chi tiet / khong lay duoc phoi / qua to / phi ton), MUC DO (Nghiem trong/Trung binh/Nhe), va GIAI PHAP cu the. RANG BUOC BAT BUOC: TUYET DOI KHONG duoc thu nho hay thay doi kich thuoc chi tiet; moi cach sua phai GIU NGUYEN kich thuoc (vd: tang kho tam ton, xoay mieng, tach mieng to ra cat rieng, xoa net vun thua, kiem tra/noi net ho trong CAD). Neu la loi PHI TON ton thi danh gia muc nghiem trong va goi y giam phi. KET THUC bang cau nhac: nhan vien xem lai va xac nhan truoc khi ap dung." });
        } else if (mode === "deepread") {
          msgs.push({ role: "user", content: "Day la ket qua phan tich ban ve (JSON): " + JSON.stringify(context.analysis || {}).slice(0, 1800) + ". Hay DOC SAU va tu van tieng Viet NGAN GON (gach dau dong): chat luong ban ve de cat laser; nhom nao xep se phi ton va vi sao; co nen dung Deepnest khong; co dau hieu loi don vi / net ho / chi tiet qua to khong; cach toi uu tiet kiem ton." });
        } else {
          if (ctxStr) sysContent += "\n\n[Boi canh] " + ctxStr;
          msgs[0].content = sysContent;
          hist.slice(-8).forEach((m) => { if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") msgs.push({ role: m.role, content: m.content.slice(0, 1500) }); });
        }
        let reply = "";
        try { reply = await callClaude(env, msgs); } catch (e) { return jsonResp({ ok: false, reason: "AI loi: " + String(e).slice(0, 150) }, 502); }
        if (mode === "detect") {
          let data = []; try { const m = reply.match(/\[[\s\S]*\]/); if (m) data = JSON.parse(m[0]); } catch (e) {}
          return jsonResp({ ok: true, data, reply });
        }
        return jsonResp({ ok: true, reply });
      } catch (e) { return jsonResp({ ok: false, reason: String(e) }, 500); }
    }


    // --- APP XEP LASER: thu vien part + phien lam viec (luu may chu) ---
    if (url.pathname === "/api/laser-lib" && request.method === "POST") {
      try {
        const b = await request.json();
        const device = String(b.device || "").trim();
        const v = await verifyLaser(env, String(b.token || ""), device);
        if (!v) return jsonResp({ ok: false, reason: "Chua kich hoat." }, 401);
        if (!(await laserDeviceOk(env, device, v.key))) return jsonResp({ ok: false, reason: "May khong duoc phep." }, 403);
        if (!env.GH_TOKEN) return jsonResp({ ok: false, reason: "May chu chua cau hinh." }, 503);
        const act = String(b.action || "get");
        if (act === "get") {
          const r = await ghGetJson(env, "laser-library.json", "appdata");
          const data = (r.obj && typeof r.obj === "object") ? r.obj : { parts: [], sessions: [], rev: 0 };
          return jsonResp({ ok: true, data });
        }
        if (act === "save") {
          const incoming = (b.data && typeof b.data === "object") ? b.data : null;
          if (!incoming) return jsonResp({ ok: false, reason: "Thieu data." }, 400);
          const baseRev = Number(b.baseRev || 0);
          const res = await ghUpdate(env, "laser-library.json", "appdata", (store) => {
            const curRev = Number(store.rev || 0);
            if (Array.isArray(store.parts) && curRev !== baseRev) {
              return { reject: jsonResp({ ok: false, conflict: true, data: store }) };
            }
            store.parts = Array.isArray(incoming.parts) ? incoming.parts : [];
            store.sessions = Array.isArray(incoming.sessions) ? incoming.sessions : [];
            return { msg: "laser-lib: cap nhat thu vien (" + (v.key) + ")" };
          });
          if (res.rejected) return res.rejected;
          if (!res.ok) return jsonResp({ ok: false, reason: "Loi luu, thu lai." }, 500);
          return jsonResp({ ok: true, data: res.store });
        }
        return jsonResp({ ok: false, reason: "action khong hop le." }, 400);
      } catch (e) { return jsonResp({ ok: false, reason: String(e) }, 500); }
    }

    // --- APP XEP LASER: luu PHIEN (zip) len Google Drive cua Duy (OAuth refresh token) ---
    if (url.pathname === "/api/laser-drive" && request.method === "POST") {
      try {
        const b = await request.json();
        const device = String(b.device || "").trim();
        const v = await verifyLaser(env, String(b.token || ""), device);
        if (!v) return jsonResp({ ok: false, reason: "Chua kich hoat." }, 401);
        if (!(await laserDeviceOk(env, device, v.key))) return jsonResp({ ok: false, reason: "May khong duoc phep." }, 403);
        if (!env.GOOGLE_REFRESH_TOKEN || !env.GOOGLE_CLIENT_SECRET) return jsonResp({ ok: true, not_configured: true });
        const tok = await gdAccessToken(env);
        if (!tok) return jsonResp({ ok: false, error: "Drive: khong lay duoc token (kiem tra GOOGLE_REFRESH_TOKEN/SECRET)." }, 502);
        const root = await gdRootFolder(tok, env);   // thu muc DuyNestPro trong My Drive (tu tao)
        if (!root) return jsonResp({ ok: false, error: "Khong tao duoc thu muc goc Drive." }, 502);
        const product = String(b.product || "Phien").replace(/[\/\\:*?"<>|]/g, "-").slice(0, 80) || "Phien";
        const fname = String(b.fname || "phien.zip").replace(/[\/\\:*?"<>|]/g, "-").slice(0, 120);
        const zipB64 = String(b.zip || "");
        if (!zipB64) return jsonResp({ ok: false, error: "Thieu du lieu." }, 400);
        let bytes; try {
          const bin = atob(zipB64); bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch (e) { return jsonResp({ ok: false, error: "Du lieu zip loi." }, 400); }
        const sub = await gdFindOrCreateFolder(tok, product, root);   // gom theo TEN FILE/san pham
        if (!sub) return jsonResp({ ok: false, error: "Khong tao duoc thu muc Drive." }, 502);
        const up = await gdUploadFile(tok, fname, sub, bytes, "application/zip");
        if (up && up.id) {
          try { ctx && ctx.waitUntil && ctx.waitUntil(auditLog(env, "laser", "Luu phien xep Drive", product + " / " + fname)); } catch (e) {}
          return jsonResp({ ok: true, id: up.id });
        }
        return jsonResp({ ok: false, error: "Upload that bai: " + JSON.stringify(up || {}).slice(0, 200) }, 502);
      } catch (e) { return jsonResp({ ok: false, error: String(e) }, 500); }
    }

    // --- APP XEP LASER: CAP QUYEN Drive 1 lan (chu bam link -> dong y -> hien refresh token) ---
    if (url.pathname === "/api/laser-drive-auth") {
      const cid = env.GOOGLE_CLIENT_ID || GD_CLIENT_ID_DEFAULT;
      const redirect = url.origin + "/api/laser-drive-auth";
      const code = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      const H = (body) => new Response("<!doctype html><html lang=vi><head><meta charset=utf-8>" +
        "<meta name=viewport content='width=device-width,initial-scale=1'><title>Cấp quyền Google Drive</title>" +
        "<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#15110e;color:#eee;" +
        "max-width:640px;margin:30px auto;padding:0 18px;line-height:1.6}h2{color:#ff7a45}a.btn,button{background:#e0431f;" +
        "color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:16px;text-decoration:none;display:inline-block;cursor:pointer}" +
        "code,textarea{background:#241c17;border:1px solid #5a3;border-radius:8px;color:#9f9;padding:12px;" +
        "width:100%;box-sizing:border-box;font-size:13px;word-break:break-all}ol{padding-left:20px}</style></head><body>" +
        body + "</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } });
      if (err) return H("<h2>Chưa cấp quyền</h2><p>Google báo: " + String(err).slice(0,200) +
        "</p><p><a class=btn href='" + redirect + "'>Thử lại</a></p>");
      if (!code) {
        const auth = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + encodeURIComponent(cid) +
          "&redirect_uri=" + encodeURIComponent(redirect) + "&response_type=code" +
          "&scope=" + encodeURIComponent("https://www.googleapis.com/auth/drive.file") +
          "&access_type=offline&prompt=consent";
        return H("<h2>Bật lưu phiên xếp lên Google Drive</h2>" +
          "<p>Đăng nhập đúng tài khoản <b>vinhduy@duyoven.com</b> rồi bấm nút dưới để CHO PHÉP phần mềm " +
          "lưu file phiên xếp vào Drive của bạn.</p><p><a class=btn href='" + auth + "'>✅ Cho phép Google Drive</a></p>" +
          "<p style='color:#888;font-size:13px'>Chỉ cấp quyền với các file phần mềm tạo ra (drive.file). Bạn có thể thu hồi bất cứ lúc nào trong Google Account.</p>");
      }
      const cs = env.GOOGLE_CLIENT_SECRET;
      if (!cs) return H("<h2>Thiếu cấu hình</h2><p>Chưa đặt <code>GOOGLE_CLIENT_SECRET</code> trong Cloudflare. " +
        "Đặt xong rồi mở lại link này.</p>");
      try {
        const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=authorization_code&code=" + encodeURIComponent(code) +
            "&client_id=" + encodeURIComponent(cid) + "&client_secret=" + encodeURIComponent(cs) +
            "&redirect_uri=" + encodeURIComponent(redirect) });
        const j = await r.json();
        if (!j.refresh_token) return H("<h2>Chưa lấy được mã</h2><p>Google trả về: <code>" +
          JSON.stringify(j).slice(0, 300) + "</code></p><p>Thử lại: <a class=btn href='" + redirect + "'>Cấp quyền lại</a> " +
          "(nếu đã cấp trước đó, vào Google Account → Bảo mật → Quyền của bên thứ ba → gỡ rồi cấp lại để nhận mã mới).</p>");
        return H("<h2>✅ Thành công! Còn 1 bước cuối</h2>" +
          "<p>Copy đoạn mã dưới đây, vào <b>Cloudflare → Worker → Settings → Variables</b>, thêm <b>Secret</b> tên " +
          "<code>GOOGLE_REFRESH_TOKEN</code> với giá trị là đoạn này:</p>" +
          "<textarea rows=4 readonly onclick='this.select()'>" + j.refresh_token + "</textarea>" +
          "<p style='color:#888;font-size:13px'>Giữ kín đoạn mã này (như mật khẩu). Sau khi lưu vào Cloudflare là xong — mọi máy nhân viên sẽ tự lưu phiên về Drive của bạn.</p>");
      } catch (e) {
        return H("<h2>Lỗi</h2><p><code>" + String(e).slice(0, 200) + "</code></p>");
      }
    }

    // --- AI: trợ lý báo giá nội bộ (chỉ nhân viên) ---
    if (url.pathname === "/api/bao-gia" && request.method === "POST") {
      try {
        if (!(await authUser(request, env))) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
        if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: "Chưa cấu hình ANTHROPIC_API_KEY." }, 503);
        const body = await request.json();
        const brief = String(body.brief || "").slice(0, 2000);
        const hist = Array.isArray(body.messages) ? body.messages : [];
        const conv = [];
        hist.slice(-8).forEach((m) => {
          if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            conv.push({ role: m.role, content: m.content.slice(0, 2000) });
        });
        if (brief) conv.push({ role: "user", content: brief });
        if (!conv.length) return jsonResp({ error: "Thiếu nội dung." }, 400);
        const model = env.CLAUDE_MODEL_QUOTE || "claude-haiku-4-5";
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 1200, system: QUOTE_SYS, messages: conv }),
        });
        if (!r.ok) return jsonResp({ error: "anthropic " + r.status + " " + (await r.text()).slice(0, 200) }, 502);
        const j = await r.json();
        const txt = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
        let data = null;
        try { data = JSON.parse(txt); } catch (e) { const mm = txt.match(/\{[\s\S]*\}/); if (mm) { try { data = JSON.parse(mm[0]); } catch (e2) {} } }
        if (!data || typeof data !== "object") return jsonResp({ reply: txt || "Xin lỗi, chưa tạo được gợi ý.", items: [] });
        const items = Array.isArray(data.items) ? data.items.slice(0, 20).map((it) => ({
          n: String(it.n || it.name || "").slice(0, 120),
          desc: String(it.desc || "").slice(0, 1000),
          unit: String(it.unit || "Cái").slice(0, 20),
          p: Math.max(0, Math.round(Number(it.p || it.price || 0)) || 0),
          q: Math.max(1, Math.round(Number(it.q || it.qty || 1)) || 1),
        })).filter((it) => it.n) : [];
        const c = (data.cust && typeof data.cust === "object") ? data.cust : {};
        const cust = {
          name: String(c.name || "").slice(0, 120),
          phone: String(c.phone || "").slice(0, 40),
          contact: String(c.contact || "").slice(0, 120),
          email: String(c.email || "").slice(0, 120),
          company: String(c.company || "").slice(0, 160),
          tax: String(c.tax || "").slice(0, 40),
          addr: String(c.addr || "").slice(0, 300),
        };
        return jsonResp({
          reply: String(data.reply || "").slice(0, 2000),
          items,
          cust,
          note: String(data.note || "").slice(0, 600),
          deliv: String(data.deliv || "").slice(0, 120),
          warr: String(data.warr || "").slice(0, 80),
          valid: parseInt(data.valid) || 0,
          model,
        });
      } catch (e) { return jsonResp({ error: String(e) }, 500); }
    }

    // --- AI: trợ lý lập hợp đồng (chỉ nhân viên) ---
    if (url.pathname === "/api/hop-dong" && request.method === "POST") {
      try {
        if (!(await authUser(request, env))) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
        if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: "Chưa cấu hình ANTHROPIC_API_KEY." }, 503);
        const body = await request.json();
        const brief = String(body.brief || "").slice(0, 3000);
        const hist = Array.isArray(body.messages) ? body.messages : [];
        const conv = [];
        hist.slice(-8).forEach((m) => {
          if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            conv.push({ role: m.role, content: m.content.slice(0, 3000) });
        });
        if (brief) conv.push({ role: "user", content: brief });
        if (!conv.length) return jsonResp({ error: "Thiếu nội dung." }, 400);
        const model = env.CLAUDE_MODEL_QUOTE || "claude-haiku-4-5";
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 1600, system: CONTRACT_SYS, messages: conv }),
        });
        if (!r.ok) return jsonResp({ error: "anthropic " + r.status + " " + (await r.text()).slice(0, 200) }, 502);
        const j = await r.json();
        const txt = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
        let data = null;
        try { data = JSON.parse(txt); } catch (e) { const mm = txt.match(/\{[\s\S]*\}/); if (mm) { try { data = JSON.parse(mm[0]); } catch (e2) {} } }
        if (!data || typeof data !== "object") return jsonResp({ reply: txt || "Chưa tạo được gợi ý.", items: [] });
        const party = (p) => {
          p = (p && typeof p === "object") ? p : {};
          return {
            name: String(p.name || "").slice(0, 200), addr: String(p.addr || "").slice(0, 300),
            phone: String(p.phone || "").slice(0, 40), email: String(p.email || "").slice(0, 120),
            tax: String(p.tax || "").slice(0, 40), rep: String(p.rep || "").slice(0, 120),
            title: String(p.title || "").slice(0, 60), bank: String(p.bank || "").slice(0, 200),
          };
        };
        const items = Array.isArray(data.items) ? data.items.slice(0, 30).map((it) => ({
          n: String(it.n || it.name || "").slice(0, 200), desc: String(it.desc || "").slice(0, 800), unit: String(it.unit || "bộ").slice(0, 20),
          p: Math.max(0, Math.round(Number(it.p || it.price || 0)) || 0), q: Math.max(1, Math.round(Number(it.q || it.qty || 1)) || 1),
        })).filter((it) => it.n) : [];
        return jsonResp({
          reply: String(data.reply || "").slice(0, 2000), items,
          A: party(data.A), B: party(data.B),
          project: String(data.project || "").slice(0, 300),
          delivery: String(data.delivery || "").slice(0, 1000),
          payment: String(data.payment || "").slice(0, 1500),
          warr: parseInt(data.warr) || 0, model,
        });
      } catch (e) { return jsonResp({ error: String(e) }, 500); }
    }

    // --- AI: import báo giá cũ từ ảnh/PDF (chỉ nhân viên) ---
    if (url.pathname === "/api/bao-gia-import" && request.method === "POST") {
      try {
        if (!(await authUser(request, env))) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
        if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: "Chưa cấu hình ANTHROPIC_API_KEY." }, 503);
        const body = await request.json();
        const file = String(body.file || "");
        const note = String(body.text || "").slice(0, 500);
        const mm = file.match(/^data:([^;]+);base64,(.+)$/);
        if (!mm) return jsonResp({ error: "File không hợp lệ." }, 400);
        const mime = mm[1], data = mm[2];
        let block;
        if (mime === "application/pdf") block = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
        else if (mime.indexOf("image/") === 0) block = { type: "image", source: { type: "base64", media_type: mime, data } };
        else return jsonResp({ error: "Chỉ nhận ảnh hoặc PDF." }, 400);
        const content = [block, { type: "text", text: "Đây là một BÁO GIÁ CŨ. Hãy đọc và trích xuất chính xác thành JSON theo đúng cấu trúc đã hướng dẫn." + (note ? (" Lưu ý thêm từ nhân viên: " + note) : "") }];
        const model = env.CLAUDE_MODEL_IMPORT || env.CLAUDE_MODEL_QUOTE || "claude-haiku-4-5";
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 1600, system: IMPORT_SYS, messages: [{ role: "user", content }] }),
        });
        if (!r.ok) return jsonResp({ error: "anthropic " + r.status + " " + (await r.text()).slice(0, 200) }, 502);
        const j = await r.json();
        const txt = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
        let d = null;
        try { d = JSON.parse(txt); } catch (e) { const x = txt.match(/\{[\s\S]*\}/); if (x) { try { d = JSON.parse(x[0]); } catch (e2) {} } }
        if (!d || typeof d !== "object") return jsonResp({ reply: txt || "Chưa đọc được báo giá.", items: [] });
        const items = Array.isArray(d.items) ? d.items.slice(0, 30).map((it) => ({
          n: String(it.n || it.name || "").slice(0, 200), desc: String(it.desc || "").slice(0, 1200), unit: String(it.unit || "Cái").slice(0, 20),
          p: Math.max(0, Math.round(Number(it.p || it.price || 0)) || 0), q: Math.max(1, Math.round(Number(it.q || it.qty || 1)) || 1),
        })).filter((it) => it.n) : [];
        const c = (d.cust && typeof d.cust === "object") ? d.cust : {};
        return jsonResp({
          reply: String(d.reply || "").slice(0, 2000), items,
          cust: {
            name: String(c.name || "").slice(0, 120), phone: String(c.phone || "").slice(0, 40), contact: String(c.contact || "").slice(0, 120),
            email: String(c.email || "").slice(0, 120), company: String(c.company || "").slice(0, 160), tax: String(c.tax || "").slice(0, 40), addr: String(c.addr || "").slice(0, 300),
          },
          note: String(d.note || "").slice(0, 600), deliv: String(d.deliv || "").slice(0, 120), warr: String(d.warr || "").slice(0, 80), valid: parseInt(d.valid) || 0, model,
        });
      } catch (e) { return jsonResp({ error: String(e) }, 500); }
    }

    // --- AI: dịch nội dung trang (batch) ---
    if (url.pathname === "/api/translate" && request.method === "POST") {
      try {
        const body = await request.json();
        const texts = Array.isArray(body.texts) ? body.texts.slice(0, 60).map((t) => String(t)) : [];
        const lang = String(body.lang || "en");
        if (!texts.length) return jsonResp({ translations: [] });
        if (!LANG_NAMES[lang]) return jsonResp({ translations: texts });
        // Cache edge (miễn phí, chia sẻ giữa các khách) theo hash của nội dung + ngôn ngữ.
        const cache = caches.default;
        const ckey = new Request("https://tr.duyoven.vn/t?l=" + lang + "&h=" + (await sha1hex(JSON.stringify(texts))));
        const hit = await cache.match(ckey);
        if (hit) return hit;
        if (!env.ANTHROPIC_API_KEY) return jsonResp({ translations: texts });
        const sys =
          "You are a professional UI/website translator for Duy's Oven, a premium Vietnamese charcoal BBQ oven brand. " +
          "Translate each Vietnamese string in the input JSON array into " + LANG_NAMES[lang] + ". " +
          "Rules: keep it natural, concise and on-brand for a product website; preserve numbers, prices, units, emojis exactly; " +
          "keep brand/product names unchanged (Duy's Oven, Pantina, Hybrid, Offset, Fastgrill, Argentina Grill, Eco); " +
          "KEY TERM: 'tách khói' is the brand's flagship concept meaning SMOKELESS (the smoke is separated away) — translate it with the natural word for 'smokeless' in the target language, NEVER as 'offset'; 'lò xông khói' = smoker; 'lò nướng' = grill/oven; " +
          "do not translate phone numbers or email addresses; do not add quotes, notes or extra text. " +
          "Return ONLY a JSON array of translated strings with the SAME length and order as the input.";
        let arr = null, lastErr = "";
        for (const model of [env.CLAUDE_MODEL || "claude-haiku-4-5", "claude-haiku-4-5"]) {
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model, max_tokens: 4096, system: sys, messages: [{ role: "user", content: JSON.stringify(texts) }] }),
            });
            if (!r.ok) { lastErr = "anthropic " + r.status; continue; }
            const j = await r.json();
            let txt = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
            try { arr = JSON.parse(txt); } catch (e) { const m = txt.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : null; }
            if (Array.isArray(arr) && arr.length === texts.length) break;
            arr = null;
          } catch (e) { lastErr = String(e); }
        }
        if (!Array.isArray(arr) || arr.length !== texts.length) arr = texts;
        const resp = new Response(JSON.stringify({ translations: arr }), {
          headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "public, max-age=2592000" },
        });
        if (arr !== texts) { try { await cache.put(ckey, resp.clone()); } catch (e) {} }
        return resp;
      } catch (e) { return jsonResp({ error: String(e) }, 500); }
    }

    // --- Xác thực 2 lớp Google Authenticator (TOTP) cho khu Quản Lý ---
    if (url.pathname === "/api/totp" && request.method === "POST") {
      if (!env.TOTP_SECRET) return jsonResp({ notconfigured: true });
      let tb; try { tb = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
      const code = String((tb && tb.code) || "").replace(/\D/g, "");
      if (code.length < 6) return jsonResp({ error: "Thiếu mã 6 số." }, 400);
      const ok = await verifyTOTP(env.TOTP_SECRET, code);
      return jsonResp(ok ? { ok: true } : { error: "Mã không đúng hoặc đã hết hạn." }, ok ? 200 : 401);
    }

    // --- Đăng nhập Google cho khu Quản Lý: verify ID token ở máy chủ + allowlist ---
    if (url.pathname === "/api/glogin" && request.method === "POST") {
      let gb; try { gb = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
      const cred = gb && gb.credential;
      if (!cred) return jsonResp({ error: "Thiếu credential." }, 400);
      const CLIENT_ID = env.GOOGLE_CLIENT_ID || "692061670720-n836gc68b3k5q5ceq8jb8bcb7nvt50on.apps.googleusercontent.com";
      let info;
      try {
        const gr = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(cred));
        if (!gr.ok) return jsonResp({ error: "Token Google không hợp lệ." }, 401);
        info = await gr.json();
      } catch (e) { return jsonResp({ error: "Lỗi xác minh: " + e.message }, 502); }
      if (info.aud !== CLIENT_ID) return jsonResp({ error: "Sai ứng dụng (aud)." }, 401);
      if (String(info.email_verified) !== "true") return jsonResp({ error: "Email chưa xác minh." }, 401);
      const allowed = (env.GLOGIN_ALLOWED || "vinhduynguyen@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const gemail = (info.email || "").toLowerCase();
      // 1) Xác định vai trò + mục được phép
      let role = null, mods = null;
      if (allowed.indexOf(gemail) !== -1) { role = "owner"; mods = "all"; }
      else {
        try {
          const a = await env.ASSETS.fetch(new URL("/site-content.json", url).toString());
          if (a.ok) { const c = await a.json(); const eh = await sha256hex(gemail); const entry = (Array.isArray(c.staff) ? c.staff : []).find((s) => s && s.hash === eh); if (entry) { role = "staff"; mods = Array.isArray(entry.mods) ? entry.mods : []; } }
        } catch (e) {}
      }
      if (!role) return jsonResp({ error: "Email " + gemail + " chưa được cấp quyền vào Quản Lý." }, 403);
      // 2) Khoá thiết bị: chỉ máy tin cậy mới được vào (chặn hack email từ máy lạ)
      const gdev = (gb && gb.device) ? String(gb.device) : "";
      const gate = await deviceGate(env, request, gemail, gdev);
      if (gate.state !== "ok") return jsonResp({ ok: false, needApproval: true, email: info.email, role: role }, 200);
      if (ctx && ctx.waitUntil) ctx.waitUntil(auditLog(env, gemail, "Đăng nhập", "Google · " + uaLabel(request)));
      return await loginResponse({ ok: true, email: info.email, name: info.name || "", role: role, mods: mods }, gemail, env);
    }

    // --- Đăng nhập bằng mật khẩu chủ (dự phòng) → cũng cấp phiên cookie để dùng API ---
    if (url.pathname === "/api/plogin" && request.method === "POST") {
      let pb; try { pb = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
      const h = String((pb && pb.h) || "");
      if (!h) return jsonResp({ error: "Thiếu mật khẩu." }, 400);
      const DEFAULT_OWNER_HASH = "af73d138ab9df9df801490bd5beef3426d98616e21a79207a8fc18d9f7f1bf63"; // sha256("oven2026")
      let ok = (h === DEFAULT_OWNER_HASH) || (!!env.OWNER_PW_HASH && h === env.OWNER_PW_HASH);
      if (!ok) { try { const a = await env.ASSETS.fetch(new URL("/site-content.json", url).toString()); if (a.ok) { const c = await a.json(); if (c && c.settings && c.settings.ownerPwHash && h === c.settings.ownerPwHash) ok = true; } } catch (e) {} }
      if (!ok) return jsonResp({ error: "Sai mật khẩu." }, 401);
      // Mật khẩu chủ = lối vào dự phòng (break-glass), bỏ qua khoá thiết bị
      if (ctx && ctx.waitUntil) ctx.waitUntil(auditLog(env, "chu@duyoven", "Đăng nhập", "Mật khẩu chủ · " + uaLabel(request)));
      return await loginResponse({ ok: true, role: "owner", mods: "all" }, "chu@duyoven", env);
    }

    // --- Quản lý thiết bị tin cậy (chỉ chủ): list / approve / reject / remove ---
    if (url.pathname === "/api/device" && request.method === "POST") {
      const who = await authUser(request, env);
      if (!who) return jsonResp({ error: "Chưa đăng nhập." }, 401);
      if (!isOwnerUser(who, env)) return jsonResp({ error: "Chỉ chủ được quản thiết bị." }, 403);
      if (!env.GH_TOKEN) return jsonResp({ error: "Chưa cấu hình GH_TOKEN." }, 503);
      let b; try { b = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
      const act = b && b.act;
      let read; try { read = await ghGetJson(env, DEVFILE); } catch (e) { return jsonResp({ error: "Đọc thiết bị lỗi." }, 502); }
      let store = read.obj || { trusted: [], pending: [] };
      store.trusted = Array.isArray(store.trusted) ? store.trusted : [];
      store.pending = Array.isArray(store.pending) ? store.pending : [];
      if (act === "list") return jsonResp({ ok: true, trusted: store.trusted, pending: store.pending });
      if (act === "approve") { const i = store.pending.findIndex((p) => p && p.u === b.u && p.d === b.d); if (i >= 0) { const p = store.pending.splice(i, 1)[0]; store.trusted.push({ u: p.u, d: p.d, label: p.label || "Máy", email: p.email || "", ts: new Date().toISOString() }); } }
      else if (act === "reject") store.pending = store.pending.filter((p) => !(p && p.u === b.u && p.d === b.d));
      else if (act === "remove") store.trusted = store.trusted.filter((t) => !(t && t.u === b.u && t.d === b.d));
      else return jsonResp({ error: "act?" }, 400);
      const okw = await ghPutJson(env, DEVFILE, store, "device: " + act + " (" + who + ")", read.sha);
      if (!okw) return jsonResp({ error: "Lưu thiết bị lỗi." }, 502);
      return jsonResp({ ok: true, trusted: store.trusted, pending: store.pending });
    }

    // --- Kho chung (đồng bộ nhiều máy + backup): lưu trên nhánh "appdata" để KHÔNG kích hoạt build ---
    if (url.pathname === "/api/kho") {
      const who = await authUser(request, env);
      if (!who) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
      if (!env.GH_TOKEN) return jsonResp({ error: "Chưa cấu hình GH_TOKEN." }, 503);
      const BR = "appdata", FILE = "kho-data.json";
      if (request.method === "GET") {
        let r; try { r = await ghGetJson(env, FILE, BR); } catch (e) { return jsonResp({ error: "Đọc kho lỗi." }, 502); }
        return jsonResp({ ok: true, data: r.obj || {} });
      }
      if (request.method === "POST") {
        let body; try { body = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
        const d = (body && body.data) ? body.data : (body || {});
        const r = await ghUpdate(env, FILE, BR, (store) => {
          // kiểm tra phiên bản (rev): nếu người khác vừa lưu → báo xung đột, KHÔNG ghi đè
          if (body.baseRev != null && Number(body.baseRev) !== (Number(store.rev) || 0)) return { reject: { ok: false, conflict: true, data: store } };
          ["inv", "log", "phieuxuat", "phieunhap"].forEach((k) => { if (d[k] !== undefined) store[k] = d[k]; });
          store.by = who;
          return { msg: "kho: cap nhat (" + who + ")" };
        });
        if (r.rejected) return jsonResp(r.rejected, 200);
        if (r.error) return jsonResp({ error: "Lưu kho lỗi." }, 502);
        return jsonResp({ ok: true, rev: (r.store && r.store.rev) || 0, updatedAt: r.store && r.store.updatedAt });
      }
      return jsonResp({ error: "method" }, 405);
    }

    // --- Nhật ký hành động: nhân viên ghi (POST), chỉ chủ xem (GET) ---
    if (url.pathname === "/api/audit") {
      const who = await authUser(request, env);
      if (!who) return jsonResp({ error: "Chưa đăng nhập." }, 401);
      if (request.method === "POST") {
        let b; try { b = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
        ctx && ctx.waitUntil ? ctx.waitUntil(auditLog(env, who, b && b.action, b && b.detail)) : await auditLog(env, who, b && b.action, b && b.detail);
        return jsonResp({ ok: true });
      }
      if (request.method === "GET") {
        if (!isOwnerUser(who, env)) return jsonResp({ error: "Chỉ chủ xem được nhật ký." }, 403);
        let r; try { r = await ghGetJson(env, AUDITFILE, "appdata"); } catch (e) { return jsonResp({ error: "Đọc nhật ký lỗi." }, 502); }
        const arr = (r.obj && Array.isArray(r.obj.entries)) ? r.obj.entries : [];
        return jsonResp({ ok: true, entries: arr.slice(0, 300) });
      }
      return jsonResp({ error: "method" }, 405);
    }

    // --- Vật tư đầu vào (materials) + định mức (bom) — đồng bộ nhánh appdata ---
    if (url.pathname === "/api/vattu") {
      const who = await authUser(request, env);
      if (!who) return jsonResp({ error: "Chưa đăng nhập." }, 401);
      if (!env.GH_TOKEN) return jsonResp({ error: "Chưa cấu hình GH_TOKEN." }, 503);
      const VBR = "appdata", VFILE = "vattu-data.json";
      if (request.method === "GET") {
        let r; try { r = await ghGetJson(env, VFILE, VBR); } catch (e) { return jsonResp({ error: "Đọc vật tư lỗi." }, 502); }
        return jsonResp({ ok: true, data: r.obj || {} });
      }
      if (request.method === "POST") {
        let body; try { body = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
        const act = body && body.act;
        const r = await ghUpdate(env, VFILE, VBR, (store) => {
          store.materials = Array.isArray(store.materials) ? store.materials : [];
          store.bom = (store.bom && typeof store.bom === "object") ? store.bom : {};
          store.log = Array.isArray(store.log) ? store.log : [];
          store.phieunhap = Array.isArray(store.phieunhap) ? store.phieunhap : [];
          if (act === "consume") {
            // tự trừ vật tư theo định mức trên BẢN MỚI NHẤT (ghUpdate đọc lại & áp dụng lại nếu xung đột → không bao giờ sai)
            const batch = Array.isArray(body.items) ? body.items : [{ product: body.product, qty: body.qty }];
            const consumed = [];
            batch.forEach((b2) => {
              const code = String((b2 && b2.code) || ""), product = String((b2 && b2.product) || ""), q = Number(b2 && b2.qty) || 0;
              // ĐỊNH MỨC KHOÁ THEO MÃ SP: ưu tiên bom[code], dự phòng bom[tên]
              const recipe = (code && store.bom[code]) ? store.bom[code] : store.bom[product];
              if (!Array.isArray(recipe) || !recipe.length || q <= 0) return;
              recipe.forEach((rr) => {
                const need = (Number(rr.qty) || 0) * q;
                if (need <= 0) return;
                const m = store.materials.find((x) => x && x.name && rr.mat && x.name.toLowerCase() === String(rr.mat).toLowerCase());
                if (m) m.qty = (Number(m.qty) || 0) - need;
                else store.materials.push({ name: rr.mat, unit: rr.unit || "", qty: -need, price: 0, cat: rr.cat || "khac" });
                consumed.push({ mat: rr.mat, qty: need, sp: product });
              });
            });
            if (!consumed.length) return { skip: true, result: { consumed: [] } };
            store.log.unshift({ t: new Date().toISOString(), type: "xuất-sx", who: who, note: "Sản xuất: " + batch.filter((b2) => b2 && b2.product).map((b2) => (Number(b2.qty) || 0) + "×" + b2.product).join(", "), items: consumed });
            store.log = store.log.slice(0, 500);
            return { msg: "vattu consume (" + who + ")", result: { consumed } };
          }
          // save — kiểm tra phiên bản (rev) để KHÔNG ghi đè thay đổi của người khác
          if (body.baseRev != null && Number(body.baseRev) !== (Number(store.rev) || 0)) return { reject: { ok: false, conflict: true, data: store } };
          const d = body.data || {};
          store.materials = Array.isArray(d.materials) ? d.materials : store.materials;
          store.bom = (d.bom && typeof d.bom === "object") ? d.bom : store.bom;
          store.log = Array.isArray(d.log) ? d.log : store.log;
          store.phieunhap = Array.isArray(d.phieunhap) ? d.phieunhap : store.phieunhap;
          store.cats = Array.isArray(d.cats) ? d.cats : store.cats;
          store.catalog = (d.catalog && typeof d.catalog === "object") ? d.catalog : store.catalog;
          store.by = who;
          return { msg: "vattu save (" + who + ")" };
        });
        if (r.rejected) return jsonResp(r.rejected, 200);
        if (r.error) return jsonResp({ error: "Lưu vật tư lỗi." }, 502);
        return jsonResp({ ok: true, rev: (r.store && r.store.rev) || 0, data: r.store, consumed: (r.result && r.result.consumed) || undefined });
      }
      return jsonResp({ error: "method" }, 405);
    }

    // --- AI phân tích hiệu quả vật tư (chỉ chủ) ---
    if (url.pathname === "/api/vattu-analyze" && request.method === "POST") {
      const who = await authUser(request, env);
      if (!who) return jsonResp({ error: "Chưa đăng nhập." }, 401);
      if (!isOwnerUser(who, env)) return jsonResp({ error: "Chỉ chủ được xem phân tích." }, 403);
      if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: "Chưa cấu hình ANTHROPIC_API_KEY." }, 503);
      // gom dữ liệu: vật tư + định mức + sản phẩm đã sản xuất (từ kho-data)
      let vt = {}, kho = {}, site = {};
      try { vt = (await ghGetJson(env, "vattu-data.json", "appdata")).obj || {}; } catch (e) {}
      try { kho = (await ghGetJson(env, "kho-data.json", "appdata")).obj || {}; } catch (e) {}
      try { const a = await env.ASSETS.fetch(new URL("/site-content.json", url).toString()); if (a.ok) site = await a.json(); } catch (e) {}
      const materials = Array.isArray(vt.materials) ? vt.materials : [];
      const bom = (vt.bom && typeof vt.bom === "object") ? vt.bom : {};
      const vlog = Array.isArray(vt.log) ? vt.log : [];
      const khoLog = Array.isArray(kho.log) ? kho.log : [];
      // tổng hợp sản phẩm sản xuất ra từ log nhập kho
      const produced = {};
      khoLog.forEach((e) => { if (e && /nh/i.test(e.type || "") && e.name) produced[e.name] = (produced[e.name] || 0) + (Number(e.qty) || 0); });
      // thông số kỹ thuật từng lò (từ website): kích thước, cân nặng, vỉ, vật liệu...
      const specs = (Array.isArray(site.products) ? site.products : []).filter((p) => p && p.specs && Object.keys(p.specs).some((k) => p.specs[k])).map((p) => ({ ten: p.name, gia_ban: p.price || 0, thong_so: p.specs }));
      const ctxData = {
        vat_tu_ton: materials.map((m) => ({ ten: m.name, dvt: m.unit, ton: m.qty, don_gia: m.price || 0, gia_tri: (Number(m.qty) || 0) * (Number(m.price) || 0) })),
        dinh_muc: bom,
        thong_so_lo: specs,
        san_pham_san_xuat: produced,
        nhat_ky_xuat_vat_tu: vlog.slice(0, 60),
      };
      const sys = "Bạn là chuyên gia quản lý sản xuất cơ khí (lò nướng than/BBQ bằng thép tấm, có sơn). Phân tích dữ liệu xưởng, đánh giá HIỆU QUẢ SỬ DỤNG VẬT TƯ. Trả lời tiếng Việt, ngắn gọn, SỐ LIỆU cụ thể, markdown. " +
        "QUAN TRỌNG: dùng `thong_so_lo` (kích thước dài×rộng×cao mm, cân nặng kg, số vỉ, chất liệu...) để ƯỚC TÍNH cho từng lò: (a) KHỐI LƯỢNG TÔN/THÉP TẤM cần — suy từ cân nặng lò (phần lớn là thép) và/hoặc diện tích bề mặt từ kích thước; (b) LƯỢNG SƠN cần — theo diện tích bề mặt ngoài (m²); (c) số kg lò = cân nặng. " +
        "Các mục: 1) Bảng ước tính cho mỗi lò: tôn (kg), sơn (m² hoặc kg), số kg, và CHI PHÍ vật tư/lò (dùng đơn giá vật tư tồn). 2) Giá trị tồn kho vật tư & vật tư tồn nhiều/ít/nút thắt. 3) Hao hụt/bất thường (vật tư âm, dùng vượt định mức). 4) Vật tư có khả năng lãng phí. 5) 2-3 gợi ý tiết kiệm cụ thể. " +
        "Nếu thiếu dữ liệu (chưa có thông số/đơn giá/định mức) thì nói rõ mục nào thiếu và phân tích theo những gì có. Tiêu đề ngắn, gạch đầu dòng, có thể dùng bảng markdown.";
      const userMsg = "Dữ liệu xưởng (JSON):\n" + JSON.stringify(ctxData) + "\n\nHãy phân tích hiệu quả vật tư.";
      try {
        const reply = await callClaude(env, [{ role: "system", content: sys }, { role: "user", content: userMsg }]);
        if (!reply) return jsonResp({ error: "AI không trả lời được." }, 502);
        return jsonResp({ ok: true, report: reply, at: new Date().toISOString() });
      } catch (e) { return jsonResp({ error: "Lỗi AI: " + e.message }, 502); }
    }

    // --- AI quét phiếu nhập vật tư (camera/ảnh) → trích xuất dòng vật tư ---
    if (url.pathname === "/api/vattu-scan" && request.method === "POST") {
      if (!(await authUser(request, env))) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
      if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: "Chưa cấu hình ANTHROPIC_API_KEY." }, 503);
      let body; try { body = await request.json(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
      const file = String(body.file || "");
      const mm = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!mm) return jsonResp({ error: "Ảnh không hợp lệ." }, 400);
      const mime = mm[1], data = mm[2];
      let block;
      if (mime === "application/pdf") block = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
      else if (mime.indexOf("image/") === 0) block = { type: "image", source: { type: "base64", media_type: mime, data } };
      else return jsonResp({ error: "Chỉ nhận ảnh hoặc PDF." }, 400);
      const sys = "Bạn đọc PHIẾU NHẬP / HOÁ ĐƠN / PHIẾU GIAO HÀNG vật tư của một xưởng cơ khí làm lò nướng than (BBQ) ở Việt Nam. Trích xuất các DÒNG VẬT TƯ thành JSON. " +
        "Mỗi dòng: {name (tên vật tư kèm quy cách như độ dày/kích thước nếu có, VD 'Tôn đen 1.2mm', 'Hộp 30x30x1.4mm'), unit (đơn vị: kg/cây/tấm/cái/lít/bình/cuộn/con/viên...), qty (số lượng, số), price (đơn giá VNĐ, số, 0 nếu không thấy), cat}. " +
        "cat là LOẠI, chọn 1 trong: tole (tôn/thép tấm), ong (ống/hộp/la/V thép), son (sơn các loại), ocvit (ốc vít/bù lon/tán/vít), quehan (que hàn/dây hàn/đá cắt-mài/vật tư máy hàn), khihan (khí CO2/Argon/oxy/gas), vinuong (vỉ nướng), banhxe (bánh xe), dongho (đồng hồ nhiệt), board (board điều khiển/quạt/motor), khac (khác). " +
        "CHỈ trả về JSON: {\"items\":[...]}. Không thêm chữ nào ngoài JSON. Đọc kỹ số lượng và đơn giá. Mờ/không chắc thì vẫn ghi tên, qty=1, price=0.";
      const content = [block, { type: "text", text: "Đọc phiếu nhập vật tư này và trích xuất JSON các dòng vật tư." }];
      const model = env.CLAUDE_MODEL_IMPORT || env.CLAUDE_MODEL_QUOTE || "claude-haiku-4-5";
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 1800, system: sys, messages: [{ role: "user", content }] }) });
        if (!r.ok) return jsonResp({ error: "anthropic " + r.status + " " + (await r.text()).slice(0, 150) }, 502);
        const j = await r.json();
        const txt = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
        let d = null; try { d = JSON.parse(txt); } catch (e) { const x = txt.match(/\{[\s\S]*\}/); if (x) { try { d = JSON.parse(x[0]); } catch (e2) {} } }
        const items = (d && Array.isArray(d.items) ? d.items : []).slice(0, 40).map((it) => ({ name: String(it.name || "").slice(0, 120), unit: String(it.unit || "").slice(0, 20), qty: Math.max(0, Number(it.qty) || 0), price: Math.max(0, Math.round(Number(it.price) || 0)), cat: String(it.cat || "khac").slice(0, 20) })).filter((it) => it.name);
        return jsonResp({ ok: true, items });
      } catch (e) { return jsonResp({ error: "Lỗi AI: " + e.message }, 502); }
    }

    // --- CMS: nội dung động của site (site-content.json), tự đăng lên GitHub ---
    if (url.pathname === "/api/cms") {
      if (!(await authUser(request, env))) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
      const repo = env.GH_REPO || "duyoven/duyoven-vn-site";
      const ghPath = "site-content.json";
      const ghApi = "https://api.github.com/repos/" + repo + "/contents/" + ghPath;
      const ghHeaders = {
        "Authorization": "Bearer " + (env.GH_TOKEN || ""),
        "Accept": "application/vnd.github+json",
        "User-Agent": "duyoven-cms",
      };
      if (request.method === "GET") {
        // luôn lấy bản mới nhất trong repo (kể cả vừa lưu xong)
        if (!env.GH_TOKEN) {
          // chưa có token: đọc bản tĩnh đang phục vụ
          try { const a = await env.ASSETS.fetch(new URL("/site-content.json", url).toString()); if (a.ok) return new Response(await a.text(), { headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" } }); } catch (e) {}
          return jsonResp({ error: "Chưa cấu hình GH_TOKEN." }, 503);
        }
        const r = await fetch(ghApi + "?ref=main", { headers: ghHeaders });
        if (!r.ok) return jsonResp({ error: "GitHub " + r.status }, 502);
        const j = await r.json();
        const txt = decodeURIComponent(escape(atob((j.content || "").replace(/\n/g, ""))));
        return new Response(txt, { headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" } });
      }
      if (request.method === "POST") {
        if (!env.GH_TOKEN) return jsonResp({ error: "Chưa cấu hình chìa khóa GitHub (GH_TOKEN) trong Worker — xem hướng dẫn." }, 503);
        let bodyTxt; try { bodyTxt = await request.text(); } catch (e) { return jsonResp({ error: "bad body" }, 400); }
        let obj; try { obj = JSON.parse(bodyTxt); } catch (e) { return jsonResp({ error: "Nội dung JSON không hợp lệ." }, 400); }
        obj.updatedAt = new Date().toISOString();
        const pretty = JSON.stringify(obj, null, 2);
        const b64 = btoa(unescape(encodeURIComponent(pretty)));
        let sha = undefined;
        const cur = await fetch(ghApi + "?ref=main", { headers: ghHeaders });
        if (cur.ok) { const cj = await cur.json(); sha = cj.sha; }
        const who = (await authUser(request, env)) || "staff";
        const put = await fetch(ghApi, {
          method: "PUT",
          headers: { ...ghHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ message: "CMS: cập nhật nội dung site (" + who + ")", content: b64, sha, branch: "main" }),
        });
        if (!put.ok) return jsonResp({ error: "GitHub " + put.status + " " + (await put.text()).slice(0, 200) }, 502);
        return jsonResp({ ok: true, updatedAt: obj.updatedAt });
      }
      return jsonResp({ error: "method" }, 405);
    }

    // --- AI: ảnh sản phẩm studio (tạo 1 lần, cache vĩnh viễn ở edge) ---
    if (url.pathname === "/img/p") {
      const m = (url.searchParams.get("m") || "hero").slice(0, 40);
      const cache = caches.default;
      const ckey = new Request("https://img.duyoven.vn/p?m=" + m);
      const hit = await cache.match(ckey);
      if (hit) return hit;
      try {
        const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt: imgPrompt(m) + IMG_STYLE, steps: 8, seed: seedFrom(m),
        });
        if (r && r.image) {
          const bin = atob(r.image);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const resp = new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000" } });
          await cache.put(ckey, resp.clone());
          return resp;
        }
      } catch (e) { return jsonResp({ error: String(e) }, 502); }
      return jsonResp({ error: "no image" }, 502);
    }

    // --- reverse proxy ---
    const target = PROXY[url.pathname];
    if (target) {
      const upstream = await fetch(target, { cf: { cacheEverything: true, cacheTtl: 86400 } });
      const headers = new Headers(upstream.headers);
      headers.delete("X-Frame-Options");
      headers.delete("Content-Security-Policy");
      headers.delete("Content-Security-Policy-Report-Only");
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("X-Proxied-By", "duyoven.vn");
      return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
    }

    // --- trang nội bộ: KHÔNG còn bảng Basic Auth — bảo vệ bằng đăng nhập Google (gate phía client) + phiên cookie cho API ---
    if (INTERNAL.has(url.pathname)) {
      const user = (await authUser(request, env)) || "Nhân viên";
      // serve the requested internal page with the logged-in staff name injected.
      // Fetch the asset directly and follow any internal redirect (e.g. Cloudflare's
      // .html -> clean-URL redirect) so we never bounce the browser into a loop.
      let pagePath = url.pathname.endsWith(".html") ? url.pathname : url.pathname + ".html";
      let res = await env.ASSETS.fetch(new URL(pagePath, url).toString());
      let guard = 0;
      while (res.status >= 300 && res.status < 400 && res.headers.get("Location") && guard++ < 3) {
        res = await env.ASSETS.fetch(new URL(res.headers.get("Location"), url).toString());
      }
      let html = await res.text();
      html = html.split("__STAFF__").join(user);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Serve .txt (robots.txt, llms.txt) as UTF-8 so Vietnamese reads correctly for AI crawlers.
    if (url.pathname.endsWith(".txt")) {
      const res = await env.ASSETS.fetch(request);
      const h = new Headers(res.headers);
      h.set("Content-Type", "text/plain; charset=utf-8");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }

    return env.ASSETS.fetch(request);
  },
};
