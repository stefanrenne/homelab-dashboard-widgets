// OpenDTU: GET /api/livedata/status (Basic authentication when the live data are protected).
// The units come from OpenDTU (W, Wh). The relative power is the power of the inverters' summed
// absolute limits.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/livedata/status`, { headers });
    if (!res.ok) throw new Error(`OpenDTU answered ${res.status}`);
    const d = await res.json();
    const power = Number(d.total?.Power?.v) || 0;
    const limit = (d.inverters ?? []).reduce((s, i) => s + (Number(i.limit_absolute) || 0), 0);
    return {
      blocks: [
        { key: 'yieldDay', label: 'yieldDay', value: Math.round(Number(d.total?.YieldDay?.v) || 0), unit: d.total?.YieldDay?.u ?? 'Wh' },
        { key: 'relativePower', label: 'relativePower', value: limit ? Math.round((power / limit) * 100) : null, unit: '%' },
        { key: 'absolutePower', label: 'absolutePower', value: Math.round(power), unit: d.total?.Power?.u ?? 'W' },
        { key: 'limit', label: 'limit', value: Math.round(limit), unit: 'W' },
      ],
    };
  },
};
