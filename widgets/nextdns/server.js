// NextDNS: GET /profiles/<profile>/analytics/status with the API key in X-Api-Key: the queries
// per outcome (default = resolved, blocked, allowed, relayed) over NextDNS's default period.

const KNOWN = ['default', 'blocked', 'allowed', 'relayed'];

export default {
  async fetch(ctx) {
    const profile = String(ctx.options.profile ?? '');
    if (!/^[a-z0-9]+$/i.test(profile)) throw new Error('profile: the ID under Setup > Endpoints');
    const base = String(ctx.options.url || 'https://api.nextdns.io').replace(/\/+$/, '');
    const res = await ctx.fetch(`${base}/profiles/${profile}/analytics/status`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
    if (!res.ok) throw new Error(`NextDNS answered ${res.status}`);
    const rows = (await res.json()).data ?? [];
    const count = (s) => rows.find((r) => r.status === s)?.queries ?? 0;
    return { blocks: KNOWN.map((s) => ({ key: s, label: s, value: count(s) })) };
  },
};
