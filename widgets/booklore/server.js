// BookLore: POST /api/v1/auth/login for an access token (kept ten hours, renewed on a 401 or
// 403), then the libraries and books of the account; reading and finished from their status.

async function token(ctx, base, fresh) {
  const cached = ctx.cache.get('token');
  if (!fresh && cached && cached.until > Date.now()) return cached.token;
  const res = await ctx.fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ username: ctx.options.username, password: ctx.options.password }),
  });
  const body = res.ok ? await res.json() : null;
  if (!body?.accessToken) throw new Error(`BookLore login answered ${res.ok ? 401 : res.status}`);
  ctx.cache.set('token', { token: body.accessToken, until: Date.now() + 10 * 3600_000 - 60_000 });
  return body.accessToken;
}

export default {
  async fetch(ctx) {
    const base = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const get = async (path, retried = false) => {
      const res = await ctx.fetch(`${base}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${await token(ctx, base, retried)}` } });
      if ((res.status === 401 || res.status === 403) && !retried) return get(path, true);
      if (!res.ok) throw new Error(`BookLore ${path} answered ${res.status}`);
      return res.json();
    };
    const libraries = await get('libraries');
    const books = await get('books');
    const status = (s) => books.filter((b) => String(b?.readStatus ?? '').toUpperCase() === s).length;
    return {
      blocks: [
        { key: 'libraries', label: 'libraries', value: libraries.length },
        { key: 'books', label: 'books', value: books.length },
        { key: 'reading', label: 'reading', value: status('READING') },
        { key: 'finished', label: 'finished', value: status('READ') },
      ],
    };
  },
};
