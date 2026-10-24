// Nginx Proxy Manager: POST /api/tokens for a token (kept until five minutes before it expires,
// renewed on a 401 or 403), then GET /api/nginx/proxy-hosts.

async function token(ctx, url, fresh) {
  const cached = ctx.cache.get('token');
  if (!fresh && cached && cached.until > Date.now()) return cached.token;
  const res = await ctx.fetch(`${url}/api/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ identity: ctx.options.username, secret: ctx.options.password }),
  });
  if (!res.ok) throw new Error(`Nginx Proxy Manager login answered ${res.status}`);
  const body = await res.json();
  const expires = Date.parse(body.expires);
  ctx.cache.set('token', { token: body.token, until: (Number.isFinite(expires) ? expires : Date.now() + 3600_000) - 5 * 60_000 });
  return body.token;
}

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (retried = false) => {
      const res = await ctx.fetch(`${url}/api/nginx/proxy-hosts`, { headers: { accept: 'application/json', authorization: `Bearer ${await token(ctx, url, retried)}` } });
      if ((res.status === 401 || res.status === 403) && !retried) return get(true);
      if (!res.ok) throw new Error(`Nginx Proxy Manager hosts answered ${res.status}`);
      return res.json();
    };
    const hosts = await get();
    const enabled = hosts.filter((h) => h.enabled === true || h.enabled === 1).length;
    return {
      blocks: [
        { key: 'enabled', label: 'enabled', value: enabled },
        { key: 'disabled', label: 'disabled', value: hosts.length - enabled },
        { key: 'total', label: 'total', value: hosts.length },
      ],
    };
  },
};
