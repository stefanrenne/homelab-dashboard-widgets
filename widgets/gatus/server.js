// Gatus: GET /api/v1/endpoints/statuses. An endpoint is up when its latest result succeeded;
// the uptime is the share of successful results Gatus keeps. Endpoints down are marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/endpoints/statuses`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Gatus answered ${res.status}`);
    const endpoints = Object.values((await res.json()) ?? {});
    const up = endpoints.filter((e) => e.results?.at(-1)?.success === true).length;
    const down = endpoints.length - up;
    const results = endpoints.flatMap((e) => e.results ?? []);
    return {
      blocks: [
        { key: 'up', label: 'up', value: up },
        { key: 'down', label: 'down', value: down, ...(down ? { status: 'warn' } : {}) },
        { key: 'uptime', label: 'uptime', value: results.length ? Math.round((results.filter((r) => r.success === true).length / results.length) * 1000) / 10 : null, unit: '%' },
      ],
    };
  },
};
