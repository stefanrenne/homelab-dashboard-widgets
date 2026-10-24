// autobrr: release stats (approved and rejected pushes), filters and indexers, with the API key
// (X-API-Token).

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', 'X-API-Token': ctx.options.key } });
      if (!res.ok) throw new Error(`autobrr ${path} answered ${res.status}`);
      return res.json();
    };
    const [stats, filters, indexers] = await Promise.all([get('release/stats'), get('filters'), get('release/indexers')]);
    return {
      blocks: [
        { key: 'approvedPushes', label: 'approvedPushes', value: stats.push_approved_count ?? 0 },
        { key: 'rejectedPushes', label: 'rejectedPushes', value: stats.push_rejected_count ?? 0 },
        { key: 'filters', label: 'filters', value: Array.isArray(filters) ? filters.length : null },
        { key: 'indexers', label: 'indexers', value: Array.isArray(indexers) ? indexers.length : null },
      ],
    };
  },
};
