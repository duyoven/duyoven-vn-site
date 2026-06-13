// Duy's Oven — duyoven.vn Worker
// Serves the static site (ASSETS) and reverse-proxies the heavy Academy
// simulations from duyoven.com under same-origin paths, stripping the
// X-Frame-Options / CSP headers so they can be embedded inline on duyoven.vn.

const SIMS = {
  "/academy-sim/tach-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duyoven-mophong-than-tach-khoi-v2.html",
  "/academy-sim/xong-khoi":
    "https://duyoven.com/wp-content/uploads/2026/06/duys-oven-mo-phong-lo-xong-khoi-1.html",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = SIMS[url.pathname];

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
