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
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.82;
  }

  resize();
  window.addEventListener('resize', resize);

  var CRAYON_TIP_X = 8;
  var CRAYON_TIP_Y = 24;
  var STOP_MS = 400;

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

  function jitter(v) {
    return v + (Math.random() - 0.5) * 1.6;
  }

  function drawSegment(x0, y0, x1, y1) {
    var mx = (x0 + x1) / 2;
    var my = (y0 + y1) / 2;
    ctx.beginPath();
    ctx.moveTo(jitter(x0), jitter(y0));
    ctx.quadraticCurveTo(jitter(mx), jitter(my), jitter(x1), jitter(y1));
    ctx.stroke();
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
