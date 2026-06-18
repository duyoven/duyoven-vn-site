/* Duy's Oven — main.js: đa ngôn ngữ (VI/EN/ZH/KO) + menu + header scroll */

(function () {
  var LANGS = ['vi', 'en', 'zh', 'ko', 'th', 'de'];

  // ----- Header đổi nền khi cuộn -----
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('solid', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  // ----- Mobile menu -----
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    document.body.classList.toggle('nav-open');
  });

  // ----- Mobile dropdown toggle (Sản phẩm / Tài liệu / Academy) -----
  document.querySelectorAll('.main-nav .nav-item > a.has-caret').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 680px)').matches) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });

  // ----- Đánh dấu mục nav đang xem -----
  (function () {
    var page = (location.pathname.split('/').pop() || 'index.html');
    var map = { 'index.html': 'index.html', '': 'index.html', 'gioi-thieu.html': 'gioi-thieu.html',
      'san-pham.html': 'san-pham.html', 'san-pham-tach-khoi-65l.html': 'san-pham.html', 'tai-lieu.html': 'tai-lieu.html', 'academy.html': 'academy.html', 'lien-he.html': 'lien-he.html' };
    var target = map[page] || 'index.html';
    document.querySelectorAll('.main-nav .nav-item > a, .main-nav > a').forEach(function (a) {
      if ((a.getAttribute('href') || '').split('#')[0] === target) a.classList.add('active');
    });
  })();

  // ----- Đa ngôn ngữ -----
  // Mỗi phần tử dịch có data-en/data-zh/data-ko; bản tiếng Việt gốc lưu vào data-vi.
  var current = localStorage.getItem('duyoven-lang') || 'vi';
  if (LANGS.indexOf(current) === -1) current = 'vi';

  // ===== Engine tự dịch toàn trang (runtime, cache) =====
  var I18N = { collected: false, nodes: [], attrs: [], busy: false };
  function cyrb53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function collectNodes() {
    if (I18N.collected) return;
    I18N.collected = true;
    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1 };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var t = n.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
        if (!/[A-Za-zÀ-ỹ]/.test(t)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== document.body) {
          if (p.nodeType === 1) {
            if (skip[p.tagName]) return NodeFilter.FILTER_REJECT;
            if (p.hasAttribute && p.hasAttribute('data-en')) return NodeFilter.FILTER_REJECT;
            if (p.id === 'chatLog' || p.id === 'recoCards') return NodeFilter.FILTER_REJECT;
            if (p.classList && p.classList.contains('lang-select')) return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while ((n = walker.nextNode())) I18N.nodes.push({ node: n, vi: n.nodeValue });
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (el) {
      if (el.hasAttribute('data-en-placeholder')) return;
      I18N.attrs.push({ el: el, attr: 'placeholder', vi: el.getAttribute('placeholder') || '' });
    });
  }
  function cacheGet(lang, s) { try { return localStorage.getItem('tr:' + lang + ':' + cyrb53(s)); } catch (e) { return null; } }
  function cacheSet(lang, s, v) { try { localStorage.setItem('tr:' + lang + ':' + cyrb53(s), v); } catch (e) {} }
  function applyMap(lang, map) {
    I18N.nodes.forEach(function (o) {
      if (lang === 'vi') { o.node.nodeValue = o.vi; return; }
      var key = o.vi.trim(); var tr = map[key];
      if (tr != null) o.node.nodeValue = o.vi.replace(key, tr);
    });
    I18N.attrs.forEach(function (o) {
      if (lang === 'vi') { o.el.setAttribute(o.attr, o.vi); return; }
      var key = o.vi.trim(); var tr = map[key];
      if (tr != null) o.el.setAttribute(o.attr, tr);
    });
  }
  function translateTo(lang) {
    collectNodes();
    if (lang === 'vi') { applyMap('vi', {}); return; }
    var set = {};
    I18N.nodes.forEach(function (o) { var s = o.vi.trim(); if (s) set[s] = 1; });
    I18N.attrs.forEach(function (o) { var s = o.vi.trim(); if (s) set[s] = 1; });
    var uniq = Object.keys(set), map = {}, misses = [];
    uniq.forEach(function (s) { var c = cacheGet(lang, s); if (c != null) map[s] = c; else misses.push(s); });
    applyMap(lang, map);
    if (!misses.length) return;
    var chunks = []; for (var i = 0; i < misses.length; i += 40) chunks.push(misses.slice(i, i + 40));
    if (header) header.classList.add('translating');
    (function next(ci) {
      if (ci >= chunks.length) { if (header) header.classList.remove('translating'); return; }
      fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: chunks[ci], lang: lang }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var arr = (j && j.translations) || [];
          chunks[ci].forEach(function (s, idx) { var t = arr[idx]; if (typeof t === 'string' && t) { map[s] = t; cacheSet(lang, s, t); } });
          if (current === lang) applyMap(lang, map);
        })
        .catch(function () {})
        .then(function () { next(ci + 1); });
    })(0);
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!el.hasAttribute('data-vi')) el.setAttribute('data-vi', el.innerHTML);
      var val = el.getAttribute('data-' + lang);
      el.innerHTML = (val !== null && val !== undefined) ? val : el.getAttribute('data-vi');
    });
    document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      if (!el.hasAttribute('data-vi-placeholder'))
        el.setAttribute('data-vi-placeholder', el.getAttribute('placeholder') || '');
      var val = el.getAttribute('data-' + lang + '-placeholder');
      el.setAttribute('placeholder', (val !== null && val !== undefined) ? val : el.getAttribute('data-vi-placeholder'));
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    document.querySelectorAll('.lang-select').forEach(function (s) { s.value = lang; });
    try { localStorage.setItem('duyoven-lang', lang); } catch (e) {}
    current = lang;
    if (lang !== 'vi' || I18N.collected) translateTo(lang);
  }

  document.querySelectorAll('.lang-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () { applyLang(btn.dataset.lang); });
  });
  document.querySelectorAll('.lang-select').forEach(function (sel) {
    sel.addEventListener('change', function () { applyLang(sel.value); });
  });

  applyLang(current);

  // ----- Product gallery thumbs -----
  var mainImg = document.querySelector('.product-gallery > img');
  document.querySelectorAll('.thumbs img').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      if (mainImg) mainImg.src = thumb.src;
      document.querySelectorAll('.thumbs img').forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
    });
  });
})();

/* ====== CMS: nội dung động từ site-content.json (GĐ2) ====== */
(function () {
  fetch('/site-content.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) return; window.__cms = c;
      var co = c.company || {};
      // Hotline (mọi link tel:)
      if (co.hotline) {
        var tel = co.hotline.replace(/[^0-9+]/g, '');
        document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
          a.setAttribute('href', 'tel:' + tel);
          a.textContent = /Hotline/i.test(a.textContent) ? ('Hotline: ' + co.hotline) : co.hotline;
        });
      }
      // Email (mọi link mailto:)
      if (co.email) document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute('href', 'mailto:' + co.email); a.textContent = co.email;
      });
      // Địa chỉ trong footer
      if (co.address) document.querySelectorAll('.site-footer p[data-en^="Address"]').forEach(function (p) {
        var t = 'Địa chỉ: ' + co.address; p.textContent = t; p.setAttribute('data-vi', t);
      });
      // Phần tử bất kỳ có data-cms="company.hotline" v.v.
      document.querySelectorAll('[data-cms]').forEach(function (el) {
        var v = c, ks = el.getAttribute('data-cms').split('.');
        for (var i = 0; i < ks.length && v != null; i++) v = v[ks[i]];
        if (v != null && typeof v !== 'object') el.textContent = v;
      });
      // Chèn link "Tin tức" vào cột "Khám phá" của footer
      var h4 = Array.prototype.find.call(document.querySelectorAll('.site-footer h4'), function (h) { return /Khám phá|Explore/i.test(h.textContent); });
      if (h4 && h4.nextElementSibling && h4.nextElementSibling.tagName === 'UL') {
        var ul = h4.nextElementSibling;
        if (!ul.querySelector('a[href="tin-tuc.html"]')) {
          var li = document.createElement('li'); li.innerHTML = '<a href="tin-tuc.html">Tin tức</a>';
          ul.appendChild(li);
        }
      }
      // Chèn link "Bảng giá" vào cột "Sản phẩm" của footer
      var h4p = Array.prototype.find.call(document.querySelectorAll('.site-footer h4'), function (h) { return /Sản phẩm|Products/i.test(h.textContent); });
      if (h4p && h4p.nextElementSibling && h4p.nextElementSibling.tagName === 'UL') {
        var ulp = h4p.nextElementSibling;
        if (!ulp.querySelector('a[href="bang-gia.html"]')) {
          var li2 = document.createElement('li'); li2.innerHTML = '<a href="bang-gia.html">Bảng giá</a>';
          ulp.appendChild(li2);
        }
      }
      // ===== Thông số kỹ thuật trên trang chi tiết sản phẩm (từ products[].specs) =====
      (function () {
        function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});}
        var page = (location.pathname.split('/').pop() || '').toLowerCase();
        if (!page || !Array.isArray(c.products)) return;
        var p = c.products.find(function (x) { return x && x.link && x.link.toLowerCase() === page; });
        if (!p || !p.specs) return; var s = p.specs;
        var rows = []; function add(l, v) { if (v != null && String(v).trim()) rows.push([l, String(v)]); }
        if (s.dai || s.rong || s.cao) add('Kích thước (D×R×C)', [s.dai, s.rong, s.cao].filter(Boolean).join(' × ') + ' mm');
        add('Cân nặng', s.nang ? s.nang + ' kg' : ''); add('Số vỉ nướng', s.vi); add('Chất liệu', s.chatLieu);
        add('Bánh xe', s.banhXe); add('Đồng hồ nhiệt', s.dongHo); add('Board điều khiển', s.board);
        if (s.khac) String(s.khac).split('\n').forEach(function (l) { l = l.trim(); var i = l.indexOf(':'); if (i > 0) add(l.slice(0, i).trim(), l.slice(i + 1).trim()); else if (l) add('•', l); });
        if (!rows.length || document.getElementById('cms-spec-table')) return;
        var wrap = document.createElement('section'); wrap.id = 'cms-spec-table'; wrap.style.cssText = 'max-width:1000px;margin:34px auto;padding:0 20px';
        wrap.innerHTML = '<h2 style="font-size:22px;margin:0 0 14px">Thông số kỹ thuật</h2><div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:15px">' +
          rows.map(function (r) { return '<tr style="border-bottom:1px solid rgba(128,128,128,.2)"><td style="padding:11px 12px;color:#8a8a8a;width:42%">' + E(r[0]) + '</td><td style="padding:11px 12px;font-weight:600">' + E(r[1]) + '</td></tr>'; }).join('') +
          '</table></div>';
        var foot = document.querySelector('.site-footer');
        if (foot && foot.parentNode) foot.parentNode.insertBefore(wrap, foot); else document.body.appendChild(wrap);
      })();
    }).catch(function () {});
})();

/* ====== Mục "Factory" trên menu chính → khu Quản Lý (nội bộ) ====== */
(function () {
  var nav = document.querySelector('.main-nav');
  if (nav && !nav.querySelector('a[href="quan-ly.html"]')) {
    var a = document.createElement('a');
    a.href = 'quan-ly.html';
    a.textContent = 'Factory';
    a.setAttribute('data-en', 'Factory'); a.setAttribute('data-zh', 'Factory'); a.setAttribute('data-ko', 'Factory'); a.setAttribute('data-th', 'Factory'); a.setAttribute('data-de', 'Factory');
    a.style.cssText = 'color:var(--ember,#F47B20);font-weight:700';
    nav.appendChild(a);
  }
})();
