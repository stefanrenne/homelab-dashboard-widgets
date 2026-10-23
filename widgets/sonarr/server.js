// Sonarr (API v3): wanted and queued episodes, number of series, and the queue.

const api = (ctx, path) => `${ctx.options.url.replace(/\/+$/, '')}/api/v3/${path}`;

async function get(ctx, path) {
  const res = await ctx.fetch(api(ctx, path), { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Sonarr ${path.split('?')[0]} answered ${res.status}`);
  return res.json();
}

export function queueState(item) {
  const state = item.trackedDownloadState && item.trackedDownloadState !== 'downloading' ? item.trackedDownloadState : item.status;
  return String(state ?? 'unknown').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
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
      result.rows = details.map((item) => {
        const show = titles.get(item.seriesId);
        const pct = item.size > 0 ? Math.round(Math.max(0, Math.min(100, (1 - item.sizeleft / item.size) * 100))) : undefined;
        return {
          label: show ? `${show}: ${item.title}` : item.title ?? '?',
          value: `${queueState(item)} - ${item.timeleft ?? '00:00:00'}`,
          ...(pct === undefined ? {} : { progress: pct }),
        };
      });
    }
    return result;
  },
};
