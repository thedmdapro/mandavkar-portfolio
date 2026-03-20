// Cloudflare Worker — API proxy for FRED and Yahoo Finance
// Proxies /api/fred/* and /api/yahoo/* to avoid browser CORS restrictions.
// All other requests fall through to static assets.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/fred/')) {
      const fredPath = url.pathname.slice('/api/fred'.length);
      const fredUrl = 'https://api.stlouisfed.org/fred' + fredPath + url.search;
      try {
        const resp = await fetch(fredUrl);
        return new Response(resp.body, {
          status: resp.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    if (url.pathname.startsWith('/api/yahoo/')) {
      const ticker = url.pathname.slice('/api/yahoo/'.length);
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + ticker + (url.search || '');
      try {
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
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
