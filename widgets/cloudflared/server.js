// Cloudflare Tunnel: the tunnel (status) and its connections (origin IP) from Cloudflare's API,
// with an API token. A degraded tunnel is marked, a down one too.

export default {
  async fetch(ctx) {
    const { accountid, tunnelid, key, url } = ctx.options;
    if (!/^[\w-]+$/.test(accountid) || !/^[\w-]+$/.test(tunnelid)) throw new Error('accountid and tunnelid: ids from the Cloudflare dashboard');
    const base = `${String(url).replace(/\/+$/, '')}/client/v4/accounts/${accountid}/cfd_tunnel/${tunnelid}`;
    const get = async (path) => {
      const res = await ctx.fetch(`${base}${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${key}` } });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(`Cloudflare tunnel answered ${res.ok ? 500 : res.status}`);
      return body.result;
    };
    const [tunnel, connections] = await Promise.all([get(''), get('/connections')]);
    const status = String(tunnel.status ?? '').toLowerCase() || null;
    const origin = (connections ?? []).flatMap((c) => c.conns ?? []).find((c) => c.origin_ip)?.origin_ip ?? null;
    return {
      blocks: [
        { key: 'status', label: 'status', value: status, ...(status === 'degraded' ? { status: 'warn' } : status === 'down' ? { status: 'error' } : {}) },
        { key: 'origin_ip', label: 'origin_ip', value: origin },
      ],
    };
  },
};
