// Lidarr (API v1): wanted (missing) albums, the queue (marked when it has errors or
// warnings) and the number of artists.

async function get(ctx, path) {
  const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/${path}`, { headers: { 'X-Api-Key': ctx.options.key, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Lidarr ${path.split('?')[0]} answered ${res.status}`);
  return res.json();
}

export default {
  async fetch(ctx) {
    const [wanted, queue, items] = await Promise.all([
      get(ctx, 'wanted/missing?pageSize=1'),
      get(ctx, 'queue/status'),
      get(ctx, 'artist'),
    ]);
    const attention = (queue.errors || queue.warnings) ? { status: queue.errors ? 'error' : 'warn' } : {};
    return {
      blocks: [
        { key: 'wanted', label: 'wanted', value: wanted.totalRecords ?? 0 },
        { key: 'queued', label: 'queued', value: queue.totalCount ?? 0, ...attention },
        { key: 'artists', label: 'artists', value: items.length },
      ],
    };
  },
};
