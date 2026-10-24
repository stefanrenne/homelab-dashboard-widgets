// AdGuard Home: GET /control/stats with the web interface login (basic authentication).
// filtered = Safe Browsing, Safe Search and parental control replacements, as in homepage.

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/control/stats`, { headers });
    if (!res.ok) throw new Error(`AdGuard Home stats answered ${res.status}`);
    const s = await res.json();
    const n = (v) => (typeof v === 'number' ? v : null);
    const filtered = [s.num_replaced_safebrowsing, s.num_replaced_safesearch, s.num_replaced_parental].reduce((sum, v) => sum + (n(v) ?? 0), 0);
    return {
      blocks: [
        { key: 'queries', label: 'queries', value: n(s.num_dns_queries) },
        { key: 'blocked', label: 'blocked', value: n(s.num_blocked_filtering) },
        { key: 'filtered', label: 'filtered', value: filtered },
        { key: 'latency', label: 'latency', value: n(s.avg_processing_time) === null ? null : Math.round(s.avg_processing_time * 10000) / 10, unit: 'ms' },
      ],
    };
  },
};
