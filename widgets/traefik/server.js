// Traefik: GET /api/overview. HTTP routers, services and middlewares in total; a kind with
// errors is marked as an error, with warnings as a warning.

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/api/overview`, { headers });
    if (!res.ok) throw new Error(`Traefik overview answered ${res.status}`);
    const http = (await res.json()).http ?? {};
    const block = (key, part = {}) => ({
      key, label: key, value: part.total ?? 0,
      ...(part.errors > 0 ? { status: 'error' } : part.warnings > 0 ? { status: 'warn' } : {}),
    });
    return { blocks: [block('routers', http.routers), block('services', http.services), block('middleware', http.middlewares)] };
  },
};
