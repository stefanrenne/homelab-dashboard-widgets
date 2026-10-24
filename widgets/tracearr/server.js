// Tracearr: GET /api/v1/public/streams with an API key. Per stream a row with its progress
// (as the tautulli widget), and a summary: streams, transcodes, direct plays and the bitrate.

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
  if (s.mediaType === 'episode') {
    title = showEpisodeNumber
      ? `${s.showTitle}: S${pad(s.seasonNumber)} · E${pad(s.episodeNumber)} - ${s.mediaTitle}`
      : `${s.showTitle} - ${s.mediaTitle}`;
  } else {
    title = s.mediaTitle ?? '?';
  }
  return `${title}${enableUser && s.username ? ` (${s.username})` : ''}`;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/public/streams`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Tracearr answered ${res.status}`);
    const body = await res.json();
    const sessions = [...(body.data ?? [])].sort((a, b) => (a.progressMs ?? 0) - (b.progressMs ?? 0));
    const sum = body.summary ?? {};
    const view = ctx.options.view ?? 'details';
    const out = {};
    if (view !== 'details') {
      out.blocks = [
        { key: 'streams', label: 'streams', value: sum.total ?? sessions.length },
        { key: 'transcodes', label: 'transcodes', value: sum.transcodes ?? 0 },
        { key: 'directplay', label: 'directplay', value: sum.directPlays ?? 0 },
        { key: 'bitrate', label: 'bitrate', value: sum.totalBitrate ?? null },
      ];
    }
    if (view !== 'summary') {
      out.rows = sessions.length
        ? sessions.map((s) => ({
          label: streamTitle(s, ctx.options),
          icon: s.state === 'paused' ? 'pause' : 'play',
          value: Number(s.durationMs) > 0 ? `${clock(s.progressMs)} / ${clock(s.durationMs)}` : clock(s.progressMs),
          progress: Number(s.durationMs) > 0 ? Math.max(0, Math.min(100, (s.progressMs / s.durationMs) * 100)) : 0,
        }))
        : [{ label: 'noActiveStreams' }];
    }
    return out;
  },
};
