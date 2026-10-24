// Dispatcharr: a JWT from api/accounts/token/ (kept, renewed on a 401), the channels and the
// proxy's stream status. With enableActiveStreams a row per stream: its channel, clients and
// average bit rate.

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const login = async () => {
      const res = await ctx.fetch(`${url}/api/accounts/token/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: o.username, password: o.password }) });
      const body = res.ok ? await res.json() : null;
      if (!body?.access) throw new Error(`Dispatcharr login answered ${res.ok ? 401 : res.status}`);
      ctx.cache.set('token', body.access);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.cache.get('token')}` } });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`Dispatcharr ${path.split('/')[1]} answered ${res.status}`);
      return res.json();
    };
    const channels = await get('api/channels/channels/');
    const streams = await get('proxy/ts/status');
    const out = {
      blocks: [
        { key: 'channels', label: 'channels', value: Array.isArray(channels) ? channels.length : channels.count ?? null },
        { key: 'streams', label: 'streams', value: streams.count ?? (streams.channels ?? []).length },
      ],
    };
    if (o.enableActiveStreams) {
      out.rows = (streams.channels ?? []).map((s) => ({
        label: s.channel_name ?? s.stream_name ?? '?',
        value: `${(s.clients ?? []).length} · ${Math.round((Number(s.avg_bitrate_kbps ?? (Number(s.avg_bitrate) || 0) / 1000)) / 100) / 10} Mbit/s`,
        icon: 'play',
      }));
    }
    return out;
  },
};
