// Prometheus: GET /api/v1/targets?state=active. Targets down are marked.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/targets?state=active`, { headers });
    if (!res.ok) throw new Error(`Prometheus answered ${res.status}`);
    const targets = (await res.json()).data?.activeTargets ?? [];
    const down = targets.filter((t) => t.health === 'down').length;
    return {
      blocks: [
        { key: 'targets_up', label: 'targets_up', value: targets.filter((t) => t.health === 'up').length },
        { key: 'targets_down', label: 'targets_down', value: down, ...(down ? { status: 'warn' } : {}) },
        { key: 'targets_total', label: 'targets_total', value: targets.length },
      ],
    };
  },
};
