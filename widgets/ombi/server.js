// Ombi: GET /api/v1/Request/count with the API key. Pending requests wait for you: marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/Request/count`, {
      headers: { 'X-API-Key': ctx.options.key, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Ombi answered ${res.status}`);
    const c = await res.json();
    return {
      blocks: [
        { key: 'pending', label: 'pending', value: c.pending ?? 0, ...(c.pending > 0 ? { status: 'warn' } : {}) },
        { key: 'approved', label: 'approved', value: c.approved ?? 0 },
        { key: 'available', label: 'available', value: c.available ?? 0 },
      ],
    };
  },
};
