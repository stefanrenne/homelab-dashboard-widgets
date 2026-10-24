// NetAlertX (formerly PiAlert): the device totals, from php/server/devices.php?action=
// getDevicesTotals (version 1) or the backend's /devices/totals (version 2), with the API
// token. The totals are a list: all, connected, favourites, new, down. New devices and down
// alerts are marked.

export default {
  async fetch(ctx) {
    const v2 = Number(ctx.options.version) > 1;
    const headers = { accept: 'application/json' };
    if (ctx.options.key) headers.authorization = `Bearer ${ctx.options.key}`;
    const path = v2 ? 'devices/totals' : 'php/server/devices.php?action=getDevicesTotals';
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/${path}`, { headers });
    if (!res.ok) throw new Error(`NetAlertX answered ${res.status}`);
    const t = await res.json();
    const n = (i) => parseInt(Array.isArray(t) ? t[i] : undefined, 10) || 0;
    const fresh = n(3);
    const down = n(4);
    return {
      blocks: [
        { key: 'total', label: 'total', value: n(0) },
        { key: 'connected', label: 'connected', value: n(1) },
        { key: 'new_devices', label: 'new_devices', value: fresh, ...(fresh ? { status: 'warn' } : {}) },
        { key: 'down_alerts', label: 'down_alerts', value: down, ...(down ? { status: 'error' } : {}) },
      ],
    };
  },
};
