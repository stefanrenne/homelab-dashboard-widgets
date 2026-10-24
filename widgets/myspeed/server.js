// MySpeed: GET /api/speedtests?limit=1 (the password, when set, in a Password header). Rates
// in Mbit/s as MySpeed measures them. A failed latest test shows its error.

export default {
  async fetch(ctx) {
    const headers = { accept: 'application/json' };
    if (ctx.options.password) headers.password = ctx.options.password;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/speedtests?limit=1`, { headers });
    if (!res.ok) throw new Error(`MySpeed answered ${res.status}`);
    const body = await res.json();
    if (body?.message) throw new Error(`MySpeed answered 401 (${String(body.message).slice(0, 60)})`);
    const t = Array.isArray(body) ? body[0] : null;
    if (t?.error) {
      let msg = t.error;
      try { msg = JSON.parse(t.error).message ?? msg; } catch { /* plain text */ }
      throw new Error(`MySpeed's latest test failed: ${String(msg).slice(0, 80)}`);
    }
    const n = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : null);
    return {
      blocks: [
        { key: 'download', label: 'download', value: t ? n(t.download) : null, unit: 'Mbit/s' },
        { key: 'upload', label: 'upload', value: t ? n(t.upload) : null, unit: 'Mbit/s' },
        { key: 'ping', label: 'ping', value: t ? n(t.ping) : null, unit: 'ms' },
      ],
    };
  },
};
