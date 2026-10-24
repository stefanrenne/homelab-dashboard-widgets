// Plant-it: GET /api/stats with the API key in a Key header.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/stats`, { headers: { accept: 'application/json', key: ctx.options.key } });
    if (!res.ok) throw new Error(`Plant-it answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'events', label: 'events', value: s.diaryEntryCount ?? 0 },
        { key: 'plants', label: 'plants', value: s.plantCount ?? 0 },
        { key: 'photos', label: 'photos', value: s.imageCount ?? 0 },
        { key: 'species', label: 'species', value: s.botanicalInfoCount ?? 0 },
      ],
    };
  },
};
