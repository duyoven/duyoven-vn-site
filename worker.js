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

const INTERNAL = new Set(["/bao-gia.html", "/bao-gia", "/hop-dong.html", "/hop-dong", "/quan-tri.html", "/quan-tri"]);

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
  "CHỈ trả về MỘT đối tượng JSON hợp lệ, KHÔNG kèm chữ nào khác, KHÔNG markdown, KHÔNG ```. Cấu trúc đúng: {\"items\":[{\"n\":\"Lò Tách khói 65L\",\"unit\":\"Cái\",\"p\":12100000,\"q\":1}],\"cust\":{\"name\":\"\",\"phone\":\"\",\"contact\":\"\",\"email\":\"\",\"company\":\"\",\"tax\":\"\",\"addr\":\"\"},\"note\":\"ghi chú/điều khoản gợi ý ngắn\",\"deliv\":\"7-10 ngày\",\"warr\":\"12 tháng\",\"valid\":30,\"reply\":\"giải thích ngắn 2-3 câu bằng tiếng Việt cho nhân viên: vì sao chọn các model này\"}. Giá 'p' là số nguyên VND, không dấu phân cách, không chữ. Nếu thiếu thông tin cứ đề xuất phương án hợp lý nhất và nêu giả định trong 'reply'."
].join("\n");

const IMPORT_SYS = [
  "Bạn là trợ lý ĐỌC & SỐ HÓA BÁO GIÁ CŨ cho Duy's Oven. Người dùng gửi ẢNH hoặc PDF một bản báo giá/đơn hàng đã có. Hãy ĐỌC thật kỹ và trích xuất ĐÚNG nội dung trong tài liệu — KHÔNG bịa, KHÔNG thêm thông tin ngoài tài liệu.",
  "DÙNG ĐÚNG dữ liệu trong tài liệu: từng dòng sản phẩm (tên/quy cách, ĐVT, số lượng, đơn giá), thông tin khách hàng (tên, công ty, MST, SĐT, email, người liên hệ, địa chỉ), và điều khoản nếu có (thanh toán, thời gian giao, bảo hành, hiệu lực). Đơn giá lấy ĐÚNG số trong báo giá, bỏ dấu phân cách, ra số nguyên VND. Ô nào không đọc được thì để rỗng hoặc 0.",
  "CHỈ trả về MỘT JSON hợp lệ, KHÔNG markdown. Cấu trúc: {\"items\":[{\"n\":\"\",\"unit\":\"Cái\",\"p\":0,\"q\":1}],\"cust\":{\"name\":\"\",\"phone\":\"\",\"contact\":\"\",\"email\":\"\",\"company\":\"\",\"tax\":\"\",\"addr\":\"\"},\"note\":\"\",\"deliv\":\"\",\"warr\":\"\",\"valid\":30,\"reply\":\"tóm tắt ngắn tiếng Việt: đã đọc được mấy mục hàng, tên khách\"}."
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

export default {
  async fetch(request, env) {
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

    // --- AI: trợ lý báo giá nội bộ (chỉ nhân viên) ---
    if (url.pathname === "/api/bao-gia" && request.method === "POST") {
      try {
        if (!staffUser(request, env)) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
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
        if (!staffUser(request, env)) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
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
        if (!staffUser(request, env)) return jsonResp({ error: "Chỉ dành cho nhân viên." }, 401);
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
          n: String(it.n || it.name || "").slice(0, 200), unit: String(it.unit || "Cái").slice(0, 20),
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

    // --- internal staff quote tool (Basic Auth) ---
    if (INTERNAL.has(url.pathname)) {
      const user = staffUser(request, env);
      if (!user) {
        return new Response("Khu vực nội bộ Duy's Oven — cần đăng nhập nhân viên.", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Duy\'s Oven - Noi bo", charset="UTF-8"',
            "Content-Type": "text/plain; charset=UTF-8",
          },
        });
      }
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
