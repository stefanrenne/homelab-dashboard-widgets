// SWAG Dashboard (a linuxserver docker mod): GET /?stats=true. Outdated configs and banned IPs
// are marked.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/?stats=true`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`SWAG Dashboard answered ${res.status}`);
    const s = await res.json();
    const n = (k) => Number(s[k]) || 0;
    return {
      blocks: [
        { key: 'proxied', label: 'proxied', value: n('proxied') },
        { key: 'auth', label: 'auth', value: n('auth') },
        { key: 'outdated', label: 'outdated', value: n('outdated'), ...(n('outdated') ? { status: 'warn' } : {}) },
        { key: 'banned', label: 'banned', value: n('banned') },
      ],
    };
  },
};
