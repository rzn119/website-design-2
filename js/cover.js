(function () {
  var cover = document.getElementById('cover');
  var canvas = document.getElementById('cover-canvas');
  var crayon = document.getElementById('cover-crayon');
  var prompt = document.getElementById('cover-prompt');
  var clearBtn = document.getElementById('cover-clear');
  var fade = document.getElementById('cover-fade');
  if (!cover || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.max(window.devicePixelRatio || 1, 1);
  var W = 0;
  var H = 0;

  var PASTELS = [
    '#C98F6E', /* pale terracotta */
    '#9CAE8C', /* muted sage */
    '#93B0C7', /* soft powder blue */
    '#DDA9A3', /* warm blush */
    '#D2B26A', /* pale ochre */
    '#B39CC0'  /* dusty lilac */
  ];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  resize();
  window.addEventListener('resize', resize);

  var CRAYON_TIP_X = 8;
  var CRAYON_TIP_Y = 24;
  var STOP_MS = 400;
  var STROKE_HALF_WIDTH = 3.6;
  var STEP_SPACING = 1.1;
  var MAX_STEPS_PER_SEGMENT = 80;
  var LIFT_GAP = 50; /* px the pointer must travel before a new stroke starts marking, so it never touches the previous one */
  var FADE_DISTANCE = 260; /* px of drawn stroke over which opacity tapers from full to MIN_FADE */
  var MIN_FADE = 0.26;

  var hasDrawn = false;
  var strokeActive = false;
  var liftPending = false;
  var originX = 0;
  var originY = 0;
  var strokeDistance = 0;
  var currentColor = null;
  var lastX = 0;
  var lastY = 0;
  var stopTimer = null;
  var advanced = false;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function positionCrayon(x, y) {
    crayon.style.transform = 'translate(' + (x - CRAYON_TIP_X) + 'px,' + (y - CRAYON_TIP_Y) + 'px)';
  }

  // A single flick of a real crayon is made of many tiny catches of wax on
  // the paper's tooth, not one smooth vector line — so each stroke is built
  // from a cloud of short, randomly-angled, randomly-faded dashes scattered
  // across the stroke's width rather than a single ctx.stroke() call.
  function stampGrain(px, py, weight) {
    var len = 1 + Math.random() * 2.4;
    var ang = Math.random() * Math.PI;
    var hx = Math.cos(ang) * len / 2;
    var hy = Math.sin(ang) * len / 2;
    ctx.globalAlpha = (0.16 + Math.random() * 0.34) * weight;
    ctx.lineWidth = 0.9 + Math.random() * 1.7;
    ctx.beginPath();
    ctx.moveTo(px - hx, py - hy);
    ctx.lineTo(px + hx, py + hy);
    ctx.stroke();
  }

  function stampCluster(px, py, nx, ny, fade) {
    // Dense core near the centerline (solid wax coverage) plus a sparser
    // scatter out toward the edges (the rough, grainy fringe of a real
    // crayon mark) — spread uses two summed randoms so it clusters toward
    // the middle instead of an even distribution across the full width.
    var core = 5 + Math.floor(Math.random() * 3);
    for (var k = 0; k < core; k++) {
      var s = (Math.random() + Math.random() - 1) * STROKE_HALF_WIDTH * 0.55;
      stampGrain(px + nx * s, py + ny * s, fade);
    }
    var fringe = 3 + Math.floor(Math.random() * 3);
    for (var m = 0; m < fringe; m++) {
      var sign = Math.random() < 0.5 ? -1 : 1;
      var s2 = sign * (STROKE_HALF_WIDTH * 0.5 + Math.random() * STROKE_HALF_WIDTH * 0.6);
      stampGrain(px + nx * s2, py + ny * s2, fade * 0.6);
    }
  }

  // Real crayon pressure is heaviest where the stroke lands and tapers off
  // as it's dragged out, so opacity fades from full at the start of each
  // stroke down to MIN_FADE by FADE_DISTANCE, tracked as distance drawn
  // since this stroke's first mark (reset per-stroke, not per-segment).
  function fadeAt(distanceSoFar) {
    return Math.max(MIN_FADE, 1 - distanceSoFar / FADE_DISTANCE);
  }

  function drawSegment(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    var nx = -dy / dist;
    var ny = dx / dist;
    var steps = Math.min(MAX_STEPS_PER_SEGMENT, Math.max(1, Math.round(dist / STEP_SPACING)));
    var stepDist = dist / steps;

    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var px = x0 + dx * t + nx * (Math.random() - 0.5) * 0.6;
      var py = y0 + dy * t + ny * (Math.random() - 0.5) * 0.6;
      strokeDistance += stepDist;
      stampCluster(px, py, nx, ny, fadeAt(strokeDistance));
    }
    ctx.globalAlpha = 1;
  }

  function stampStart(x, y) {
    strokeDistance = 0;
    stampCluster(x, y, 1, 0, 1);
    stampCluster(x, y, 0, 1, 1);
    ctx.globalAlpha = 1;
  }

  function pickColor() {
    if (PASTELS.length === 1) return PASTELS[0];
    var c;
    do {
      c = PASTELS[Math.floor(Math.random() * PASTELS.length)];
    } while (c === currentColor);
    return c;
  }

  function markDrawn() {
    if (hasDrawn) return;
    hasDrawn = true;
    prompt.classList.add('is-hidden');
  }

  function beginStroke(x, y) {
    currentColor = pickColor();
    ctx.strokeStyle = currentColor;
    crayon.style.setProperty('--crayon-color', currentColor);
    originX = x;
    originY = y;
    lastX = x;
    lastY = y;
    strokeActive = true;
    liftPending = true;
  }

  function endStroke() {
    strokeActive = false;
    liftPending = false;
    if (stopTimer) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function handleMove(x, y) {
    positionCrayon(x, y);
    crayon.classList.add('is-active');

    if (!strokeActive) {
      beginStroke(x, y);
    } else if (liftPending) {
      // Pointer is still inside the lift gap since this stroke began —
      // follow the cursor but don't mark yet, so the new stroke never
      // touches wherever the previous one ended.
      var travelled = Math.sqrt((x - originX) * (x - originX) + (y - originY) * (y - originY));
      if (travelled >= LIFT_GAP) {
        liftPending = false;
        lastX = x;
        lastY = y;
        stampStart(x, y);
      }
    } else {
      drawSegment(lastX, lastY, x, y);
      lastX = x;
      lastY = y;
    }

    markDrawn();

    if (stopTimer) window.clearTimeout(stopTimer);
    stopTimer = window.setTimeout(endStroke, STOP_MS);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, W, H);
  }

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

  canvas.addEventListener('pointermove', function (e) {
    handleMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerdown', function (e) {
    endStroke();
    handleMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', function () {
    endStroke();
  });

  canvas.addEventListener('pointerleave', function () {
    endStroke();
    crayon.classList.remove('is-active');
  });

  // Only a deliberate click/tap moves on — no auto-advance timer, and no
  // generic keydown trigger (the sr-only "Skip intro" link already covers
  // keyboard-only navigation without an accidental keystroke advancing it).
  cover.addEventListener('click', advance);

  clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearCanvas();
  });

  // -------------------------------------------------------------------------
  // Scattered-letters title reveal — "ADJECTIF CREATION" starts as loose,
  // randomly-placed/rotated letters and animates into its normal typeset
  // position. Each letter keeps its real inline layout (so word spacing is
  // exactly what the stylesheet says) and is measured there first; only
  // then does it switch to position:fixed and fly in from a random point,
  // landing on that measured spot.
  // -------------------------------------------------------------------------
  (function runTitleReveal() {
    var title = document.getElementById('cover-title');
    if (!title) return;
    var letters = Array.prototype.slice.call(title.querySelectorAll('.cover__letter'));
    if (!letters.length) return;

    if (reducedMotion) {
      title.classList.add('is-reduced');
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          title.classList.add('is-settled');
        });
      });
      return;
    }

    // Measure every letter's real resting position first, in one pass —
    // switching a letter to position:fixed removes it from the inline flow,
    // which would shift the still-unmeasured letters after it if the two
    // passes were interleaved.
    var rects = letters.map(function (letter) {
      return letter.getBoundingClientRect();
    });

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var margin = 16;

    // Scatter magnitude is tied to each letter's own rendered size rather
    // than the viewport, so the pile reads as an overlapping jumble of
    // letters close to their word (like a dropped stencil-lettering set)
    // instead of pieces flung to the far corners of the screen — and it
    // scales naturally with the responsive font-size on small viewports.
    letters.forEach(function (letter, i) {
      var rect = rects[i];
      var finalX = rect.left;
      var finalY = rect.top;
      var scatterRadiusX = rect.height * 1.7;
      var scatterRadiusY = rect.height * 1.15;

      var scatterX = finalX + (Math.random() - 0.5) * 2 * scatterRadiusX;
      var scatterY = finalY + (Math.random() - 0.5) * 2 * scatterRadiusY;
      scatterX = Math.min(Math.max(scatterX, margin), Math.max(margin, vw - margin - rect.width));
      scatterY = Math.min(Math.max(scatterY, margin), Math.max(margin, vh - margin - rect.height));
      var scatterRot = (Math.random() * 64 - 32).toFixed(1);

      letter.style.position = 'fixed';
      letter.style.left = '0px';
      letter.style.top = '0px';
      letter.style.opacity = '1';

      var startTransform = 'translate(' + scatterX.toFixed(1) + 'px,' + scatterY.toFixed(1) + 'px) rotate(' + scatterRot + 'deg)';
      var endTransform = 'translate(' + finalX.toFixed(1) + 'px,' + finalY.toFixed(1) + 'px) rotate(0deg)';

      letter.animate(
        [{ transform: startTransform }, { transform: endTransform }],
        {
          duration: 1500,
          delay: 300 + i * 170,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'both'
        }
      );
    });
  })();
})();
