/* Pantina principle sim — 2D animated cross-section, canvas-based.
   Side-by-side: normal grill (grease hits coals -> black smoke) vs Pantina
   (V charcoal channels, grease falls through gaps to tray, fan + chimney).
   Global: window.PantinaPrinciple. Props: fire (bool), fan (0-100). */
(function () {
  var React = window.React;

  function PantinaPrinciple(props) {
    var hostRef = React.useRef(null);
    var propsRef = React.useRef(props);
    propsRef.current = props;

    React.useEffect(function () {
      var host = hostRef.current;
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:100%;display:block;';
      host.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var W = 1240, H = 560;
      var disposed = false;
      var visible = true;

      function resize() {
        var w = host.clientWidth, h = host.clientHeight;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      var ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      // geometry (in design units) — two grills
      var G = [
        { x0: 30, w: 540, pantina: false },
        { x0: 670, w: 540, pantina: true }
      ];
      var BODY_TOP = 210, GRATE_Y = 252, COAL_Y = 360, TRAY_Y = 432, BODY_BOT = 470, LEG_BOT = 540;

      // particles
      var drops = [], blackSmoke = [], graySmoke = [], flames = [], airT = 0;
      var dropTimer = [0, 0];

      function rnd(a, b) { return a + Math.random() * (b - a); }

      function spawnDrop(gi) {
        var g = G[gi];
        var mx = g.x0 + 70 + Math.random() * (g.w - 150);
        drops.push({ gi: gi, x: mx, y: GRATE_Y - 8, vy: 0 });
      }

      function vGap(g, x) {
        // pantina: 4 V channels; returns true if x is over a gap between Vs
        var rel = (x - g.x0 - 40) / (g.w - 80);
        if (rel < 0 || rel > 1) return false;
        var seg = (rel * 4) % 1;
        return seg < 0.16 || seg > 0.84;
      }

      var last = performance.now();
      var raf = 0;
      function loop(now) {
        if (disposed) return;
        if (!visible) { raf = 0; return; }
        raf = requestAnimationFrame(loop);
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        var p = propsRef.current;
        var fire = p.fire !== false;
        var fan = Math.max(0, Math.min(100, +p.fan || 0)) / 100;
        var heat = fire ? (0.45 + 0.55 * fan) : 0;

        // spawn
        for (var gi = 0; gi < 2; gi++) {
          dropTimer[gi] -= dt;
          if (fire && dropTimer[gi] <= 0) {
            dropTimer[gi] = rnd(0.25, 0.7) / (0.5 + heat);
            spawnDrop(gi);
          }
        }
        if (fire && Math.random() < dt * (3 + fan * 6)) {
          var g2 = G[1];
          graySmoke.push({ x: g2.x0 + 60 + Math.random() * (g2.w - 200), y: COAL_Y - 14, a: 0.5, r: rnd(6, 13), phase: 0, seed: Math.random() * 9 });
        }

        // physics
        for (var i = drops.length - 1; i >= 0; i--) {
          var d = drops[i], gg = G[d.gi];
          d.vy += 600 * dt; d.y += d.vy * dt;
          if (!gg.pantina && d.y >= COAL_Y - 16) {
            // hits coals -> black smoke burst
            for (var k = 0; k < 4; k++) blackSmoke.push({ x: d.x + rnd(-6, 6), y: COAL_Y - 16, a: 0.75, r: rnd(5, 10), vx: rnd(-12, 12), seed: Math.random() * 9 });
            drops.splice(i, 1);
          } else if (gg.pantina && d.y >= COAL_Y - 22 && !vGap(gg, d.x)) {
            d.x += (vGap(gg, d.x + 14) ? 1 : -1) * 60 * dt; // slide down V wall toward gap
            d.y = COAL_Y - 22;
            d.vy = 40;
            if (vGap(gg, d.x)) d.vy = 120;
          } else if (gg.pantina && d.y >= TRAY_Y - 6) {
            drops.splice(i, 1);
          } else if (d.y > TRAY_Y + 30) drops.splice(i, 1);
        }
        for (var b = blackSmoke.length - 1; b >= 0; b--) {
          var s = blackSmoke[b];
          s.y -= (28 + 40 * heat) * dt; s.x += s.vx * dt + Math.sin(now * 0.002 + s.seed) * 12 * dt;
          s.r += 9 * dt; s.a -= dt * 0.22;
          if (s.a <= 0 || s.y < 40) blackSmoke.splice(b, 1);
        }
        for (var q = graySmoke.length - 1; q >= 0; q--) {
          var s2 = graySmoke[q], g3 = G[1];
          var chimX = g3.x0 + g3.w - 36;
          if (s2.phase === 0) {
            s2.x += (chimX - s2.x) * dt * (0.8 + fan * 1.6);
            s2.y -= 16 * dt;
            if (Math.abs(s2.x - chimX) < 16) s2.phase = 1;
          } else {
            s2.y -= (70 + 90 * fan) * dt;
            s2.x = chimX + Math.sin(now * 0.003 + s2.seed) * 5;
          }
          s2.r += 4 * dt; s2.a -= dt * (s2.phase === 1 && s2.y < 110 ? 0.5 : 0.06);
          if (s2.a <= 0 || s2.y < 28) graySmoke.splice(q, 1);
        }
        airT += dt * (0.4 + fan * 2.2);

        // ---------- draw ----------
        var scale = canvas.width / W;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, W, H + 200);

        for (var gi2 = 0; gi2 < 2; gi2++) {
          var g = G[gi2];
          var x0 = g.x0, w = g.w;

          // legs
          ctx.fillStyle = '#5a544d';
          ctx.fillRect(x0 + 24, BODY_BOT, 14, LEG_BOT - BODY_BOT);
          ctx.fillRect(x0 + w - 38, BODY_BOT, 14, LEG_BOT - BODY_BOT);
          // body shell (cut-away: open front)
          ctx.fillStyle = '#565049';
          ctx.fillRect(x0, BODY_TOP, 10, BODY_BOT - BODY_TOP);
          ctx.fillRect(x0 + w - 10, BODY_TOP, 10, BODY_BOT - BODY_TOP);
          ctx.fillRect(x0, BODY_BOT - 10, w, 10);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x0 + 10, BODY_TOP, w - 20, BODY_BOT - BODY_TOP - 10);

          if (g.pantina) {
            // chimney
            ctx.fillStyle = '#565049';
            ctx.fillRect(x0 + w - 52, 60, 8, BODY_TOP - 58);
            ctx.fillRect(x0 + w - 12, 60, 8, BODY_TOP - 58);
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(x0 + w - 44, 60, 32, BODY_TOP - 58);
            // fan box
            ctx.fillStyle = '#5a544d';
            ctx.fillRect(x0 - 26, COAL_Y - 26, 30, 44);
            ctx.fillStyle = '#f4661f';
            ctx.beginPath(); ctx.arc(x0 - 11, COAL_Y - 4, 9, 0, 6.3); ctx.fill();
            ctx.fillStyle = '#1a1816';
            ctx.beginPath(); ctx.arc(x0 - 11, COAL_Y - 4, 4, 0, 6.3); ctx.fill();
            // air arrows
            if (fire && fan > 0.02) {
              ctx.strokeStyle = 'rgba(255,150,80,0.6)'; ctx.lineWidth = 2.5;
              for (var ar = 0; ar < 3; ar++) {
                var ax = x0 + 14 + ((airT * 90 + ar * 46) % 130);
                var ay = COAL_Y - 4 + (ar - 1) * 13;
                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 20, ay);
                ctx.lineTo(ax + 14, ay - 5); ctx.moveTo(ax + 20, ay); ctx.lineTo(ax + 14, ay + 5);
                ctx.stroke();
              }
            }
            // grease tray
            ctx.fillStyle = '#f4661f';
            ctx.fillRect(x0 + 30, TRAY_Y, w - 60, 7);
            ctx.fillStyle = 'rgba(255,150,80,0.55)';
            ctx.fillRect(x0 + 34, TRAY_Y - 3, w - 68, 3);
            // V charcoal channels
            for (var v = 0; v < 4; v++) {
              var vx0 = x0 + 40 + (w - 80) * v / 4, vw = (w - 80) / 4;
              var cxm = vx0 + vw / 2;
              ctx.strokeStyle = '#6a645d'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(vx0 + vw * 0.16, COAL_Y - 26);
              ctx.lineTo(cxm, COAL_Y + 6);
              ctx.lineTo(vx0 + vw * 0.84, COAL_Y - 26);
              ctx.stroke();
              // coals in V
              for (var c = 0; c < 4; c++) {
                var ccx = cxm + (c - 1.5) * 9, ccy = COAL_Y - 8 - Math.abs(c - 1.5) * 9;
                var fl = 0.5 + 0.5 * Math.sin(now * 0.006 + v * 2 + c * 3);
                ctx.fillStyle = fire ? 'rgb(' + Math.round(190 + 60 * fl * heat) + ',' + Math.round(60 + 70 * fl * heat) + ',24)' : '#5d5852';
                ctx.beginPath(); ctx.arc(ccx, ccy, 6.5, 0, 6.3); ctx.fill();
              }
            }
          } else {
            // flat coal bed
            for (var c2 = 0; c2 < 16; c2++) {
              var fx = x0 + 36 + (w - 72) * (c2 / 15), fy = COAL_Y - 10 + ((c2 % 3) - 1) * 6;
              var fl2 = 0.5 + 0.5 * Math.sin(now * 0.005 + c2 * 2.1);
              ctx.fillStyle = fire ? 'rgb(' + Math.round(185 + 60 * fl2 * heat) + ',' + Math.round(55 + 65 * fl2 * heat) + ',22)' : '#5d5852';
              ctx.beginPath(); ctx.arc(fx, fy, 7.5, 0, 6.3); ctx.fill();
            }
          }

          // grate + meat
          ctx.strokeStyle = '#9aa1a8'; ctx.lineWidth = 4;
          for (var gb = 0; gb <= 14; gb++) {
            var gx = x0 + 30 + (w - 60) * gb / 14;
            ctx.beginPath(); ctx.moveTo(gx, GRATE_Y); ctx.lineTo(gx, GRATE_Y + 4); ctx.stroke();
          }
          ctx.strokeStyle = '#b6bcc2'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x0 + 26, GRATE_Y); ctx.lineTo(x0 + w - 26, GRATE_Y); ctx.stroke();
          for (var m = 0; m < 3; m++) {
            var mx2 = x0 + 80 + m * (w - 200) / 2, mw = 88;
            ctx.fillStyle = gi2 === 0 ? '#7d4a33' : '#a2543a';
            if (gi2 === 0) {
              // smoke-stained meat darker
              ctx.fillStyle = '#6b4030';
            }
            ctx.beginPath();
            ctx.roundRect(mx2 - mw / 2, GRATE_Y - 22, mw, 20, 7);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,235,210,0.25)';
            ctx.beginPath(); ctx.roundRect(mx2 - mw / 2 + 6, GRATE_Y - 20, mw - 30, 5, 3); ctx.fill();
          }
        }

        // particles on top
        for (var di = 0; di < drops.length; di++) {
          var dr = drops[di];
          ctx.fillStyle = '#e2a93c';
          ctx.beginPath(); ctx.ellipse(dr.x, dr.y, 3, 5, 0, 0, 6.3); ctx.fill();
        }
        for (var bi = 0; bi < blackSmoke.length; bi++) {
          var bs = blackSmoke[bi];
          ctx.fillStyle = 'rgba(20,16,13,' + (bs.a * 0.9).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(bs.x, bs.y, bs.r, 0, 6.3); ctx.fill();
          ctx.fillStyle = 'rgba(92,76,64,' + (bs.a * 0.35).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(bs.x - bs.r * 0.25, bs.y - bs.r * 0.25, bs.r * 0.6, 0, 6.3); ctx.fill();
        }
        for (var qi = 0; qi < graySmoke.length; qi++) {
          var gs = graySmoke[qi];
          ctx.fillStyle = 'rgba(170,164,156,' + (gs.a * 0.5).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(gs.x, gs.y, gs.r, 0, 6.3); ctx.fill();
        }
      }
      var io = new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !visible && !disposed) { visible = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
        visible = vis;
      }, { threshold: 0.01 });
      io.observe(host);

      raf = requestAnimationFrame(loop);

      return function () {
        disposed = true;
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    }, []);

    return React.createElement('div', {
      ref: hostRef,
      style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
    });
  }

  window.PantinaPrinciple = PantinaPrinciple;
})();
