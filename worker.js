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

const INTERNAL = new Set(["/bao-gia.html", "/bao-gia"]);

const AI_SYS = [
  "Bạn là trợ lý tư vấn của Duy's Oven (duyoven.vn) — thương hiệu Việt Nam chuyên lò nướng than tách khói, lò BBQ, lò xông khói (smoker) và lò pizza, sản xuất từ thép, sơn chịu nhiệt chuẩn Mỹ 600°C, vỉ inox.",
  "Cơ chế tách khói: than cháy ở khu vực riêng, vỉ tách dầu hình chữ V hứng mỡ nên mỡ không rơi vào than → không sinh khói khét; có quạt gió (DC 12V/USB-C) giúp than cháy đều, nướng được trong nhà.",
  "Bảng model & giá tham khảo (đã gồm VAT): Pantina 7.700.000đ (nhỏ gọn ~3 con gà); Tách khói 65L 12.100.000đ; 80L 15.400.000đ; 85L 16.500.000đ; 125L/125L Pro/250L (liên hệ); Hybrid than+gas 65L 15.400.000đ, 80L 18.700.000đ, 125L 27.500.000đ; Lò xông khói Hybrid 10050 33.000.000đ; Offset Smoker 10050 24.200.000đ; Lò Pizza Wood&Gas 126.500.000đ; Argentina Grill, Fastgrill, lò quay (liên hệ).",
  "Nhiệm vụ: hỏi nhu cầu (số người ăn, trong nhà/sân vườn/camping, loại món, ngân sách) rồi gợi ý model phù hợp, giải thích ngắn gọn lý do, nêu giá. Có thể tư vấn đặt lò theo kích thước riêng.",
  "NGÔN NGỮ: luôn trả lời bằng ĐÚNG ngôn ngữ mà khách dùng trong tin nhắn gần nhất của họ — khách viết tiếng Anh thì đáp tiếng Anh, tiếng Hàn đáp tiếng Hàn, tiếng Trung/Thái/Đức tương tự; nếu không chắc thì dùng tiếng Việt. Thân thiện, ngắn gọn, thực tế. Không bịa thông số. Khi cần chốt đơn/giá chính xác, mời liên hệ Hotline 090 169 1717 hoặc trang Báo giá.",
  "QUAN TRỌNG về định dạng: khung chat chỉ hiển thị VĂN BẢN THUẦN, KHÔNG render Markdown. Vì vậy TUYỆT ĐỐI không dùng dấu Markdown: không dùng # hay ## (tiêu đề), không dùng ** hay __ (in đậm), không bảng. Trả lời như tin nhắn tự nhiên, 2–5 câu. Nếu cần liệt kê thì xuống dòng và bắt đầu bằng dấu gạch '– '. Tên model và giá viết thẳng trong câu, ví dụ: Lò Tách khói 65L giá 12.100.000đ."
].join(" ");

const LANG_NAMES = { en: "English", zh: "Simplified Chinese", ko: "Korean", th: "Thai", de: "German" };

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
      // serve the page with the logged-in staff name injected.
      // Fetch the asset directly and follow any internal redirect (e.g. Cloudflare's
      // .html -> clean-URL redirect) so we never bounce the browser into a loop.
      let res = await env.ASSETS.fetch(new URL("/bao-gia.html", url).toString());
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

    return env.ASSETS.fetch(request);
  },
};
