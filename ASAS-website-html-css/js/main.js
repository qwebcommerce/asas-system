/* ASAS — small interactions shared by all pages */
(function () {
  // Toggle buttons (service chips in the consultation forms)
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  // Single-choice filters: Blogs (.filter -> .article) and Documents (.cat -> .resource)
  function setupFilter(buttonSel, itemSel) {
    var buttons = document.querySelectorAll(buttonSel);
    var items = document.querySelectorAll(itemSel);
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        var key = btn.dataset.filter;
        items.forEach(function (item) {
          item.hidden = !(key === 'all' || item.dataset.cat === key);
        });
      });
    });
  }
  setupFilter('.filter', '.article');
  setupFilter('.cat', '.resource');

  // Demo forms: keep the visitor on the page
  document.querySelectorAll('form.form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form__note');
      if (note) note.textContent = 'Thank you — we will call you within one working day.';
    });
  });

  // Fade sections in as they scroll into view
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
})();
