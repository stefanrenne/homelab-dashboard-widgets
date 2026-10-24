// Sonarr (API v3): wanted and queued episodes, number of series, and the queue.
//
// Queue rows name the episode ("South Park · S29E04"), not the release, and lead with
// what needs you; at most `queueLimit` rows plus "+N more".

const api = (ctx, path) => `${ctx.options.url.replace(/\/+$/, '')}/api/v3/${path}`;

async function get(ctx, path) {
  const res = await ctx.fetch(api(ctx, path), { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Sonarr ${path.split('?')[0]} answered ${res.status}`);
  return res.json();
}

export const STATES = ['downloading', 'queued', 'paused', 'completed', 'delay', 'failed', 'failedPending', 'warning',
  'importPending', 'importBlocked', 'importing', 'imported', 'downloadClientUnavailable'];
const PROBLEMS = { importBlocked: 'warn', warning: 'warn', failed: 'error', failedPending: 'error', downloadClientUnavailable: 'error' };

export function queueState(item) {
  const raw = item.trackedDownloadState && item.trackedDownloadState !== 'downloading' ? item.trackedDownloadState : item.status;
  const key = String(raw ?? 'queued').replace(/^./, (c) => c.toLowerCase());
  return STATES.includes(key) ? key : key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function queueStatus(item, state) {
  if (item.trackedDownloadStatus === 'error') return 'error';
  if (item.trackedDownloadStatus === 'warning') return 'warn';
  return PROBLEMS[state];
}

function parseTimeleft(value) {
  const m = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)/.exec(String(value ?? ''));
  return m ? (Number(m[1] ?? 0) * 86400) + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]) : 0;
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

const pad2 = (n) => String(n ?? 0).padStart(2, '0');

/** "South Park · S29E04" from the episode; the release title only as a last resort. */
export function episodeLabel(item, titles) {
  const show = titles.get(item.seriesId) ?? item.series?.title;
  const ep = item.episode ?? {};
  const season = ep.seasonNumber ?? item.seasonNumber;
  const number = ep.episodeNumber;
  if (show && season !== undefined && number !== undefined) return `${show} · S${pad2(season)}E${pad2(number)}`;
  return show ? `${show} · ${item.title ?? '?'}` : item.title ?? '?';
}

export default {
  async fetch(ctx) {
    const [wanted, queue, series] = await Promise.all([
      get(ctx, 'wanted/missing?pageSize=1'),
      get(ctx, 'queue?pageSize=1'),
      get(ctx, 'series'),
    ]);
    const result = {
      blocks: [
        { key: 'wanted', label: 'wanted', value: wanted.totalRecords ?? 0 },
        { key: 'queued', label: 'queued', value: queue.totalRecords ?? 0 },
        { key: 'series', label: 'series', value: series.length },
      ],
    };
    if (ctx.options.enableQueue) {
      const details = await get(ctx, 'queue/details?includeEpisode=true');
      const titles = new Map(series.map((s) => [s.id, s.title]));
      const rank = { error: 0, warn: 1 };
      const rows = details.map((item, i) => {
        const state = queueState(item);
        const status = queueStatus(item, state);
        const left = parseTimeleft(item.timeleft);
        const progress = item.size > 0 ? Math.round(Math.max(0, Math.min(100, (1 - item.sizeleft / item.size) * 100))) : undefined;
        return {
          i,
          row: {
            label: episodeLabel(item, titles),
            value: state === 'downloading' && left > 0 ? clock(left) : state,
            ...(status ? { status } : {}),
            ...(progress === undefined || status ? {} : { progress }),
          },
        };
      });
      rows.sort((a, b) => (rank[a.row.status] ?? 2) - (rank[b.row.status] ?? 2) || a.i - b.i);
      const limit = ctx.options.queueLimit;
      result.rows = rows.slice(0, limit).map((r) => r.row);
      if (rows.length > limit) result.rows.push({ label: 'moreItems', vars: { count: rows.length - limit } });
    }
    return result;
  },
};
