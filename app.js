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

  // Run a module; if it throws, never let it break the rest, and optionally recover.
  function safe(fn, onErr) {
    try { fn(); }
    catch (e) { if (onErr) { try { onErr(); } catch (_) {} } }
  }

  // The blank-page failsafe: anything still hidden gets shown.
  function forceReveal() {
    document.querySelectorAll('.fade-up').forEach(function (el) {
      if (parseFloat(window.getComputedStyle(el).opacity) < 0.99) {
        el.classList.add('visible');
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
    document.querySelectorAll('h2[data-splitting] .char').forEach(function (c) {
      if (parseFloat(window.getComputedStyle(c).opacity) < 0.99) {
        c.style.opacity = '1';
        c.style.transform = 'none';
      }
    });
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
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: REDUCE ? 'auto' : 'smooth' });
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


  /* ─── SCROLL SPY (active nav link) ─── */
  function initScrollSpy() {
    var sections   = document.querySelectorAll('section[id]');
    var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !navAnchors.length || !('IntersectionObserver' in window)) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navAnchors.forEach(function (link) {
            link.classList.toggle('nav-spy-active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.35 });
    sections.forEach(function (section) { spy.observe(section); });
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


  /* ═══════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════ */
  if (hasGSAP) safe(function () { gsap.registerPlugin(ScrollTrigger); });

  safe(initNav);
  safe(initMobileMenu);
  safe(initAnchors);
  safe(initReveals, forceReveal);    // on failure, never strand hidden content
  safe(initScrollSpy);
  safe(initBentoTilt);
  safe(initHeadline);
  safe(initEmail);
  safe(initCursor);
  safe(initSplitting, forceReveal);  // on failure, force any half-hidden chars visible
  safe(initMagnetic);

  // Recompute trigger start positions once webfonts settle.
  if (hasGSAP && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { safe(function () { ScrollTrigger.refresh(); }); });
  }

  // Final backstop: 2.5s after load, anything still hidden is forced visible.
  window.addEventListener('load', function () {
    setTimeout(function () { safe(forceReveal); }, 2500);
  });

})();
