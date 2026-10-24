// FreshRSS through its Google Reader API (/api/greader.php): ClientLogin (a form POST, answered
// with an "Auth=" line; the token is kept and renewed on 401), then the subscription list and
// the unread count.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const api = `${ctx.options.url.replace(/\/+$/, '')}/api/greader.php`;
    const login = async () => {
      const res = await ctx.fetch(`${api}/accounts/ClientLogin`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ Email: username, Passwd: password }).toString() });
      if (!res.ok) throw new Error(`FreshRSS login answered ${res.status}`);
      const token = (await res.text()).split('\n').find((l) => l.startsWith('Auth='))?.slice(5).trim();
      if (!token) throw new Error('FreshRSS login answered 401');
      ctx.cache.set('token', token);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${api}/reader/api/0/${path}?output=json`, { headers: { accept: 'application/json', authorization: `GoogleLogin auth=${ctx.cache.get('token')}` } });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`FreshRSS ${path} answered ${res.status}`);
      return res.json();
    };
    const subscriptions = await get('subscription/list');
    const unread = await get('unread-count');
    return {
      blocks: [
        { key: 'unread', label: 'unread', value: Number(unread.max) || 0 },
        { key: 'subscriptions', label: 'subscriptions', value: (subscriptions.subscriptions ?? []).length },
      ],
    };
  },
};
