// SparkyFitness: GET /api/dashboard/stats with the API key in X-API-Key; today's calories (kcal)
// and steps.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/dashboard/stats`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
    if (!res.ok) throw new Error(`SparkyFitness answered ${res.status}`);
    const s = await res.json();
    const n = (k) => (typeof s[k] === 'number' ? Math.round(s[k]) : null);
    return {
      blocks: [
        { key: 'eaten', label: 'eaten', value: n('eaten'), unit: 'kcal' },
        { key: 'burned', label: 'burned', value: n('burned'), unit: 'kcal' },
        { key: 'remaining', label: 'remaining', value: n('remaining'), unit: 'kcal', ...(n('remaining') < 0 ? { status: 'warn' } : {}) },
        { key: 'steps', label: 'steps', value: n('steps') },
      ],
    };
  },
};
