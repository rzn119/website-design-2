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

  var hasDrawn = false;
  var strokeActive = false;
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

  function stampCluster(px, py, nx, ny) {
    // Dense core near the centerline (solid wax coverage) plus a sparser
    // scatter out toward the edges (the rough, grainy fringe of a real
    // crayon mark) — spread uses two summed randoms so it clusters toward
    // the middle instead of an even distribution across the full width.
    var core = 5 + Math.floor(Math.random() * 3);
    for (var k = 0; k < core; k++) {
      var s = (Math.random() + Math.random() - 1) * STROKE_HALF_WIDTH * 0.55;
      stampGrain(px + nx * s, py + ny * s, 1);
    }
    var fringe = 3 + Math.floor(Math.random() * 3);
    for (var m = 0; m < fringe; m++) {
      var sign = Math.random() < 0.5 ? -1 : 1;
      var s2 = sign * (STROKE_HALF_WIDTH * 0.5 + Math.random() * STROKE_HALF_WIDTH * 0.6);
      stampGrain(px + nx * s2, py + ny * s2, 0.6);
    }
  }

  function drawSegment(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    var nx = -dy / dist;
    var ny = dx / dist;
    var steps = Math.min(MAX_STEPS_PER_SEGMENT, Math.max(1, Math.round(dist / STEP_SPACING)));

    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var px = x0 + dx * t + nx * (Math.random() - 0.5) * 0.6;
      var py = y0 + dy * t + ny * (Math.random() - 0.5) * 0.6;
      stampCluster(px, py, nx, ny);
    }
    ctx.globalAlpha = 1;
  }

  function stampStart(x, y) {
    stampCluster(x, y, 1, 0);
    stampCluster(x, y, 0, 1);
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
    lastX = x;
    lastY = y;
    strokeActive = true;
    stampStart(x, y);
  }

  function endStroke() {
    strokeActive = false;
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
})();
