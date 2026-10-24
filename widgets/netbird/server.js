// NetBird: GET /api/peers and /api/users with a personal access token ("Token <key>"). Service
// users are not counted as users. Peers offline and logins expired are marked.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Token ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`NetBird ${path} answered ${res.status}`);
      const body = await res.json();
      return Array.isArray(body) ? body : [];
    };
    const [peers, users] = await Promise.all([get('peers'), get('users')]);
    const online = peers.filter((p) => p.connected).length;
    const expired = peers.filter((p) => p.login_expired).length;
    return {
      blocks: [
        { key: 'online', label: 'online', value: `${online} / ${peers.length}`, ...(online < peers.length ? { status: 'warn' } : {}) },
        { key: 'users', label: 'users', value: users.filter((u) => !u.is_service_user).length },
        { key: 'login_expired', label: 'login_expired', value: expired, ...(expired ? { status: 'warn' } : {}) },
      ],
    };
  },
};
