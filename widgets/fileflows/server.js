// FileFlows: before 26.10 GET /api/status (queue, processing, processed and the processing
// time as text); from 26.10 (`version: 2`) GET /webhook/fenrus with the endpoint's token in
// X-Webhook-Token. Failed files are marked.

export default {
  async fetch(ctx) {
    const v2 = Number(ctx.options.version) === 2;
    const headers = { accept: 'application/json' };
    if (v2 && ctx.options.key) headers['x-webhook-token'] = ctx.options.key;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/${v2 ? 'webhook/fenrus' : 'api/status'}`, { headers });
    if (!res.ok) throw new Error(`FileFlows answered ${res.status}`);
    const s = await res.json();
    if (v2) {
      const failed = Number(s.Failed) || 0;
      return {
        blocks: [
          { key: 'queue', label: 'queue', value: Number(s.Unprocessed) || 0 },
          { key: 'processing', label: 'processing', value: Number(s.Processing) || 0 },
          { key: 'processed', label: 'processed', value: Number(s.Processed) || 0 },
          { key: 'failed', label: 'failed', value: failed, ...(failed ? { status: 'warn' } : {}) },
        ],
      };
    }
    return {
      blocks: [
        { key: 'queue', label: 'queue', value: Number(s.queue) || 0 },
        { key: 'processing', label: 'processing', value: Number(s.processing) || 0 },
        { key: 'processed', label: 'processed', value: Number(s.processed) || 0 },
        { key: 'time', label: 'time', value: s.time || '0:00' },
      ],
    };
  },
};
