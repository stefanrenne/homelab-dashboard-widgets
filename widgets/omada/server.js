// TP-Link Omada controller 4, 5 and 6: GET /api/info (controller version and id), log in (the
// token and session cookie are kept; renewed when the controller refuses them), find the site
// by name, then its overview diagram and alert count. Alerts are marked.

export default {
  async fetch(ctx) {
    const { username, password, site: siteName, insecure } = ctx.options;
    const url = ctx.options.url.replace(/\/+$/, '');
    const call = async (path, init = {}, session) => {
      const headers = { accept: 'application/json', 'content-type': 'application/json', ...(init.headers ?? {}) };
      if (session) Object.assign(headers, { 'csrf-token': session.token, ...(session.cookie ? { cookie: session.cookie } : {}) });
      const res = await ctx.fetch(`${url}${path}`, { ...init, headers, insecure });
      if (!res.ok) throw Object.assign(new Error(`Omada answered ${res.status}`), { status: res.status });
      const body = await res.json();
      if (body.errorCode > 0) throw Object.assign(new Error(`Omada answered 401 (error ${body.errorCode})`), { refused: true });
      return { body, res };
    };
    const info = ctx.cache.get('info') ?? (await call('/api/info')).body.result ?? {};
    ctx.cache.set('info', info);
    const major = parseInt(String(info.controllerVer ?? '').split('.')[0], 10);
    if (![4, 5, 6].includes(major)) throw new Error(`Omada controller ${info.controllerVer ?? '(unknown)'} is not supported; version 4, 5 or 6 is`);
    const base = major === 4 ? '/api/v2' : `/${info.omadacId}/api/v2`;
    const login = async () => {
      const { body, res } = await call(`${base}/login`, { method: 'POST', body: JSON.stringify({ username, password }) });
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).filter(Boolean).join('; ');
      const session = { token: body.result.token, cookie };
      ctx.cache.set('session', session);
      return session;
    };
    const read = async (session) => {
      const q = `token=${encodeURIComponent(session.token)}&currentPage=1&currentPageSize=1000`;
      const sites = (await call(`${base}/sites?${q}`, {}, session)).body.result?.data ?? [];
      const site = sites.find((s) => s.name === siteName);
      if (!site) throw new Error(`no Omada site "${siteName}" (${sites.map((s) => s.name).join(', ') || 'none'})`);
      const id = major > 4 ? site.id : site.key;
      const [overview, alerts] = await Promise.all([
        call(`${base}/sites/${encodeURIComponent(id)}/dashboard/overviewDiagram?${q}`, {}, session),
        call(`${base}/sites/${encodeURIComponent(id)}/alerts/num?${q}`, {}, session),
      ]);
      return { o: overview.body.result ?? {}, alerts: alerts.body.result?.alertNum ?? 0 };
    };
    let data;
    const cached = ctx.cache.get('session');
    try {
      data = await read(cached ?? (await login()));
    } catch (err) {
      if (!cached || !(err.refused || err.status === 401 || err.status === 403)) throw err;
      ctx.cache.delete('session');
      data = await read(await login());
    }
    const { o, alerts } = data;
    return {
      blocks: [
        { key: 'connectedAp', label: 'connectedAp', value: o.connectedApNum ?? 0 },
        { key: 'activeUser', label: 'activeUser', value: o.totalClientNum ?? 0 },
        { key: 'alerts', label: 'alerts', value: alerts, ...(alerts ? { status: 'warn' } : {}) },
        { key: 'connectedGateways', label: 'connectedGateways', value: o.connectedGatewayNum ?? 0 },
        { key: 'connectedSwitches', label: 'connectedSwitches', value: o.connectedSwitchNum ?? 0 },
      ],
    };
  },
};
