/* <stl-viewer> — showroom-style 3D viewer for binary STL files.
 * Attributes:
 *   src          URL of the .stl file (binary)
 *   color        hex body color (default #16161a)
 *   start-yaw    initial yaw in degrees (default 30)
 *   start-pitch  initial pitch in degrees (default 12)
 *   hotspots     JSON: [{f:[fx,fy,fz], t:"Title", d:"Description"}] with
 *                fractions of the oriented bounding box (y = up).
 */
(function () {
  if (customElements.get('stl-viewer')) return;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

  function parseBinarySTL(buffer, THREE) {
    const dv = new DataView(buffer);
    const tris = dv.getUint32(80, true);
    const pos = new Float32Array(tris * 9);
    let off = 84;
    for (let i = 0; i < tris; i++) {
      off += 12; // skip facet normal — recomputed later
      for (let v = 0; v < 3; v++) {
        const j = i * 9 + v * 3;
        pos[j] = dv.getFloat32(off, true);
        pos[j + 1] = dv.getFloat32(off + 4, true);
        pos[j + 2] = dv.getFloat32(off + 8, true);
        off += 12;
      }
      off += 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  class STLViewer extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const cs = getComputedStyle(this);
      if (cs.display === 'inline') this.style.display = 'block';
      if (cs.position === 'static') this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.style.touchAction = 'pan-y';
      // ensure the element fills its mount even when the parent sizes via inset
      const r = this.getBoundingClientRect();
      if (r.height < 10) { this.style.width = '100%'; this.style.height = '100%'; }
      this._buildOverlay();
      this._boot().catch((e) => {
        console.error('[stl-viewer] ' + String(e) + ' | ' + (e && e.message) + ' | ' + (e && e.stack ? e.stack.split('\n')[0] : ''));
        this._loadBox.innerHTML = '<div style="color:#f4f4f4;font:500 14px/1.5 system-ui">Không tải được mô hình 3D.<br><span style="opacity:.6">' + (e && e.message ? e.message : e) + '</span></div>';
      });
    }

    _buildOverlay() {
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:3;pointer-events:none;text-align:center;padding:24px';
      box.innerHTML =
        '<div style="width:46px;height:46px;border-radius:50%;border:2px solid rgba(244,123,32,.25);border-top-color:#F47B20;animation:stlv-spin 0.9s linear infinite"></div>' +
        '<div data-msg style="color:rgba(255,255,255,.75);font:500 13px/1.4 system-ui;letter-spacing:.04em">Đang tải mô hình 3D…</div>' +
        '<div style="width:180px;height:3px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden"><div data-bar style="height:100%;width:0%;background:#F47B20;border-radius:99px;transition:width .15s"></div></div>';
      const st = document.createElement('style');
      st.textContent = '@keyframes stlv-spin{to{transform:rotate(360deg)}}@keyframes stlv-pulse{0%{box-shadow:0 0 0 0 rgba(244,123,32,.55)}70%{box-shadow:0 0 0 12px rgba(244,123,32,0)}100%{box-shadow:0 0 0 0 rgba(244,123,32,0)}}';
      this.appendChild(st);
      this.appendChild(box);
      this._loadBox = box;
      this._bar = box.querySelector('[data-bar]');
      this._msg = box.querySelector('[data-msg]');
    }

    _attr(name) {
      // x-import may apply props as attributes (kebab stripped: model-src -> modelsrc), properties, or late
      const cands = [name, name.replace(/-/g, ''), name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())];
      for (const n of cands) {
        const a = this.getAttribute(n);
        if (a !== null && a !== undefined && a !== '') return a;
      }
      for (const n of cands) {
        const p = this[n];
        if (p !== undefined && p !== null) return String(p);
      }
      return null;
    }

    async _boot() {
      // wait up to 8s for the src attribute/prop to be applied
      for (let i = 0; i < 160 && !(this._attr('model-src') || this._attr('src')); i++) await new Promise((r) => setTimeout(r, 50));
      let THREE;
      try {
        THREE = await import(/* webpackIgnore: true */ THREE_URL);
      } catch (e1) {
        console.warn('[stl-viewer] esm import failed, trying unpkg…', String(e1));
        THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
      }
      let src = this._attr('model-src') || this._attr('src');
      if (window.__resources && src && /tk65l\.stl$/.test(src)) src = window.__resources.stlOpen || src;
      if (!src) {
        const attrs = Array.from(this.attributes).map((a) => a.name + '=' + a.value).join(' ');
        const keys = Object.keys(this).join(',');
        console.warn('[stl-viewer debug] attrs=[' + attrs + '] ownKeys=[' + keys + '] parent=' + (this.parentElement ? this.parentElement.tagName + '/' + (this.parentElement.className || '') : 'none'));
        throw new Error('thiếu thuộc tính model-src');
      }

      // ---- fetch with progress ----
      const res = await fetch(src);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = +res.headers.get('Content-Length') || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total) this._bar.style.width = Math.round((got / total) * 100) + '%';
      }
      this._msg.textContent = 'Đang dựng mô hình…';
      this._bar.style.width = '100%';
      await new Promise((r) => setTimeout(r, 30));
      const buf = new Uint8Array(got);
      let p = 0;
      for (const c of chunks) { buf.set(c, p); p += c.length; }

      const geo = parseBinarySTL(buf.buffer, THREE);

      // ---- orient: longest bbox axis becomes +Y (up) ----
      geo.computeBoundingBox();
      let bb = geo.boundingBox;
      const ext = new THREE.Vector3().subVectors(bb.max, bb.min);
      if (ext.z >= ext.x && ext.z >= ext.y) geo.rotateX(-Math.PI / 2);
      else if (ext.x >= ext.y && ext.x >= ext.z) geo.rotateZ(Math.PI / 2);
      geo.computeBoundingBox();
      bb = geo.boundingBox;
      const center = new THREE.Vector3();
      bb.getCenter(center);
      geo.translate(-center.x, -bb.min.y, -center.z);
      geo.computeBoundingBox();
      bb = geo.boundingBox;
      let size = new THREE.Vector3().subVectors(bb.max, bb.min);
      // STL from CAD is usually in mm — normalize to meters so physical lights behave
      if (Math.max(size.x, size.y, size.z) > 100) {
        geo.scale(0.001, 0.001, 0.001);
        geo.computeBoundingBox();
        bb = geo.boundingBox;
        size = new THREE.Vector3().subVectors(bb.max, bb.min);
      }
      const radius = Math.max(size.x, size.y, size.z);

      // ---- scene ----
      const scene = new THREE.Scene();
      const bodyColor = this._attr('color') || '#161618';
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bodyColor),
        metalness: 0.42,
        roughness: 0.52,
        envMapIntensity: 1.0,
        flatShading: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      const turntable = new THREE.Group();
      turntable.add(mesh);
      scene.add(turntable);

      // ---- split out the 2 coal cages + grate for the install demo ----
      // (same anatomy as grill-sim: chamber |x|<0.155 |z|<0.335, grate y 0.735-0.825, cages y 0.555-0.735 with |z|>0.06)
      let demoParts = null;
      try {
        const pa = geo.attributes.position.array;
        const buckets = { rest: [], grate: [], cageL: [], cageR: [] };
        for (let i = 0; i < pa.length; i += 9) {
          const cx = (pa[i] + pa[i + 3] + pa[i + 6]) / 3;
          const cy = (pa[i + 1] + pa[i + 4] + pa[i + 7]) / 3;
          const cz = (pa[i + 2] + pa[i + 5] + pa[i + 8]) / 3;
          let k = 'rest';
          if (Math.abs(cx) < 0.155 && Math.abs(cz) < 0.335) {
            if (cy > 0.735 && cy < 0.825) k = 'grate';
            else if (cy > 0.555 && cy <= 0.735) { if (cx < -0.06) k = 'cageL'; else if (cx > 0.06) k = 'cageR'; }
          }
          for (let a = 0; a < 9; a++) buckets[k].push(pa[i + a]);
        }
        if (buckets.grate.length && buckets.cageL.length && buckets.cageR.length) {
          const geoOf = (arr) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
            g.computeVertexNormals();
            return g;
          };
          mesh.geometry = geoOf(buckets.rest);
          const cageMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, metalness: 0.5, roughness: 0.5 });
          const grateMat = new THREE.MeshStandardMaterial({ color: 0x55555e, metalness: 0.75, roughness: 0.38 });
          const mk = (g, m2) => { const x = new THREE.Mesh(g, m2); x.castShadow = true; turntable.add(x); return x; };
          demoParts = {
            cageL: mk(geoOf(buckets.cageL), cageMat),
            cageR: mk(geoOf(buckets.cageR), cageMat),
            grate: mk(geoOf(buckets.grate), grateMat),
          };
          // glowing charcoal sitting in the two side cartridges (±x columns)
          const coalMat = new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 0.9, emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0 });
          const coalsGrp = new THREE.Group();
          turntable.add(coalsGrp);
          [-0.12, 0.12].forEach((xCol) => {
            for (let i = 0; i < 10; i++) {
              const row = Math.floor(i / 4), col = i % 4;
              const c = new THREE.Mesh(new THREE.SphereGeometry(0.022, 9, 7), coalMat);
              c.castShadow = true;
              c.position.set(xCol + ((col % 2) ? 0.018 : -0.018), 0.595 + row * 0.04, -0.18 + col * 0.12);
              coalsGrp.add(c);
            }
          });
          // warm light from each coal bed
          const cgl = new THREE.PointLight(0xff6a1f, 0.6, radius * 0.8, 2); cgl.position.set(-0.12, 0.64, 0); turntable.add(cgl);
          const cgr = new THREE.PointLight(0xff6a1f, 0.6, radius * 0.8, 2); cgr.position.set(0.12, 0.64, 0); turntable.add(cgr);
          demoParts.coals = coalsGrp;
        }
      } catch (e) { console.warn('[stl-viewer] demo split failed', e); }

      // ---- fan + controls overlaid on the model's (empty) fan box ----
      // fan box opening centre, found by inspection (model-local, metres)
      const FB = { x: 0, y: 0.50, z: 0.225 };
      let fanSpin = null;
      try {
        const grp = new THREE.Group();
        grp.position.set(FB.x, FB.y, FB.z);
        turntable.add(grp);
        // spinning blades, recessed slightly into the housing
        const fan = new THREE.Group();
        fan.position.z = -0.014;
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x33333a, metalness: 0.6, roughness: 0.42, side: THREE.DoubleSide });
        for (let i = 0; i < 7; i++) {
          const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.05), bladeMat);
          const a = (i / 7) * Math.PI * 2;
          bl.position.set(Math.sin(a) * 0.022, Math.cos(a) * 0.022, 0);
          bl.rotation.z = -a; bl.rotation.y = 0.6;
          bl.castShadow = true;
          fan.add(bl);
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 12), new THREE.MeshStandardMaterial({ color: 0x18181c, metalness: 0.7, roughness: 0.35 }));
        hub.rotation.x = Math.PI / 2; fan.add(hub);
        grp.add(fan);
        fanSpin = fan;
        // control column to the right of the fan (knob, red LED, DC jack, USB-C)
        const colX = 0.062;
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.016, 18), new THREE.MeshStandardMaterial({ color: 0x18181c, metalness: 0.55, roughness: 0.4 }));
        knob.rotation.x = Math.PI / 2; knob.position.set(colX, 0.035, 0.006); knob.castShadow = true; grp.add(knob);
        const led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), new THREE.MeshBasicMaterial({ color: 0xff3322 }));
        led.position.set(colX, -0.002, 0.012); grp.add(led);
        const ringM = new THREE.MeshStandardMaterial({ color: 0x46464e, metalness: 0.7, roughness: 0.4 });
        const portM = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.3, roughness: 0.6 });
        const dcRing = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0024, 8, 16), ringM);
        dcRing.position.set(colX - 0.012, -0.04, 0.011); grp.add(dcRing);
        const dc = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 14), portM); dc.position.set(colX - 0.012, -0.04, 0.011); grp.add(dc);
        const usbH = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.006), ringM); usbH.position.set(colX + 0.014, -0.04, 0.011); grp.add(usbH);
        const usb = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.0045), portM); usb.position.set(colX + 0.014, -0.04, 0.0145); grp.add(usb);
      } catch (e) { console.warn('[stl-viewer] fan overlay failed', e); }

      // floor (soft shadow catcher)
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 1.6, 64),
        new THREE.ShadowMaterial({ opacity: 0.45 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // lights — showroom rig, anchored around the default viewing angle
      const yaw0 = (+this._attr('start-yaw') || 30) * Math.PI / 180;
      const lp = (offDeg, dist, h) => {
        const a = yaw0 + offDeg * Math.PI / 180;
        return [Math.sin(a) * radius * dist, radius * h, Math.cos(a) * radius * dist];
      };
      scene.add(new THREE.HemisphereLight(0x9aa3b5, 0x18120c, 0.85));
      const key = new THREE.DirectionalLight(0xfff2e2, 3.4);
      key.position.set(...lp(38, 1.4, 1.6));
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      const sc = key.shadow.camera;
      sc.left = sc.bottom = -radius * 1.5; sc.right = sc.top = radius * 1.5;
      sc.near = 0.1; sc.far = radius * 8;
      key.shadow.bias = -0.0004;
      scene.add(key);
      const rimL = new THREE.SpotLight(0xf47b20, 26, 0, Math.PI / 4, 0.6, 1.6);
      rimL.position.set(...lp(155, 1.7, 0.9));
      rimL.target.position.set(0, size.y * 0.5, 0);
      scene.add(rimL); scene.add(rimL.target);
      const rimR = new THREE.SpotLight(0x6f87ff, 14, 0, Math.PI / 4, 0.7, 1.6);
      rimR.position.set(...lp(-150, 1.7, 0.6));
      rimR.target.position.set(0, size.y * 0.5, 0);
      scene.add(rimR); scene.add(rimR.target);
      const fill = new THREE.DirectionalLight(0xffffff, 1.0);
      fill.position.set(...lp(-45, 1.4, 0.7));
      scene.add(fill);

      // ---- renderer / camera ----
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1';
      this.appendChild(renderer.domElement);

      // studio environment for metallic reflections (mini "room" scene -> PMREM)
      {
        const env = new THREE.Scene();
        env.background = new THREE.Color(0x0a0a0b);
        const panel = (hex, inten, x, y, z, sx, sy, sz, ry) => {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(sx, sy, sz),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(inten) })
          );
          m.position.set(x, y, z);
          if (ry) m.rotation.y = ry;
          env.add(m);
        };
        panel(0xffffff, 6, 0, 6, 0, 6, 0.2, 6);          // bright ceiling softbox
        panel(0xfff1e0, 4, -5, 2.5, 2, 0.2, 3, 4);        // warm left strip
        panel(0xdfe6f5, 2.5, 5, 2, -1, 0.2, 2.5, 5);      // cool right strip
        panel(0xf47b20, 1.4, 0, 2, -6, 5, 2, 0.2);       // orange back accent
        panel(0x404040, 1, 0, -0.1, 0, 12, 0.1, 12);      // floor bounce
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(env, 0.03).texture;
        pmrem.dispose();
      }

      const camera = new THREE.PerspectiveCamera(33, 1, radius / 100, radius * 20);
      const target = new THREE.Vector3(0, size.y * 0.42, 0);

      const st = {
        yaw: (+this._attr('start-yaw') || 30) * Math.PI / 180,
        pitch: (+this._attr('start-pitch') || 12) * Math.PI / 180,
        dist: radius * 2.4,
        vyaw: 0, vpitch: 0,
        auto: true, lastInteract: 0,
      };
      const distMin = radius * 1.2, distMax = radius * 3.4;

      const applyCam = () => {
        const cp = Math.max(-0.1, Math.min(1.25, st.pitch));
        st.pitch = cp;
        // fixed studio camera azimuth; the model itself sits on a turntable
        camera.position.set(
          target.x + st.dist * Math.cos(cp) * Math.sin(yaw0),
          target.y + st.dist * Math.sin(cp),
          target.z + st.dist * Math.cos(cp) * Math.cos(yaw0)
        );
        camera.lookAt(target);
        turntable.rotation.y = st.yaw - yaw0;
      };

      // ---- interaction ----
      let dragging = false, px = 0, py = 0, moved = false;
      const el = renderer.domElement;
      el.style.cursor = 'grab';
      el.addEventListener('pointerdown', (e) => {
        dragging = true; moved = false; px = e.clientX; py = e.clientY;
        st.auto = false; st.lastInteract = performance.now();
        el.setPointerCapture(e.pointerId);
        el.style.cursor = 'grabbing';
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - px, dy = e.clientY - py;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        px = e.clientX; py = e.clientY;
        st.yaw -= dx * 0.0055;
        st.pitch += dy * 0.004;
        st.vyaw = -dx * 0.0055; st.vpitch = dy * 0.004;
        st.lastInteract = performance.now();
        this._hideHint();
      });
      const endDrag = () => { dragging = false; el.style.cursor = 'grab'; st.lastInteract = performance.now(); };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
      el.addEventListener('dblclick', () => {
        st.yaw = (+this._attr('start-yaw') || 30) * Math.PI / 180;
        st.pitch = (+this._attr('start-pitch') || 12) * Math.PI / 180;
        st.dist = radius * 2.4;
      });

      // zoom buttons
      const ctr = document.createElement('div');
      ctr.style.cssText = 'position:absolute;right:14px;bottom:14px;display:flex;gap:8px;z-index:4';
      const mkBtn = (label, title) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.title = title;
        b.style.cssText = 'width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(12,12,13,.72);backdrop-filter:blur(6px);color:#eee;font:600 17px/1 system-ui;cursor:pointer;transition:border-color .15s,color .15s';
        b.onmouseenter = () => { b.style.borderColor = '#F47B20'; b.style.color = '#F47B20'; };
        b.onmouseleave = () => { b.style.borderColor = 'rgba(255,255,255,.16)'; b.style.color = '#eee'; };
        ctr.appendChild(b);
        return b;
      };
      mkBtn('−', 'Thu nhỏ').onclick = () => { st.dist = Math.min(distMax, st.dist * 1.18); };
      mkBtn('+', 'Phóng to').onclick = () => { st.dist = Math.max(distMin, st.dist / 1.18); };
      mkBtn('⟳', 'Tự xoay').onclick = () => { st.auto = true; st.lastInteract = 0; };
      this.appendChild(ctr);

      // ---- install demo (2 coal cages -> grate) ----
      const demo = { t: -1 };
      let demoBtn = null, demoCaption = null;
      if (demoParts) {
        demoBtn = document.createElement('button');
        demoBtn.textContent = '▶ Xem lắp hộc than & vỉ';
        demoBtn.style.cssText = 'position:absolute;left:14px;bottom:14px;z-index:4;height:38px;padding:0 16px;border-radius:10px;border:1px solid rgba(244,123,32,.55);background:rgba(12,12,13,.72);backdrop-filter:blur(6px);color:#F47B20;font:700 12.5px/1 system-ui;letter-spacing:.03em;cursor:pointer;transition:background .15s';
        demoBtn.onmouseenter = () => { demoBtn.style.background = 'rgba(244,123,32,.18)'; };
        demoBtn.onmouseleave = () => { demoBtn.style.background = 'rgba(12,12,13,.72)'; };
        demoBtn.onclick = () => {
          demo.t = 0;
          st.auto = false; st.lastInteract = performance.now() + 9000;
          demoBtn.disabled = true; demoBtn.style.opacity = '.45';
          this._hideHint();
        };
        this.appendChild(demoBtn);
        demoCaption = document.createElement('div');
        demoCaption.style.cssText = 'position:absolute;left:50%;top:16px;transform:translateX(-50%);z-index:4;color:#F5F3EF;font:600 13px/1.3 system-ui;letter-spacing:.05em;padding:9px 18px;border:1px solid rgba(244,123,32,.5);border-radius:99px;background:rgba(12,12,13,.78);backdrop-filter:blur(6px);pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap';
        this.appendChild(demoCaption);
      }

      // drag hint
      const hint = document.createElement('div');
      hint.textContent = 'Kéo để xoay 360°';
      hint.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:4;color:rgba(255,255,255,.55);font:500 12px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;padding:8px 14px;border:1px solid rgba(255,255,255,.12);border-radius:99px;background:rgba(12,12,13,.55);backdrop-filter:blur(6px);pointer-events:none;transition:opacity .5s';
      this.appendChild(hint);
      this._hideHint = () => { hint.style.opacity = '0'; };

      // ---- hotspots ----
      let hotspots = [];
      try {
        const raw = this._attr('hotspots');
        hotspots = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(this.hotspots) ? this.hotspots : []);
      } catch (e) { /* ignore */ }
      const hsLayer = document.createElement('div');
      hsLayer.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none';
      this.appendChild(hsLayer);
      const card = document.createElement('div');
      card.style.cssText = 'position:absolute;z-index:5;max-width:240px;background:rgba(15,15,16,.92);backdrop-filter:blur(8px);border:1px solid rgba(244,123,32,.45);border-radius:12px;padding:12px 14px;color:#fff;display:none;pointer-events:none;box-shadow:0 12px 32px rgba(0,0,0,.5)';
      this.appendChild(card);
      let activeHS = -1;
      const hsEls = hotspots.map((h, i) => {
        const d = document.createElement('button');
        d.setAttribute('aria-label', h.t);
        d.style.cssText = 'position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #F47B20;background:rgba(12,12,13,.85);color:#F47B20;font:700 11px/1 system-ui;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;animation:stlv-pulse 2.4s ease-out infinite;animation-delay:' + (i * 0.3) + 's;transition:transform .15s,background .15s,color .15s';
        d.textContent = i + 1;
        d.onmouseenter = () => { d.style.transform = 'scale(1.25)'; };
        d.onmouseleave = () => { d.style.transform = 'scale(1)'; };
        d.onclick = (e) => {
          e.stopPropagation();
          activeHS = activeHS === i ? -1 : i;
          if (activeHS === i) {
            card.innerHTML = '<div style="font:700 13px/1.3 system-ui;color:#F47B20;letter-spacing:.02em;margin-bottom:4px">' + h.t + '</div><div style="font:400 12.5px/1.5 system-ui;color:rgba(255,255,255,.82)">' + (h.d || '') + '</div>';
            card.style.display = 'block';
          } else card.style.display = 'none';
        };
        hsLayer.appendChild(d);
        return d;
      });
      el.addEventListener('pointerup', () => { if (!moved) { activeHS = -1; card.style.display = 'none'; } });

      const v3 = new THREE.Vector3();
      const camDir = new THREE.Vector3();
      const updateHotspots = (w, h) => {
        if (!hotspots.length) return;
        camera.getWorldDirection(camDir);
        for (let i = 0; i < hotspots.length; i++) {
          const f = hotspots[i].f;
          v3.set(bb.min.x + f[0] * size.x, bb.min.y + f[1] * size.y, bb.min.z + f[2] * size.z);
          v3.applyMatrix4(turntable.matrixWorld);
          const worldX = v3.x, worldY = v3.y, worldZ = v3.z;
          // visibility: near half of the model relative to camera
          const toC = (worldX - target.x) * camDir.x + (worldY - target.y) * camDir.y + (worldZ - target.z) * camDir.z;
          v3.project(camera);
          const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
          const vis = v3.z < 1 && toC < radius * 0.12;
          const d = hsEls[i];
          d.style.left = sx + 'px';
          d.style.top = sy + 'px';
          d.style.opacity = vis ? '1' : '0';
          d.style.pointerEvents = vis ? 'auto' : 'none';
          if (i === activeHS) {
            if (!vis) { card.style.display = 'none'; activeHS = -1; }
            else {
              card.style.display = 'block';
              const cw = card.offsetWidth, chh = card.offsetHeight;
              let cx = sx + 18, cy = sy - chh / 2;
              if (cx + cw > w - 8) cx = sx - cw - 18;
              cy = Math.max(8, Math.min(h - chh - 8, cy));
              card.style.left = cx + 'px';
              card.style.top = cy + 'px';
            }
          }
        }
      };

      // ---- resize ----
      let W = 0, H = 0;
      const onResize = () => {
        const r = this.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      };
      new ResizeObserver(onResize).observe(this);
      onResize();

      // pause rendering when scrolled out of view (rect check — IO is unreliable in embedded previews)
      let onScreen = true, visCheck = 0;
      const checkVis = () => {
        const r = this.getBoundingClientRect();
        onScreen = r.bottom > -150 && r.top < (window.innerHeight || 9999) + 150 && r.width > 0;
      };
      checkVis();

      // ---- loop ----
      this._loadBox.remove();
      let lastT = performance.now();
      const tick = (t) => {
        requestAnimationFrame(tick);
        const dt = Math.min(0.05, (t - lastT) / 1000);
        lastT = t;
        if (++visCheck >= 12) { visCheck = 0; checkVis(); }
        if (!onScreen) return;
        if (fanSpin) fanSpin.rotation.z -= dt * 6;
        if (!dragging) {
          st.yaw += st.vyaw; st.pitch += st.vpitch;
          st.vyaw *= 0.92; st.vpitch *= 0.92;
          if (!st.auto && t - st.lastInteract > 4000) st.auto = true;
          if (st.auto) st.yaw += dt * 0.25;
        }
        // install demo timeline
        if (demoParts && demo.t >= 0) {
          demo.t += dt;
          const ease = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
          const kL = ease(demo.t / 1.1);
          const kR = ease((demo.t - 1.25) / 1.1);
          const kG = ease((demo.t - 2.5) / 1.1);
          const place = (m, k) => {
            m.visible = k > 0.01;
            m.position.y = (1 - k) * 0.55;
            m.material.transparent = k < 1;
            m.material.opacity = Math.min(1, k * 2.5);
          };
          place(demoParts.cageL, kL);
          place(demoParts.cageR, kR);
          place(demoParts.grate, kG);
          // coals ride down with the side cartridges (visible once both are seated)
          if (demoParts.coals) {
            const kC = Math.min(kL, kR);
            demoParts.coals.visible = kC > 0.3;
            demoParts.coals.position.y = (1 - kC) * 0.55;
          }
          // steer the camera to look into the chamber
          st.pitch += (0.52 - st.pitch) * Math.min(1, dt * 2);
          st.dist += (radius * 2.0 - st.dist) * Math.min(1, dt * 2);
          if (demoCaption) {
            const cap = demo.t < 1.25 ? 'Bước 1/3 — Lắp hộc than thứ nhất' :
              demo.t < 2.5 ? 'Bước 2/3 — Lắp hộc than thứ hai' :
              demo.t < 3.8 ? 'Bước 3/3 — Đặt vỉ nướng 55×37 cm' :
              '✓ 2 hộc than 2 bên · mỡ rơi khay giữa, không chạm than';
            if (demoCaption.textContent !== cap) demoCaption.textContent = cap;
            demoCaption.style.opacity = demo.t < 6.2 ? '1' : '0';
          }
          if (demo.t > 6.6) {
            demo.t = -1;
            if (demoBtn) { demoBtn.disabled = false; demoBtn.style.opacity = '1'; demoBtn.textContent = '↺ Xem lại lắp đặt'; }
            st.auto = true; st.lastInteract = 0;
          }
        }
        applyCam();
        renderer.render(scene, camera);
        updateHotspots(W, H);
      };
      requestAnimationFrame(tick);
    }
  }

  customElements.define('stl-viewer', STLViewer);
})();
