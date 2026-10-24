// Jackett: GET /api/v2.0/indexers?configured=true. With an admin password Jackett also wants
// its session cookie: a POST of the password to /UI/Dashboard answers with it (a redirect, so
// it is read before following). Indexers with a last error are counted and marked.

async function login(ctx, url) {
  const res = await ctx.fetch(`${url}/UI/Dashboard`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: ctx.options.password }).toString(),
    redirect: 'manual',
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).filter(Boolean).join('; ');
  if (!cookie) throw new Error(`Jackett login answered ${res.status === 200 || res.status === 302 ? 401 : res.status}`);
  ctx.cache.set('cookie', cookie);
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const get = async (retried = false) => {
      if (o.password && !ctx.cache.get('cookie')) await login(ctx, url);
      const query = new URLSearchParams({ apikey: o.key, configured: 'true' });
      const headers = { accept: 'application/json', ...(o.password ? { cookie: ctx.cache.get('cookie') } : {}) };
      const res = await ctx.fetch(`${url}/api/v2.0/indexers?${query}`, { headers, redirect: 'manual' });
      // an expired session sends the request to the login page
      if (o.password && !retried && (res.status === 302 || res.status === 401)) {
        ctx.cache.delete('cookie');
        return get(true);
      }
      if (!res.ok) throw new Error(`Jackett indexers answered ${res.status}`);
      return res.json();
    };
    const indexers = await get();
    const errored = indexers.filter((i) => i.last_error).length;
    return {
      blocks: [
        { key: 'configured', label: 'configured', value: indexers.length },
        { key: 'errored', label: 'errored', value: errored, ...(errored > 0 ? { status: 'warn' } : {}) },
      ],
    };
  },
};
