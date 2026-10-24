// Proxmox Backup Server: datastore usage (status/datastore-usage), failed tasks of the last
// 24 hours (nodes/localhost/tasks?errors=1, at most 100 counted, shown as 99+ then, as in
// homepage) and the host's CPU and memory (nodes/localhost/status). Failed tasks are marked.

const pct = (used, total) => (total > 0 ? Math.round((1000 * used) / total) / 10 : null);
const LIMIT = 100;

export default {
  async fetch(ctx) {
    const { url, username, password, datastore, insecure } = ctx.options;
    const base = `${url.replace(/\/+$/, '')}/api2/json`;
    const get = async (path) => {
      const res = await ctx.fetch(`${base}${path}`, { headers: { accept: 'application/json', authorization: `PBSAPIToken=${username}:${password}` }, insecure });
      if (!res.ok) throw new Error(`Proxmox Backup Server ${path.split('?')[0]} answered ${res.status}`);
      return res.json();
    };
    const since = Math.floor(Date.now() / 1000) - 24 * 3600;
    const [stores, tasks, host] = await Promise.all([
      get('/status/datastore-usage'),
      get(`/nodes/localhost/tasks?errors=1&limit=${LIMIT}&since=${since}`),
      get('/nodes/localhost/status'),
    ]);
    const list = (stores.data ?? []).filter((d) => !datastore || d.store === datastore);
    if (datastore && list.length === 0) throw new Error(`Proxmox Backup Server has no datastore "${datastore}"`);
    const used = list.reduce((s, d) => s + (d.used ?? 0), 0);
    const total = list.reduce((s, d) => s + (d.total ?? 0), 0);
    const failed = Number(tasks.total ?? tasks.data?.length ?? 0);
    const memory = host.data?.memory ?? {};
    return {
      blocks: [
        { key: 'datastore_usage', label: 'datastore_usage', value: pct(used, total), unit: '%' },
        { key: 'failed_tasks_24h', label: 'failed_tasks_24h', value: failed >= LIMIT ? '99+' : failed, ...(failed > 0 ? { status: 'warn' } : {}) },
        { key: 'cpu_usage', label: 'cpu', value: typeof host.data?.cpu === 'number' ? Math.round(host.data.cpu * 1000) / 10 : null, unit: '%' },
        { key: 'memory_usage', label: 'memory', value: pct(memory.used ?? 0, memory.total ?? 0), unit: '%' },
      ],
    };
  },
};
