// Komodo: POST /read with { type: GetDockerContainersSummary | GetStacksSummary |
// GetServersSummary } and the key and secret in X-API-Key and X-API-Secret. Containers by
// default, stacks with showStacks, or a summary with showSummary. Stopped, down and unhealthy
// are marked.

const warn = (n) => (n > 0 ? { status: 'warn' } : {});

export default {
  async fetch(ctx) {
    const { key, secret, showStacks, showSummary } = ctx.options;
    const read = async (type) => {
      const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/read`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': key, 'x-api-secret': secret },
        body: JSON.stringify({ type, params: {} }),
      });
      if (!res.ok) throw new Error(`Komodo ${type} answered ${res.status}`);
      return res.json();
    };
    if (showSummary) {
      const [servers, stacks, containers] = await Promise.all([read('GetServersSummary'), read('GetStacksSummary'), read('GetDockerContainersSummary')]);
      const of = (running, total) => ({ value: `${running ?? 0} / ${total ?? 0}`, ...((running ?? 0) < (total ?? 0) ? { status: 'warn' } : {}) });
      return {
        blocks: [
          { key: 'servers', label: 'servers', ...of(servers.healthy, servers.total) },
          { key: 'stacks', label: 'stacks', ...of(stacks.running, stacks.total) },
          { key: 'containers', label: 'containers', ...of(containers.running, containers.total) },
        ],
      };
    }
    if (showStacks) {
      const s = await read('GetStacksSummary');
      const down = (s.stopped ?? 0) + (s.down ?? 0);
      return {
        blocks: [
          { key: 'total', label: 'total', value: s.total ?? 0 },
          { key: 'running', label: 'running', value: s.running ?? 0 },
          { key: 'down', label: 'down', value: down, ...warn(down) },
          { key: 'unhealthy', label: 'unhealthy', value: s.unhealthy ?? 0, ...warn(s.unhealthy) },
          { key: 'unknown', label: 'unknown', value: s.unknown ?? 0 },
        ],
      };
    }
    const c = await read('GetDockerContainersSummary');
    return {
      blocks: [
        { key: 'total', label: 'total', value: c.total ?? 0 },
        { key: 'running', label: 'running', value: c.running ?? 0 },
        { key: 'stopped', label: 'stopped', value: c.stopped ?? 0, ...warn(c.stopped) },
        { key: 'unhealthy', label: 'unhealthy', value: c.unhealthy ?? 0, ...warn(c.unhealthy) },
        { key: 'unknown', label: 'unknown', value: c.unknown ?? 0 },
      ],
    };
  },
};
