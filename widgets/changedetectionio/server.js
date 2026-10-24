// changedetection.io: GET /api/v1/watch. Watches that changed and were not viewed yet are
// counted and marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/watch`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
    if (!res.ok) throw new Error(`changedetection.io answered ${res.status}`);
    const watches = Object.values(await res.json());
    const changed = watches.filter((w) => w.last_changed > 0 && !w.viewed).length;
    return {
      blocks: [
        { key: 'diffsDetected', label: 'diffsDetected', value: changed, ...(changed > 0 ? { status: 'warn' } : {}) },
        { key: 'totalObserved', label: 'totalObserved', value: watches.length },
      ],
    };
  },
};
