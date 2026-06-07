/* ─────────────────────────────────────────────────────
   dataviz.js — lazy, reusable Chart.js layer for the portfolio.

   Pages register chart builders by id, then call DataViz.boot():
     <div class="hz-chart-wrap">
       <canvas class="dataviz-canvas" data-chart="angel-ebitda"
               role="img" aria-label="..."></canvas>
     </div>
     <script src="dataviz.js?v=1"></script>
     <script>
       DataViz.register('angel-ebitda', function (ctx) { return { type:'line', ... }; });
       DataViz.boot();
     </script>

   Discipline (matches the site's perf contract):
   - Chart.js 4.4.2 + annotation 3.0.1 are injected (SRI + crossorigin) only AFTER
     first paint and only if a .dataviz-canvas[data-chart] exists on the page.
   - Each chart builds when it scrolls into view (IntersectionObserver).
   - Under prefers-reduced-motion the chart renders its final state with no animation.
   - The static table / strip beside each chart stays in the DOM as the fallback;
     if the CDN fails, that table simply remains and nothing breaks.
   - Builders receive resolved CSS-token colours + a shared baseOptions() factory,
     so chart configs stay tiny and on-brand. Never invents data — builders pass in
     only numbers already present in the page.
───────────────────────────────────────────────────── */

(function () {
  'use strict';

  var CHART_SRI = 'sha384-e6cc9LaIG7xZ3XD5B+jtr1NhTWPQGQdRCh6xiZ+ZFUtWCpg4ycv3Sh+SkZoopvUY';
  var ANNO_SRI  = 'sha384-oNtu+d18330MVFpltUTve1DatxCkkctlpA2AC3GulbVFOSqhHdDat3qHse/Lbuek';
  var CDN = 'https://cdn.jsdelivr.net/npm/';

  var REDUCE  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var builders = {};      // id -> function(ctx) => Chart.js config
  var booted  = false;
  var loading = false;
  var pending = [];       // canvases that intersected before Chart.js finished loading

  function safe(fn) {
    try { return fn(); }
    catch (e) { if (window.console && console.warn) console.warn('[dataviz]', e); }
  }

  /* Resolve a CSS custom property to an rgb() string (token source of truth). */
  function resolveColor(name, fallback) {
    try {
      var s = document.createElement('span');
      s.style.color = 'var(' + name + ')';
      document.body.appendChild(s);
      var c = window.getComputedStyle(s).color;
      document.body.removeChild(s);
      return (c && c.indexOf('rgb') === 0) ? c : fallback;
    } catch (e) { return fallback; }
  }

  function mix(rgb, alpha) {
    // turn 'rgb(a,b,c)' into 'rgba(a,b,c,alpha)'
    var m = /rgba?\(([^)]+)\)/.exec(rgb);
    if (!m) return rgb;
    var parts = m[1].split(',').slice(0, 3).join(',');
    return 'rgba(' + parts + ',' + alpha + ')';
  }

  /* Shared base options (lifted from horizon2040's baseOptions). */
  function baseOptions(opt) {
    opt = opt || {};
    var dark = !!opt.dark;
    var grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(47,72,88,0.08)';
    var dim  = dark ? 'rgba(255,255,255,0.45)' : 'rgba(47,72,88,0.5)';
    var mono = "'JetBrains Mono', monospace";
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: REDUCE ? false : { duration: 950, easing: 'easeOutCubic' },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: opt.legend === true,
          labels: { color: dim, font: { family: mono, size: 10 }, boxWidth: 12, padding: 14 }
        },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: 'rgba(255,255,255,0.6)',
          bodyColor: 'rgba(255,255,255,0.92)',
          padding: 10,
          displayColors: false,
          titleFont: { family: mono, size: 10 },
          bodyFont:  { family: mono, size: 12, weight: '600' }
        }
      },
      scales: {
        x: {
          grid: { color: grid, drawTicks: false },
          border: { display: false },
          ticks: { maxRotation: 0, font: { family: mono, size: 10 }, color: dim }
        },
        y: {
          grid: { color: grid, drawTicks: false },
          border: { display: false },
          ticks: { font: { family: mono, size: 10 }, color: dim, callback: opt.yFmt || function (v) { return v; } },
          title: opt.yLabel ? { display: true, text: opt.yLabel, color: dim, font: { family: mono, size: 10 } } : undefined,
          beginAtZero: opt.beginAtZero !== false
        }
      }
    };
  }

  function ctxFor(canvas) {
    return {
      canvas: canvas,
      reduce: REDUCE,
      resolveColor: resolveColor,
      mix: mix,
      baseOptions: baseOptions,
      colors: {
        ink:     resolveColor('--ink', 'rgb(28,28,28)'),
        oxblood: resolveColor('--oxblood', 'rgb(124,45,45)'),
        ochre:   resolveColor('--ochre', 'rgb(177,131,47)'),
        teal:    resolveColor('--teal', 'rgb(6,182,212)'),
        dim:     resolveColor('--dim', 'rgba(47,72,88,0.5)'),
        paper:   resolveColor('--paper', 'rgb(249,248,246)'),
        cream:   resolveColor('--cream-on-dark', 'rgb(225,225,215)')
      }
    };
  }

  function build(canvas) {
    if (!canvas || canvas._dvBuilt || typeof Chart === 'undefined') return;
    var id = canvas.getAttribute('data-chart');
    var builder = builders[id];
    if (!builder) return;
    canvas._dvBuilt = true;
    safe(function () {
      var config = builder(ctxFor(canvas));
      if (config) new Chart(canvas, config);
    });
  }

  function flushPending() {
    pending.forEach(build);
    pending = [];
  }

  function loadChart(done) {
    if (typeof Chart !== 'undefined') { done(); return; }
    if (loading) return;          // first caller owns the load; others sit in `pending`
    loading = true;

    function inject(src, integrity, onload) {
      var s = document.createElement('script');
      s.src = src;
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.async = true;
      s.onload = function () { safe(onload); };
      s.onerror = function () { /* CDN fail: static tables remain, nothing breaks */ };
      document.head.appendChild(s);
    }

    inject(CDN + 'chart.js@4.4.2/dist/chart.umd.min.js', CHART_SRI, function () {
      // The annotation plugin is best-effort: charts must build even if it fails,
      // so `finish` runs on its load OR error (annotated charts just lose the labels).
      var finish = function () {
        safe(function () {
          var plugin = window['chartjs-plugin-annotation'];
          if (window.Chart && plugin) Chart.register(plugin);
          if (window.Chart) Chart.defaults.font.family = "'JetBrains Mono', monospace";
        });
        done();
      };
      var s = document.createElement('script');
      s.src = CDN + 'chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js';
      s.integrity = ANNO_SRI;
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = function () { safe(finish); };
      s.onerror = function () { safe(finish); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    if (booted) return; booted = true;
    var canvases = [].slice.call(document.querySelectorAll('.dataviz-canvas[data-chart]'));
    if (!canvases.length) return;

    if (!('IntersectionObserver' in window)) {
      loadChart(function () { canvases.forEach(build); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target;
        io.unobserve(c);
        if (typeof Chart !== 'undefined') build(c);
        else { pending.push(c); loadChart(flushPending); }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -40px 0px' });

    canvases.forEach(function (c) { io.observe(c); });
  }

  window.DataViz = {
    register: function (id, builder) { builders[id] = builder; },
    boot: boot
  };
})();
