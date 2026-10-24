// Homebox: logs in (a form POST to /api/v1/users/login; the token, already "Bearer ...", is
// kept and renewed on 401/403), then GET /api/v1/groups/statistics and /api/v1/groups (the
// group's currency).

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const login = async () => {
      const res = await ctx.fetch(`${url}/users/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams({ username, password }).toString() });
      if (!res.ok) throw new Error(`Homebox login answered ${res.status}`);
      const { token } = await res.json();
      if (!token) throw new Error('Homebox login answered 401');
      ctx.cache.set('token', token);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: ctx.cache.get('token') } });
      if ((res.status === 401 || res.status === 403) && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`Homebox ${path} answered ${res.status}`);
      return res.json();
    };
    const stats = await get('groups/statistics');
    const group = await get('groups');
    const value = Number(stats.totalItemPrice);
    return {
      blocks: [
        { key: 'items', label: 'items', value: stats.totalItems ?? 0 },
        { key: 'totalWithWarranty', label: 'totalWithWarranty', value: stats.totalWithWarranty ?? 0 },
        { key: 'locations', label: 'locations', value: stats.totalLocations ?? 0 },
        { key: 'labels', label: 'labels', value: stats.totalLabels ?? 0 },
        { key: 'users', label: 'users', value: stats.totalUsers ?? 0 },
        { key: 'totalValue', label: 'totalValue', value: Number.isFinite(value) ? `${value.toFixed(2)} ${group.currency ?? ''}`.trim() : null },
      ],
    };
  },
};
