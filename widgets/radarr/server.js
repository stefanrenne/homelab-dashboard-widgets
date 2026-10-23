// Radarr (API v3): wanted, missing, queued and downloaded movies, and the queue.

const api = (ctx, path) => `${ctx.options.url.replace(/\/+$/, '')}/api/v3/${path}`;

async function get(ctx, path) {
  const res = await ctx.fetch(api(ctx, path), { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Radarr ${path.split('?')[0]} answered ${res.status}`);
  return res.json();
}

/** "importBlocked" -> "import blocked"; while downloading, the download status is shown. */
export function queueState(item) {
  const state = item.trackedDownloadState && item.trackedDownloadState !== 'downloading' ? item.trackedDownloadState : item.status;
  return String(state ?? 'unknown').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export function progress(item) {
  return item.size > 0 ? Math.round(Math.max(0, Math.min(100, (1 - item.sizeleft / item.size) * 100))) : undefined;
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
      result.rows = queue.map((item) => ({
        label: item.movie?.title ?? item.title ?? '?',
        value: `${queueState(item)} - ${item.timeleft ?? '00:00:00'}`,
        ...(progress(item) === undefined ? {} : { progress: progress(item) }),
      }));
    }
    return result;
  },
};
