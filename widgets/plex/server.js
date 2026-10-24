// Plex Media Server: active streams (/status/sessions) on every refresh, and the number of
// movies, TV shows and albums over the libraries (counted with a container size of 0, so Plex
// only reports totalSize). The libraries are kept for 6 hours, the counts for 10 minutes, as
// in homepage. JSON through Accept, the token in a header.

const LIBRARIES_MS = 6 * 3600_000;
const COUNTS_MS = 10 * 60_000;

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (path, size) => {
      const headers = { accept: 'application/json', 'x-plex-token': ctx.options.key };
      if (size !== undefined) Object.assign(headers, { 'x-plex-container-start': '0', 'x-plex-container-size': String(size) });
      const res = await ctx.fetch(`${url}${path}`, { headers });
      if (!res.ok) throw new Error(`Plex ${path} answered ${res.status}`);
      return (await res.json()).MediaContainer ?? {};
    };
    const remembered = async (key, ms, load) => {
      const hit = ctx.cache.get(key);
      if (hit && hit.until > Date.now()) return hit.value;
      const value = await load();
      ctx.cache.set(key, { value, until: Date.now() + ms });
      return value;
    };

    const sessions = await get('/status/sessions');
    const libraries = await remembered('libraries', LIBRARIES_MS, async () => (await get('/library/sections')).Directory ?? []);
    const counts = await remembered('counts', COUNTS_MS, async () => {
      const out = { movie: 0, show: 0, artist: 0 };
      await Promise.all(libraries.filter((l) => l.type in out).map(async (l) => {
        // music counts albums, as in homepage
        const c = await get(`/library/sections/${encodeURIComponent(l.key)}/${l.type === 'artist' ? 'albums' : 'all'}`, 0);
        out[l.type] += Number(c.totalSize ?? c.size ?? 0);
      }));
      return out;
    });
    return {
      blocks: [
        { key: 'streams', label: 'streams', value: Number(sessions.size ?? 0) },
        { key: 'albums', label: 'albums', value: counts.artist },
        { key: 'movies', label: 'movies', value: counts.movie },
        { key: 'tv', label: 'tv', value: counts.show },
      ],
    };
  },
};
