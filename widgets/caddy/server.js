// Caddy: GET /reverse_proxy/upstreams on the admin API. Upstreams, the requests in flight to
// them and the failures Caddy counts against them; failures are marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/reverse_proxy/upstreams`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Caddy upstreams answered ${res.status}`);
    const upstreams = await res.json();
    const failed = upstreams.reduce((s, u) => s + (u.fails ?? 0), 0);
    return {
      blocks: [
        { key: 'upstreams', label: 'upstreams', value: upstreams.length },
        { key: 'requests', label: 'requests', value: upstreams.reduce((s, u) => s + (u.num_requests ?? 0), 0) },
        { key: 'requests_failed', label: 'requests_failed', value: failed, ...(failed > 0 ? { status: 'warn' } : {}) },
      ],
    };
  },
};
