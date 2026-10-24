// Proxmox VE: GET /api2/json/cluster/resources with an API token. VMs and containers (not
// templates) running against all; CPU and memory over the online nodes, or one `node`.

const pct = (used, total) => (total > 0 ? Math.round((1000 * used) / total) / 10 : null);

export default {
  async fetch(ctx) {
    const { url, username, password, node, insecure } = ctx.options;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/api2/json/cluster/resources`, {
      headers: { accept: 'application/json', authorization: `PVEAPIToken=${username}=${password}` },
      insecure,
    });
    if (!res.ok) throw new Error(`Proxmox cluster answered ${res.status}`);
    const all = ((await res.json()).data ?? []).filter((r) => node === undefined || r.node === node);
    const guests = (type) => all.filter((r) => r.type === type && !r.template);
    const running = (list) => `${list.filter((r) => r.status === 'running').length} / ${list.length}`;
    const nodes = all.filter((r) => r.type === 'node' && r.status === 'online');
    const sum = (f) => nodes.reduce((s, n) => s + (Number(f(n)) || 0), 0);
    const online = nodes.length > 0;
    return {
      blocks: [
        { key: 'vms', label: 'vms', value: running(guests('qemu')) },
        { key: 'lxc', label: 'lxc', value: running(guests('lxc')) },
        { key: 'resources.cpu', label: 'cpu', value: online ? pct(sum((n) => n.cpu * n.maxcpu), sum((n) => n.maxcpu)) : null, unit: '%' },
        { key: 'resources.mem', label: 'memory', value: online ? pct(sum((n) => n.mem), sum((n) => n.maxmem)) : null, unit: '%' },
      ],
    };
  },
};
