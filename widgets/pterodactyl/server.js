// Pterodactyl: GET /api/application/nodes?include=servers with an application API key.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/application/nodes?include=servers`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Pterodactyl answered ${res.status}`);
    const nodes = (await res.json()).data ?? [];
    return {
      blocks: [
        { key: 'nodes', label: 'nodes', value: nodes.length },
        { key: 'servers', label: 'servers', value: nodes.reduce((s, n) => s + (n.attributes?.relationships?.servers?.data?.length ?? 0), 0) },
      ],
    };
  },
};
