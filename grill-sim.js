/* <grill-sim> — interactive cutaway demo of the TK65L tách-khói oven.
 * Uses the two REAL models (open / closed lid) clipped to a cross-section so the
 * customer ALWAYS sees inside, even with the lid down. It tells the smoke-separation
 * story: charcoal glowing in the two SIDE troughs, heat rising from both sides and
 * curling up to the lid + swirling around the meat, grease dripping straight down the
 * centre gap into the ash/grease tray at the bottom — never onto the coals.
 * sim-state: { coalsIn, grateIn, coalAmount, foods[], grilling, lidClosed, temp, doneness, grease, trayCycle }
 */
(function () {
  if (customElements.get('grill-sim')) return;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const OPEN_URL = 'model/tk65l.stl';
  const CLOSED_URL = 'model/tk65l_closed.stl';
  const CHIM = { x: -0.095, z: -0.006 };
  // interior frame (model-local, metres) — two coal troughs on the sides, middle gap
  const TRO = { xL: -0.135, xR: 0.135, z0: -0.27, z1: 0.18, y: 0.50, halfW: 0.03 };
  const GRATE_Y = 0.82;
  const TRAY_Y = 0.44;
  const CLIP_Z = 0.16;   // remove the near (+z) front so the chamber is open to view

  function parseSTL(buffer) {
    const dv = new DataView(buffer);
    const tris = dv.getUint32(80, true);
    const pos = new Float32Array(tris * 9);
    let off = 84;
    for (let i = 0; i < tris; i++) {
      off += 12;
      for (let v = 0; v < 3; v++) { const j = i * 9 + v * 3; pos[j] = dv.getFloat32(off, true); pos[j + 1] = dv.getFloat32(off + 4, true); pos[j + 2] = dv.getFloat32(off + 8, true); off += 12; }
      off += 2;
    }
    return pos;
  }
  function orient(pos) {
    let mn, mx;
    const scan = () => { mn = [1e9, 1e9, 1e9]; mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { const v = pos[i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; } };
    scan();
    const e = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    if (e[2] >= e[0] && e[2] >= e[1]) { for (let i = 0; i < pos.length; i += 3) { const y = pos[i + 1], z = pos[i + 2]; pos[i + 1] = z; pos[i + 2] = -y; } }
    else if (e[0] >= e[1] && e[0] >= e[2]) { for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1]; pos[i] = y; pos[i + 1] = -x; } }
    scan();
    const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, by = mn[1];
    const s = (mx[1] - mn[1]) > 100 ? 0.001 : 1;
    for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - cx) * s; pos[i + 1] = (pos[i + 1] - by) * s; pos[i + 2] = (pos[i + 2] - cz) * s; }
    return pos;
  }
  function softTexture(THREE, rgb) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(' + rgb + ',.95)'); g.addColorStop(0.45, 'rgba(' + rgb + ',.5)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  class GrillSim extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const cs = getComputedStyle(this);
      if (cs.display === 'inline') this.style.display = 'block';
      if (cs.position === 'static') this.style.position = 'relative';
      this.style.overflow = 'hidden'; this.style.touchAction = 'pan-y'; this.style.width = '100%';
      if (this.getBoundingClientRect().height < 40) this.style.height = '540px';
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;z-index:3;color:rgba(255,255,255,.7);font:500 13px/1.4 system-ui;letter-spacing:.04em;pointer-events:none;text-align:center;padding:24px';
      box.innerHTML = '<div style="width:42px;height:42px;border-radius:50%;border:2px solid rgba(244,123,32,.25);border-top-color:#F47B20;animation:gsSpin .9s linear infinite"></div><div data-msg>Đang tải mô hình lò 65L…</div><div style="width:170px;height:3px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden"><div data-bar style="height:100%;width:0;background:#F47B20;border-radius:99px;transition:width .15s"></div></div>';
      const st = document.createElement('style'); st.textContent = '@keyframes gsSpin{to{transform:rotate(360deg)}}';
      this.appendChild(st); this.appendChild(box);
      this._loadBox = box; this._bar = box.querySelector('[data-bar]');
      this._boot().catch((e) => {
        console.error('[grill-sim] ' + (e && e.message ? e.message : e) + (e && e.stack ? ' @ ' + e.stack.split('\n')[1] : ''));
        box.innerHTML = '<div style="color:#f4f4f4">Không tải được mô phỏng 3D.<br><span style="opacity:.6;font-size:12px">' + (e && e.message ? e.message : e) + '</span></div>';
      });
    }
    _attr(name) {
      const cands = [name, name.replace(/-/g, ''), name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())];
      for (const n of cands) { const a = this.getAttribute(n); if (a !== null && a !== undefined && a !== '') return a; }
      for (const n of cands) { const p = this[n]; if (p !== undefined && p !== null) return String(p); }
      return null;
    }

    async _boot() {
      const THREE = await import(THREE_URL);
      const load = async (url, f0, f1) => {
        const res = await fetch(url); if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
        const total = +res.headers.get('Content-Length') || 0;
        const reader = res.body.getReader(); const chunks = []; let got = 0;
        while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; if (total && this._bar) this._bar.style.width = Math.round((f0 + (f1 - f0) * got / total) * 100) + '%'; }
        const u = new Uint8Array(got); let p = 0; for (const c of chunks) { u.set(c, p); p += c.length; } return u.buffer;
      };
      const geoFrom = (buf) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(orient(parseSTL(buf)), 3)); g.computeVertexNormals(); g.computeBoundingBox(); return g; };
      const __R = window.__resources || {};
      const closedGeo = geoFrom(await load(__R.stlClosed || CLOSED_URL, 0, 0.25));
      const openGeo = geoFrom(await load(__R.stlOpen || OPEN_URL, 0.25, 1));
      const bb = closedGeo.boundingBox; const H = bb.max.y - bb.min.y;

      // cutaway clip: follows the camera each frame so the near wall is always removed (see inside from any angle).
      const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), CLIP_Z);
      const matOpen = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1c1f'), metalness: 0.42, roughness: 0.52, envMapIntensity: 1.0, side: THREE.DoubleSide, clippingPlanes: [clip], clipShadows: true, transparent: true, opacity: 1 });
      const matClosed = matOpen.clone(); matClosed.clippingPlanes = [clip];
      const coalMat = new THREE.MeshStandardMaterial({ color: 0x161208, roughness: 0.92, emissive: new THREE.Color(0xff4d12), emissiveIntensity: 0 });
      const troughMat = new THREE.MeshStandardMaterial({ color: 0x26221b, metalness: 0.55, roughness: 0.5 });
      const ductMat = new THREE.MeshStandardMaterial({ color: 0x303036, metalness: 0.6, roughness: 0.45 });
      const grateMat = new THREE.MeshStandardMaterial({ color: 0x55555e, metalness: 0.78, roughness: 0.36 });
      const greaseMat = new THREE.MeshStandardMaterial({ color: 0xb9842c, metalness: 0.3, roughness: 0.25, emissive: 0x301d05, emissiveIntensity: 0.3 });
      const trayMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.45 });

      // ---- scene + lights ----
      const scene = new THREE.Scene();
      const oven = new THREE.Group(); scene.add(oven); // static (no spin) so the cutaway always faces us
      const openMesh = new THREE.Mesh(openGeo, matOpen); openMesh.castShadow = true; openMesh.receiveShadow = true; oven.add(openMesh);
      const closedMesh = new THREE.Mesh(closedGeo, matClosed); closedMesh.castShadow = true; closedMesh.receiveShadow = true; closedMesh.visible = false; oven.add(closedMesh);

      scene.add(new THREE.HemisphereLight(0x9aa3b5, 0x18120c, 1.35));
      const key = new THREE.DirectionalLight(0xfff2e2, 3.0); key.position.set(1.4, H * 1.8, 2.0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      const scm = key.shadow.camera; scm.left = scm.bottom = -H; scm.right = scm.top = H; scm.near = 0.1; scm.far = H * 6; key.shadow.bias = -0.0004; scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-1.6, H * 0.9, 2.2); scene.add(fill);
      const topFill = new THREE.DirectionalLight(0xffffff, 0.7); topFill.position.set(0.2, H * 1.7, 1.2); scene.add(topFill);
      const interiorFill = new THREE.PointLight(0xffe6c8, 0.6, H * 1.6, 2); interiorFill.position.set(0, GRATE_Y + 0.05, 0.4); scene.add(interiorFill);
      const camFill = new THREE.DirectionalLight(0xffffff, 1.1); scene.add(camFill); // follows the camera so the open cutaway is always lit
      const floor = new THREE.Mesh(new THREE.CircleGeometry(H * 0.9, 64), new THREE.ShadowMaterial({ opacity: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

      // ---- middle gap stays open (no visible box). Forced air is shown by the blue airflow streaks only. ----
      const duct = new THREE.Group(); oven.add(duct);

      // ---- interior groups ----
      const coalsL = new THREE.Group(), coalsR = new THREE.Group(); oven.add(coalsL); oven.add(coalsR);
      // (no custom grate drawn — the vỉ nướng is part of the real STL model)
      const foodRoot = new THREE.Group(); oven.add(foodRoot);
      const glowL = new THREE.PointLight(0xff5a1a, 0, 0.55, 2); glowL.position.set(TRO.xL, TRO.y + 0.03, 0); oven.add(glowL);
      const glowR = new THREE.PointLight(0xff5a1a, 0, 0.55, 2); glowR.position.set(TRO.xR, TRO.y + 0.03, 0); oven.add(glowR);
      // ---- offset smoke chamber (khoẩng đốt phụ) at z≈-0.48: charcoal + oak wood, smoke mode only ----
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.86, metalness: 0.0, emissive: new THREE.Color(0x3a1d08), emissiveIntensity: 0 });
      const OFF = { x: 0, y: 0.34, z: -0.47, halfX: 0.085, halfZ: 0.085 };
      const offsetFuel = new THREE.Group(); oven.add(offsetFuel); offsetFuel.visible = false;
      const glowOff = new THREE.PointLight(0xff5a1a, 0, 0.6, 2); glowOff.position.set(OFF.x, OFF.y + 0.05, OFF.z); oven.add(glowOff);

      // ---- ash / grease tray is already part of the real model (no extra mesh added) ----
      const tray = null;

      // ---- the blower fan (quạt sò) is part of the real STL model — no custom fan drawn ----
      const fanSpin = null, fanLed = null;


      // ---- renderer / env ----
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.32;
      renderer.localClippingEnabled = true;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;cursor:grab';
      this.appendChild(renderer.domElement);
      {
        const env = new THREE.Scene(); env.background = new THREE.Color(0x0a0a0b);
        const pE = (hex, inten, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(inten) })); m.position.set(x, y, z); env.add(m); };
        pE(0xffffff, 5, 0, 8, 0, 10, 0.2, 10); pE(0xfff1e0, 4, -6, 3, 2, 0.2, 4, 6); pE(0xdfe6f5, 2.6, 6, 2.5, -1, 0.2, 3.5, 6);
        const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
      }

      // ---- foods (on the grate, centre, above the middle gap) ----
      const FOOD_COLORS = { ga: 0xd9a04e, ca: 0x9fb3c4, heo: 0xd98a7a, bo: 0x8a4434, tom: 0xe8835a, muc: 0xe6e0d4, so: 0xd9c9a8, khoai: 0xcaa14e };
      const foodMesh = (type, mat) => {
        let m;
        if (type === 'ga') { m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 14), mat); m.scale.set(1.3, 0.78, 1.0); }
        else if (type === 'ca') { m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 14), mat); m.scale.set(1.9, 0.42, 0.72); }
        else if (type === 'heo') { m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.032, 0.06), mat); }
        else if (type === 'bo') { m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.068), mat); }
        else if (type === 'tom') { m = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.015, 10, 16, Math.PI * 1.3), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = 0.4; }
        else if (type === 'muc') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.092, 12), mat); m.rotation.z = Math.PI / 2; }
        else if (type === 'so') { m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), mat); m.scale.set(1.1, 0.42, 1.05); }
        else { m = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.048, 6, 12), mat); m.rotation.z = Math.PI / 2; }
        m.castShadow = true; return m;
      };
      const zc = (TRO.z0 + TRO.z1) / 2;
      const SLOTS = [[-0.045, zc - 0.16], [0.045, zc - 0.16], [-0.045, zc], [0.045, zc], [-0.045, zc + 0.16], [0.045, zc + 0.16]];
      let foodEntries = [], foodsKey = '';
      const rebuildFoods = (list) => {
        while (foodRoot.children.length) foodRoot.remove(foodRoot.children[0]);
        foodEntries = list.slice(0, 6).map((t, i) => {
          const base = new THREE.Color(FOOD_COLORS[t] || 0xcaa14e);
          const m1 = new THREE.MeshStandardMaterial({ color: base.clone(), roughness: 0.62, metalness: 0.05 });
          const ga = new THREE.Group(); ga.add(foodMesh(t, m1)); ga.position.set(SLOTS[i][0], GRATE_Y + 0.03, SLOTS[i][1]); ga.scale.setScalar(0.01);
          foodRoot.add(ga); return { ga, m1, base, spawn: 0, z: SLOTS[i][1], x: SLOTS[i][0] };
        });
      };
      const cookTarget = new THREE.Color(0x5e3514);

      // ---- charcoal in the two side troughs ----
      let coalKey = '';
      const coalSphere = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r || 0.02, 9, 7), coalMat); m.castShadow = true; return m; };
      const buildLiner = (xC) => {
        const g = new THREE.Group(); const czz = (TRO.z0 + TRO.z1) / 2, len = (TRO.z1 - TRO.z0) + 0.05, w = TRO.halfW * 2 + 0.02;
        const fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, len), troughMat); fl.position.set(xC, TRO.y - 0.035, czz); fl.castShadow = true; g.add(fl);
        [-(w / 2), (w / 2)].forEach((dx) => { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.06, len), troughMat); wall.position.set(xC + dx, TRO.y - 0.01, czz); g.add(wall); });
        return g;
      };
      const fillTrough = (g, xC, n) => {
        while (g.children.length) g.remove(g.children[0]);
        if (!n) return;
        const stations = Math.max(2, Math.round(n));
        for (let i = 0; i < stations; i++) {
          const f = i / (stations - 1);
          const z = TRO.z0 + 0.02 + (TRO.z1 - TRO.z0 - 0.04) * f;
          [-TRO.halfW * 0.55, TRO.halfW * 0.55].forEach((dx) => { const c = coalSphere(0.016 + Math.random() * 0.006); c.position.set(xC + dx + (Math.random() - 0.5) * 0.01, TRO.y - 0.005 + Math.random() * 0.012, z + (Math.random() - 0.5) * 0.015); g.add(c); });
        }
      };
      const fillOffset = (n, on) => {
        while (offsetFuel.children.length) offsetFuel.remove(offsetFuel.children[0]);
        if (!on) return;
        const coals = Math.max(4, Math.round(n * 2.2));
        for (let i = 0; i < coals; i++) { const c = coalSphere(0.015 + Math.random() * 0.007); c.position.set(OFF.x + (Math.random() - 0.5) * OFF.halfX * 1.7, OFF.y - 0.006 + Math.random() * 0.014, OFF.z + (Math.random() - 0.5) * OFF.halfZ * 1.7); offsetFuel.add(c); }
        const logs = Math.max(2, Math.round(n));
        for (let i = 0; i < logs; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.024, 0.024), woodMat); w.position.set(OFF.x + (Math.random() - 0.5) * OFF.halfX * 1.2, OFF.y + 0.02 + Math.random() * 0.012, OFF.z + (Math.random() - 0.5) * OFF.halfZ * 1.2); w.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3); w.castShadow = true; offsetFuel.add(w); }
      };
      const rebuildCoals = (n, on, mode) => {
        coalKey = n + ':' + on + ':' + mode;
        const grillFuel = on && mode !== 'smoke';   // two main-chamber troughs (nướng / kết hợp)
        const smokeFuel = on && mode !== 'grill';   // offset firebox (xông khói / kết hợp)
        fillTrough(coalsL, TRO.xL, grillFuel ? n : 0);
        fillTrough(coalsR, TRO.xR, grillFuel ? n : 0);
        fillOffset(n, smokeFuel);
      };

      // ---- particles: convection heat (curls from sides over the meat), smoke, grease drips ----
      const heatTex = softTexture(THREE, '255,150,54');
      const smokeTex = softTexture(THREE, '205,205,212');
      const mkPool = (n, tex, additive) => Array.from({ length: n }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); m.visible = false; scene.add(m); return { m, t: 0, life: 0, side: 1, z0: 0, o0: 0 }; });
      const heatPool = mkPool(40, heatTex, true);
      const smokePool = mkPool(20, smokeTex, false);
      const airTex = softTexture(THREE, '150,200,255');
      const airPool = mkPool(28, airTex, true);
      const grab = (p) => p.find((q) => !q.m.visible);
      const ovPos = (lx, ly, lz, out) => { out.set(lx, ly, lz); oven.localToWorld(out); return out; };
      const tmp = new THREE.Vector3();
      // forced air blown from the middle duct out to each coal trough (luồng gió thổi vào than)
      const spawnAir = (side) => {
        const q = grab(airPool); if (!q) return;
        q.side = side; q.z0 = (TRO.z0 + TRO.z1) / 2 + (Math.random() - 0.5) * 0.28;
        q.t = 0; q.life = 0.55 + Math.random() * 0.25; q.o0 = 0.5;
        q.m.visible = true;
      };
      const spawnHeat = (side) => {
        const q = grab(heatPool); if (!q) return;
        q.side = side; q.z0 = TRO.z0 + Math.random() * (TRO.z1 - TRO.z0);
        q.t = 0; q.life = 1.8 + Math.random() * 0.8; q.o0 = 0.30 + Math.random() * 0.12;
        q.m.visible = true;
      };
      const spawnSmoke = (heat) => {
        const q = grab(smokePool); if (!q) return;
        ovPos(CHIM.x, H * 1.0, CHIM.z, q.m.position); q.m.position.x += (Math.random() - 0.5) * 0.04;
        const s = 0.1 + Math.random() * 0.05; q.m.scale.set(s, s, 1); q.o0 = 0.22 + heat * 0.12; q.m.material.opacity = q.o0;
        q.t = 0; q.life = 2.3 + Math.random() * 0.8; q.m.visible = true;
      };
      const dripPool = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 6, 5), greaseMat); m.visible = false; oven.add(m); return { m, vy: 0 }; });
      const spawnDrip = (x, z) => { const q = dripPool.find((d) => !d.m.visible); if (!q) return; q.m.position.set(x, GRATE_Y - 0.02, z); q.vy = 0; q.m.visible = true; };

      // ---- camera (front 3/4, locked near the front so the cutaway always faces us) ----
      const camera = new THREE.PerspectiveCamera(31, 1, H / 100, H * 20);
      const target = new THREE.Vector3(0, H * 0.52, 0);
      const cam = { yaw: 0.5, pitch: 0.16, dist: H * 1.55 };
      const camDir = new THREE.Vector3(), cutPt = new THREE.Vector3();
      const applyCam = () => {
        cam.pitch = Math.max(-0.15, Math.min(0.9, cam.pitch));
        cam.dist = Math.max(H * 0.85, Math.min(H * 2.4, cam.dist));
        camera.position.set(target.x + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), target.y + cam.dist * Math.sin(cam.pitch), target.z + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw));
        camera.lookAt(target);
        // cutaway follows the camera: remove the near wall so the interior is always visible (full 360)
        camDir.set(camera.position.x - target.x, 0, camera.position.z - target.z).normalize();
        cutPt.set(target.x + camDir.x * 0.05, target.y, target.z + camDir.z * 0.05);
        clip.setFromNormalAndCoplanarPoint(camDir.clone().multiplyScalar(-1), cutPt);
      };
      let dragging = false, px = 0, py = 0;
      const el = renderer.domElement;
      el.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
      el.addEventListener('pointermove', (e) => { if (!dragging) return; cam.yaw -= (e.clientX - px) * 0.006; cam.pitch += (e.clientY - py) * 0.004; px = e.clientX; py = e.clientY; });
      const up = () => { dragging = false; el.style.cursor = 'grab'; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist *= e.deltaY > 0 ? 1.07 : 0.93; }, { passive: false });

      let W = 0, Hpx = 0;
      const onResize = () => { const r = this.getBoundingClientRect(); W = Math.max(1, r.width); Hpx = Math.max(1, r.height); renderer.setSize(W, Hpx, false); camera.aspect = W / Hpx; camera.updateProjectionMatrix(); };
      new ResizeObserver(onResize).observe(this); onResize();

      // ---- state + loop ----
      let S = { coalsIn: false, grateIn: false, coalAmount: 8, foods: [], grilling: false, lidClosed: false, temp: 28, doneness: 0, grease: 0, trayCycle: 0 };
      let lastRaw = '';
      let closeness = 0, gateGrate = 0;
      let smokeT = 0, heatT = 0, dripT = 0, trayCycleSeen = 0, trayT = -1;

      this._loadBox.remove();
      let lastT = performance.now();
      const frame = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        try {
          const raw2 = this._attr('sim-state');
          if (raw2 && raw2 !== lastRaw) {
            lastRaw = raw2;
            try { S = Object.assign(S, JSON.parse(raw2)); } catch (e) { /* mid-stream */ }
            const ck = S.coalAmount + ':' + S.coalsIn + ':' + (S.mode || 'grill'); if (ck !== coalKey) rebuildCoals(S.coalAmount, S.coalsIn, S.mode || 'grill');
            const fk = (S.foods || []).join(','); if (fk !== foodsKey) { foodsKey = fk; rebuildFoods(S.foods || []); }
            if ((S.trayCycle || 0) !== trayCycleSeen) { trayCycleSeen = S.trayCycle || 0; trayT = 0; }
          }
          const lp2 = (cur, tgt, sp) => cur + (tgt - cur) * Math.min(1, dt * sp);

          // lid open/close via the two real models (cutaway keeps the inside visible either way)
          closeness = lp2(closeness, S.lidClosed ? 1 : 0, 3.0);
          matOpen.opacity = Math.min(1, (1 - closeness) * 2.2);
          matClosed.opacity = Math.min(1, closeness * 2.2);
          openMesh.visible = closeness < 0.99;
          closedMesh.visible = closeness > 0.01;

          // install reveal
          const isSmokeMode = S.mode === 'smoke';
          coalsL.visible = S.coalsIn && !isSmokeMode; coalsR.visible = S.coalsIn && !isSmokeMode;
          offsetFuel.visible = S.coalsIn && S.mode !== 'grill';

          // heat / embers
          const heat = Math.max(0, Math.min(1, (S.temp - 40) / 200));
          const glow = S.coalsIn ? Math.max(0.25, heat) : 0;
          coalMat.emissiveIntensity = glow * 2.0;
          glowL.intensity = glowR.intensity = (isSmokeMode ? 0 : glow) * 1.3;
          glowOff.intensity = (S.mode !== 'grill' ? glow : 0) * 1.4;
          interiorFill.intensity = 0.35 + glow * 0.5;
          if (fanSpin && S.grilling) fanSpin.rotation.z -= dt * 16;
          if (fanLed) fanLed.material.color.setHex(S.grilling ? 0xff3322 : 0x551411);

          // grease accumulates as drips falling to the model's own bottom tray (no extra mesh)


          // foods grow-in + browning
          const cook = Math.max(0, Math.min(1, (S.doneness || 0) / 100));
          for (const f of foodEntries) {
            if (f.spawn < 1) { f.spawn = Math.min(1, f.spawn + dt * 3); f.ga.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - f.spawn, 3))); }
            f.m1.color.lerpColors(f.base, cookTarget, cook * 0.55);
          }

          // ---- particle spawns while grilling ----
          if (S.grilling) {
            heatT += dt; smokeT += dt; dripT += dt;
            if (!isSmokeMode && heatT > 0.06) { heatT = 0; spawnHeat(Math.random() < 0.5 ? -1 : 1); spawnAir(Math.random() < 0.5 ? -1 : 1); }
            if (smokeT > (S.mode !== 'grill' ? 0.06 : 0.16)) { smokeT = 0; spawnSmoke(S.mode !== 'grill' ? Math.max(heat, 0.55) : heat); }
            if (dripT > 0.34 && foodEntries.length) { dripT = 0; const f = foodEntries[Math.floor(Math.random() * foodEntries.length)]; spawnDrip(f.x, f.z); }
          }

          // forced air: streak from the centre duct sideways into each coal trough
          for (const q of airPool) if (q.m.visible) {
            q.t += dt; const u = q.t / q.life;
            if (u >= 1) { q.m.visible = false; continue; }
            const x = q.side * (0.03 + u * (TRO.xR - 0.03));   // duct edge -> trough
            ovPos(x, TRO.y - 0.01, q.z0, tmp); q.m.position.copy(tmp);
            const sc = 0.03 + u * 0.02; q.m.scale.set(sc, sc, 1);
            q.m.material.opacity = q.o0 * Math.sin(Math.PI * u) * (0.4 + glow * 0.6);
          }

          // heat convection: rise from a side trough, curl up & inward, swirl over the meat
          for (const q of heatPool) if (q.m.visible) {
            q.t += dt; const u = q.t / q.life;
            if (u >= 1) { q.m.visible = false; continue; }
            const ease = u * u * (3 - 2 * u);
            const y = TRO.y + ease * 0.30;                          // rise from coals up toward the lid
            const baseX = q.side * TRO.xR;                          // start at the side trough
            const r = (1 - ease * 0.78);                            // spiral inward toward centre
            const ang = (q.side > 0 ? 0 : Math.PI) + ease * Math.PI * q.side; // sweep up & over
            const x = baseX * r * Math.cos(ease * Math.PI) + Math.sin(q.t * 3 + q.z0) * 0.02;
            const z = q.z0 + Math.sin(ang) * 0.05;
            ovPos(x, y, z, tmp); q.m.position.copy(tmp);
            const sc = 0.06 + ease * 0.07; q.m.scale.set(sc, sc, 1);
            q.m.material.opacity = q.o0 * Math.sin(Math.PI * u) * (0.5 + glow * 0.5);
          }
          for (const q of smokePool) if (q.m.visible) {
            q.t += dt; q.m.position.y += dt * 0.55; q.m.position.x += dt * 0.03 + Math.sin(q.t * 1.7 + q.life) * dt * 0.05;
            const g = 1 + dt * 0.85; q.m.scale.x *= g; q.m.scale.y *= g; q.m.material.opacity = q.o0 * Math.max(0, 1 - q.t / q.life);
            if (q.t >= q.life) q.m.visible = false;
          }
          for (const q of dripPool) if (q.m.visible) {
            q.vy += dt * 0.9; q.m.position.y -= q.vy * dt + 0.004;
            if (q.m.position.y <= TRAY_Y + 0.03) q.m.visible = false;   // lands in the bottom tray
          }

          if (!dragging) cam.yaw += dt * 0.04 * Math.cos(now / 2600); // gentle idle sway
          camFill.position.copy(camera.position); camFill.target.position.copy(target); camFill.target.updateMatrixWorld();
          applyCam();
          renderer.render(scene, camera);
        } catch (err) { console.error('[grill-sim] frame: ' + (err && err.message ? err.message : err)); }
      };
      applyCam(); renderer.render(scene, camera);
      this._timer = setInterval(frame, 33);
    }
    disconnectedCallback() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  }
  customElements.define('grill-sim', GrillSim);
})();
