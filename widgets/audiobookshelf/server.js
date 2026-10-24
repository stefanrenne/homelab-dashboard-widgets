// Audiobookshelf: the libraries (/api/libraries) and each one's stats, summed per media type.
// Lengths as spans ("63d 4h"), as the uptime of the other widgets.

export function span(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Audiobookshelf ${path.split('/')[0]} answered ${res.status}`);
      return res.json();
    };
    const libraries = (await get('libraries')).libraries ?? [];
    const stats = await Promise.all(libraries.map(async (l) => ({ type: l.mediaType, ...(await get(`libraries/${encodeURIComponent(l.id)}/stats`)) })));
    const total = (type, field) => stats.filter((s) => s.type === type).reduce((sum, s) => sum + (Number(s[field]) || 0), 0);
    return {
      blocks: [
        { key: 'podcasts', label: 'podcasts', value: total('podcast', 'totalItems') },
        { key: 'podcastsDuration', label: 'podcastsDuration', value: span(total('podcast', 'totalDuration')) },
        { key: 'books', label: 'books', value: total('book', 'totalItems') },
        { key: 'booksDuration', label: 'booksDuration', value: span(total('book', 'totalDuration')) },
      ],
    };
  },
};
