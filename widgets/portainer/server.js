// Portainer: container counts of one environment (read-only GET).

export default {
  async fetch(ctx) {
    const base = ctx.options.url.replace(/\/+$/, '');
    const url = `${base}/api/endpoints/${encodeURIComponent(ctx.options.env)}/docker/containers/json?all=1`;
    const res = await ctx.fetch(url, { headers: { 'X-API-Key': ctx.options.key, accept: 'application/json' } });
    if (res.status === 404) throw new Error(`Portainer has no environment ${ctx.options.env}`);
    if (!res.ok) throw new Error(`Portainer answered ${res.status}`);
    const containers = await res.json();
    return {
      blocks: [
        { key: 'running', label: 'running', value: containers.filter((c) => c.State === 'running').length },
        { key: 'stopped', label: 'stopped', value: containers.filter((c) => c.State === 'exited').length },
        { key: 'total', label: 'total', value: containers.length },
      ],
    };
  },
};
