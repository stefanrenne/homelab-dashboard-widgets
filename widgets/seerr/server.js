// Overseerr / Jellyseerr / Seerr: request counts.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1/request/count`;
    const res = await ctx.fetch(url, { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Seerr answered ${res.status}`);
    const c = await res.json();
    return {
      blocks: [
        { key: 'pending', label: 'pending', value: c.pending ?? 0 },
        { key: 'approved', label: 'approved', value: c.approved ?? 0 },
        // Older Overseerr versions have no "completed" and call it "available".
        { key: 'completed', label: 'completed', value: c.completed ?? c.available ?? 0 },
      ],
    };
  },
};
