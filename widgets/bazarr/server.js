// Bazarr: episodes and movies that still miss subtitles.

async function total(ctx, kind) {
  const url = `${ctx.options.url.replace(/\/+$/, '')}/api/${kind}/wanted?start=0&length=1`;
  const res = await ctx.fetch(url, { headers: { 'X-API-KEY': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bazarr ${kind} answered ${res.status}`);
  const json = await res.json();
  return json.total ?? 0;
}

export default {
  async fetch(ctx) {
    const [episodes, movies] = await Promise.all([total(ctx, 'episodes'), total(ctx, 'movies')]);
    return {
      blocks: [
        { key: 'missingEpisodes', label: 'missingEpisodes', value: episodes },
        { key: 'missingMovies', label: 'missingMovies', value: movies },
      ],
    };
  },
};
