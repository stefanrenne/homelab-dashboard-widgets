// evcc: GET /api/state (under "result" before 0.207). Powers in kW; a negative grid power is
// what goes back to the grid.

const kw = (w) => (typeof w === 'number' ? Math.round(w / 100) / 10 : null);

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/state`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`evcc answered ${res.status}`);
    const body = await res.json();
    const s = body.result ?? body;
    const grid = s.gridPower ?? s.grid?.power ?? 0;
    const charging = (s.loadpoints ?? []).reduce((sum, lp) => sum + (lp.chargePower ?? 0), 0);
    return {
      blocks: [
        { key: 'pv_power', label: 'pv_power', value: kw(s.pvPower ?? 0), unit: 'kW' },
        { key: 'grid_power', label: 'grid_power', value: kw(grid), unit: 'kW' },
        { key: 'home_power', label: 'home_power', value: kw(s.homePower ?? 0), unit: 'kW' },
        { key: 'charge_power', label: 'charge_power', value: kw(charging), unit: 'kW' },
      ],
    };
  },
};
