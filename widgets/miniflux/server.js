// Miniflux: GET /v1/feeds/counters with an API key in X-Auth-Token; the per-feed counts summed.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/v1/feeds/counters`, { headers: { accept: 'application/json', 'x-auth-token': ctx.options.key } });
    if (!res.ok) throw new Error(`Miniflux answered ${res.status}`);
    const c = await res.json();
    const sum = (o) => Object.values(o ?? {}).reduce((s, n) => s + (Number(n) || 0), 0);
    return {
      blocks: [
        { key: 'unread', label: 'unread', value: sum(c.unreads) },
        { key: 'read', label: 'read', value: sum(c.reads) },
      ],
    };
  },
};
