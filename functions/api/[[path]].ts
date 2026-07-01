const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  let path = context.params.path;
  if (Array.isArray(path)) path = path.join('/');
  if (!path) path = '';
  path = String(path);

  const apiUrl = `${POKEAPI_BASE}/${path}${url.search}`;

  const cache = caches.default;
  const cacheKey = new Request(apiUrl, { method: 'GET' });

  let response = await cache.match(cacheKey);
  if (response) {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('CF-Cache-Status', 'HIT');
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  try {
    response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'pokedex-cf/1.0' },
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');

    const body = await response.text();

    if (response.ok) {
      context.waitUntil(
        cache.put(cacheKey, new Response(body, {
          status: response.status,
          headers: {
            'Cache-Control': 'public, max-age=86400, s-maxage=604800',
            'Content-Type': responseHeaders.get('Content-Type') || 'application/json',
          },
        }))
      );
    }

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from PokeAPI', details: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
