// PeaNUT (a web front end for Network UPS Tools): GET /api/v1/devices/<ups>. NUT's status is a
// list of flags ("OL CHRG"): on battery is marked, low battery as an error, as is a charge
// below 20%. PeaNUT 1 used underscores in the variable names.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const ups = String(ctx.options.key || 'ups');
    if (!/^[\w.-]+$/.test(ups)) throw new Error('key: the UPS name in NUT, e.g. ups');
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/devices/${ups}`, { headers });
    if (!res.ok) throw new Error(`PeaNUT answered ${res.status}`);
    const d = await res.json();
    const v = (dotted) => d[dotted] ?? d[dotted.replace('.', '_')];
    const flags = String(v('ups.status') ?? '').split(/\s+/);
    const state = flags.includes('LB') ? 'low_battery' : flags.includes('OB') ? 'on_battery' : flags.includes('OL') ? 'online' : 'unknown';
    const charge = v('battery.charge');
    const load = v('ups.load');
    const num = (n) => (n === undefined || n === null || n === '' ? null : Number(n));
    return {
      blocks: [
        { key: 'battery_charge', label: 'battery_charge', value: num(charge), unit: '%', ...(num(charge) !== null && num(charge) < 20 ? { status: 'error' } : {}) },
        { key: 'ups_load', label: 'ups_load', value: num(load), unit: '%', ...(num(load) > 80 ? { status: 'warn' } : {}) },
        { key: 'ups_status', label: 'ups_status', value: state, ...(state === 'low_battery' ? { status: 'error' } : state === 'on_battery' ? { status: 'warn' } : {}) },
      ],
    };
  },
};
