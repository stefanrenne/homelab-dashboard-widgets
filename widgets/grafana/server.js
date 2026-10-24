// Grafana: /api/admin/stats (dashboards, data sources, alert rules) and the alerts that fire.
// Version 1 asks the legacy /api/alerts first and falls back to Grafana's alertmanager;
// version 2 asks the alertmanager named in `alerts`. Firing alerts are marked.

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/api`;
    const headers = { accept: 'application/json', authorization: `Basic ${Buffer.from(`${o.username}:${o.password ?? ''}`).toString('base64')}` };
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers });
      if (!res.ok) throw new Error(`Grafana ${path} answered ${res.status}`);
      return res.json();
    };
    const stats = await get('admin/stats');
    let firing;
    if (Number(o.version) >= 2) {
      firing = (await get(`alertmanager/${o.alerts === 'alertmanager' ? 'alertmanager' : 'grafana'}/api/v2/alerts`)).length;
    } else {
      const legacy = await get('alerts').catch(() => null);
      firing = Array.isArray(legacy) && legacy.length > 0
        ? legacy.filter((a) => a.state === 'alerting').length
        : (await get('alertmanager/grafana/api/v2/alerts')).length;
    }
    return {
      blocks: [
        { key: 'dashboards', label: 'dashboards', value: stats.dashboards ?? null },
        { key: 'datasources', label: 'datasources', value: stats.datasources ?? null },
        { key: 'totalalerts', label: 'totalalerts', value: stats.alerts ?? null },
        { key: 'alertstriggered', label: 'alertstriggered', value: firing, ...(firing > 0 ? { status: 'warn' } : {}) },
      ],
    };
  },
};
