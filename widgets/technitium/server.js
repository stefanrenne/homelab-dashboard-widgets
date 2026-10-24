// Technitium DNS Server: GET /api/dashboard/stats/get?token=...&type=<range>&utc=true (and
// node). Server failures are marked.

const FIELDS = ['totalNoError', 'totalServerFailure', 'totalNxDomain', 'totalRefused', 'totalAuthoritative', 'totalRecursive', 'totalCached', 'totalBlocked', 'totalDropped'];

export default {
  async fetch(ctx) {
    const params = new URLSearchParams({ token: ctx.options.key, type: ctx.options.range || 'LastHour', utc: 'true' });
    if (ctx.options.node) params.set('node', ctx.options.node);
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/dashboard/stats/get?${params}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Technitium answered ${res.status}`);
    const body = await res.json();
    if (body.status !== 'ok') throw new Error(`Technitium answered ${body.status === 'invalid-token' ? 401 : 500} (${body.status})`);
    const s = body.response?.stats ?? {};
    const total = Number(s.totalQueries) || 0;
    return {
      blocks: [
        { key: 'totalQueries', label: 'totalQueries', value: total },
        ...FIELDS.map((k) => ({ key: k, label: k, value: Number(s[k]) || 0, ...(k === 'totalServerFailure' && s[k] > 0 ? { status: 'warn' } : {}) })),
        { key: 'totalClients', label: 'totalClients', value: Number(s.totalClients) || 0 },
      ],
    };
  },
};
