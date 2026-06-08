// Cloudflare Worker — API proxy for FRED and Yahoo Finance
// Proxies /api/fred/* and /api/yahoo/* to avoid browser CORS restrictions.
// All other requests fall through to static assets.
//
// Hardened 2026-05-11: buffer upstream responses instead of streaming
// resp.body (streaming a subrequest body through a Worker can trigger
// HTTP 520 if the upstream connection behaves unexpectedly), add an
// 8s timeout via AbortController, and always return JSON with CORS.

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function proxy(upstreamUrl, fetchInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  // Always send a browser-like User-Agent + Accept. Some upstreams (FRED's
  // WAF in particular) reject header-less Worker subrequests, which surfaces
  // as a Cloudflare 520. Yahoo already required a UA; FRED needs one too.
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; mandavkar.uk signal tracker)',
    'Accept': 'application/json, text/plain, */*',
  };
  try {
    const resp = await fetch(upstreamUrl, {
      ...fetchInit,
      headers: { ...baseHeaders, ...(fetchInit && fetchInit.headers) },
      signal: ctrl.signal,
    });
    // Buffer the body fully rather than streaming resp.body through.
    const text = await resp.text();
    // Only cache SUCCESSFUL responses. Caching errors (the old behaviour)
    // poisons the edge: a transient upstream failure gets cached for an
    // hour and served to every visitor on that PoP.
    const cache = resp.ok ? 'public, max-age=3600' : 'no-store';
    return new Response(text, {
      status: resp.ok ? 200 : resp.status,
      headers: { ...CORS, 'Cache-Control': cache },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e && e.message ? e.message : 'proxy_failed' }),
      { status: 502, headers: CORS }
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Analytics injection ──────────────────────────────────────────────
// Cookieless Umami + our engagement layer (analytics.js) + the Substack RSS
// link, appended to <head> of every HTML response. One hook covers all pages
// (root, dossiers, blog, and anything added later). Cookieless => no consent
// banner. The Umami tag only injects once a real website id is set, so it is
// safe to deploy with the placeholder.
const UMAMI_WEBSITE_ID = '__UMAMI_WEBSITE_ID__'; // replace with the Umami Cloud website id (public UUID)
const SUBSTACK_FEED = 'https://thedmdapro.substack.com/feed';

class HeadInjector {
  element(head) {
    head.append(
      '\n  <link rel="alternate" type="application/rss+xml" title="Dhruv Mandavkar — Writing" href="' + SUBSTACK_FEED + '">' +
      '\n  <script defer src="/analytics.js?v=1"></script>' +
      (UMAMI_WEBSITE_ID.indexOf('__') === 0
        ? ''
        : '\n  <script defer src="https://cloud.umami.is/script.js" data-website-id="' + UMAMI_WEBSITE_ID + '"></script>'),
      { html: true }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname.startsWith('/api/fred/')) {
      const fredPath = url.pathname.slice('/api/fred'.length);
      const fredUrl = 'https://api.stlouisfed.org/fred' + fredPath + url.search;
      return proxy(fredUrl);
    }

    if (url.pathname.startsWith('/api/yahoo/')) {
      const ticker = url.pathname.slice('/api/yahoo/'.length);
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + ticker + (url.search || '');
      return proxy(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    }

    // Static assets — inject the analytics layer into HTML responses only.
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      return new HTMLRewriter().on('head', new HeadInjector()).transform(res);
    }
    return res;
  },
};
