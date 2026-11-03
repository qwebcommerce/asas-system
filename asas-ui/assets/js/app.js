/* ASAS System — small UI behaviours for the static prototype.
   Language (EN/AR + RTL), theme, mobile menu, modals, drawers, toasts, chip groups. */
(function () {
  var root = document.documentElement;
  var dict = window.ASAS_I18N || { en: {}, ar: {} };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Language ---------- */
  function setLang(lang) {
    var t = dict[lang] || dict.en;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (t[k] != null) el.textContent = t[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph'); if (t[k]) el.placeholder = t[k];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria'); if (t[k]) el.setAttribute('aria-label', t[k]);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-label'); if (t[k]) el.setAttribute('data-label', t[k]);
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    store.set('asas-lang', lang);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang')); }
  });

  /* ---------- Theme ---------- */
  function setTheme(theme) {
    if (theme === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
    store.set('asas-theme', theme);
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === theme));
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-theme-toggle]')) setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    var s = e.target.closest('[data-set-theme]'); if (s) setTheme(s.getAttribute('data-set-theme'));
  });

  /* ---------- Overlays (modal / drawer / mobile menu) ---------- */
  var overlay = document.querySelector('[data-overlay]');
  var openEl = null;
  function open(el) {
    if (!el) return;
    closeAll();
    el.classList.add('is-open'); overlay && overlay.classList.add('is-open'); openEl = el;
    var f = el.querySelector('input, select, textarea, button'); if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function closeAll() {
    document.querySelectorAll('.modal.is-open, .drawer.is-open, .sidebar.is-open').forEach(function (el) { el.classList.remove('is-open'); });
    overlay && overlay.classList.remove('is-open'); openEl = null;
  }
  function toast(id) {
    var t = document.getElementById(id); if (!t) return;
    t.classList.add('is-open'); setTimeout(function () { t.classList.remove('is-open'); }, 3200);
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); open(document.getElementById(o.getAttribute('data-open'))); return; }
    var c = e.target.closest('[data-close]');
    if (c) {
      closeAll();
      if (c.hasAttribute('data-toast')) toast(c.getAttribute('data-toast'));
      var swap = c.getAttribute('data-swap');
      if (swap === 'pending') { var a = document.getElementById('basic'), p = document.getElementById('pending'); if (a) a.hidden = true; if (p) p.hidden = false; }
      return;
    }
    var t = e.target.closest('[data-toast]'); if (t) toast(t.getAttribute('data-toast'));
    if (e.target.closest('[data-menu]')) { var sb = document.getElementById('sidebar'); sb.classList.add('is-open'); overlay.classList.add('is-open'); }
    if (e.target === overlay) closeAll();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* ---------- Chip / segmented groups (single choice) ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-group] > button');
    if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  });

  /* ---------- Init ---------- */
  setLang(store.get('asas-lang') || 'en');
  setTheme(store.get('asas-theme') || 'light');
})();
