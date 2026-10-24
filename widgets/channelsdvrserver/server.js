// Channels DVR Server: GET /dvr, its stats.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/dvr`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Channels DVR answered ${res.status}`);
    const s = (await res.json()).stats ?? {};
    return {
      blocks: [
        { key: 'shows', label: 'shows', value: s.groups ?? null },
        { key: 'recordings', label: 'recordings', value: s.files ?? null },
        { key: 'scheduled', label: 'scheduled', value: s.jobs ?? null },
        { key: 'passes', label: 'passes', value: s.rules ?? null },
      ],
    };
  },
};
