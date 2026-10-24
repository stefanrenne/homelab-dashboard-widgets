// Jellystat: GET /stats/getViewsByLibraryType?days=<n> with the API key in X-API-Token.

export default {
  async fetch(ctx) {
    const days = Math.max(1, Math.floor(Number(ctx.options.days) || 30));
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/stats/getViewsByLibraryType?days=${days}`, { headers: { accept: 'application/json', 'x-api-token': ctx.options.key } });
    if (!res.ok) throw new Error(`Jellystat answered ${res.status}`);
    const v = await res.json();
    if (v?.message) throw new Error(`Jellystat answered: ${String(v.message).slice(0, 80)}`);
    const n = (k) => Number(v?.[k]) || 0;
    return {
      blocks: [
        { key: 'songs', label: 'songs', value: n('Audio') },
        { key: 'movies', label: 'movies', value: n('Movie') },
        { key: 'episodes', label: 'episodes', value: n('Series') },
        { key: 'other', label: 'other', value: n('Other') },
      ],
    };
  },
};
