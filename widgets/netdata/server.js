// Netdata: GET /api/v1/info, no key. Warnings and criticals are marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/info`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Netdata answered ${res.status}`);
    const a = (await res.json()).alarms ?? {};
    const warnings = Number(a.warning) || 0;
    const criticals = Number(a.critical) || 0;
    return {
      blocks: [
        { key: 'warnings', label: 'warnings', value: warnings, ...(warnings ? { status: 'warn' } : {}) },
        { key: 'criticals', label: 'criticals', value: criticals, ...(criticals ? { status: 'error' } : {}) },
      ],
    };
  },
};
