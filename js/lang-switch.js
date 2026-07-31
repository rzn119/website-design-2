// Language toggle — EN / Simplified Chinese. Every translatable node
// carries the English text as its own data-en (so this reads back the
// original rather than needing a second copy of it) plus a data-zh
// counterpart; switching just swaps textContent in place; nothing is
// duplicated in the DOM. Choice persists via localStorage so a reload
// (or navigating to another page) keeps whichever language was last
// picked. Same logic as home.html's own copy (which stays inline there
// since that page is otherwise self-contained) -- shared here so every
// other page doesn't need to duplicate it.
(function () {
  var STORAGE_KEY = 'adjectif-lang';
  var options = document.querySelectorAll('.lang-switch__option');
  var nodes = document.querySelectorAll('[data-en]');
  if (!options.length || !nodes.length) return;

  function apply(lang) {
    nodes.forEach(function (el) {
      var zh = el.getAttribute('data-zh');
      el.textContent = (lang === 'zh' && zh) ? zh : el.getAttribute('data-en');
    });
    document.body.classList.toggle('lang-zh', lang === 'zh');
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    options.forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  var saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { saved = null; }
  apply(saved === 'zh' ? 'zh' : 'en');

  options.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-lang');
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
      apply(lang);
    });
  });
})();
