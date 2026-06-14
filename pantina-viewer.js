/* Pantina 3D demo room — React component (global: window.PantinaViewer)
   Loads three.js (UMD r149), renders segmented STL parts.
   Features: 2 materials, charcoal & meat amounts, fire/smoke/fan, chimney damper,
   lid open/close, glass door, removable inox plates, pull-out grease & ash trays,
   chimney removal, folding legs, power bank + USB-C cable, procedural sound. */
(function () {
  var React = window.React;

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
  var threePromise = null;
  function loadThree() {
    if (window.THREE) return Promise.resolve();
    if (!threePromise) {
      threePromise = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = THREE_URL;
        s.onload = function () { res(); };
        s.onerror = function () { rej(new Error('Không tải được three.js')); };
        document.head.appendChild(s);
      });
    }
    return threePromise;
  }

  function fetchF32(url) {
    var store = window.__PANTINA_BINS;
    if (store && store[url]) {
      return Promise.resolve().then(function () {
        var bin = atob(store[url]);
        var n = bin.length;
        var bytes = new Uint8Array(n);
        for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
        return new Float32Array(bytes.buffer);
      });
    }
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Không tải được ' + url);
      return r.arrayBuffer();
    }).then(function (b) { return new Float32Array(b); });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- canvas textures ----------
  function makeEnvTexture(THREE) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#23272e'); g.addColorStop(0.55, '#101318'); g.addColorStop(1, '#050608');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    x.filter = 'blur(14px)';
    x.fillStyle = 'rgba(255,250,240,0.85)'; x.fillRect(60, 28, 130, 38);
    x.fillStyle = 'rgba(200,215,235,0.55)'; x.fillRect(330, 50, 110, 26);
    x.fillStyle = 'rgba(255,210,160,0.35)'; x.fillRect(230, 95, 70, 16);
    x.filter = 'none';
    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }
  function radialTex(THREE, inner, mid, size) {
    var c = document.createElement('canvas'); c.width = c.height = size || 64;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    g.addColorStop(0, inner); g.addColorStop(0.4, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }
  function coalTexture(THREE, lit) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = lit ? '#0a0505' : '#0c0c0e'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 260; i++) {
      var r = 3 + Math.random() * 9;
      var cx = Math.random() * 256, cy = Math.random() * 256;
      var heat = Math.random();
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      var col;
      if (lit) col = heat > 0.7 ? '255,180,80' : heat > 0.35 ? '255,98,20' : '120,28,8';
      else col = heat > 0.7 ? '74,76,82' : heat > 0.35 ? '52,54,58' : '34,35,38';
      g.addColorStop(0, 'rgba(' + col + ',0.95)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // gauge dial face: 0..500°C, gap at bottom
  function gaugeFaceTexture(THREE) {
    var S = 320, c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d'), cx = S / 2, cy = S / 2, R = S / 2;
    // face
    var g = x.createRadialGradient(cx, cy - 30, 20, cx, cy, R);
    g.addColorStop(0, '#22211f'); g.addColorStop(0.7, '#15140f'); g.addColorStop(1, '#050504');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 6.3); x.fill();
    // bezel
    x.lineWidth = 14; x.strokeStyle = '#d7d9dd'; x.beginPath(); x.arc(cx, cy, R - 9, 0, 6.3); x.stroke();
    x.lineWidth = 4; x.strokeStyle = '#76787c'; x.beginPath(); x.arc(cx, cy, R - 18, 0, 6.3); x.stroke();
    function ang(v) { return (225 - (v / 500) * 270) * Math.PI / 180; } // y-up math degrees
    function pt(a, rr) { return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; }
    // ticks
    for (var v = 0; v <= 500; v += 25) {
      var a = ang(v), major = v % 100 === 0, tr = R - 26;
      var p1 = pt(a, tr), p2 = pt(a, tr - (major ? 26 : 14));
      x.lineWidth = major ? 4 : 2;
      x.strokeStyle = v >= 350 ? '#f4661f' : '#e9e6df';
      x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke();
      if (major) {
        var lp = pt(a, tr - 48);
        x.fillStyle = v >= 350 ? '#f4661f' : '#e9e6df';
        x.font = '700 30px "Be Vietnam Pro", sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(v), lp[0], lp[1]);
      }
    }
    x.fillStyle = '#9a948a'; x.font = '600 20px "Be Vietnam Pro", sans-serif';
    x.textAlign = 'center'; x.fillText('°C', cx, cy + 56);
    x.fillStyle = '#f4661f'; x.font = '700 15px "Be Vietnam Pro", sans-serif';
    x.fillText('PANTINA', cx, cy - 60);
    var t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  // ember wall seen through the glass door: dense glowing coals (lit) / grey lumps (dark)
  function emberWallTexture(THREE, lit) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 128;
    var x = c.getContext('2d');
    x.fillStyle = lit ? '#1a0500' : '#0e0d0c'; x.fillRect(0, 0, 512, 128);
    for (var i = 0; i < 240; i++) {
      var cx = Math.random() * 512, cy = 18 + Math.random() * 110, r = 7 + Math.random() * 13;
      var heat = Math.random();
      var g = x.createRadialGradient(cx, cy, 1, cx, cy, r);
      if (lit) {
        if (heat > 0.75) { g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.35, '#ffb23c'); g.addColorStop(0.75, '#e3470e'); g.addColorStop(1, 'rgba(120,20,0,0)'); }
        else if (heat > 0.4) { g.addColorStop(0, '#ffb23c'); g.addColorStop(0.5, '#f4661f'); g.addColorStop(1, 'rgba(110,18,0,0)'); }
        else { g.addColorStop(0, '#d8430f'); g.addColorStop(0.6, '#7a1d04'); g.addColorStop(1, 'rgba(40,8,0,0)'); }
      } else {
        var v = 40 + Math.round(heat * 28);
        g.addColorStop(0, 'rgb(' + (v + 18) + ',' + (v + 14) + ',' + (v + 10) + ')');
        g.addColorStop(0.7, 'rgb(' + v + ',' + (v - 3) + ',' + (v - 6) + ')');
        g.addColorStop(1, 'rgba(10,10,10,0)');
      }
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill();
    }
    if (lit) {
      var tg = x.createLinearGradient(0, 0, 0, 42);
      tg.addColorStop(0, 'rgba(255,150,40,0.55)'); tg.addColorStop(1, 'rgba(255,80,10,0)');
      x.fillStyle = tg; x.fillRect(0, 0, 512, 42);
    }
    return new THREE.CanvasTexture(c);
  }

  // ---------- procedural audio ----------
  function makeAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    function noiseBuf(sec) {
      var n = Math.max(1, Math.floor(ctx.sampleRate * sec));
      var b = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    var master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    var loopBuf = noiseBuf(2.0);
    // fan rumble
    var fanSrc = ctx.createBufferSource(); fanSrc.buffer = loopBuf; fanSrc.loop = true;
    var fanLp = ctx.createBiquadFilter(); fanLp.type = 'lowpass'; fanLp.frequency.value = 180; fanLp.Q.value = 0.7;
    var fanGain = ctx.createGain(); fanGain.gain.value = 0;
    fanSrc.connect(fanLp); fanLp.connect(fanGain); fanGain.connect(master); fanSrc.start();
    // sizzle
    var sizSrc = ctx.createBufferSource(); sizSrc.buffer = loopBuf; sizSrc.loop = true;
    var sizHp = ctx.createBiquadFilter(); sizHp.type = 'highpass'; sizHp.frequency.value = 3400;
    var sizGain = ctx.createGain(); sizGain.gain.value = 0;
    sizSrc.connect(sizHp); sizHp.connect(sizGain); sizGain.connect(master); sizSrc.start();
    var shortBuf = noiseBuf(0.15);
    return {
      ctx: ctx, fanGain: fanGain, fanLp: fanLp, sizGain: sizGain,
      crackle: function (inten) {
        var d = 0.04 + Math.random() * 0.08;
        var src = ctx.createBufferSource(); src.buffer = shortBuf;
        var f = ctx.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.value = 220 + Math.random() * 950; f.Q.value = 2.5;
        var g = ctx.createGain();
        var t0 = ctx.currentTime;
        g.gain.setValueAtTime(0.001, t0);
        g.gain.exponentialRampToValueAtTime(0.035 + 0.2 * inten, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t0); src.stop(t0 + d + 0.05);
      },
      dispose: function () { try { ctx.close(); } catch (e) {} }
    };
  }

  // ---------- main imperative scene ----------
  function initScene(host, propsRef) {
    var THREE = window.THREE;
    var disposed = false;

    while (host.firstChild) host.removeChild(host.firstChild);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;';
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(makeEnvTexture(THREE)).texture;

    var camera = new THREE.PerspectiveCamera(38, 1, 10, 12000);
    var target = new THREE.Vector3(0, 340, 0);

    scene.add(new THREE.HemisphereLight(0x90a0b8, 0x191410, 0.45));
    var key = new THREE.DirectionalLight(0xfff2e2, 1.5); key.position.set(700, 1000, 500); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db8e0, 0.7); rim.position.set(-800, 500, -700); scene.add(rim);
    var warm1 = new THREE.PointLight(0xf4661f, 0.5, 2400, 2); warm1.position.set(180, 140, 1050); scene.add(warm1);
    var warm2 = new THREE.PointLight(0xff7a30, 0.35, 2000, 2); warm2.position.set(-450, 90, -650); scene.add(warm2);

    var groundTex = radialTex(THREE, '#ffffff', '#ffffff', 128);
    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(1400, 64),
      new THREE.MeshStandardMaterial({ color: 0x141009, roughness: 0.95, metalness: 0, alphaMap: groundTex, transparent: true })
    );
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    var shadow = new THREE.Mesh(
      new THREE.CircleGeometry(520, 48),
      new THREE.MeshBasicMaterial({ map: radialTex(THREE, 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0.38)', 128), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.8; scene.add(shadow);

    // ---------- model constants ----------
    var OFF = { x: -197.79, y: -15.38, z: -318.78 };
    var MATS = {
      black: { color: 0x0b0b0d, metalness: 0.7, roughness: 0.34 },
      inox:  { color: 0xd7dbdf, metalness: 0.95, roughness: 0.34 }
    };
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.7, roughness: 0.34, envMapIntensity: 1.25, side: THREE.DoubleSide });
    var charGrateMat = new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: 0.8, roughness: 0.5, envMapIntensity: 0.8, side: THREE.DoubleSide });
    var viMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d7, metalness: 0.92, roughness: 0.3, envMapIntensity: 1.05, side: THREE.DoubleSide });
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a3136, metalness: 0, roughness: 0.06,
      transparent: true, opacity: 0.22, envMapIntensity: 0.75,
      side: THREE.DoubleSide, depthWrite: false
    });
    var silverMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.0 });
    var trayMat = new THREE.MeshStandardMaterial({ color: 0x282a2e, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.7 });
    var legMat = new THREE.MeshStandardMaterial({ color: 0x070708, metalness: 0.75, roughness: 0.28, envMapIntensity: 1.3 });

    var LEVER_PIVOT = { x: 172, y: 778, z: 627 };
    var LID_PIVOT = { x: 103.5, y: 432, z: 330 };
    var GLASS_PIVOT = { x: 324.2, y: 232, z: 168 };

    var group = new THREE.Group(); group.position.set(OFF.x, OFF.y, OFF.z); scene.add(group);
    var lidGroup = new THREE.Group(); lidGroup.position.set(LID_PIVOT.x + OFF.x, LID_PIVOT.y + OFF.y, LID_PIVOT.z + OFF.z); scene.add(lidGroup);
    var chimGroup = new THREE.Group(); chimGroup.position.set(OFF.x, OFF.y, OFF.z); scene.add(chimGroup);
    var glassGroup = new THREE.Group(); glassGroup.position.set(GLASS_PIVOT.x + OFF.x, OFF.y, GLASS_PIVOT.z + OFF.z); scene.add(glassGroup);
    var viGroup = new THREE.Group(); viGroup.position.set(OFF.x, OFF.y, OFF.z); scene.add(viGroup);
    var legGroups = [];
    var leverMesh = null;

    function geomFrom(pos) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return g;
    }

    // ---------- fabricated parts ----------
    // khay tro — bên trái lò, dưới ống khói, kéo ra về phía ống khói
    var ashTray = new THREE.Group();
    var ashPan = new THREE.Mesh(new THREE.BoxGeometry(240, 18, 190), trayMat);
    ashPan.position.set(190, 150, 452);
    var ashHandle = new THREE.Mesh(new THREE.BoxGeometry(90, 8, 10), silverMat);
    ashHandle.position.set(190, 150, 552);
    ashTray.add(ashPan); ashTray.add(ashHandle);
    ashTray.position.set(OFF.x, OFF.y, OFF.z);
    scene.add(ashTray);

    // vỉ tách dầu — tấm inox nằm giữa vỉ nướng và vỉ than, hứng mỡ chảy xuống
    var tachDau = new THREE.Group();
    var tdPlate = new THREE.Mesh(new THREE.BoxGeometry(228, 5, 420), viMat);
    tdPlate.position.set(193, 300, 318);
    tachDau.add(tdPlate);
    tachDau.position.set(OFF.x, OFF.y, OFF.z);
    scene.add(tachDau);

    // vỉ than — nhóm riêng để tháo ra được
    var thanGroup = new THREE.Group();
    thanGroup.position.set(OFF.x, OFF.y, OFF.z);
    scene.add(thanGroup);

    // power bank + USB-C cable
    var powerGroup = new THREE.Group(); powerGroup.position.set(OFF.x, OFF.y, OFF.z); scene.add(powerGroup);
    var pbMat = new THREE.MeshStandardMaterial({ color: 0x17191c, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0 });
    var pbStripeMat = new THREE.MeshStandardMaterial({ color: 0xf4661f, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0 });
    var cableMat = new THREE.MeshStandardMaterial({ color: 0x4a4e54, metalness: 0.2, roughness: 0.8, transparent: true, opacity: 0 });
    var pb = new THREE.Mesh(new THREE.BoxGeometry(64, 26, 132), pbMat); pb.position.set(470, 14, 40); powerGroup.add(pb);
    var pbStripe = new THREE.Mesh(new THREE.BoxGeometry(66, 6, 20), pbStripeMat); pbStripe.position.set(470, 14, -10); powerGroup.add(pbStripe);
    var cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(268, 151, 73),
      new THREE.Vector3(316, 122, 58),
      new THREE.Vector3(392, 58, 45),
      new THREE.Vector3(452, 30, 42)
    ]);
    var cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 36, 3.5, 8), cableMat); powerGroup.add(cable);

    // quạt sò: cánh quạt quay thấy được ở mặt hút của hộp quạt (mặt ngoài, phía z thấp)
    var fanRotor = new THREE.Group();
    fanRotor.position.set(167 + OFF.x, 230 + OFF.y, 2.5 + OFF.z);
    var fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x3c3f43, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.1, side: THREE.DoubleSide });
    var fanHubMat = new THREE.MeshStandardMaterial({ color: 0xf4661f, metalness: 0.5, roughness: 0.4 });
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 7, 20), fanHubMat);
    hub.geometry.rotateX(Math.PI / 2);
    fanRotor.add(hub);
    for (var fb = 0; fb < 7; fb++) {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(7, 24, 1.6), fanBladeMat);
      var bg = new THREE.Group();
      blade.position.y = 18;
      blade.rotation.y = 0.55; // pitch
      bg.rotation.z = (fb / 7) * Math.PI * 2;
      bg.add(blade);
      fanRotor.add(bg);
    }
    scene.add(fanRotor);
    var fanRing = new THREE.Mesh(new THREE.TorusGeometry(33, 2.2, 10, 36), legMat);
    fanRing.position.copy(fanRotor.position);
    scene.add(fanRing);
    var fanSpinV = 0;

    // meat pieces (ride inside viGroup so they follow the plates)
    var MEAT_SLOTS = [];
    var mxs = [120, 252], mzs = [168, 256, 388, 476];
    for (var mi = 0; mi < 8; mi++) MEAT_SLOTS.push([mxs[mi % 2], mzs[Math.floor(mi / 2)]]);
    var RAW = new THREE.Color(0xb24a3e), DONE = new THREE.Color(0x59301b);
    var meats = MEAT_SLOTS.map(function (sl, i) {
      var m = new THREE.Mesh(
        new THREE.BoxGeometry(80 - (i % 3) * 8, 18, 60 - (i % 2) * 6),
        new THREE.MeshStandardMaterial({ color: 0xb24a3e, metalness: 0.05, roughness: 0.75 })
      );
      m.position.set(sl[0], 341, sl[1]);
      m.rotation.y = (i * 0.4) % 0.5 - 0.25;
      m.visible = false;
      viGroup.add(m);
      return m;
    });

    // ---------- fire ----------
    var FIRE_N = 480;
    var fireGeo = new THREE.BufferGeometry();
    var firePos = new Float32Array(FIRE_N * 3);
    var fireCol = new Float32Array(FIRE_N * 3);
    var fireLife = new Float32Array(FIRE_N), fireMax = new Float32Array(FIRE_N);
    var fireVel = new Float32Array(FIRE_N * 3);
    function fireSpawn(i) {
      var patch = Math.random() < 0.5 ? 0 : 1;
      firePos[i * 3] = 105 + Math.random() * 175 + OFF.x;
      firePos[i * 3 + 1] = 282 + Math.random() * 14 + OFF.y;
      firePos[i * 3 + 2] = (patch ? 350 : 125) + Math.random() * 165 + OFF.z;
      fireVel[i * 3] = (Math.random() - 0.5) * 26;
      fireVel[i * 3 + 1] = 80 + Math.random() * 110;
      fireVel[i * 3 + 2] = (Math.random() - 0.5) * 26;
      fireMax[i] = 0.4 + Math.random() * 0.7;
      fireLife[i] = Math.random() * fireMax[i];
    }
    for (var fi = 0; fi < FIRE_N; fi++) fireSpawn(fi);
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    fireGeo.setAttribute('color', new THREE.BufferAttribute(fireCol, 3));
    var firePts = new THREE.Points(fireGeo, new THREE.PointsMaterial({
      size: 28, map: radialTex(THREE, 'rgba(255,255,255,1)', 'rgba(255,255,255,0.55)', 64),
      vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, sizeAttenuation: true
    }));
    firePts.visible = false; firePts.frustumCulled = false; scene.add(firePts);

    // coal beds: two patches (gap at the center seam between the two plates)
    var coalDarkTex = coalTexture(THREE, false), coalLitTex = coalTexture(THREE, true);
    function coalPatch(zc, tex, lit) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(215, 172),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(195 + OFF.x, (lit ? 279 : 277.5) + OFF.y, zc + OFF.z);
      scene.add(m);
      return m;
    }
    var coalsDark = [coalPatch(212, coalDarkTex, false), coalPatch(434, coalDarkTex, false)];
    var coalsLit = [coalPatch(212, coalLitTex, true), coalPatch(434, coalLitTex, true)];
    // vách than dựng đứng ngay sau ô kính (kính: x≈324, y 172..292, z 163..493) — hiệu ứng lò sưởi
    function coalWall(tex, additive, xPos) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(318, 108),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
      );
      m.rotation.y = Math.PI / 2;
      m.position.set(xPos + OFF.x, 234 + OFF.y, 328 + OFF.z);
      scene.add(m);
      return m;
    }
    var coalWallDark = coalWall(emberWallTexture(THREE, false), false, 312);
    var coalWallLit = coalWall(emberWallTexture(THREE, true), true, 313.5);
    var glowGlass = new THREE.PointLight(0xff6a1a, 0, 700, 2);
    glowGlass.position.set(295 + OFF.x, 268 + OFF.y, 318 + OFF.z);
    scene.add(glowGlass);
    var glow1 = new THREE.PointLight(0xff7426, 0, 1100, 2); glow1.position.set(200 + OFF.x, 320 + OFF.y, 212 + OFF.z); scene.add(glow1);
    var glow2 = new THREE.PointLight(0xff5a14, 0, 1100, 2); glow2.position.set(200 + OFF.x, 320 + OFF.y, 434 + OFF.z); scene.add(glow2);

    // grease drips (from meat down to the grease tray)
    var DRIP_N = 16;
    var dripGeo = new THREE.BufferGeometry();
    var dripPos = new Float32Array(DRIP_N * 3);
    var dripT = new Float32Array(DRIP_N);
    for (var di = 0; di < DRIP_N; di++) dripT[di] = Math.random();
    dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
    var dripPts = new THREE.Points(dripGeo, new THREE.PointsMaterial({
      size: 7, color: 0xe2bd72, transparent: true, opacity: 0.85, depthWrite: false,
      map: radialTex(THREE, 'rgba(255,240,200,1)', 'rgba(255,220,150,0.5)', 32)
    }));
    dripPts.visible = false; dripPts.frustumCulled = false; scene.add(dripPts);

    // smoke
    var smokeTex = radialTex(THREE, 'rgba(160,160,165,0.55)', 'rgba(140,140,148,0.22)', 128);
    var SMOKE_N = 34;
    var smokes = [];
    for (var si = 0; si < SMOKE_N; si++) {
      var sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
      sm.userData = { t: Math.random(), chimney: si < SMOKE_N * 0.7, seed: Math.random() * 100 };
      scene.add(sm); smokes.push(sm);
    }
    function smokePlace(sm) {
      var u = sm.userData;
      if (u.chimney) { u.x0 = 173 + OFF.x + (Math.random() - 0.5) * 40; u.y0 = 786 + OFF.y; u.z0 = 595 + OFF.z + (Math.random() - 0.5) * 50; u.rise = 420; }
      else { u.x0 = 200 + OFF.x + (Math.random() - 0.5) * 150; u.y0 = 340 + OFF.y; u.z0 = 318 + OFF.z + (Math.random() - 0.5) * 300; u.rise = 380; }
      u.drift = (Math.random() - 0.5) * 90;
    }
    smokes.forEach(smokePlace);

    // ---------- dimensions ----------
    var dimsOn = false;
    var dimGroup = new THREE.Group(); dimGroup.visible = false; scene.add(dimGroup);
    var dimMat = new THREE.LineBasicMaterial({ color: 0x93a6bd, transparent: true, opacity: 0.85 });
    function dimLine(pts) {
      var g = new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
      dimGroup.add(new THREE.Line(g, dimMat));
    }
    var HX = 391.7 / 2, HZ = 635.5 / 2, HY = 770.3;
    dimLine([[HX + 70, 2, -HZ], [HX + 70, 2, HZ]]); dimLine([[HX + 50, 2, -HZ], [HX + 90, 2, -HZ]]); dimLine([[HX + 50, 2, HZ], [HX + 90, 2, HZ]]);
    dimLine([[-HX, 2, HZ + 70], [HX, 2, HZ + 70]]); dimLine([[-HX, 2, HZ + 50], [-HX, 2, HZ + 90]]); dimLine([[HX, 2, HZ + 50], [HX, 2, HZ + 90]]);
    dimLine([[-HX - 70, 0, -HZ], [-HX - 70, HY, -HZ]]); dimLine([[-HX - 90, 0, -HZ], [-HX - 50, 0, -HZ]]); dimLine([[-HX - 90, HY, -HZ], [-HX - 50, HY, -HZ]]);

    // ---------- overlay DOM (hotspots + dim labels) ----------
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    host.appendChild(overlay);

    var HOTSPOTS = [
      { id: 'chimney',  n: 1,  label: 'ỐNG KHÓI', p: [188, 750, 597], move: 'chim' },
      { id: 'damper',   n: 2,  label: 'TAY GẠT ỐNG KHÓI', p: [172, 712, 630], move: 'chim' },
      { id: 'lid',      n: 3,  label: 'CỬA TRÊN LÒ', p: [170, 590, 440], move: 'lid' },
      { id: 'gauge',    n: 4,  label: 'ĐỒNG HỒ NHIỆT ĐỘ', p: [92, 497, 330], move: 'lid' },
      { id: 'vi',       n: 5,  label: 'VỈ NƯỚNG INOX', p: [182, 332, 200], move: 'v1' },
      { id: 'coalbed',  n: 6,  label: 'VỈ THAN', p: [195, 270, 434], move: 'v3' },
      { id: 'glass',    n: 7,  label: 'KÍNH CƯỜNG LỰC', p: [326, 232, 330] },
      { id: 'oiltray',  n: 8,  label: 'VỈ TÁCH DẦU', p: [312, 302, 318], move: 'v2' },
      { id: 'ashtray',  n: 9,  label: 'KHAY TRO', p: [190, 152, 558], move: 'ash' },
      { id: 'fan',      n: 10, label: 'QUẠT SÒ', p: [167, 230, 4] },
      { id: 'knob',     n: 11, label: 'NÚM CHỈNH QUẠT', p: [274, 186, 72] },
      { id: 'ports',    n: 12, label: 'DC 12V · TYPE-C', p: [263, 151, 73] },
      { id: 'legs',     n: 13, label: 'CHÂN GẬP', p: [350, 85, 150] }
    ];
    var dots = HOTSPOTS.map(function (h) {
      var d = document.createElement('button');
      d.setAttribute('aria-label', h.id);
      d.style.cssText = 'display:none;position:absolute;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;padding:0;' +
        'background:rgba(244,102,31,0.2);border:2px solid #f4661f;' +
        'box-shadow:0 0 14px rgba(244,102,31,0.45);' +
        'pointer-events:auto;cursor:pointer;transition:transform .2s,border-color .2s,background .2s,opacity .2s;';
      d.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var cb = propsRef.current.onSelectHotspot;
        if (cb) cb(propsRef.current.activeHotspot === h.id ? null : h.id);
      });
      overlay.appendChild(d);
      return { h: h, el: d };
    });

    // ---------- AE-style callout for the active hotspot ----------
    var callout = document.createElement('div');
    callout.style.cssText = 'display:none;position:absolute;left:0;top:0;pointer-events:none;z-index:6;';
    overlay.appendChild(callout);
    var calloutFor = null, calloutDir = 1, calloutAnim = null;
    function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
    function buildCallout(h, dir) {
      var L1 = 46, L2 = 132;
      var dx = Math.round(L1 * 0.7071), dy = -Math.round(L1 * 0.7071);
      var deg = dir === 1 ? -45 : -135;
      callout.innerHTML = '';
      var a = document.createElement('div');
      a.style.cssText = 'position:absolute;left:0;top:0;width:' + L1 + 'px;height:1.5px;background:#f4661f;' +
        'transform-origin:left center;transform:rotate(' + deg + 'deg) scaleX(0);';
      var b = document.createElement('div');
      b.style.cssText = 'position:absolute;top:' + dy + 'px;height:1.5px;width:' + L2 + 'px;' +
        'left:' + (dir === 1 ? dx : -dx - L2) + 'px;' +
        'background:linear-gradient(' + (dir === 1 ? '90deg' : '270deg') + ',#f4661f,rgba(244,102,31,0.15));' +
        'transform-origin:' + (dir === 1 ? 'left' : 'right') + ' center;transform:scaleX(0);';
      var lab = document.createElement('div');
      lab.style.cssText = 'position:absolute;top:' + (dy - 9) + 'px;transform:translateY(-100%);white-space:nowrap;opacity:0;' +
        (dir === 1 ? 'left:' + (dx + 12) + 'px;' : 'right:' + (dx + 12) + 'px;text-align:right;') +
        'background:rgba(8,9,11,0.72);backdrop-filter:blur(6px);border-' + (dir === 1 ? 'left' : 'right') + ':2px solid #f4661f;' +
        'padding:8px 13px;color:#ffffff;font:600 11.5px/1.25 "Be Vietnam Pro",sans-serif;letter-spacing:0.16em;';
      lab.textContent = h.label || h.id;
      var dotEnd = document.createElement('div');
      dotEnd.style.cssText = 'position:absolute;top:' + (dy - 2.25) + 'px;left:' + ((dir === 1 ? dx + L2 : -dx - L2) - 3) + 'px;width:6px;height:6px;border-radius:50%;background:#f4661f;opacity:0;';
      callout.appendChild(a); callout.appendChild(b); callout.appendChild(lab); callout.appendChild(dotEnd);
      calloutAnim = { a: a, b: b, lab: lab, dotEnd: dotEnd, deg: deg, t0: performance.now() };
    }

    var DIMLABELS = [
      { text: 'Rộng 636 mm', p: [HX + 70, 30, 0] },
      { text: 'Sâu 392 mm', p: [0, 30, HZ + 70] },
      { text: 'Cao 770 mm', p: [-HX - 70, HY / 2, -HZ] }
    ];
    var dimEls = DIMLABELS.map(function (dl) {
      var d = document.createElement('div');
      d.textContent = dl.text;
      d.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);padding:4px 10px;border-radius:999px;' +
        'background:rgba(13,16,20,0.78);border:1px solid rgba(147,166,189,0.4);color:#b9c6d6;font:500 12px/1 "Be Vietnam Pro",sans-serif;' +
        'white-space:nowrap;display:none;letter-spacing:0.04em;';
      overlay.appendChild(d);
      return { dl: dl, el: d };
    });

    // ---------- camera control ----------
    var az = 0.85, el = 0.32, dist = 1750, vAz = 0, vEl = 0;
    function placeCam() {
      camera.position.set(
        target.x + dist * Math.cos(el) * Math.sin(az),
        target.y + dist * Math.sin(el),
        target.z + dist * Math.cos(el) * Math.cos(az)
      );
      camera.lookAt(target);
    }
    var dragging = false, lx = 0, ly = 0;
    var cv = renderer.domElement;
    cv.addEventListener('pointerdown', function (e) {
      dragging = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
      if (audio && audio.ctx.state === 'suspended') audio.ctx.resume();
    });
    cv.addEventListener('pointerup', function () { dragging = false; cv.style.cursor = 'grab'; });
    cv.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      vAz = -(e.clientX - lx) * 0.006; vEl = (e.clientY - ly) * 0.005;
      az += vAz; el += vEl;
      el = Math.max(-0.05, Math.min(1.35, el));
      lx = e.clientX; ly = e.clientY;
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      dist *= (1 + Math.sign(e.deltaY) * 0.09);
      dist = Math.max(750, Math.min(4200, dist));
    }, { passive: false });

    // ---------- simulation state ----------
    var fireOn = false, fireAmt = 0;
    var autoRot = false;
    var gaugeNeedle = null, gaugeTemp = 32, gaugeNeedleAmt = 32;
    var fanLevel = 0;
    var damperOn = true, damperAmt = 1;
    var lidOpen = true, lidAmt = 1;
    var glassOpenS = false, glassAmt = 0;
    var viStage = 0, v1Amt = 0, v2Amt = 0, v3Amt = 0;
    var ashS = false, ashAmt = 0;
    var chimS = false, chimAmt = 0;
    var legsS = false, legsAmt = 0;
    var powerS = true, powerAmt = 1;
    var charcoalTarget = 0, charcoalAmt = 0;
    var meatN = 0, prevMeatN = 0, cookT = 0;
    var soundOn = false, audio = null, crackleT = 0;

    function setMaterial(name) {
      var m = MATS[name] || MATS.black;
      bodyMat.color.setHex(m.color);
      bodyMat.metalness = m.metalness;
      bodyMat.roughness = m.roughness;
    }
    function setSound(on) {
      on = !!on;
      if (on === soundOn) return;
      soundOn = on;
      if (on && !audio) audio = makeAudio();
      if (on && audio && audio.ctx.state === 'suspended') audio.ctx.resume();
      if (!on && audio) { audio.fanGain.gain.value = 0; audio.sizGain.gain.value = 0; }
    }
    function setShowDims(on) {
      dimsOn = !!on; dimGroup.visible = dimsOn;
      dimEls.forEach(function (d) { d.el.style.display = dimsOn ? 'block' : 'none'; });
    }
    function update(p) {
      setMaterial(p.material || 'black');
      fireOn = !!p.fire;
      charcoalTarget = clamp((+p.charcoal || 0) / 3, 0, 1);
      var mN = Math.round(clamp(+p.meat || 0, 0, 4) * 2);
      if (prevMeatN === 0 && mN > 0) cookT = 0;
      prevMeatN = meatN = mN;
      fanLevel = clamp(+p.fanSpeed || 0, 0, 100);
      damperOn = p.damper !== false;
      lidOpen = p.lidOpen !== false;
      glassOpenS = !!p.glassOpen;
      viStage = clamp(+p.viStage || 0, 0, 3);
      ashS = !!p.ashOut;
      chimS = !!p.chimneyOff;
      legsS = !!p.legsFolded;
      powerS = p.power !== false;
      autoRot = !!p.autoRotate;
      gaugeTemp = Math.max(0, Math.min(500, +p.temp || 32));
      setSound(!!p.sound);
      setShowDims(!!p.showDims);
    }

    // ---------- resize ----------
    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    var ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ---------- loop ----------
    var raf = 0, last = performance.now(), lastTick = performance.now();
    var projV = new THREE.Vector3();
    function approach(cur, on, dt, speed) { return cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * speed); }
    function loop(now) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      doFrame(now);
    }
    function doFrame(now) {
      if (disposed) return;
      window.__pvDbg2.doFrame++;
      try {
      lastTick = now;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;

      if (!dragging) { az += vAz; el += vEl; el = Math.max(-0.05, Math.min(1.35, el)); vAz *= 0.92; vEl *= 0.92; if (autoRot) az += dt * 0.1; }
      placeCam();

      // smoothed amounts
      damperAmt = approach(damperAmt, damperOn, dt, 5);
      lidAmt = approach(lidAmt, lidOpen, dt, 3.5);
      glassAmt = approach(glassAmt, glassOpenS, dt, 4);
      v1Amt = approach(v1Amt, viStage >= 1, dt, 2.6);
      v2Amt = approach(v2Amt, viStage >= 2, dt, 2.6);
      v3Amt = approach(v3Amt, viStage >= 3, dt, 2.6);
      ashAmt = approach(ashAmt, ashS, dt, 3.5);
      chimAmt = approach(chimAmt, chimS, dt, 2.8);
      legsAmt = approach(legsAmt, legsS, dt, 2.8);
      powerAmt = approach(powerAmt, powerS, dt, 4);
      charcoalAmt += (charcoalTarget - charcoalAmt) * Math.min(1, dt * 3);

      if (leverMesh) leverMesh.rotation.x = -(1 - damperAmt) * 0.85;
      lidGroup.rotation.z = -(1 - lidAmt) * Math.PI / 2;
      // gauge needle -> live temperature (0..500°C scale, gap at bottom)
      gaugeNeedleAmt += (gaugeTemp - gaugeNeedleAmt) * Math.min(1, dt * 3);
      if (gaugeNeedle) gaugeNeedle.rotation.z = (225 - (Math.max(0, Math.min(500, gaugeNeedleAmt)) / 500) * 270) * Math.PI / 180;
      glassGroup.rotation.y = glassAmt * 1.25;
      // tháo vỉ theo thứ tự: nhấc lên rồi đưa sang phải, xếp so le để nhìn rõ từng lớp
      function layerPos(grp, amt, lift, finalDy, outZ) {
        var p1 = clamp(amt * 1.8, 0, 1), p2 = clamp((amt - 0.45) * 1.82, 0, 1);
        grp.position.set(OFF.x + 460 * p2, OFF.y + lift * p1 + (finalDy - lift) * p2, OFF.z + (outZ || 0) * p2);
        return p2;
      }
      var viP2 = layerPos(viGroup, v1Amt, 160, 110, -90);
      layerPos(tachDau, v2Amt, 140, 10, 30);
      layerPos(thanGroup, v3Amt, 120, -90, 150);
      ashTray.position.z = OFF.z + 235 * ashAmt;
      chimGroup.position.set(OFF.x, OFF.y + 270 * chimAmt, OFF.z + 170 * chimAmt);
      for (var lg = 0; lg < legGroups.length; lg++) legGroups[lg].g.rotation.z = legGroups[lg].fold * legsAmt;
      pbMat.opacity = pbStripeMat.opacity = cableMat.opacity = powerAmt;
      powerGroup.visible = powerAmt > 0.02;
      // fan rotor spin — speeds up with fan level, only when powered
      var fanTarget = (fanLevel / 100) * 30 * powerAmt;
      fanSpinV += (fanTarget - fanSpinV) * Math.min(1, dt * 2.5);
      fanRotor.rotation.z -= fanSpinV * dt;

      // fire
      fireAmt = approach(fireAmt, fireOn && charcoalAmt > 0.03, dt, 2.2);
      var coalFac = charcoalAmt < 0.03 ? 0 : (0.4 + 0.85 * charcoalAmt);
      var boost = (0.6 + (fanLevel / 100) * 0.85 * powerAmt) * (0.55 + 0.45 * lidAmt) * coalFac;
      firePts.visible = fireAmt > 0.02 && boost > 0.02;
      for (var cb = 0; cb < 2; cb++) {
        coalsDark[cb].material.opacity = charcoalAmt < 0.01 ? 0 : (0.45 + 0.55 * charcoalAmt);
        coalsLit[cb].material.opacity = Math.min(1, fireAmt * (0.4 + 0.8 * charcoalAmt));
      }
      coalWallDark.material.opacity = charcoalAmt < 0.01 ? 0 : (0.6 + 0.4 * charcoalAmt);
      var flick = 0.85 + Math.sin(now * 0.011) * 0.1 + Math.sin(now * 0.027) * 0.08;
      glow1.intensity = 1.6 * fireAmt * flick * boost;
      glow2.intensity = 1.4 * fireAmt * (1.7 - flick) * boost;
      glowGlass.intensity = 2.8 * fireAmt * flick * (0.4 + 0.6 * charcoalAmt);
      coalWallLit.material.opacity = Math.min(1, fireAmt * (0.6 + 0.6 * charcoalAmt)) * (0.7 + 0.3 * flick);
      if (firePts.visible) {
        for (var i = 0; i < FIRE_N; i++) {
          fireLife[i] += dt;
          if (fireLife[i] > fireMax[i]) { fireSpawn(i); fireLife[i] = 0; }
          var t = fireLife[i] / fireMax[i];
          firePos[i * 3] += (fireVel[i * 3] + Math.sin(now * 0.004 + i) * 14) * dt;
          firePos[i * 3 + 1] += fireVel[i * 3 + 1] * dt * (0.7 + t) * boost;
          firePos[i * 3 + 2] += fireVel[i * 3 + 2] * dt;
          var b = (1 - t) * fireAmt * Math.min(1.2, boost);
          fireCol[i * 3] = b;
          fireCol[i * 3 + 1] = b * (0.42 * (1 - t) + 0.22);
          fireCol[i * 3 + 2] = b * 0.06 * (1 - t);
        }
        fireGeo.attributes.position.needsUpdate = true;
        fireGeo.attributes.color.needsUpdate = true;
      }

      // meat cooking
      if (meatN > 0 && fireAmt > 0.1) cookT = Math.min(1, cookT + dt / 70 * fireAmt * (0.6 + fanLevel / 250));
      for (var mm = 0; mm < meats.length; mm++) {
        meats[mm].visible = mm < meatN;
        if (meats[mm].visible) meats[mm].material.color.copy(RAW).lerp(DONE, Math.min(1, cookT * (0.85 + (mm % 3) * 0.1)));
      }

      // grease drips
      var dripsOn = meatN > 0 && fireAmt > 0.25 && v1Amt < 0.2 && v2Amt < 0.2;
      dripPts.visible = dripsOn;
      if (dripsOn) {
        for (var dd = 0; dd < DRIP_N; dd++) {
          dripT[dd] += dt * 1.35;
          if (dripT[dd] > 1) dripT[dd] = 0;
          var slot = MEAT_SLOTS[dd % Math.max(1, meatN)];
          var active = (dd % 8) < meatN;
          var yy = 332 - 30 * dripT[dd];
          dripPos[dd * 3] = active ? slot[0] + ((dd * 37) % 30) - 15 + OFF.x : 0;
          dripPos[dd * 3 + 1] = active ? yy + OFF.y : -9999;
          dripPos[dd * 3 + 2] = active ? slot[1] + ((dd * 53) % 26) - 13 + OFF.z : 0;
        }
        dripGeo.attributes.position.needsUpdate = true;
      }

      // smoke
      for (var s = 0; s < smokes.length; s++) {
        var smk = smokes[s], u = smk.userData;
        if (fireAmt > 0.02 && boost > 0.05) {
          u.t += dt / 6;
          if (u.t > 1) { u.t = 0; smokePlace(smk); }
          var tt = u.t;
          smk.position.set(
            u.x0 + Math.sin(u.seed + tt * 5) * 26 + u.drift * tt,
            u.y0 + u.rise * tt + (u.chimney ? 270 * chimAmt : 0) * 0,
            u.z0 + Math.cos(u.seed + tt * 4) * 22 + (u.chimney ? 30 : 90) * tt
          );
          var sc = 70 + 180 * tt;
          smk.scale.set(sc, sc, 1);
          var chimFac = (0.12 + 0.88 * damperAmt) * (1 - chimAmt);
          var leakFac = 0.3 + (1 - damperAmt) * 0.8 + chimAmt * 0.4;
          smk.material.opacity = fireAmt * 0.3 * Math.sin(Math.PI * tt) * (u.chimney ? chimFac : leakFac);
        } else smk.material.opacity = 0;
      }

      // sound
      if (audio) {
        audio.fanGain.gain.value = soundOn ? (fanLevel / 100) * 0.16 * powerAmt : 0;
        audio.fanLp.frequency.value = 140 + fanLevel * 2.6;
        audio.sizGain.gain.value = soundOn ? (meatN / 8) * fireAmt * 0.1 : 0;
        crackleT -= dt;
        if (soundOn && fireAmt > 0.05 && crackleT <= 0) {
          crackleT = 0.06 + Math.random() * 0.22;
          if (Math.random() < 0.7) audio.crackle(fireAmt * (0.5 + fanLevel / 200) * (0.5 + charcoalAmt * 0.6));
        }
      }

      // hotspot anchors
      var w = host.clientWidth, hh = host.clientHeight;
      var activeX = 0, activeY = 0, activeVis = false;
      for (var d = 0; d < dots.length; d++) {
        var dot = dots[d], hp = dot.h.p;
        var ax = hp[0], ay = hp[1], azz = hp[2];
        if (dot.h.move === 'lid') {
          var lca = Math.cos(lidGroup.rotation.z), lsa = Math.sin(lidGroup.rotation.z);
          var lrx = hp[0] - LID_PIVOT.x, lry = hp[1] - LID_PIVOT.y;
          ax = LID_PIVOT.x + lrx * lca - lry * lsa;
          ay = LID_PIVOT.y + lrx * lsa + lry * lca;
        } else if (dot.h.move === 'chim') { ay += 270 * chimAmt; azz += 170 * chimAmt; }
        else if (dot.h.move === 'v1') { ax += viGroup.position.x - OFF.x; ay += viGroup.position.y - OFF.y; azz += viGroup.position.z - OFF.z; }
        else if (dot.h.move === 'v2') { ax += tachDau.position.x - OFF.x; ay += tachDau.position.y - OFF.y; azz += tachDau.position.z - OFF.z; }
        else if (dot.h.move === 'v3') { ax += thanGroup.position.x - OFF.x; ay += thanGroup.position.y - OFF.y; azz += thanGroup.position.z - OFF.z; }
        else if (dot.h.move === 'ash') { azz += 235 * ashAmt; }
        projV.set(ax + OFF.x, ay + OFF.y, azz + OFF.z).project(camera);
        var vis = projV.z < 1;
        dot.el.style.display = vis ? 'flex' : 'none';
        if (vis) {
          var act = propsRef.current.activeHotspot === dot.h.id;
          var sx = (projV.x * 0.5 + 0.5) * w, sy = (-projV.y * 0.5 + 0.5) * hh;
          dot.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)' + (act ? ' scale(1.45)' : '');
          dot.el.style.borderColor = '#f4661f';
          dot.el.style.background = act ? 'rgba(244,102,31,0.65)' : 'rgba(244,102,31,0.2)';
          if (act) {
            var pp = (now % 1800) / 1800;
            dot.el.style.boxShadow = '0 0 0 ' + (11 * pp).toFixed(1) + 'px rgba(244,102,31,' + (0.45 * (1 - pp)).toFixed(3) + '), 0 0 14px rgba(244,102,31,0.45)';
          } else {
            dot.el.style.boxShadow = '0 0 14px rgba(244,102,31,0.45)';
          }
          dot.el.style.opacity = (propsRef.current.activeHotspot && !act) ? '0.4' : '1';
          if (act) { activeX = sx; activeY = sy; activeVis = true; }
        }
      }
      // callout follows the active hotspot; reveal driven from this loop (survives rAF throttling)
      var actId = propsRef.current.activeHotspot || null;
      if (actId !== calloutFor) {
        calloutFor = actId;
        var hAct = null;
        for (var hi = 0; hi < HOTSPOTS.length; hi++) if (HOTSPOTS[hi].id === actId) hAct = HOTSPOTS[hi];
        if (hAct) { calloutDir = activeX < w * 0.55 ? 1 : -1; buildCallout(hAct, calloutDir); }
        else calloutAnim = null;
      }
      if (calloutFor && activeVis) {
        callout.style.display = 'block';
        callout.style.transform = 'translate(' + activeX.toFixed(1) + 'px,' + activeY.toFixed(1) + 'px)';
        if (calloutAnim) {
          var ct = now - calloutAnim.t0;
          var e1 = easeOut(ct / 220);
          var e2 = easeOut((ct - 160) / 200);
          var e3 = easeOut((ct - 300) / 280);
          calloutAnim.a.style.transform = 'rotate(' + calloutAnim.deg + 'deg) scaleX(' + e1.toFixed(3) + ')';
          calloutAnim.b.style.transform = 'scaleX(' + e2.toFixed(3) + ')';
          calloutAnim.lab.style.opacity = e3.toFixed(3);
          calloutAnim.lab.style.transform = 'translateY(-100%) translateY(' + (6 * (1 - e3)).toFixed(2) + 'px)';
          calloutAnim.dotEnd.style.opacity = e3.toFixed(3);
        }
      } else {
        callout.style.display = 'none';
      }
      if (dimsOn) {
        for (var dl = 0; dl < dimEls.length; dl++) {
          var ddl = dimEls[dl], pp = ddl.dl.p;
          projV.set(pp[0], pp[1], pp[2]).project(camera);
          ddl.el.style.display = projV.z < 1 ? 'block' : 'none';
          ddl.el.style.left = ((projV.x * 0.5 + 0.5) * w).toFixed(1) + 'px';
          ddl.el.style.top = ((-projV.y * 0.5 + 0.5) * hh).toFixed(1) + 'px';
        }
      }

      renderer.render(scene, camera);
      window.__pvDbg2.rendered++;
      } catch (e) { window.__pvDbg2.errs.push(String(e.stack || e).slice(0, 300)); }
    }

    window.__pvDbg2 = { v: 4, doFrame: 0, rendered: 0, watchdog: 0, errs: [] };
    placeCam();
    window.__pv = { camera: camera, scene: scene, renderer: renderer, host: host,
      setCam: function (a, e, d) { az = a; el = e; dist = d; vAz = 0; vEl = 0; },
      setTarget: function (x, y, z) { target.set(x, y, z); },
      getCam: function () { return { az: az, el: el, dist: dist, target: [target.x, target.y, target.z] }; } };
    raf = requestAnimationFrame(loop);
    // watchdog: rAF can be fully suspended (hidden/backgrounded iframe, throttling).
    // If it stalls, drive frames from this interval instead so the scene still renders.
    var watchdog = setInterval(function () {
      if (disposed) return;
      window.__pvDbg2.watchdog++;
      if (performance.now() - lastTick > 200) {
        doFrame(performance.now());
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop); // try to rejoin rAF when it comes back
      }
    }, 33);
    renderer.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); }, false);
    renderer.domElement.addEventListener('webglcontextrestored', function () {
      last = lastTick = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }, false);

    // ---------- load geometry ----------
    function safe(u) { return fetchF32(u).catch(function () { return null; }); }
    var ready = Promise.all([
      fetchF32('body.bin'),     // 0
      fetchF32('grate.bin'),    // 1 charcoal grate
      safe('wheel.bin'),        // 2 gauge
      safe('glass.bin'),        // 3
      safe('lever.bin'),        // 4
      safe('lid.bin'),          // 5
      safe('chimney.bin'),      // 6
      safe('leg0.bin'), safe('leg1.bin'), safe('leg2.bin'), safe('leg3.bin'), // 7-10
      safe('vi.bin')            // 11
    ]).then(function (r) {
      group.add(new THREE.Mesh(geomFrom(r[0]), bodyMat));
      thanGroup.add(new THREE.Mesh(geomFrom(r[1]), charGrateMat));
      if (r[2]) {
        // Use the REAL gauge housing from the source 3D file (wheel.bin). In model space it sits at
        // centre (97, 497, 330) facing -X — i.e. mounted on the front lip of the lid, exactly where
        // the physical thermometer is. It is parented to lidGroup (geometry translated by -LID_PIVOT)
        // so it travels with the lid and never floats. We only overlay a readable dial face + needle
        // on its outer face. Local centre = model centre - LID_PIVOT = (-6.5, 65, 0); face at x=-11.
        var wg = geomFrom(r[2]);
        wg.translate(-LID_PIVOT.x, -LID_PIVOT.y, -LID_PIVOT.z);
        lidGroup.add(new THREE.Mesh(wg, silverMat));
        var GC = { x: -11, y: 65, z: 0 }, GR = 33;
        var faceMat = new THREE.MeshStandardMaterial({ map: gaugeFaceTexture(THREE), metalness: 0.1, roughness: 0.55, emissive: 0x120a04, emissiveIntensity: 0.5 });
        var face = new THREE.Mesh(new THREE.CircleGeometry(GR, 48), faceMat);
        face.rotation.y = -Math.PI / 2; // normal -> -X (outer face)
        face.position.set(GC.x, GC.y, GC.z);
        lidGroup.add(face);
        var glassCover = new THREE.Mesh(new THREE.CircleGeometry(GR, 48),
          new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.12, envMapIntensity: 1.4 }));
        glassCover.rotation.y = -Math.PI / 2; glassCover.position.set(GC.x - 1.2, GC.y, GC.z);
        lidGroup.add(glassCover);
        gaugeNeedle = new THREE.Group();
        gaugeNeedle.position.set(GC.x - 0.6, GC.y, GC.z);
        gaugeNeedle.rotation.y = -Math.PI / 2;
        var needle = new THREE.Mesh(new THREE.BoxGeometry(GR * 0.82, 2.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xf4661f, metalness: 0.3, roughness: 0.4, emissive: 0xf4661f, emissiveIntensity: 0.6 }));
        needle.position.x = GR * 0.31; // pivot at one end
        gaugeNeedle.add(needle);
        var capN = new THREE.Mesh(new THREE.CircleGeometry(5, 20),
          new THREE.MeshStandardMaterial({ color: 0x1a1714, metalness: 0.5, roughness: 0.4 }));
        gaugeNeedle.add(capN);
        lidGroup.add(gaugeNeedle);
      }
      if (r[3]) {
        var gg = geomFrom(r[3]);
        gg.translate(-GLASS_PIVOT.x, 0, -GLASS_PIVOT.z);
        var gm = new THREE.Mesh(gg, glassMat);
        gm.renderOrder = 10;
        glassGroup.add(gm);
      }
      if (r[4]) {
        var lvg = geomFrom(r[4]);
        lvg.translate(-LEVER_PIVOT.x, -LEVER_PIVOT.y, -LEVER_PIVOT.z);
        leverMesh = new THREE.Mesh(lvg, silverMat);
        leverMesh.position.set(LEVER_PIVOT.x, LEVER_PIVOT.y, LEVER_PIVOT.z);
        chimGroup.add(leverMesh);
      }
      if (r[5]) {
        var ldg = geomFrom(r[5]);
        ldg.translate(-LID_PIVOT.x, -LID_PIVOT.y, -LID_PIVOT.z);
        lidGroup.add(new THREE.Mesh(ldg, bodyMat));
      }
      if (r[6]) chimGroup.add(new THREE.Mesh(geomFrom(r[6]), bodyMat));
      for (var li = 7; li <= 10; li++) {
        if (!r[li]) continue;
        var arr = r[li];
        var bb = { minX: 1e9, minY: 1e9, minZ: 1e9, maxX: -1e9, maxY: -1e9, maxZ: -1e9 };
        for (var vi2 = 0; vi2 < arr.length; vi2 += 3) {
          if (arr[vi2] < bb.minX) bb.minX = arr[vi2];
          if (arr[vi2] > bb.maxX) bb.maxX = arr[vi2];
          if (arr[vi2 + 1] < bb.minY) bb.minY = arr[vi2 + 1];
          if (arr[vi2 + 1] > bb.maxY) bb.maxY = arr[vi2 + 1];
          if (arr[vi2 + 2] < bb.minZ) bb.minZ = arr[vi2 + 2];
          if (arr[vi2 + 2] > bb.maxZ) bb.maxZ = arr[vi2 + 2];
        }
        var cx = (bb.minX + bb.maxX) / 2, cz = (bb.minZ + bb.maxZ) / 2;
        var isFront = cx > 197;
        var topX = isFront ? bb.minX : bb.maxX;
        var footX = isFront ? bb.maxX : bb.minX;
        var thCur = Math.atan2(bb.minY - bb.maxY, footX - topX);
        var fold = (isFront ? Math.PI : 0) - thCur;
        while (fold > Math.PI) fold -= 2 * Math.PI;
        while (fold < -Math.PI) fold += 2 * Math.PI;
        var lgGeo = geomFrom(arr);
        lgGeo.translate(-topX, -(bb.maxY - 3), -cz);
        var lgGroup = new THREE.Group();
        lgGroup.position.set(topX + OFF.x, bb.maxY - 3 + OFF.y, cz + OFF.z);
        lgGroup.add(new THREE.Mesh(lgGeo, legMat));
        scene.add(lgGroup);
        legGroups.push({ g: lgGroup, fold: fold });
      }
      if (r[11]) viGroup.add(new THREE.Mesh(geomFrom(r[11]), viMat));
    });

    return {
      ready: ready,
      update: update,
      dispose: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        clearInterval(watchdog);
        ro.disconnect();
        if (audio) audio.dispose();
        renderer.dispose();
        pmrem.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    };
  }

  // ---------- React wrapper ----------
  function PantinaViewer(props) {
    var useRef = React.useRef, useEffect = React.useEffect, useState = React.useState;
    var hostRef = useRef(null);
    var apiRef = useRef(null);
    var propsRef = useRef(props);
    propsRef.current = props;
    var st = useState('loading'); var status = st[0], setStatus = st[1];

    useEffect(function () {
      var dead = false;
      loadThree().then(function () {
        if (dead) return;
        var api = initScene(hostRef.current, propsRef);
        apiRef.current = api;
        api.update(propsRef.current);
        return api.ready.then(function () { if (!dead) setStatus('ok'); });
      }).catch(function (err) {
        console.error(err);
        if (!dead) setStatus('error');
      });
      return function () {
        dead = true;
        if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
      };
    }, []);

    useEffect(function () {
      if (apiRef.current) apiRef.current.update(propsRef.current);
    });

    var children = [
      React.createElement('div', {
        key: 'mount',
        ref: hostRef,
        style: { position: 'absolute', inset: 0, overflow: 'hidden' }
      })
    ];
    if (status !== 'ok') {
      children.push(React.createElement('div', {
        key: 'load',
        style: {
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 14,
          alignItems: 'center', justifyContent: 'center', color: '#8b94a0',
          font: '500 13px "Be Vietnam Pro", sans-serif', letterSpacing: '0.06em', zIndex: 5
        }
      }, [
        status === 'loading' ? React.createElement('div', {
          key: 'sp',
          style: {
            width: 34, height: 34, borderRadius: '50%',
            border: '2px solid rgba(244,102,31,0.2)', borderTopColor: '#f4661f',
            animation: 'pv-spin 0.9s linear infinite'
          }
        }) : null,
        React.createElement('div', { key: 'tx' }, status === 'loading' ? 'ĐANG TẢI MÔ HÌNH 3D…' : 'Không tải được mô hình. Thử tải lại trang.')
      ]));
    }

    return React.createElement('div', {
      style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
    }, children);
  }

  if (!document.getElementById('pv-style')) {
    var st2 = document.createElement('style');
    st2.id = 'pv-style';
    st2.textContent = '@keyframes pv-spin{to{transform:rotate(360deg)}}' +
      '@keyframes pvGrow{from{scale:0 1}to{scale:1 1}}' +
      '@keyframes pvFade{from{opacity:0;translate:0 5px}to{opacity:1;translate:0 0}}' +
      '@keyframes pvPulse{0%{box-shadow:0 0 0 0 rgba(244,102,31,0.45)}70%{box-shadow:0 0 0 11px rgba(244,102,31,0)}100%{box-shadow:0 0 0 0 rgba(244,102,31,0)}}';
    document.head.appendChild(st2);
  }

  window.PantinaViewer = PantinaViewer;
})();
