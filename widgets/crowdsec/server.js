// CrowdSec: a watcher login (POST /v1/watchers/login; the token is kept until it expires and
// renewed on a 401), then the alerts of the last 24 hours (own engine only, 500 at most: then
// "500+") and the alerts with an active ban.

const LIMIT = 500;

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const api = `${o.url.replace(/\/+$/, '')}/v1`;
    const login = async () => {
      const res = await ctx.fetch(`${api}/watchers/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ machine_id: o.username, password: o.password, scenarios: [] }) });
      const body = res.ok ? await res.json() : null;
      if (!body?.token) throw new Error(`CrowdSec login answered ${res.ok ? 401 : res.status}`);
      const expires = Date.parse(body.expire);
      ctx.cache.set('token', { token: body.token, until: Number.isFinite(expires) ? expires - 60_000 : Date.now() + 3600_000 });
    };
    const get = async (query, retried = false) => {
      if (!(ctx.cache.get('token')?.until > Date.now())) await login();
      const res = await ctx.fetch(`${api}/alerts?${query}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.cache.get('token').token}` } });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('token');
        return get(query, true);
      }
      if (!res.ok) throw new Error(`CrowdSec alerts answered ${res.status}`);
      return (await res.json()) ?? [];
    };
    const alerts = await get(`limit=${LIMIT}&since=24h&with_decisions=false&include_capi=false`);
    const bans = await get('decision_type=ban&include_capi=false&has_active_decision=1&with_decisions=false');
    return {
      blocks: [
        { key: 'alerts', label: 'alerts', value: alerts.length >= LIMIT ? `${LIMIT}+` : alerts.length, ...(alerts.length > 0 ? { status: 'warn' } : {}) },
        { key: 'bans', label: 'bans', value: bans.length },
      ],
    };
  },
};
