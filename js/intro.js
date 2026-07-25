(function () {
  var html = document.documentElement;
  if (html.classList.contains('intro-skip')) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    try { sessionStorage.setItem('adjectif-intro-seen', '1'); } catch (e) {}
    return;
  }

  var intro = document.getElementById('intro');
  var mark = document.getElementById('intro-mark');
  var navMark = document.getElementById('intro-nav-mark');
  var ticks = document.getElementById('intro-ticks');
  var heroMark = document.getElementById('hero-mark');
  var navWord = document.getElementById('intro-nav-word');
  if (!intro || !mark || !navMark) return;

  var drawEls = [
    document.getElementById('intro-circle-a'),
    document.getElementById('intro-circle-a2'),
    document.getElementById('intro-circle-b'),
    document.getElementById('intro-circle-b2'),
    document.getElementById('intro-diagonal'),
    document.getElementById('intro-diagonal2')
  ].filter(Boolean);

  document.body.classList.add('intro-running');

  // Lock the word's box to its natural width before its letters detach
  // into position:fixed for the scatter — otherwise the header's flex
  // layout would collapse where the word used to be and nav-links/
  // actions would jump sideways once the letters return to view.
  var letters = [];
  if (navWord) {
    navWord.style.minWidth = navWord.getBoundingClientRect().width + 'px';
    letters = Array.prototype.slice.call(navWord.querySelectorAll('.intro-letter'));
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function positionMark() {
    var rect = navMark.getBoundingClientRect();
    mark.style.left = rect.left + 'px';
    mark.style.top = rect.top + 'px';
    mark.style.width = rect.width + 'px';
    mark.style.height = rect.height + 'px';
    mark.style.transformOrigin = '50% 50%';
    var scaleK = (Math.max(window.innerWidth, window.innerHeight) * 1.15) / Math.max(rect.width, 1);
    mark.style.transition = 'none';
    mark.style.transform = 'scale(' + scaleK.toFixed(2) + ')';
    return scaleK;
  }

  positionMark();

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(runSequence);
  });

  function runSequence() {
    // Re-measure once more after fonts/layout have had a chance to
    // settle, in case the nav mark's true position shifted slightly.
    positionMark();
    void mark.offsetWidth; // commit the scale-up transform before drawing

    // Web Animations API rather than a CSS transition + rAF-flip: the
    // from/to values are declared up front in the keyframes, so there's
    // no dependency on the browser having painted an intermediate style
    // before the next mutation lands (a CSS transition needs that, and
    // in some automation/headless contexts rAF can resolve fast enough
    // that the "committed" starting frame never actually paints).
    var drawDuration = 1150;
    drawEls.forEach(function (el) {
      var len = el.getTotalLength();
      el.style.strokeDasharray = len;
      var isDiagonal = el.id.indexOf('diagonal') === 0;
      el.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        {
          duration: drawDuration,
          delay: isDiagonal ? 250 : 0,
          easing: 'cubic-bezier(0.45, 0.05, 0.35, 1)',
          fill: 'forwards'
        }
      );
    });

    if (ticks) window.setTimeout(function () { ticks.classList.add('is-visible'); }, drawDuration - 150);

    var holdEnd = drawDuration + 250 + 450; // draw + diagonal offset + hold

    window.setTimeout(zoomOut, holdEnd);
  }

  function zoomOut() {
    mark.style.transition = 'transform 1.05s cubic-bezier(0.22, 1, 0.36, 1)';
    mark.style.transform = 'scale(1)';

    window.setTimeout(revealHeader, 500);
    window.setTimeout(finish, 1550);
  }

  function revealHeader() {
    document.body.classList.add('intro-header-revealed');
    scatterLetters();
    window.setTimeout(revealHero, 380);
  }

  function scatterLetters() {
    if (!letters.length) return;
    var rnd = mulberry32(9);
    var rects = letters.map(function (el) { return el.getBoundingClientRect(); });
    letters.forEach(function (el, i) {
      var rect = rects[i];
      var finalX = rect.left;
      var finalY = rect.top;
      var angle = rnd() * Math.PI * 2;
      var radius = 16 + rnd() * 26;
      var scatterX = finalX + Math.cos(angle) * radius;
      var scatterY = finalY + Math.sin(angle) * radius;
      var scatterRot = (rnd() * 46 - 23).toFixed(1);

      el.style.position = 'fixed';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.opacity = '1';

      el.animate(
        [
          { transform: 'translate(' + scatterX.toFixed(1) + 'px,' + scatterY.toFixed(1) + 'px) rotate(' + scatterRot + 'deg)' },
          { transform: 'translate(' + finalX.toFixed(1) + 'px,' + finalY.toFixed(1) + 'px) rotate(0deg)' }
        ],
        {
          duration: 420,
          delay: 20 + i * 22,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'both'
        }
      );
    });
    document.body.classList.add('intro-letters-done');
  }

  function revealHero() {
    document.body.classList.add('intro-hero-revealed');
    if (heroMark) {
      heroMark.classList.remove('is-revealing');
      void heroMark.offsetWidth;
      heroMark.classList.add('is-revealing');
    }
  }

  function finish() {
    intro.classList.add('is-fading');
    window.setTimeout(function () {
      intro.style.display = 'none';
      document.body.classList.remove('intro-running');
    }, 550);
    try { sessionStorage.setItem('adjectif-intro-seen', '1'); } catch (e) {}
  }
})();
