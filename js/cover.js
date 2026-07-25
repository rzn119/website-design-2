(function () {
  var cover = document.getElementById('cover');
  var canvas = document.getElementById('cover-canvas');
  var pencil = document.getElementById('cover-pencil');
  var prompt = document.getElementById('cover-prompt');
  var clearBtn = document.getElementById('cover-clear');
  var fade = document.getElementById('cover-fade');
  if (!cover || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.max(window.devicePixelRatio || 1, 1);
  var W = 0;
  var H = 0;
  var navy = '#2B3A6B';

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
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.6;
  }

  var navyVar = getComputedStyle(document.documentElement).getPropertyValue('--navy');
  if (navyVar && navyVar.trim()) navy = navyVar.trim();
  resize();
  window.addEventListener('resize', resize);

  // Where the pencil's drawn tip sits within its own 30x30 SVG box —
  // used to offset the cursor so the tip lands exactly on the pointer,
  // not the icon's corner.
  var PENCIL_TIP_X = 3;
  var PENCIL_TIP_Y = 26;

  var hasDrawn = false;
  var pointerActive = false;
  var lastX = 0;
  var lastY = 0;
  var advanced = false;
  var autoAdvanceTimer = null;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function positionPencil(x, y) {
    pencil.style.transform = 'translate(' + (x - PENCIL_TIP_X) + 'px,' + (y - PENCIL_TIP_Y) + 'px)';
  }

  function jitter(v) {
    return v + (Math.random() - 0.5) * 1.1;
  }

  function drawSegment(x0, y0, x1, y1) {
    var mx = (x0 + x1) / 2;
    var my = (y0 + y1) / 2;
    ctx.beginPath();
    ctx.moveTo(jitter(x0), jitter(y0));
    ctx.quadraticCurveTo(jitter(mx), jitter(my), jitter(x1), jitter(y1));
    ctx.stroke();
  }

  function markDrawn() {
    if (hasDrawn) return;
    hasDrawn = true;
    prompt.classList.add('is-hidden');
    autoAdvanceTimer = window.setTimeout(advance, 4200);
  }

  function handleMove(x, y) {
    positionPencil(x, y);
    pencil.classList.add('is-active');
    if (!pointerActive) {
      pointerActive = true;
      lastX = x;
      lastY = y;
      return;
    }
    drawSegment(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
    markDrawn();
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, W, H);
  }

  function advance() {
    if (advanced) return;
    advanced = true;
    if (autoAdvanceTimer) window.clearTimeout(autoAdvanceTimer);
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

  canvas.addEventListener('pointermove', function (e) {
    handleMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerdown', function (e) {
    pointerActive = false; // fresh segment start, don't connect to a stale point
    handleMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', function () {
    pointerActive = false;
  });

  canvas.addEventListener('pointerleave', function () {
    pointerActive = false;
    pencil.classList.remove('is-active');
  });

  cover.addEventListener('click', function () {
    advance();
  });

  clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearCanvas();
  });

  document.addEventListener('keydown', function () {
    advance();
  });
})();
