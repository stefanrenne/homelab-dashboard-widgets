// Argo CD: GET /api/v1/applications, counted by sync status (Synced, OutOfSync) and health
// (Healthy, Progressing, Degraded, Suspended, Missing). Out of sync, degraded and missing
// applications are marked.

const STATES = ['synced', 'outOfSync', 'healthy', 'progressing', 'degraded', 'suspended', 'missing'];
const MARK = { outOfSync: 'warn', degraded: 'error', missing: 'error' };

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/applications`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Argo CD applications answered ${res.status}`);
    const apps = (await res.json()).items ?? [];
    const is = (a, state) => [a.status?.sync?.status, a.status?.health?.status].some((s) => String(s ?? '').toLowerCase() === state.toLowerCase());
    return {
      blocks: [
        { key: 'apps', label: 'apps', value: apps.length },
        ...STATES.map((state) => {
          const n = apps.filter((a) => is(a, state)).length;
          return { key: state, label: state, value: n, ...(n > 0 && MARK[state] ? { status: MARK[state] } : {}) };
        }),
      ],
    };
  },
};
