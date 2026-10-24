// Prowlarr: grabs and queries summed over all indexers.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1/indexerstats`;
    const res = await ctx.fetch(url, { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Prowlarr answered ${res.status}`);
    const { indexers = [] } = await res.json();
    const sum = (field) => indexers.reduce((n, i) => n + (Number(i[field]) || 0), 0);
    const failed = (key, field) => {
      const value = sum(field);
      return { key, label: key, value, ...(value > 0 ? { status: 'warn' } : {}) };
    };
    return {
      blocks: [
        { key: 'grabs', label: 'grabs', value: sum('numberOfGrabs') },
        { key: 'queries', label: 'queries', value: sum('numberOfQueries') },
        failed('failGrabs', 'numberOfFailedGrabs'),
        failed('failQueries', 'numberOfFailedQueries'),
      ],
    };
  },
};
