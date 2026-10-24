// Longhorn (https://longhorn.io): storage per node from its API (GET /v1/nodes), summed over
// each node's disks the way the Longhorn dashboard does: used = maximum - available.

export function formatBytes(bytes) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n >= 100 || i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${units[i]}`;
}

const pct = (used, max) => (max > 0 ? Math.round((1000 * used) / max) / 10 : null);

export default {
  async fetch(ctx) {
    const o = { total: true, nodes: true, include: [], labels: true, ...ctx.options };
    const headers = { accept: 'application/json' };
    if (o.username) headers.authorization = `Basic ${Buffer.from(`${o.username}:${o.password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${o.url.replace(/\/+$/, '')}/v1/nodes`, { headers });
    if (!res.ok) throw new Error(`Longhorn answered ${res.status}`);
    const include = Array.isArray(o.include) ? o.include : [];
    const nodes = ((await res.json()).data ?? [])
      .filter((n) => !include.length || include.includes(n.name))
      .map((n) => {
        const disks = Object.values(n.disks ?? {});
        const max = disks.reduce((s, d) => s + (Number(d.storageMaximum) || 0), 0);
        const available = disks.reduce((s, d) => s + (Number(d.storageAvailable) || 0), 0);
        return { name: n.name, max, available, used: max - available };
      });
    const blocks = [];
    const rows = [];
    if (o.total) {
      const max = nodes.reduce((s, n) => s + n.max, 0);
      const available = nodes.reduce((s, n) => s + n.available, 0);
      blocks.push({ key: 'total', label: 'total', value: pct(max - available, max), unit: '%' });
      if (o.expanded) rows.push({ label: 'total', value: `${formatBytes(available)} / ${formatBytes(max)}`, progress: pct(max - available, max) ?? 0 });
    }
    if (o.nodes) {
      nodes.forEach((n, i) => {
        // names are data, so the label is a key with the name (or number) filled in
        const [label, vars] = o.labels ? ['node', { name: n.name }] : ['nodeNumber', { n: i + 1 }];
        const p = pct(n.used, n.max);
        blocks.push({ key: `node${i + 1}`, label, vars, value: p, unit: '%', ...(p !== null && p >= 90 ? { status: 'warn' } : {}) });
        if (o.expanded) rows.push({ label, vars, value: `${formatBytes(n.available)} / ${formatBytes(n.max)}`, progress: p ?? 0 });
      });
    }
    return { blocks, ...(rows.length ? { rows } : {}) };
  },
};
