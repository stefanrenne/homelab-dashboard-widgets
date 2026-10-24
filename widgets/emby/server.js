// Emby: the sessions that are playing something (/emby/Sessions), one row each with its
// position and progress, and with enableBlocks the library counts (/emby/Items/Counts). The key
// goes in the X-Emby-Token header rather than the URL.

const TICKS_PER_MS = 10_000;
const pad = (n) => String(n ?? 0).padStart(2, '0');

/** Milliseconds -> "3:54" or "1:02:03", the one time format of these widgets. */
export function clock(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function streamTitle(session, { showEpisodeNumber, enableUser }) {
  const item = session.NowPlayingItem;
  let title;
  if (item.Type === 'Episode' && showEpisodeNumber) {
    title = `${item.SeriesName}: S${pad(item.ParentIndexNumber)} · E${pad(item.IndexNumber)} - ${item.Name}`;
  } else if (item.Type === 'Audio') {
    title = [item.AlbumArtist, item.Album, item.Name].filter(Boolean).join(' - ');
  } else {
    title = `${item.Name}${item.SeriesName ? ` - ${item.SeriesName}` : ''}`;
  }
  return enableUser && session.UserName ? `${title} (${session.UserName})` : title;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/emby${path}`, { headers: { accept: 'application/json', 'x-emby-token': o.key } });
      if (!res.ok) throw new Error(`Emby ${path} answered ${res.status}`);
      return res.json();
    };
    const out = {};
    if (o.enableBlocks) {
      const c = await get('/Items/Counts');
      out.blocks = [
        { key: 'movies', label: 'movies', value: c.MovieCount ?? null },
        { key: 'series', label: 'series', value: c.SeriesCount ?? null },
        { key: 'episodes', label: 'episodes', value: c.EpisodeCount ?? null },
        { key: 'songs', label: 'songs', value: c.SongCount ?? null },
      ];
    }
    if (o.enableNowPlaying !== false) {
      const playing = (await get('/Sessions')).filter((s) => s.NowPlayingItem);
      out.rows = playing.length === 0 ? [{ label: 'noActiveStreams' }] : playing.map((s) => {
        const position = (s.PlayState?.PositionTicks ?? 0) / TICKS_PER_MS;
        const duration = (s.NowPlayingItem.RunTimeTicks ?? s.NowPlayingItem.CurrentProgram?.RunTimeTicks ?? 0) / TICKS_PER_MS;
        return {
          label: streamTitle(s, o),
          icon: s.PlayState?.IsPaused ? 'pause' : 'play',
          value: duration > 0 ? `${clock(position)} / ${clock(duration)}` : clock(position),
          progress: duration > 0 ? Math.max(0, Math.min(100, Math.round((1000 * position) / duration) / 10)) : 0,
        };
      });
    }
    return out;
  },
};
