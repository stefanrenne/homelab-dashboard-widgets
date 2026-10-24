// authentik: the number of users (core/users, page_size=1) and the events of the last 24
// hours: version 1 sums the per-month graph points (events/events/per_month) newer than a day,
// version 2 asks events/events/volume for one day. Failed logins are marked.

const DAY = 86400_000;

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/api/v3`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${o.key}` } });
      if (!res.ok) throw new Error(`authentik ${path.split('?')[0]} answered ${res.status}`);
      return res.json();
    };
    const users = (await get('core/users/?page_size=1')).pagination?.count ?? null;
    let logins = 0;
    let failed = 0;
    let authorizations = null;
    if (Number(o.version) >= 2) {
      authorizations = 0;
      for (const e of await get('events/events/volume/?actions=login&actions=login_failed&actions=authorize_application&history_days=1')) {
        if (e.action === 'login') logins += e.count ?? 0;
        else if (e.action === 'login_failed') failed += e.count ?? 0;
        else if (e.action === 'authorize_application') authorizations += e.count ?? 0;
      }
    } else {
      const since = Date.now() - DAY;
      const sum = (points) => points.reduce((s, p) => (p.x_cord >= since ? s + (p.y_cord ?? 0) : s), 0);
      [logins, failed] = await Promise.all([
        get('events/events/per_month/?action=login').then(sum),
        get('events/events/per_month/?action=login_failed').then(sum),
      ]);
    }
    const blocks = [
      { key: 'users', label: 'users', value: users },
      { key: 'loginsLast24H', label: 'loginsLast24H', value: logins },
      { key: 'failedLoginsLast24H', label: 'failedLoginsLast24H', value: failed, ...(failed > 0 ? { status: 'warn' } : {}) },
    ];
    if (authorizations !== null) blocks.push({ key: 'authorizationsLast24H', label: 'authorizationsLast24H', value: authorizations });
    return { blocks };
  },
};
