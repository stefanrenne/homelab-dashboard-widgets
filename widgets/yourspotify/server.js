// Your Spotify: GET /spotify/songs_per, time_per and different_artists_per with the public
// token, from `interval` ago (the past 7 days for week, not since Monday). The listening time
// is a span ("2d 3h").

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export function startOf(interval, now = new Date()) {
  if (interval === 'all') return '2006-04-23T00:00:00.000Z'; // before Spotify
  const d = new Date(now);
  if (interval === 'day') d.setDate(d.getDate() - 1);
  else if (interval === 'month') d.setMonth(d.getMonth() - 1);
  else if (interval === 'year') d.setFullYear(d.getFullYear() - 1);
  else d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/spotify`;
    const params = new URLSearchParams({ token: ctx.options.key, start: startOf(ctx.options.interval ?? 'week'), timeSplit: 'all' });
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}?${params}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Your Spotify answered ${res.status}`);
      const body = await res.json();
      return Array.isArray(body) ? body[0] ?? {} : {};
    };
    const [songs, time, artists] = await Promise.all([get('songs_per'), get('time_per'), get('different_artists_per')]);
    return {
      blocks: [
        { key: 'songs', label: 'songs', value: songs.count ?? 0 },
        { key: 'time', label: 'time', value: span(time.count ?? 0) },
        { key: 'artists', label: 'artists', value: artists.artists?.length ?? 0 },
      ],
    };
  },
};
