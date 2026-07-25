(function () {
  var cover = document.getElementById('cover');
  var title = document.getElementById('cover-title');
  var fade = document.getElementById('cover-fade');
  if (!cover) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var advanced = false;

  function advance() {
    if (advanced) return;
    advanced = true;
    try {
      sessionStorage.setItem('adjectif-cover-seen', '1');
    } catch (e) {}
    fade.classList.add('is-active');
    window.setTimeout(function () {
      window.location.href = 'home.html';
    }, reducedMotion ? 60 : 480);
  }

  // Only a deliberate click/tap moves on — no auto-advance timer, and no
  // generic keydown trigger (the sr-only "Skip intro" link already covers
  // keyboard-only navigation without an accidental keystroke advancing it).
  cover.addEventListener('click', advance);

  // -------------------------------------------------------------------------
  // Letter entrance — the shadow-styled letters drift together into place
  // from a modest scatter, then the continuous sway (CSS, on the shared
  // .cover__title container) takes over. Letters keep their soft opacity
  // throughout; only position/rotation animate here.
  // -------------------------------------------------------------------------
  if (title && !reducedMotion) {
    var letters = Array.prototype.slice.call(title.querySelectorAll('.cover__letter'));
    // Letters stay in normal document flow the whole time — the scatter is
    // just a small random offset transform animating back to zero, not a
    // reposition to absolute viewport coordinates. That matters here: this
    // container also has its own CSS transform (title-sway, for the
    // continuous drift once settled), and a transform on an ancestor makes
    // it the containing block for any position:fixed descendant — which
    // would send fixed-positioned letters to nonsensical coordinates the
    // moment the sway animation starts. Normal flow sidesteps that trap
    // entirely and also means the group sways together for free, since the
    // container's transform naturally carries its in-flow children.
    letters.forEach(function (letter, i) {
      var angle = Math.random() * Math.PI * 2;
      var radius = 14 + Math.random() * 20;
      var scatterX = Math.cos(angle) * radius;
      var scatterY = Math.sin(angle) * radius;
      var scatterRot = (Math.random() * 30 - 15).toFixed(1);

      letter.animate(
        [
          { transform: 'translate(' + scatterX.toFixed(1) + 'px,' + scatterY.toFixed(1) + 'px) rotate(' + scatterRot + 'deg)' },
          { transform: 'translate(0,0) rotate(0deg)' }
        ],
        {
          duration: 900,
          delay: 120 + i * 55,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both'
        }
      );
    });
  }
})();
