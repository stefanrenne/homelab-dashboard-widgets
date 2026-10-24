// Kavita: logs in (POST /api/Account/login with a user name and password, or an API key; the
// token is kept and renewed on 401/403), then GET /api/Stats/server/stats.

export default {
  async fetch(ctx) {
    const { username, password, key } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const login = async () => {
      const body = username && password ? { username, password, apiKey: '' } : { username: '', password: '', apiKey: key ?? '' };
      const res = await ctx.fetch(`${url}/Account/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Kavita login answered ${res.status}`);
      ctx.cache.set('token', (await res.json()).token);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.cache.get('token')}` } });
      if ((res.status === 401 || res.status === 403) && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`Kavita ${path} answered ${res.status}`);
      return res.json();
    };
    const s = await get('Stats/server/stats');
    return {
      blocks: [
        { key: 'seriesCount', label: 'seriesCount', value: s.seriesCount ?? 0 },
        { key: 'totalFiles', label: 'totalFiles', value: s.totalFiles ?? 0 },
      ],
    };
  },
};
