// Pulse (Proxmox monitoring): GET /api/resources (version 1: per resource its type and status,
// so the running ones of all) or /api/state/summary (Pulse 6: the counts), with the token in
// X-API-Token. Fewer running than in all is marked.

const ACTIVE = ['online', 'running'];

export default {
  async fetch(ctx) {
    const v2 = Number(ctx.options.version) >= 2;
    const headers = { accept: 'application/json' };
    if (ctx.options.key) headers['x-api-token'] = ctx.options.key;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/${v2 ? 'api/state/summary' : 'api/resources'}`, { headers });
    if (!res.ok) throw new Error(`Pulse answered ${res.status}`);
    const d = await res.json();
    if (v2) {
      return {
        blocks: [
          { key: 'nodes', label: 'nodes', value: d.nodes ?? 0 },
          { key: 'vms', label: 'vms', value: d.vms ?? 0 },
          { key: 'lxcs', label: 'lxcs', value: d.containers ?? 0 },
        ],
      };
    }
    const resources = d.resources ?? [];
    const block = (key, type) => {
      const all = d.stats?.byType?.[type] ?? resources.filter((r) => r.type === type).length;
      const active = resources.filter((r) => r.type === type && ACTIVE.includes(r.status)).length;
      return { key, label: key, value: `${active} / ${all}`, ...(active < all ? { status: 'warn' } : {}) };
    };
    return { blocks: [block('nodes', 'node'), block('vms', 'vm'), block('lxcs', 'container')] };
  },
};
