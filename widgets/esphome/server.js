// ESPHome: the dashboard's /ping, a map of device to true (online), false (offline) or null
// (unknown: a bad config or a name that does not resolve). Offline devices are marked.

export default {
  async fetch(ctx) {
    const { url, username, password, key } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    else if (key) headers.cookie = `authenticated=${key}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/ping`, { headers });
    if (!res.ok) throw new Error(`ESPHome answered ${res.status}`);
    const states = Object.values(await res.json());
    const offline = states.filter((v) => v === false).length;
    const notOnline = states.filter((v) => v !== true).length;
    return {
      blocks: [
        { key: 'online', label: 'online', value: states.filter((v) => v === true).length },
        { key: 'offline', label: 'offline', value: offline, ...(offline > 0 ? { status: 'warn' } : {}) },
        { key: 'offline_alt', label: 'offline_alt', value: notOnline, ...(notOnline > 0 ? { status: 'warn' } : {}) },
        { key: 'unknown', label: 'unknown', value: states.filter((v) => v === null).length },
        { key: 'total', label: 'total', value: states.length },
      ],
    };
  },
};
