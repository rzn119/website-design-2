(function () {
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    var isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

(function () {
  var hero = document.getElementById('hero');
  var mark = document.getElementById('hero-mark');
  if (!hero || !mark || !('IntersectionObserver' in window)) return;

  // Observe the hero section, not the mark itself — the mark is hidden via
  // clip-path between reveals, and a fully-clipped (zero-area) target never
  // reports as intersecting, so it could never re-trigger its own reveal.
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      mark.classList.remove('is-revealing');
      void mark.offsetWidth; // force reflow so the animation restarts
      mark.classList.add('is-revealing');
    });
  }, { threshold: 0.3 });

  observer.observe(hero);
})();
