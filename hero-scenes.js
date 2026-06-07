/* ─────────────────────────────────────────────────────
   hero-scenes.js — lightweight themed 2D-canvas hero backdrops.

   Each dossier hero declares a scene:
     <canvas class="hz-hero-scene" data-hero-scene="energy-flow" aria-hidden="true"></canvas>
   and loads this file. The scene paints behind the hero content (z-index 0).

   Discipline (same contract as initHeroTape / globe.js):
   - prefers-reduced-motion: paint ONE static frame, then stop (no loop).
   - dpr capped at 1.5; ~30fps frame cap; IntersectionObserver + visibilitychange
     pause the rAF when the hero is off-screen or the tab is hidden.
   - colours resolved from CSS tokens; everything wrapped so a throw is contained.
   - all scenes are additive, low-alpha ambience — never block the hero text.
───────────────────────────────────────────────────── */

(function () {
  'use strict';

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SMALL  = window.matchMedia('(max-width: 760px)').matches;

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
  function rgba(rgb, a) {
    var m = /rgba?\(([^)]+)\)/.exec(rgb);
    if (!m) return rgb;
    return 'rgba(' + m[1].split(',').slice(0, 3).join(',') + ',' + a + ')';
  }

  // Bright, warm palette: the hero is near-black, so dark tokens (raw --teal,
  // --oxblood) vanish. Use the luminous globe gold + a brightened cyan + cream.
  var PAL = {
    ochre:   resolveColor('--globe-node', 'rgb(212,170,70)'),
    oxblood: resolveColor('--oxblood-on-dark', 'rgb(196,96,86)'),
    teal:    'rgb(120,182,194)',
    cream:   resolveColor('--cream-on-dark', 'rgb(228,226,214)')
  };

  // Deterministic pseudo-random (no Math.random reliance for layout stability).
  function makeRng(seed) {
    var s = seed || 1;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  /* Shared scaffold: sizing, dpr, IO/visibility pause, ~30fps loop, REDUCE. */
  function makeScene(canvas, setup) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var host = canvas.parentElement || canvas;
    // Bounded resolution: an ambient backdrop does not need device pixels. Cap
    // the backing buffer to ~1.3 megapixels so fill/compositing stays cheap on
    // retina + 4K (the buffer is CSS-stretched to fill the hero; the soft scenes
    // hide the upscale). This is the main fix for scroll choppiness.
    var DPR = Math.min(1, window.devicePixelRatio || 1);
    var MAXPX = 1.3e6;
    var w = 0, h = 0, state = null, draw = null;

    function resize() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      var scale = 1, px = w * h * DPR * DPR;
      if (px > MAXPX) scale = Math.sqrt(MAXPX / px);
      var bw = Math.max(1, Math.round(w * DPR * scale));
      var bh = Math.max(1, Math.round(h * DPR * scale));
      canvas.width = bw; canvas.height = bh;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(bw / w, 0, 0, bh / h, 0, 0);   // draw in CSS px; buffer may be downscaled
      var built = setup(w, h, PAL, SMALL);            // rebuild geometry for new size
      state = built.state; draw = built.draw;
    }
    resize();
    var rzT = null;
    window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(resize, 200); }, { passive: true });

    function frame1() { ctx.clearRect(0, 0, w, h); draw(ctx, 0, w, h, state); }

    if (REDUCE) { frame1(); canvas.classList.add('ready'); return; }  // static, no loop

    var running = false, onScreen = true, scrolling = false, rafId = null,
        last = 0, elapsed = 0, lastDraw = -1, MIN_DT = 1 / 24;
    function loop(ts) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (!last) last = ts;
      var dt = (ts - last) / 1000; last = ts;
      if (dt > 0.1) dt = 0.1;                 // clamp after a tab pause
      elapsed += dt;
      if (lastDraw >= 0 && elapsed - lastDraw < MIN_DT) return;  // 24fps cap, but always draw the first frame
      lastDraw = elapsed;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, elapsed, w, h, state);
    }
    function start() { if (!running && onScreen && !scrolling) { running = true; last = 0; lastDraw = -1; rafId = requestAnimationFrame(loop); } }
    function stop()  { if (running) { running = false; if (rafId) cancelAnimationFrame(rafId); } }

    canvas.classList.add('ready');
    start();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { onScreen = e.isIntersecting; if (onScreen) start(); else stop(); });
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    // Pause repaint while the user scrolls — the backdrop competing with the
    // compositor is the main cause of scroll jank. Resume shortly after it stops.
    var scrollT = null;
    window.addEventListener('scroll', function () {
      scrolling = true; stop();
      clearTimeout(scrollT);
      scrollT = setTimeout(function () { scrolling = false; start(); }, 180);
    }, { passive: true });
  }

  /* ─── SCENES ───────────────────────────────────────── */
  var SCENES = {};

  // SHIPPING: drifting great-circle-style lanes with travelling cargo dots.
  SCENES['shipping-lanes'] = function (w, h, pal, small) {
    var rng = makeRng(7), n = small ? 5 : 9, lanes = [];
    for (var i = 0; i < n; i++) {
      lanes.push({
        y: h * (0.12 + 0.76 * (i + rng() * 0.4) / n),
        amp: h * (0.03 + rng() * 0.06), k: 1 + rng() * 2,
        ph: rng() * 6.28, sp: 0.06 + rng() * 0.12,
        col: i % 3 === 0 ? pal.ochre : pal.oxblood,
        dots: 1 + ((rng() * 2) | 0)
      });
    }
    function y(ln, x, t) {
      var nx = x / w;
      return ln.y + Math.sin(nx * ln.k * 6.28 + ln.ph + t * ln.sp) * ln.amp;
    }
    return { state: lanes, draw: function (ctx, t) {
      ctx.lineWidth = 1;
      for (var i = 0; i < lanes.length; i++) {
        var ln = lanes[i];
        ctx.beginPath();
        for (var x = 0; x <= w; x += 10) { var yy = y(ln, x, t); x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5; ctx.strokeStyle = ln.col; ctx.stroke();
        for (var d = 0; d < ln.dots; d++) {
          var px = ((t * (0.05 + 0.03 * d) + d / ln.dots + i * 0.13) % 1) * w;
          ctx.globalAlpha = 0.95; ctx.fillStyle = ln.col;
          ctx.beginPath(); ctx.arc(px, y(ln, px, t), 2.6, 0, 6.28); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }};
  };

  // ENERGY: particles flowing up diagonal "pipelines".
  SCENES['energy-flow'] = function (w, h, pal, small) {
    var rng = makeRng(13), n = small ? 90 : 230, ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: rng() * w, y: rng() * h, sp: 16 + rng() * 34, r: 1.4 + rng() * 3, c: rng() < 0.45 ? pal.ochre : pal.teal });
    return { state: ps, draw: function (ctx, t) {
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        var yy = (p.y - t * p.sp) % h; if (yy < 0) yy += h;
        var xx = p.x + Math.sin((yy / h) * 6.28 + i) * 18;
        ctx.globalAlpha = 0.3; ctx.strokeStyle = p.c; ctx.lineWidth = p.r;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 30); ctx.stroke();
        ctx.globalAlpha = 0.85; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(xx, yy, p.r, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }};
  };

  // DEMOGRAPHICS: layered shifting population waves.
  SCENES['demographics-curves'] = function (w, h, pal, small) {
    var n = small ? 4 : 6, waves = [];
    for (var i = 0; i < n; i++) waves.push({ base: h * (0.3 + 0.5 * i / n), amp: h * (0.04 + 0.02 * i), k: 1.2 + i * 0.4, sp: 0.1 + i * 0.04, col: i % 2 ? pal.teal : pal.ochre });
    return { state: waves, draw: function (ctx, t) {
      for (var i = 0; i < waves.length; i++) {
        var wv = waves[i];
        ctx.beginPath();
        for (var x = 0; x <= w; x += 12) {
          var yy = wv.base + Math.sin(x / w * wv.k * 6.28 + t * wv.sp) * wv.amp + Math.sin(x / w * 9 - t * 0.2) * wv.amp * 0.3;
          x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.globalAlpha = 0.42; ctx.strokeStyle = wv.col; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }};
  };

  // SUPPLY CHAINS: a drifting node graph with pulsing links.
  SCENES['supply-nodes'] = function (w, h, pal, small) {
    var rng = makeRng(29), n = small ? 12 : 22, nodes = [];
    for (var i = 0; i < n; i++) nodes.push({ x: rng() * w, y: rng() * h, vx: (rng() - 0.5) * 8, vy: (rng() - 0.5) * 8, r: 1.4 + rng() * 2 });
    return { state: nodes, draw: function (ctx, t) {
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx * 0.016; a.y += a.vy * 0.016;
        if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.globalAlpha = (1 - dist / 150) * 0.45; ctx.strokeStyle = pal.teal; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var nd = nodes[k];
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2 + k); ctx.fillStyle = k % 4 === 0 ? pal.ochre : pal.cream;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }};
  };

  // CONFLICT: a tense lattice grid that flickers along fracture lines.
  SCENES['conflict-lattice'] = function (w, h, pal, small) {
    var step = small ? 64 : 48;
    return { state: { step: step }, draw: function (ctx, t) {
      ctx.lineWidth = 1;
      for (var x = 0; x <= w; x += step) {
        var sway = Math.sin(x / w * 5 + t * 0.3) * 6;
        ctx.globalAlpha = 0.18; ctx.strokeStyle = pal.oxblood;
        ctx.beginPath(); ctx.moveTo(x + sway, 0); ctx.lineTo(x - sway, h); ctx.stroke();
      }
      for (var y = 0; y <= h; y += step) {
        ctx.globalAlpha = 0.14; ctx.strokeStyle = pal.oxblood;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // travelling fracture flashes at lattice nodes
      var fx = (Math.sin(t * 0.7) * 0.5 + 0.5) * w, fy = (Math.cos(t * 0.5) * 0.5 + 0.5) * h;
      var gx = Math.round(fx / step) * step, gy = Math.round(fy / step) * step;
      ctx.globalAlpha = 0.6; ctx.fillStyle = pal.ochre;
      ctx.beginPath(); ctx.arc(gx, gy, 2.4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
    }};
  };

  // OIL SHOCK: a propagating price-shock waveform.
  SCENES['oil-wave'] = function (w, h, pal, small) {
    return { state: {}, draw: function (ctx, t) {
      var mid = h * 0.58;
      for (var layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (var x = 0; x <= w; x += 6) {
          var nx = x / w;
          var shock = Math.exp(-Math.pow((nx - ((t * 0.12) % 1.4 - 0.2)) * 6, 2));  // travelling gaussian spike
          var yy = mid - shock * h * 0.34 * (1 - layer * 0.25)
                   + Math.sin(nx * 22 + t * (1.2 + layer)) * (4 + layer * 3);
          x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.globalAlpha = 0.5 - layer * 0.12; ctx.strokeStyle = layer === 0 ? pal.ochre : pal.oxblood; ctx.lineWidth = 2.2; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }};
  };

  // HORIZON 2040: a drifting perspective grid (the "forecast horizon").
  SCENES['horizon-grid'] = function (w, h, pal, small) {
    var cols = small ? 8 : 14;
    return { state: {}, draw: function (ctx, t) {
      var horizon = h * 0.42;
      ctx.globalAlpha = 0.2; ctx.strokeStyle = pal.teal; ctx.lineWidth = 1.2;
      for (var i = -cols; i <= cols; i++) {       // converging verticals
        var x0 = w / 2 + (i / cols) * w * 0.5;
        ctx.beginPath(); ctx.moveTo(w / 2 + (i / cols) * 40, horizon); ctx.lineTo(x0, h); ctx.stroke();
      }
      for (var r = 1; r <= 8; r++) {              // receding horizontals (eased + drift)
        var p = ((r + (t * 0.2) % 1) / 8);
        var yy = horizon + (h - horizon) * p * p;
        ctx.globalAlpha = 0.22 * (1 - p); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }};
  };

  /* ─── BOOT (after first paint / idle) ─── */
  function boot() {
    var canvases = document.querySelectorAll('canvas[data-hero-scene]');
    if (!canvases.length) return;
    canvases.forEach(function (c) {
      var name = c.getAttribute('data-hero-scene');
      var factory = SCENES[name];
      if (!factory) return;
      try { makeScene(c, factory); } catch (e) { /* contained: hero stays clean */ }
    });
  }

  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 120); };
  if (document.readyState === 'complete') idle(boot);
  else window.addEventListener('load', function () { idle(boot); });

  window.HeroScenes = { boot: boot, scenes: SCENES };
})();
