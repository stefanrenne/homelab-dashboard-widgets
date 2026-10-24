// Tautulli: the streams that are playing now, one row each with its progress.

const pad = (n) => String(n ?? 0).padStart(2, '0');

/** Milliseconds -> "3:54" or "1:02:03", the one time format of these widgets. */
export function clock(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function streamTitle(s, { showEpisodeNumber, enableUser }) {
  let title;
  if (s.media_type === 'episode') {
    title = showEpisodeNumber
      ? `${s.grandparent_title}: S${pad(s.parent_media_index)} · E${pad(s.media_index)} - ${s.title}`
      : `${s.grandparent_title} - ${s.title}`;
  } else if (s.media_type === 'track') {
    title = `${s.grandparent_title} - ${s.title}`;
  } else {
    title = s.full_title ?? s.title ?? '?';
  }
  return `${title}${enableUser && s.friendly_name ? ` (${s.friendly_name})` : ''}`;
}

export default {
  async fetch(ctx) {
    const url = new URL(`${ctx.options.url.replace(/\/+$/, '')}/api/v2`);
    url.search = new URLSearchParams({ apikey: ctx.options.key, cmd: 'get_activity' }).toString();
    const res = await ctx.fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Tautulli answered ${res.status}`);
    const json = await res.json();
    if (json.response?.result !== 'success') throw new Error(`Tautulli: ${json.response?.message ?? 'unexpected answer'}`);
    const sessions = json.response.data?.sessions ?? [];
    if (sessions.length === 0) return { rows: [{ label: 'noActiveStreams' }] };
    return {
      rows: sessions.map((s) => ({
        label: streamTitle(s, ctx.options),
        // the dashboard draws ▶ / ❚❚ and says "Playing" / "Paused" to screen readers
        icon: s.state === 'paused' ? 'pause' : 'play',
        // where it is / how long it is: "3:54 / 58:00"
        value: Number(s.duration) > 0 ? `${clock(s.view_offset)} / ${clock(s.duration)}` : clock(s.view_offset),
        progress: Math.max(0, Math.min(100, Number(s.progress_percent) || 0)),
      })),
    };
  },
};
