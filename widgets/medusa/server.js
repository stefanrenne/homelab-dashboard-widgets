// Medusa: the v1 API with the key in the path: ?cmd=shows.stats and ?cmd=future (episodes
// missed, today, soon and later count as wanted).

export default {
  async fetch(ctx) {
    const base = `${ctx.options.url.replace(/\/+$/, '')}/api/v1/${encodeURIComponent(ctx.options.key)}/`;
    const get = async (cmd) => {
      const res = await ctx.fetch(`${base}?cmd=${cmd}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Medusa ${cmd} answered ${res.status}`);
      const body = await res.json();
      if (body.result && body.result !== 'success') throw new Error(`Medusa ${cmd} answered 401 (${body.result})`);
      return body.data ?? {};
    };
    const [stats, future] = await Promise.all([get('shows.stats'), get('future')]);
    const wanted = ['missed', 'today', 'soon', 'later'].reduce((s, k) => s + (future[k]?.length ?? 0), 0);
    return {
      blocks: [
        { key: 'wanted', label: 'wanted', value: wanted },
        { key: 'queued', label: 'queued', value: stats.ep_snatched ?? 0 },
        { key: 'series', label: 'series', value: stats.shows_active ?? 0 },
      ],
    };
  },
};
