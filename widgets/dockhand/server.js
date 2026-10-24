// Dockhand: GET /api/dashboard/stats (per environment). With a username and password the
// session cookie of /api/auth/login is kept and renewed on a 401; or an API key. One environment
// or all summed (CPU and memory averaged). Pending updates and stopped containers are marked.

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/api`;
    const login = async () => {
      const res = await ctx.fetch(`${url}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: o.username, password: o.password }) });
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
      if (!res.ok || !cookie) throw new Error(`Dockhand login answered ${res.ok ? 401 : res.status}`);
      ctx.cache.set('cookie', cookie);
    };
    const get = async (retried = false) => {
      const headers = { accept: 'application/json' };
      if (o.key) headers.authorization = `Bearer ${o.key}`;
      else if (ctx.cache.get('cookie')) headers.cookie = ctx.cache.get('cookie');
      const res = await ctx.fetch(`${url}/dashboard/stats`, { headers });
      if (res.status === 401 && !o.key && o.username && !retried) {
        await login();
        return get(true);
      }
      if (!res.ok) throw new Error(`Dockhand stats answered ${res.status}`);
      return res.json();
    };
    let stats = await get();
    if (!Array.isArray(stats)) stats = [stats];
    if (o.environment) {
      const want = String(o.environment).toLowerCase();
      stats = stats.filter((e) => String(e?.name ?? '').toLowerCase() === want || String(e?.id) === String(o.environment));
      if (stats.length === 0) throw new Error(`Dockhand has no environment "${o.environment}"`);
    }
    const sum = (f) => stats.reduce((s, e) => s + (Number(f(e)) || 0), 0);
    const avg = (f) => (stats.length ? Math.round((10 * sum(f)) / stats.length) / 10 : null);
    const running = sum((e) => e.containers?.running);
    const total = sum((e) => e.containers?.total);
    const stopped = sum((e) => e.containers?.stopped ?? (e.containers?.total ?? 0) - (e.containers?.running ?? 0));
    const updates = sum((e) => e.containers?.pendingUpdates);
    return {
      blocks: [
        { key: 'running', label: 'running', value: running },
        { key: 'stopped', label: 'stopped', value: stopped, ...(stopped > 0 ? { status: 'warn' } : {}) },
        { key: 'paused', label: 'paused', value: sum((e) => e.containers?.paused) },
        { key: 'pending_updates', label: 'updates', value: updates, ...(updates > 0 ? { status: 'warn' } : {}) },
        { key: 'total', label: 'total', value: total },
        { key: 'cpu', label: 'cpu', value: avg((e) => e.metrics?.cpuPercent), unit: '%' },
        { key: 'memory', label: 'memory', value: avg((e) => e.metrics?.memoryPercent), unit: '%' },
        { key: 'images', label: 'images', value: sum((e) => e.images?.total) },
        { key: 'volumes', label: 'volumes', value: sum((e) => e.volumes?.total) },
        { key: 'stacks', label: 'stacks', value: `${sum((e) => e.stacks?.running)} / ${sum((e) => e.stacks?.total)}` },
        { key: 'events_today', label: 'events_today', value: sum((e) => e.events?.today) },
      ],
    };
  },
};
