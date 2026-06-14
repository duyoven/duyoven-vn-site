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
