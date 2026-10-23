// Prowlarr: grabs and queries summed over all indexers.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1/indexerstats`;
    const res = await ctx.fetch(url, { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Prowlarr answered ${res.status}`);
    const { indexers = [] } = await res.json();
    const sum = (field) => indexers.reduce((n, i) => n + (Number(i[field]) || 0), 0);
    return {
      blocks: [
        { key: 'grabs', label: 'grabs', value: sum('numberOfGrabs') },
        { key: 'queries', label: 'queries', value: sum('numberOfQueries') },
        { key: 'failGrabs', label: 'failGrabs', value: sum('numberOfFailedGrabs') },
        { key: 'failQueries', label: 'failQueries', value: sum('numberOfFailedQueries') },
      ],
    };
  },
};
