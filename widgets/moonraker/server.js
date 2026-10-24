// Moonraker (Klipper): GET /printer/objects/query?print_stats&display_status&webhooks, with an
// API key in X-Api-Key when authorization is on. A printer that is shut down or in error is
// marked, as is a print in error.

const STATES = ['standby', 'printing', 'paused', 'complete', 'cancelled', 'error'];

export default {
  async fetch(ctx) {
    const headers = { accept: 'application/json' };
    if (ctx.options.key) headers['x-api-key'] = ctx.options.key;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/printer/objects/query?print_stats&display_status&webhooks`, { headers });
    if (!res.ok) throw new Error(`Moonraker answered ${res.status}`);
    const s = (await res.json()).result?.status ?? {};
    const printer = s.webhooks?.state ?? 'unknown'; // ready, startup, shutdown, error
    if (printer !== 'ready') {
      return { blocks: [{ key: 'printer_state', label: 'printer_state', value: ['startup', 'shutdown', 'error'].includes(printer) ? printer : 'unknown', status: printer === 'startup' ? 'warn' : 'error' }] };
    }
    const p = s.print_stats ?? {};
    const state = STATES.includes(p.state) ? p.state : 'standby';
    const idle = state === 'standby';
    const progress = Number(s.display_status?.progress);
    return {
      blocks: [
        { key: 'printer_state', label: 'printer_state', value: 'ready' },
        { key: 'layers', label: 'layers', value: idle ? null : `${p.info?.current_layer ?? '–'} / ${p.info?.total_layer ?? '–'}` },
        { key: 'print_progress', label: 'print_progress', value: idle || !Number.isFinite(progress) ? null : Math.round(progress * 100), unit: '%' },
        { key: 'print_status', label: 'print_status', value: state, ...(state === 'error' ? { status: 'error' } : state === 'paused' ? { status: 'warn' } : {}) },
      ],
    };
  },
};
