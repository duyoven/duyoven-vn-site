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

  // ----- Đa ngôn ngữ -----
  // Mỗi phần tử dịch có data-en/data-zh/data-ko; bản tiếng Việt gốc lưu vào data-vi.
  var current = localStorage.getItem('duyoven-lang') || 'vi';
  if (LANGS.indexOf(current) === -1) current = 'vi';

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
