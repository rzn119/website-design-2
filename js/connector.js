(function () {
  var svg = document.getElementById('connector');
  var pathA = document.getElementById('connector-path-a');
  var pathB = document.getElementById('connector-path-b');
  var motifGroup = document.getElementById('connector-motifs');
  var main = document.querySelector('main');
  if (!svg || !pathA || !pathB || !motifGroup || !main) return;

  var hero = document.getElementById('hero');
  var statement = document.getElementById('statement-section');
  var work = document.getElementById('work-preview-section');
  var shop = document.getElementById('shop-preview-section');
  var pullQuote = document.getElementById('pull-quote-section');
  if (!hero || !statement || !work || !shop || !pullQuote) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Seeded RNG (mulberry32) so the hand-drawn jitter is stable across
  // reloads/resizes instead of reshuffling every time the path rebuilds.
  // ---------------------------------------------------------------------
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function catmullRomToBezier(points) {
    var pts = [points[0]].concat(points, [points[points.length - 1]]);
    var segs = [];
    for (var i = 1; i < pts.length - 2; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      segs.push([p1, c1, c2, p2]);
    }
    return segs;
  }

  function jitteredPath(points, seed, jitterAmt, ctrlJitter) {
    var rnd = mulberry32(seed);
    var jpts = points.map(function (p, i) {
      if (i === 0 || i === points.length - 1) return p;
      return [
        p[0] + (rnd() - 0.5) * 2 * jitterAmt,
        p[1] + (rnd() - 0.5) * 2 * jitterAmt * 0.6
      ];
    });
    var segs = catmullRomToBezier(jpts);
    var d = 'M ' + jpts[0][0].toFixed(1) + ',' + jpts[0][1].toFixed(1) + ' ';
    segs.forEach(function (seg) {
      var p1 = seg[0], c1 = seg[1], c2 = seg[2], p2 = seg[3];
      var c1j = [c1[0] + (rnd() - 0.5) * 2 * ctrlJitter, c1[1] + (rnd() - 0.5) * 2 * ctrlJitter];
      var c2j = [c2[0] + (rnd() - 0.5) * 2 * ctrlJitter, c2[1] + (rnd() - 0.5) * 2 * ctrlJitter];
      d += 'C ' + c1j[0].toFixed(1) + ',' + c1j[1].toFixed(1) + ' ' +
        c2j[0].toFixed(1) + ',' + c2j[1].toFixed(1) + ' ' +
        p2[0].toFixed(1) + ',' + p2[1].toFixed(1) + ' ';
    });
    return d.trim();
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function buildMotif(x, y, r) {
    var g = svgEl('g', { class: 'connector__motif' });
    g.appendChild(svgEl('circle', { cx: x, cy: y, r: r }));
    var tick = r * 0.7;
    g.appendChild(svgEl('line', { x1: x - r - tick, y1: y, x2: x - r + tick * 0.3, y2: y }));
    g.appendChild(svgEl('line', { x1: x + r - tick * 0.3, y1: y, x2: x + r + tick, y2: y }));
    g.appendChild(svgEl('line', { x1: x, y1: y - r - tick, x2: x, y2: y - r + tick * 0.3 }));
    g.appendChild(svgEl('line', { x1: x, y1: y + r - tick * 0.3, x2: x, y2: y + r + tick }));
    return g;
  }

  var pathLengthA = 0;
  var pathLengthB = 0;
  var trackTop = 0;    // hero top, offset within main (px)
  var trackHeight = 0; // hero top -> pull-quote bottom, total tracked span (px)
  var motifThresholds = []; // [{ el, progress }]

  function rectRelativeToMain(el) {
    var r = el.getBoundingClientRect();
    var m = main.getBoundingClientRect();
    return { top: r.top - m.top, bottom: r.bottom - m.top, left: r.left - m.left, right: r.right - m.left, width: r.width, height: r.height };
  }

  function build() {
    var mainRect = main.getBoundingClientRect();
    var W = mainRect.width;

    var heroR = rectRelativeToMain(hero);
    var stR = rectRelativeToMain(statement);
    var workR = rectRelativeToMain(work);
    var shopR = rectRelativeToMain(shop);
    var pqR = rectRelativeToMain(pullQuote);
    var pqAttribution = pullQuote.querySelector('.pull-quote-attribution');
    var pqTextBottom = pqAttribution ? rectRelativeToMain(pqAttribution).bottom : (pqR.top + pqR.height * 0.65);

    trackTop = heroR.top;
    trackHeight = pqR.bottom - heroR.top;
    if (trackHeight <= 0) return;

    svg.setAttribute('width', W);
    svg.setAttribute('height', main.getBoundingClientRect().height);

    var cross1 = (heroR.bottom + stR.top) / 2;
    var cross2 = (stR.bottom + workR.top) / 2;
    var cross3 = (workR.bottom + shopR.top) / 2;
    var cross4 = (shopR.bottom + pqR.top) / 2;

    // Waypoints in real pixel coordinates, weaving through the outer
    // gutters of each section and crossing at the divider gaps between
    // them. The pull-quote's text is centered, so the route stays in the
    // left gutter until just past the attribution line, only swinging to
    // center for the final approach to the terminal mark.
    var waypoints = [
      [W * 0.90, heroR.top],
      [W * 0.94, heroR.top + (heroR.height * 0.20)],
      [W * 0.895, heroR.top + (heroR.height * 0.45)],
      [W * 0.93, heroR.top + (heroR.height * 0.72)],
      [W * 0.885, cross1 - 6],
      [W * 0.55, cross1],
      [W * 0.10, cross1 + 6],
      [W * 0.06, stR.top + stR.height * 0.25],
      [W * 0.095, stR.top + stR.height * 0.6],
      [W * 0.05, cross2 - 6],
      [W * 0.30, cross2],
      [W * 0.93, cross2 + 6],
      [W * 0.895, workR.top + workR.height * 0.30],
      [W * 0.945, workR.top + workR.height * 0.62],
      [W * 0.905, cross3 - 6],
      [W * 0.60, cross3],
      [W * 0.08, cross3 + 6],
      [W * 0.045, shopR.top + shopR.height * 0.35],
      [W * 0.09, shopR.top + shopR.height * 0.68],
      [W * 0.055, cross4 - 6],
      [W * 0.40, cross4],
      [W * 0.10, cross4 + 6],
      [W * 0.08, pqTextBottom],
      [W * 0.28, pqTextBottom + (pqR.bottom - pqTextBottom) * 0.4],
      [W * 0.50, pqTextBottom + (pqR.bottom - pqTextBottom) * 0.78],
      [W * 0.50, pqR.bottom]
    ];

    var jitterAmt = Math.max(4, Math.min(10, W * 0.008));
    var ctrlJitter = jitterAmt * 1.6;

    if (reducedMotion) {
      // A calmer, near-straight rendering: keep the same waypoints (so the
      // route/negative-space placement is identical) but skip the jitter.
      pathA.setAttribute('d', jitteredPath(waypoints, 1, 0, 0));
      pathB.setAttribute('d', jitteredPath(waypoints, 2, 0, 0));
    } else {
      pathA.setAttribute('d', jitteredPath(waypoints, 17, jitterAmt, ctrlJitter));
      pathB.setAttribute('d', jitteredPath(waypoints, 42, jitterAmt, ctrlJitter));
    }

    pathLengthA = pathA.getTotalLength();
    pathLengthB = pathB.getTotalLength();
    pathA.style.strokeDasharray = pathLengthA;
    pathB.style.strokeDasharray = pathLengthB;

    // Motifs at each crossing plus a deliberate terminal mark — reuses the
    // same circle+crosshair vocabulary as the logo and statement mark.
    motifGroup.innerHTML = '';
    var crossings = [cross1, cross2, cross3, cross4];
    motifThresholds = [];
    crossings.forEach(function (y) {
      var idx = waypoints.findIndex(function (p) { return Math.abs(p[1] - y) < 0.5; });
      var x = idx >= 0 ? waypoints[idx][0] : W * 0.5;
      var el = buildMotif(x, y, 9);
      motifGroup.appendChild(el);
      motifThresholds.push({ el: el, progress: (y - trackTop) / trackHeight });
    });
    var terminal = buildMotif(W * 0.5, pqR.bottom, 13);
    terminal.classList.add('connector__motif--terminal');
    motifGroup.appendChild(terminal);
    motifThresholds.push({ el: terminal, progress: 1 });

    motifThresholds.forEach(function (m) {
      m.el.style.opacity = 0;
      m.el.style.transition = 'opacity 0.4s ease';
    });

    applyProgress(currentProgress, true);
  }

  var currentProgress = reducedMotion ? 1 : 0;
  var targetProgress = currentProgress;

  // The lerp toward targetProgress is asymptotic and, especially at the
  // very end of the track, can settle a hair under the exact threshold a
  // motif is watching for (e.g. 0.997 instead of 1.0) even after it has
  // visually caught up — so motifs trigger with a small tolerance rather
  // than requiring bit-exact convergence.
  var MOTIF_TOLERANCE = 0.015;

  function applyProgress(p, immediate) {
    if (pathLengthA) pathA.style.strokeDashoffset = pathLengthA * (1 - p);
    if (pathLengthB) pathB.style.strokeDashoffset = pathLengthB * (1 - p);
    motifThresholds.forEach(function (m) {
      m.el.style.opacity = p >= m.progress - MOTIF_TOLERANCE ? 1 : 0;
    });
  }

  function computeTargetProgress() {
    if (trackHeight <= 0) return 0;
    var heroTopViewport = hero.getBoundingClientRect().top;
    var viewportAnchor = window.innerHeight * 0.5;
    var scrolledInto = viewportAnchor - heroTopViewport;
    return Math.max(0, Math.min(1, scrolledInto / trackHeight));
  }

  function tick() {
    targetProgress = computeTargetProgress();
    currentProgress += (targetProgress - currentProgress) * 0.15;
    if (Math.abs(targetProgress - currentProgress) < 0.0005) currentProgress = targetProgress;
    applyProgress(currentProgress);
    window.requestAnimationFrame(tick);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 150);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(build);
  }
  window.addEventListener('load', build);
  build();

  if (!reducedMotion) {
    window.requestAnimationFrame(tick);
  }
})();
