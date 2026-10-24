// Unmanic: GET /unmanic/api/v2/workers/status and POST /unmanic/api/v2/pending/tasks ({}), no key.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/unmanic/api/v2`;
    const [w, p] = await Promise.all([
      ctx.fetch(`${url}/workers/status`, { headers: { accept: 'application/json' } }),
      ctx.fetch(`${url}/pending/tasks`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}' }),
    ]);
    if (!w.ok) throw new Error(`Unmanic answered ${w.status}`);
    if (!p.ok) throw new Error(`Unmanic answered ${p.status}`);
    const workers = (await w.json()).workers_status ?? [];
    const pending = await p.json();
    return {
      blocks: [
        { key: 'active_workers', label: 'active_workers', value: workers.filter((x) => !x.idle).length },
        { key: 'total_workers', label: 'total_workers', value: workers.length },
        { key: 'records_total', label: 'records_total', value: pending.recordsTotal ?? 0 },
      ],
    };
  },
};
