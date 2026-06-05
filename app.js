/* ─────────────────────────────────────────────────────
   Portfolio — app.js
   Namespaced modules behind a master gate.
   Handles: nav scroll state, mobile menu, anchor scroll, scroll reveal (GSAP),
            scroll spy, bento tilt, headline rotation, email reveal,
            custom cursor, Splitting.js headings, magnetic buttons.

   Safety contract (Phase 0):
   - JS prefers-reduced-motion guard (CSS-only before): no GSAP/canvas motion, content shown instantly.
   - Every risky module is wrapped so a throw can never strand hidden content.
   - Load watchdog force-reveals any element still at opacity:0 after 2.5s
     (kills the blank-page failure mode if a CDN/library silently fails).
   - ScrollTrigger.refresh() on fonts.ready so trigger starts are correct after webfont swap.
   - No bounce/elastic easing (DESIGN.md motion law): exponential ease-out only.
   Behaviour is identical for default users; only reduced-motion and failure paths change.
───────────────────────────────────────────────────── */

(function () {
  'use strict';

  var REDUCE   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP  = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var hasSplit = typeof Splitting !== 'undefined';
  var canHover = window.matchMedia('(hover: hover)').matches;
  var finePtr  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EMAIL    = 'jobs@mandavkar.uk';
  var lenis    = null;  // Lenis smooth-scroll instance (Phase 4), null when disabled

  // Run a module; if it throws, never let it break the rest, and optionally recover.
  function safe(fn, onErr) {
    try { fn(); }
    catch (e) { if (onErr) { try { onErr(); } catch (_) {} } }
  }

  // The blank-page failsafe. inViewOnly=true reveals only elements in or above the
  // viewport (genuinely stuck), preserving below-the-fold scroll reveals; the error
  // paths pass false to reveal everything because their scroll triggers are dead.
  function revealStuck(inViewOnly) {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    function show(el) {
      if (parseFloat(window.getComputedStyle(el).opacity) >= 0.99) return;
      el.classList.add('visible');
      el.style.opacity = '1';
      el.style.transform = 'none';
    }
    // .hero-* entrance elements are animated by CSS (opacity:0 -> 1). Include them
    // so the hero can never be left blank if a CSS animation somehow doesn't run.
    document.querySelectorAll('.fade-up, .about-methodology-layer, .hero-editorial-section .hero-line, .hero-editorial-section .hero-eyebrow, .hero-editorial-section .hero-bio, .hero-editorial-section .hero-credentials, .hero-editorial-section .hero-actions').forEach(function (el) {
      if (inViewOnly && el.getBoundingClientRect().top > vh) return;
      show(el);
    });
    document.querySelectorAll('h2[data-splitting]').forEach(function (h2) {
      if (inViewOnly && h2.getBoundingClientRect().top > vh) return;
      h2.querySelectorAll('.char').forEach(show);
    });
  }
  function revealAll() { revealStuck(false); }


  /* ─── SMOOTH SCROLL (Lenis, desktop + motion only) ─── */
  function initSmoothScroll() {
    if (REDUCE || typeof Lenis === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;  // skip on touch / coarse pointers
    lenis = new Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }  // expo ease-out, no bounce
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }


  /* ─── NAV SCROLL STATE ─── */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    function update() { nav.classList.toggle('scrolled', window.scrollY > 60); }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }


  /* ─── MOBILE MENU (off-canvas drawer + injected backdrop) ─── */
  function initMobileMenu() {
    var hamburger   = document.getElementById('hamburger');
    var mobileMenu  = document.getElementById('mobile-menu');
    var mobileClose = document.getElementById('mobile-close');
    if (!mobileMenu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      mobileMenu.parentNode.insertBefore(backdrop, mobileMenu);
    }

    function open()  { mobileMenu.classList.add('open');    backdrop.classList.add('open');    document.body.style.overflow = 'hidden'; }
    function close() { mobileMenu.classList.remove('open'); backdrop.classList.remove('open'); document.body.style.overflow = ''; }

    if (hamburger)   hamburger.addEventListener('click', open);
    if (mobileClose) mobileClose.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    mobileMenu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) close();
    });
  }


  /* ─── ANCHOR SMOOTH SCROLL (native; Lenis replaces this in Phase 4) ─── */
  function initAnchors() {
    var nav = document.getElementById('nav');
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var offset = (nav ? nav.offsetHeight : 0) + 12;
        if (lenis) {
          lenis.scrollTo(target, { offset: -offset });
        } else {
          var top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: REDUCE ? 'auto' : 'smooth' });
        }
      });
    });
  }


  /* ─── SCROLL REVEAL (.fade-up + progress bars) ─── */
  function revealNow() {
    document.querySelectorAll('.fade-up').forEach(function (el) { el.classList.add('visible'); });
    document.querySelectorAll('.now-progress-bar').forEach(function (bar) {
      bar.style.width = bar.style.getPropertyValue('--progress') || '0%';
    });
  }

  function initReveals() {
    var fadeEls = document.querySelectorAll('.fade-up');

    if (REDUCE) { revealNow(); return; }  // CSS already shows them; lock in final state, no motion

    if (hasGSAP) {
      fadeEls.forEach(function (el) {
        gsap.set(el, { opacity: 0, y: 40 });
        var delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.8, delay: delay, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });

      document.querySelectorAll('.now-progress-bar').forEach(function (bar) {
        var progress = bar.style.getPropertyValue('--progress') || '0%';
        gsap.set(bar, { width: '0%' });
        gsap.to(bar, {
          width: progress, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: bar, start: 'top 90%', once: true }
        });
      });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -56px 0px' });
      fadeEls.forEach(function (el) { io.observe(el); });
    } else {
      fadeEls.forEach(function (el) { el.classList.add('visible'); });
    }
  }


  /* ─── SCROLL SPY (active nav link) + SLIDING INDICATOR ─── */
  function initScrollSpy() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    var navAnchors = Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]'));
    // only sections that have a matching nav link drive the active state
    var named = Array.prototype.slice.call(document.querySelectorAll('section[id]')).filter(function (s) {
      return navLinks.querySelector('a[href="#' + s.id + '"]');
    });
    if (!navAnchors.length || !named.length) return;

    var indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    navLinks.appendChild(indicator);

    function moveIndicator() {
      var active = navLinks.querySelector('a.nav-spy-active:not(.nav-cta)');
      if (!active) { indicator.style.opacity = '0'; return; }
      indicator.style.opacity = '1';
      indicator.style.width = active.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    }

    function update() {
      var line = window.innerHeight * 0.4;  // active once a section top passes 40% from the top
      var current = null;
      named.forEach(function (s) {
        if (s.getBoundingClientRect().top <= line) current = s;
      });
      var href = current ? '#' + current.id : null;
      navAnchors.forEach(function (link) {
        if (link.classList.contains('nav-cta')) return;  // never recolour the CTA button
        link.classList.toggle('nav-spy-active', href != null && link.getAttribute('href') === href);
      });
      moveIndicator();
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }


  /* ─── BENTO CARD: subtle tilt on hover (desktop, motion only) ─── */
  function initBentoTilt() {
    if (REDUCE || !canHover) return;
    document.querySelectorAll('.bento-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var dx = (e.clientX - (rect.left + rect.width  / 2)) / rect.width;
        var dy = (e.clientY - (rect.top  + rect.height / 2)) / rect.height;
        card.style.transform = 'translateY(-3px) rotateX(' + (dy * -4).toFixed(2) + 'deg) rotateY(' + (dx * 4).toFixed(2) + 'deg)';
        card.style.transformOrigin = 'center';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transformOrigin = '';
      });
    });
  }


  /* ─── ABOUT HEADLINE ROTATION ─── */
  function initHeadline() {
    var headlines = [
      'Macro analyst. I track the signals that can\'t be managed.',
      'Raised across four countries. Now tracking the signals that move global capital.',
      'Equity research with an inconvenient habit of looking at physical reality first.',
      'I study what moves markets before it shows up in the data.',
      'I connect geopolitical reality to financial markets. Most models don\'t.',
      'The analyst who looks at where capital actually moves, not where it says it\'s going.'
    ];
    var el = document.getElementById('about-headline');
    if (el) el.textContent = headlines[Math.floor(Math.random() * headlines.length)];
  }


  /* ─── EMAIL REVEAL (contact + hero) ─── */
  function initEmail() {
    var contactBtn = document.getElementById('emailReveal');
    if (contactBtn) {
      var textEl = contactBtn.querySelector('.email-hidden-text');
      contactBtn.addEventListener('click', function () {
        if (contactBtn.classList.contains('revealed')) {
          window.location.href = 'mailto:' + EMAIL;
        } else {
          contactBtn.classList.add('revealed');
          if (textEl) textEl.textContent = EMAIL;
          contactBtn.setAttribute('aria-label', 'Send email to ' + EMAIL);
        }
      });
    }

    var heroBtn = document.getElementById('heroEmailReveal');
    if (heroBtn) {
      heroBtn.addEventListener('click', function () {
        if (heroBtn.classList.contains('revealed')) {
          window.location.href = 'mailto:' + EMAIL;
        } else {
          heroBtn.classList.add('revealed');
          heroBtn.textContent = EMAIL + ' →';
        }
      });
    }
  }


  /* ─── CUSTOM CURSOR (desktop fine-pointer only) ───
     Kept running under reduced-motion because CSS hides the native cursor
     (cursor: none); we only drop the smoothing so there is no motion lag.   */
  function initCursor() {
    if (!finePtr) return;
    var dot  = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    var cx = 0, cy = 0, rx = 0, ry = 0;
    var smooth = REDUCE ? 1 : 0.15;  // instant under reduced-motion

    document.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY;
      dot.style.left = cx + 'px';
      dot.style.top  = cy + 'px';
    });

    (function loop() {
      rx += (cx - rx) * smooth;
      ry += (cy - ry) * smooth;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(loop);
    })();

    var sel = 'a, button, .btn, .btn-primary, .btn-ghost, .nav-cta, .bento-card, .blog-card, .cred-card, .proj-link, .contact-link, .hero-email, .hamburger, .mobile-close, .tag, .skill-tag, .stack-tag, .now-book';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(sel)) { dot.classList.add('cursor-hover'); ring.classList.add('cursor-hover'); }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(sel)) { dot.classList.remove('cursor-hover'); ring.classList.remove('cursor-hover'); }
    });
  }


  /* ─── SPLITTING.JS HEADING REVEAL ─── */
  function initSplitting() {
    if (REDUCE || !hasSplit || !hasGSAP) return;

    document.querySelectorAll('h2').forEach(function (h2) { h2.setAttribute('data-splitting', ''); });
    Splitting();

    document.querySelectorAll('h2[data-splitting]').forEach(function (h2) {
      var chars = h2.querySelectorAll('.char');
      if (!chars.length) return;
      gsap.set(chars, { opacity: 0, y: 20, rotateX: -40 });
      ScrollTrigger.create({
        trigger: h2, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(chars, { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.02, ease: 'power2.out' });
          h2.classList.add('split-visible');
        }
      });
    });
  }


  /* ─── MAGNETIC HOVER ON BUTTONS (no bounce, DESIGN.md motion law) ─── */
  function initMagnetic() {
    if (REDUCE || !hasGSAP || !canHover) return;
    document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - rect.left - rect.width  / 2) * 0.3,
          y: (e.clientY - rect.top  - rect.height / 2) * 0.3,
          duration: 0.3, ease: 'power2.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        // Was elastic.out(1, 0.4) — replaced with exponential ease-out per DESIGN.md (no bounce).
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' });
      });
    });
  }


  /* ─── PARALLAX NUMERALS (depth on the big Fraunces numbers) ─── */
  function initParallaxNumerals() {
    if (REDUCE || !hasGSAP) return;
    gsap.matchMedia().add('(min-width: 769px)', function () {
      document.querySelectorAll('.about-ch-num, .editorial-project__num').forEach(function (num) {
        gsap.fromTo(num, { y: 34 }, {
          y: -34, ease: 'none',
          scrollTrigger: { trigger: num, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
        });
      });
    });
  }


  /* ─── EXPERIENCE SPINE (timeline line draws down on scroll) ─── */
  function initExperienceSpine() {
    if (REDUCE || !hasGSAP) return;
    var list = document.querySelector('.exp-list');
    if (!list) return;
    gsap.fromTo(list, { '--spine-scale': 0 }, {
      '--spine-scale': 1, ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 78%', end: 'bottom 82%', scrub: 0.5 }
    });
  }


  /* ─── METHODOLOGY FUNNEL (Macro->Micro layers reveal + connector draws) ─── */
  function initMethodologyFunnel() {
    if (REDUCE || !hasGSAP) return;
    var block = document.querySelector('.about-methodology');
    if (!block) return;
    var layers = block.querySelectorAll('.about-methodology-layer');
    if (!layers.length) return;
    gsap.set(block, { '--funnel-scale': 0 });
    gsap.set(layers, { opacity: 0, x: -16 });
    gsap.timeline({ scrollTrigger: { trigger: block, start: 'top 74%', once: true } })
      .to(block, { '--funnel-scale': 1, duration: 0.7, ease: 'power3.out' })
      .to(layers, { opacity: 1, x: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, '-=0.45');
  }


  /* ─── HERO "LIVE TAPE" CANVAS (drifting signal lattice) ─── */
  function initHeroTape() {
    if (REDUCE) return;
    var canvas = document.querySelector('.hero-tape');
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var section = canvas.closest('.hero-editorial-section') || canvas.parentElement;

    function resolveColor(name, fallback) {
      var s = document.createElement('span');
      s.style.color = 'var(' + name + ')';
      document.body.appendChild(s);
      var c = window.getComputedStyle(s).color;
      document.body.removeChild(s);
      return (c && c.indexOf('rgb') === 0) ? c : fallback;
    }
    var oxblood = resolveColor('--oxblood', 'rgb(124,45,45)');
    var ochre   = resolveColor('--ochre',   'rgb(177,131,47)');

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = 0, h = 0;
    function resize() {
      var r = section.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var count = (window.innerWidth < 700) ? 5 : 9;
    var lines = [];
    for (var i = 0; i < count; i++) {
      lines.push({
        base:  (i + 0.5) / count,
        amp:   0.015 + Math.random() * 0.04,
        freq:  1 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.12 + Math.random() * 0.18,
        color: (i % 3 === 0) ? ochre : oxblood,
        alpha: 0.07 + Math.random() * 0.08
      });
    }

    var running = true, rafId;
    function draw(t) {
      if (!running) return;
      var time = t * 0.001;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        ctx.beginPath();
        for (var x = 0; x <= w; x += 8) {
          var nx = x / (w || 1);
          var y = ln.base * h
            + Math.sin(nx * ln.freq * 6.2832 + ln.phase + time * ln.speed) * ln.amp * h
            + Math.sin(nx * ln.freq * 3.14 - time * ln.speed * 0.7) * ln.amp * h * 0.4;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = ln.alpha;
        ctx.strokeStyle = ln.color;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !running) { running = true; rafId = requestAnimationFrame(draw); }
          else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(rafId); }
        });
      }, { threshold: 0 }).observe(section);
    }
  }


  /* ─── HERO LIVE NUMBER (one real FRED series, deploy-only, graceful) ─── */
  function initHeroLive() {
    var el = document.querySelector('.hero-live');
    if (!el) return;
    var valEl = el.querySelector('.hero-live-val');
    if (!valEl || typeof fetch === 'undefined') return;
    var KEY = '8926f04636561748f828c19645d2eef8';  // documented FRED public-data key
    var url = '/api/fred/series/observations?series_id=DCOILWTICO&api_key=' + KEY +
              '&file_type=json&sort_order=desc&limit=8';
    fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.observations) return;
      var obs = null;
      for (var i = 0; i < data.observations.length; i++) {
        if (data.observations[i].value && data.observations[i].value !== '.') { obs = data.observations[i]; break; }
      }
      if (!obs) return;
      var val = parseFloat(obs.value);
      if (isNaN(val)) return;
      el.hidden = false;
      if (window.gsap && !REDUCE) {
        var o = { n: val * 0.9 };
        gsap.to(o, { n: val, duration: 1.2, ease: 'power2.out',
          onUpdate: function () { valEl.textContent = '$' + o.n.toFixed(2); } });
      } else {
        valEl.textContent = '$' + val.toFixed(2);
      }
    }).catch(function () { /* no live data (e.g. local preview): stay hidden */ });
  }


  /* ─── CHOKEPOINT GLOBE (lazy-loaded Three.js hero centrepiece) ───
     Three.js is injected AFTER first paint so it never blocks LCP. Skipped
     entirely under reduced-motion, save-data, or no-WebGL, the dark CSS hero
     (and later the poster) is the fallback. globe.js owns all WebGL; this is
     just the safe loader + colour bridge.                                    */
  function initChokepointGlobe() {
    var canvas = document.querySelector('.globe-canvas');
    if (!canvas) return;
    if (REDUCE) return;                                  // keep the dark hero / poster, no globe
    var conn = navigator.connection || navigator.webkitConnection;
    if (conn && conn.saveData) return;                   // respect data-saver
    try {                                                // WebGL probe before any network cost
      var probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    } catch (e) { return; }

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

    function start() {
      if (!window.THREE || !window.ChokepointGlobe) return;
      safe(function () {
        window.ChokepointGlobe.init(canvas, {
          reduce: false,
          finePtr: finePtr,
          lowDetail: !finePtr || window.innerWidth <= 768,
          colors: {
            dark:      resolveColor('--dark-ink', 'rgb(20,22,30)'),
            node:      resolveColor('--globe-node', 'rgb(212,170,70)'),
            arc:       resolveColor('--oxblood-on-dark', 'rgb(170,70,66)'),
            arcGlow:   resolveColor('--ochre', 'rgb(212,170,70)'),
            land:      resolveColor('--globe-land', 'rgba(220,220,210,0.32)'),
            graticule: resolveColor('--cream-on-dark', 'rgb(225,225,215)')
          },
          onReady: function () {
            canvas.classList.add('ready');
            var poster = document.querySelector('.globe-poster');
            if (poster) poster.classList.add('hidden');
          }
        });
      });
    }

    function loadThree() {
      if (window.THREE) { start(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
      s.integrity = 'sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O';
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = function () { safe(start); };
      s.onerror = function () { /* CDN fail: dark hero / poster stays */ };
      document.head.appendChild(s);
    }

    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
    if (document.readyState === 'complete') idle(loadThree);
    else window.addEventListener('load', function () { idle(loadThree); });
  }


  /* ═══════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════ */
  if (hasGSAP) safe(function () { gsap.registerPlugin(ScrollTrigger); });

  safe(initSmoothScroll);  // before initAnchors so anchor clicks route through Lenis
  safe(initNav);
  safe(initMobileMenu);
  safe(initAnchors);
  safe(initReveals, revealAll);      // on failure, never strand hidden content
  safe(initScrollSpy);
  safe(initBentoTilt);
  safe(initHeadline);
  safe(initEmail);
  safe(initCursor);
  safe(initSplitting, revealAll);    // on failure, force any half-hidden chars visible
  safe(initMagnetic);
  safe(initParallaxNumerals);
  safe(initExperienceSpine);
  safe(initMethodologyFunnel, revealAll);
  safe(initHeroLive);
  safe(initChokepointGlobe);

  // Recompute trigger start positions once webfonts settle.
  if (hasGSAP && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { safe(function () { ScrollTrigger.refresh(); }); });
  }

  // Final backstop: 2.5s after load, reveal only elements that are in view but still
  // hidden (stuck). Below-the-fold reveals stay with their scroll triggers.
  window.addEventListener('load', function () {
    setTimeout(function () { safe(function () { revealStuck(true); }); }, 2500);
  });

})();
