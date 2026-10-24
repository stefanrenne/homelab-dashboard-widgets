// What's up Docker: watched containers and how many have an update available.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/containers`;
    const headers = { accept: 'application/json' };
    if (ctx.options.username) {
      headers.authorization = `Basic ${Buffer.from(`${ctx.options.username}:${ctx.options.password ?? ''}`).toString('base64')}`;
    }
    const res = await ctx.fetch(url, { headers });
    if (!res.ok) throw new Error(`What's up Docker answered ${res.status}`);
    const containers = await res.json();
    return {
      blocks: [
        { key: 'monitoring', label: 'monitoring', value: containers.length },
        (() => {
          const updates = containers.filter((c) => c.updateAvailable).length;
          return { key: 'updates', label: 'updates', value: updates, ...(updates > 0 ? { status: 'warn' } : {}) };
        })(),
      ],
    };
  },
};
