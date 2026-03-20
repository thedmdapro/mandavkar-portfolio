// Cloudflare Worker — API proxy for FRED and Yahoo Finance
// Proxies /api/fred/* and /api/yahoo/* to avoid browser CORS restrictions.
// All other requests fall through to static assets.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/fred/')) {
      const fredUrl = 'https://api.stlouisfed.org' + url.pathname.replace('/api/fred', '') + url.search;
      const resp = await fetch(fredUrl);
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (url.pathname.startsWith('/api/yahoo/')) {
      const ticker = url.pathname.replace('/api/yahoo/', '');
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + ticker + (url.search || '');
      const resp = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
