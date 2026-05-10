/* ─────────────────────────────────────────────────────
   Portfolio — app.js
   Handles: nav scroll state, mobile menu, scroll reveal (GSAP),
            scroll spy, smooth anchor scroll,
            custom cursor, magnetic buttons, Splitting.js headings
───────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ─── NAV SCROLL STATE ─── */
  var nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });


  /* ─── MOBILE MENU (off-canvas drawer pattern) ─── */
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  var mobileClose = document.getElementById('mobile-close');

  // Inject backdrop element if not present (for tap-outside-to-close)
  var backdrop = document.querySelector('.mobile-menu-backdrop');
  if (!backdrop && mobileMenu) {
    backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    mobileMenu.parentNode.insertBefore(backdrop, mobileMenu);
  }

  function openMenu() {
    mobileMenu.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMenu);
  if (backdrop) backdrop.addEventListener('click', closeMenu);

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
      closeMenu();
    }
  });


  /* ─── SMOOTH SCROLL (anchor links) ─── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      var offset = nav.offsetHeight + 12;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });


  /* ─── GSAP SCROLL REVEAL (replaces IntersectionObserver) ─── */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    var fadeEls = document.querySelectorAll('.fade-up');
    fadeEls.forEach(function (el) {
      // Set initial state
      gsap.set(el, { opacity: 0, y: 40 });

      var delay = 0;
      if (el.style && el.style.getPropertyValue('--delay')) {
        delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
      }

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true
        }
      });
    });

    // Progress bars — animate on scroll
    document.querySelectorAll('.now-progress-bar').forEach(function (bar) {
      var progress = bar.style.getPropertyValue('--progress') || '0%';
      gsap.set(bar, { width: '0%' });
      gsap.to(bar, {
        width: progress,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: bar,
          start: 'top 90%',
          once: true
        }
      });
    });
  } else {
    // Fallback: original IntersectionObserver
    var fadeEls = document.querySelectorAll('.fade-up');
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -56px 0px' }
      );
      fadeEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      fadeEls.forEach(function (el) { el.classList.add('visible'); });
    }
  }


  /* ─── SCROLL SPY (active nav link) ─── */
  var sections   = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  if (sections.length && navAnchors.length && 'IntersectionObserver' in window) {
    var spyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navAnchors.forEach(function (link) {
              var isActive = link.getAttribute('href') === '#' + id;
              link.classList.toggle('nav-spy-active', isActive);
            });
          }
        });
      },
      { threshold: 0.35 }
    );
    sections.forEach(function (section) { spyObserver.observe(section); });
  }


  /* ─── BENTO CARD: subtle tilt on hover (desktop only) ─── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.bento-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect  = card.getBoundingClientRect();
        var cx    = rect.left + rect.width  / 2;
        var cy    = rect.top  + rect.height / 2;
        var dx    = (e.clientX - cx) / rect.width;
        var dy    = (e.clientY - cy) / rect.height;
        var tiltX = (dy * -4).toFixed(2);
        var tiltY = (dx *  4).toFixed(2);
        card.style.transform = 'translateY(-3px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
        card.style.transformOrigin = 'center';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transformOrigin = '';
      });
    });
  }


  /* ─── ABOUT HEADLINE ROTATION ─── */
  var headlines = [
    'Macro analyst. I track the signals that can\'t be managed.',
    'Raised across four countries. Now tracking the signals that move global capital.',
    'Equity research with an inconvenient habit of looking at physical reality first.',
    'I study what moves markets before it shows up in the data.',
    'I connect geopolitical reality to financial markets. Most models don\'t.',
    'The analyst who looks at where capital actually moves — not where it says it\'s going.',
  ];
  var headlineEl = document.getElementById('about-headline');
  if (headlineEl) {
    headlineEl.textContent = headlines[Math.floor(Math.random() * headlines.length)];
  }


  /* ─── EMAIL REVEAL ─── */
  var EMAIL = 'jobs@mandavkar.uk';

  var contactBtn = document.getElementById('emailReveal');
  if (contactBtn) {
    var textEl = contactBtn.querySelector('.email-hidden-text');
    contactBtn.addEventListener('click', function () {
      if (contactBtn.classList.contains('revealed')) {
        window.location.href = 'mailto:' + EMAIL;
      } else {
        contactBtn.classList.add('revealed');
        textEl.textContent = EMAIL;
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


/* ═══════════════════════════════════════════════════
     CUSTOM CURSOR (desktop only)
  ═══════════════════════════════════════════════════ */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var dot  = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');

    if (dot && ring) {
      var cx = 0, cy = 0;     // actual mouse position
      var rx = 0, ry = 0;     // ring lerp position

      document.addEventListener('mousemove', function (e) {
        cx = e.clientX;
        cy = e.clientY;
        dot.style.left = cx + 'px';
        dot.style.top  = cy + 'px';
      });

      // Lerp the ring
      function lerpCursor() {
        rx += (cx - rx) * 0.15;
        ry += (cy - ry) * 0.15;
        ring.style.left = rx + 'px';
        ring.style.top  = ry + 'px';
        requestAnimationFrame(lerpCursor);
      }
      lerpCursor();

      // Scale on hover over interactive elements
      var interactiveSelector = 'a, button, .btn, .btn-primary, .btn-ghost, .nav-cta, .bento-card, .blog-card, .cred-card, .proj-link, .contact-link, .hero-email, .hamburger, .mobile-close, .tag, .skill-tag, .stack-tag, .now-book';

      document.addEventListener('mouseover', function (e) {
        if (e.target.closest(interactiveSelector)) {
          dot.classList.add('cursor-hover');
          ring.classList.add('cursor-hover');
        }
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest(interactiveSelector)) {
          dot.classList.remove('cursor-hover');
          ring.classList.remove('cursor-hover');
        }
      });
    }
  }


  /* ═══════════════════════════════════════════════════
     SPLITTING.JS HEADING ANIMATIONS
  ═══════════════════════════════════════════════════ */
if (typeof Splitting !== 'undefined' && typeof gsap !== 'undefined') {
    // Add data-splitting attribute to all h2 elements
    document.querySelectorAll('h2').forEach(function (h2) {
      h2.setAttribute('data-splitting', '');
    });

    Splitting();

    // Animate each h2's chars on scroll entry
    document.querySelectorAll('h2[data-splitting]').forEach(function (h2) {
      var chars = h2.querySelectorAll('.char');
      if (!chars.length) return;

      // Set initial state
      gsap.set(chars, { opacity: 0, y: 20, rotateX: -40 });

      ScrollTrigger.create({
        trigger: h2,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          gsap.to(chars, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.5,
            stagger: 0.02,
            ease: 'power2.out'
          });
          h2.classList.add('split-visible');
        }
      });
    });
  }


  /* ═══════════════════════════════════════════════════
     MAGNETIC HOVER ON BUTTONS
  ═══════════════════════════════════════════════════ */
  if (typeof gsap !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
    var magneticEls = document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta');

    magneticEls.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var relX = e.clientX - rect.left - rect.width / 2;
        var relY = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, {
          x: relX * 0.3,
          y: relY * 0.3,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      el.addEventListener('mouseleave', function () {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.4)'
        });
      });
    });
  }

})();
