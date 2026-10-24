// Radarr (API v3): wanted, missing, queued and downloaded movies, and the queue.
//
// Queue rows lead with what needs you: blocked or failed imports first, marked warn/error,
// then the rest; at most `queueLimit` rows plus "+N more".

const api = (ctx, path) => `${ctx.options.url.replace(/\/+$/, '')}/api/v3/${path}`;

async function get(ctx, path) {
  const res = await ctx.fetch(api(ctx, path), { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Radarr ${path.split('?')[0]} answered ${res.status}`);
  return res.json();
}

/** Queue states with a translation in i18n.json; anything else is shown as words. */
export const STATES = ['downloading', 'queued', 'paused', 'completed', 'delay', 'failed', 'failedPending', 'warning',
  'importPending', 'importBlocked', 'importing', 'imported', 'downloadClientUnavailable'];
const PROBLEMS = { importBlocked: 'warn', warning: 'warn', failed: 'error', failedPending: 'error', downloadClientUnavailable: 'error' };

/** The i18n key of a queue item's state: the tracked state, or the download status while downloading. */
export function queueState(item) {
  const raw = item.trackedDownloadState && item.trackedDownloadState !== 'downloading' ? item.trackedDownloadState : item.status;
  const key = String(raw ?? 'queued').replace(/^./, (c) => c.toLowerCase());
  return STATES.includes(key) ? key : key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export function queueStatus(item, state) {
  if (item.trackedDownloadStatus === 'error') return 'error';
  if (item.trackedDownloadStatus === 'warning') return 'warn';
  return PROBLEMS[state];
}

/** "00:12:30" or "1.02:03:04" (days.hours:minutes:seconds) -> seconds. */
export function parseTimeleft(value) {
  const m = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)/.exec(String(value ?? ''));
  return m ? (Number(m[1] ?? 0) * 86400) + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]) : 0;
}

/** Seconds -> "3:54" or "1:02:03", the one time format of these widgets. */
export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Rows for a queue: problems first, then the rest, at most `limit` plus "+N more". */
export function queueRows(items, limit, labelOf) {
  const rank = { error: 0, warn: 1 };
  const rows = items.map((item, i) => {
    const state = queueState(item);
    const status = queueStatus(item, state);
    const left = parseTimeleft(item.timeleft);
    const progress = item.size > 0 ? Math.round(Math.max(0, Math.min(100, (1 - item.sizeleft / item.size) * 100))) : undefined;
    return {
      i,
      row: {
        label: labelOf(item),
        // Time left while it downloads; otherwise the state in words.
        value: state === 'downloading' && left > 0 ? clock(left) : state,
        ...(status ? { status } : {}),
        ...(progress === undefined || status ? {} : { progress }),
      },
    };
  });
  rows.sort((a, b) => (rank[a.row.status] ?? 2) - (rank[b.row.status] ?? 2) || a.i - b.i);
  const shown = rows.slice(0, limit).map((r) => r.row);
  if (rows.length > limit) shown.push({ label: 'moreItems', vars: { count: rows.length - limit } });
  return shown;
}

export default {
  async fetch(ctx) {
    const [movies, status] = await Promise.all([get(ctx, 'movie'), get(ctx, 'queue/status')]);
    const result = {
      blocks: [
        { key: 'wanted', label: 'wanted', value: movies.filter((m) => m.monitored && !m.hasFile && m.isAvailable).length },
        { key: 'missing', label: 'missing', value: movies.filter((m) => m.monitored && !m.hasFile).length },
        { key: 'queued', label: 'queued', value: status.totalCount ?? 0 },
        { key: 'movies', label: 'movies', value: movies.filter((m) => m.hasFile).length },
      ],
    };
    if (ctx.options.enableQueue) {
      const queue = await get(ctx, 'queue/details?includeMovie=true');
      result.rows = queueRows(queue, ctx.options.queueLimit, (item) =>
        item.movie ? `${item.movie.title}${item.movie.year ? ` (${item.movie.year})` : ''}` : item.title ?? '?');
    }
    return result;
  },
};
