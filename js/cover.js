(function () {
  var cover = document.getElementById('cover');
  var fade = document.getElementById('cover-fade');
  var respondEls = Array.prototype.slice.call(document.querySelectorAll('.fabric__respond'));
  if (!cover) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var advanced = false;

  function advance() {
    if (advanced) return;
    advanced = true;
    try {
      sessionStorage.setItem('adjectif-cover-seen', '1');
    } catch (e) {
      /* private browsing / storage disabled — just proceed without it */
    }
    fade.classList.add('is-active');
    window.setTimeout(function () {
      window.location.href = 'home.html';
    }, reducedMotion ? 60 : 480);
  }

  // Only a deliberate click/tap moves on — no auto-advance timer, and no
  // generic keydown trigger (the sr-only "Skip intro" link already covers
  // keyboard-only navigation without an accidental keystroke advancing it).
  cover.addEventListener('click', advance);

  if (respondEls.length === 0 || reducedMotion) return;

  // Pointer sits far off-canvas until real input arrives, so shapes stay
  // in their pure ambient drift with zero response influence at first.
  var pointerX = -9999;
  var pointerY = -9999;

  var state = respondEls.map(function () {
    return { x: 0, y: 0, rot: 0, scale: 1 };
  });

  window.addEventListener('pointermove', function (e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  });

  window.addEventListener('pointerleave', function () {
    pointerX = -9999;
    pointerY = -9999;
  });

  var MAX_DISTANCE = 640;
  var PULL_STRENGTH = 80; // px at full influence
  var ROTATE_STRENGTH = 12; // deg at full influence
  var SCALE_STRENGTH = 0.11;
  var EASE = 0.06;

  function tick() {
    // Batch all geometry reads before any writes, so applying a transform
    // to shape N never forces a synchronous layout before shape N+1 is read.
    var rects = respondEls.map(function (el) {
      return el.getBoundingClientRect();
    });

    rects.forEach(function (rect, i) {
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = pointerX - cx;
      var dy = pointerY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var influence = Math.max(0, 1 - dist / MAX_DISTANCE);

      var s = state[i];
      var targetX = dist > 0 ? (dx / (dist || 1)) * PULL_STRENGTH * influence : 0;
      var targetY = dist > 0 ? (dy / (dist || 1)) * PULL_STRENGTH * influence : 0;
      var targetRot = (i % 2 === 0 ? 1 : -1) * ROTATE_STRENGTH * influence;
      var targetScale = 1 + SCALE_STRENGTH * influence;

      s.x += (targetX - s.x) * EASE;
      s.y += (targetY - s.y) * EASE;
      s.rot += (targetRot - s.rot) * EASE;
      s.scale += (targetScale - s.scale) * EASE;
    });

    respondEls.forEach(function (el, i) {
      var s = state[i];
      el.style.transform =
        'translate(' + s.x.toFixed(2) + 'px,' + s.y.toFixed(2) + 'px) ' +
        'rotate(' + s.rot.toFixed(2) + 'deg) ' +
        'scale(' + s.scale.toFixed(3) + ')';
    });

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
