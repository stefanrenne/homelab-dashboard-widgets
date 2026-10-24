// Spoolman: GET /api/v1/spool. Per spool (at most four) the share of filament left, labelled
// with the filament's name. Less than 10% left is marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/spool`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Spoolman answered ${res.status}`);
    let spools = await res.json();
    if (!Array.isArray(spools)) spools = [];
    const ids = Array.isArray(ctx.options.spoolIds) ? ctx.options.spoolIds.map(Number) : null;
    if (ids) spools = ids.map((id) => spools.find((s) => s.id === id)).filter(Boolean);
    return {
      blocks: spools.slice(0, 4).map((s) => {
        const left = s.initial_weight ? Math.round((s.remaining_weight / s.initial_weight) * 100) : null;
        return { key: `spool${s.id}`, label: 'spool', vars: { name: s.filament?.name ?? `#${s.id}` }, value: left, unit: '%', ...(left !== null && left < 10 ? { status: 'warn' } : {}) };
      }),
    };
  },
};
