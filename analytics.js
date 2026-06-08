/* ─────────────────────────────────────────────────────
   analytics.js — privacy-first engagement events for mandavkar.uk

   Sends custom events to Umami (window.umami.track) when present; silently
   no-ops otherwise. Cookieless, dependency-free, self-booting. Injected on
   every page by the Cloudflare Worker, so it also covers blog posts that do
   not load app.js. All listeners are passive/delegated, so cost is negligible.

   Pageviews are recorded automatically by Umami's own script; this file only
   adds the engagement layer:
     scroll-depth (25/50/75/100), read-complete, outbound, subscribe-click,
     cta-click, content-open, email-reveal.
───────────────────────────────────────────────────── */

(function () {
  'use strict';

  function safe(fn) { try { fn(); } catch (e) {} }

  // Fire an event if Umami is available. Umami self-queues before its script
  // loads, but we guard anyway so a blocked/absent tracker never throws.
  function track(name, data) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name, data || {});
      }
    } catch (e) {}
  }

  var PATH = location.pathname;

  /* ── Scroll / read depth: fire each milestone once ── */
  function initScrollDepth() {
    var marks = [25, 50, 75, 100], hit = {}, ticking = false;
    function pct() {
      var h = document.documentElement;
      var scrollable = h.scrollHeight - h.clientHeight;
      if (scrollable <= 0) return 100;
      var top = window.scrollY || h.scrollTop || 0;
      return Math.min(100, Math.max(0, Math.round((top / scrollable) * 100)));
    }
    function check() {
      ticking = false;
      var p = pct();
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (p >= m && !hit[m]) { hit[m] = 1; track('scroll-depth', { depth: m, path: PATH }); }
      }
    }
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true; requestAnimationFrame(check);
    }, { passive: true });
    check();   // capture short pages / above-the-fold immediately
  }

  /* ── Read complete: the page footer (end of content) enters view ── */
  function initReadComplete() {
    if (!('IntersectionObserver' in window)) return;
    var end = document.querySelector('footer')
      || document.querySelector('.hz-footer, .cm-footer, .fs-footer, .er-footer, .footer');
    if (!end) return;
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !fired) { fired = true; track('read-complete', { path: PATH }); io.disconnect(); }
      });
    }, { threshold: 0.1 });
    io.observe(end);
  }

  /* ── Delegated clicks: subscribe / cta / outbound / content-open ── */
  function initClicks() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('a, button, [data-analytics]') : null;
      if (!el) return;

      var tag = el.getAttribute('data-analytics');
      var loc = el.getAttribute('data-loc') || '';
      if (tag === 'subscribe') { track('subscribe-click', { location: loc || 'unknown' }); return; }
      if (tag === 'cta')       { track('cta-click', { label: loc || (el.textContent || '').trim().slice(0, 40) }); return; }

      var href = el.getAttribute('href');
      if (href && /^https?:\/\//i.test(href) && href.indexOf(location.host) === -1) {
        var sub = /substack\.com/i.test(href);
        track(sub ? 'subscribe-click' : 'outbound', {
          href: href, text: (el.textContent || '').trim().slice(0, 40), location: loc
        });
        return;
      }

      var card = e.target.closest('.editorial-project, .blog-card, .bento-card, .er-company-card, .er-coming-card');
      if (card) {
        var t = card.querySelector('h3, h4, .editorial-project__title, .blog-card-title') || card;
        track('content-open', { title: (t.textContent || '').trim().slice(0, 60), path: PATH });
      }
    }, { passive: true });
  }

  /* ── Email reveal (existing contact + hero buttons) ── */
  function initEmailReveal() {
    ['emailReveal', 'heroEmailReveal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { track('email-reveal', { id: id }); }, { passive: true });
    });
  }

  function boot() {
    safe(initScrollDepth);
    safe(initReadComplete);
    safe(initClicks);
    safe(initEmailReveal);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
