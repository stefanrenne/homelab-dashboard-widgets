// wg-easy: GET /api/wireguard/client (before 15; the password in Authorization) or /api/client
// (15 and later; Basic authentication). A client is connected when its last handshake is less
// than `threshold` minutes ago.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const v2 = Number(ctx.options.version) >= 2;
    const headers = { accept: 'application/json' };
    if (username && password) headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    else if (password) headers.authorization = password;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/${v2 ? 'client' : 'wireguard/client'}`, { headers });
    if (!res.ok) throw new Error(`wg-easy answered ${res.status}`);
    const clients = await res.json();
    if (!Array.isArray(clients)) throw new Error(`wg-easy answered ${clients?.statusCode ?? 500}`);
    const since = Date.now() - Math.max(0.1, Number(ctx.options.threshold) || 2) * 60_000;
    const enabled = clients.filter((c) => c.enabled).length;
    return {
      blocks: [
        { key: 'connected', label: 'connected', value: clients.filter((c) => Date.parse(c.latestHandshakeAt ?? '') > since).length },
        { key: 'enabled', label: 'enabled', value: enabled },
        { key: 'disabled', label: 'disabled', value: clients.length - enabled },
        { key: 'total', label: 'total', value: clients.length },
      ],
    };
  },
};
