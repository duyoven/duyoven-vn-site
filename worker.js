// Duy's Oven — duyoven.vn Worker
// Serves the static site (ASSETS) and reverse-proxies heavy / cross-origin
// assets (Academy simulations + catalog / manual PDFs) from duyoven.com under
// same-origin paths, stripping framing headers so they live fully on duyoven.vn.

const PROXY = {
  // Academy interactive simulations (HTML)
  "/academy-sim/tach-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duyoven-mophong-than-tach-khoi-v2.html",
  "/academy-sim/xong-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duys-oven-mo-phong-lo-xong-khoi-1.html",

  // Catalog (PDF)
  "/tai-lieu/catalog-2026-vi.pdf":
    "https://duyoven.com/wp-content/uploads/2026/06/DuysOven-Catalog-2026.pdf",
  "/tai-lieu/catalog-2026-en.pdf":
    "https://duyoven.com/wp-content/uploads/2026/06/DuysOven-Catalog-2026-EN.pdf",

  // Hướng dẫn sử dụng (PDF)
  "/tai-lieu/hdsd-tach-khoi.pdf":
    "https://duyoven.com/wp-content/uploads/2025/07/HDSD_Nhanh_LoThanTachKhoi.pdf",
  "/tai-lieu/hdsd-pantina.pdf":
    "https://duyoven.com/wp-content/uploads/2025/07/HDSD_Nhanh_Pantina.pdf",
  "/tai-lieu/hdsd-fastgrill.pdf":
    "https://duyoven.com/wp-content/uploads/2026/03/HDSD_FastGrill.pdf",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = PROXY[url.pathname];

    if (target) {
      const upstream = await fetch(target, {
        cf: { cacheEverything: true, cacheTtl: 86400 },
      });
      const headers = new Headers(upstream.headers);
      headers.delete("X-Frame-Options");
      headers.delete("Content-Security-Policy");
      headers.delete("Content-Security-Policy-Report-Only");
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("X-Proxied-By", "duyoven.vn");
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
