// Pi-hole: today's queries, blocked queries and the blocklist size. Pi-hole 6 through its REST
// API (POST /api/auth for a session when a password is set, then /api/stats/summary); Pi-hole 5
// through /admin/api.php?summaryRaw. The session is kept until it expires and renewed on a 401.

const number = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

async function session(ctx, url, fresh) {
  const cached = ctx.cache.get('session');
  if (!fresh && cached && cached.until > Date.now()) return cached.sid;
  const res = await ctx.fetch(`${url}/api/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ password: ctx.options.key }),
  });
  const body = res.ok ? await res.json() : null;
  if (!body?.session?.valid || !body.session.sid) throw new Error(`Pi-hole login answered ${res.ok ? 401 : res.status}`);
  ctx.cache.set('session', { sid: body.session.sid, until: Date.now() + (body.session.validity ?? 300) * 1000 - 5000 });
  return body.session.sid;
}

async function summary6(ctx, url, retried = false) {
  const headers = { accept: 'application/json' };
  if (ctx.options.key) headers['x-ftl-sid'] = await session(ctx, url, retried);
  const res = await ctx.fetch(`${url}/api/stats/summary`, { headers });
  if (res.status === 401 && ctx.options.key && !retried) return summary6(ctx, url, true);
  if (!res.ok) throw new Error(`Pi-hole summary answered ${res.status}`);
  const s = await res.json();
  return { queries: s.queries?.total, blocked: s.queries?.blocked, percent: s.queries?.percent_blocked, gravity: s.gravity?.domains_being_blocked };
}

async function summary5(ctx, url) {
  const query = new URLSearchParams({ summaryRaw: '', ...(ctx.options.key ? { auth: ctx.options.key } : {}) });
  const res = await ctx.fetch(`${url}/admin/api.php?${query}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Pi-hole summary answered ${res.status}`);
  const s = await res.json();
  // without a valid token Pi-hole 5 answers [] or {} with a 200
  if (Array.isArray(s) || s.dns_queries_today === undefined) throw new Error('Pi-hole summary answered 401');
  return { queries: s.dns_queries_today, blocked: s.ads_blocked_today, percent: s.ads_percentage_today, gravity: s.domains_being_blocked };
}

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '').replace(/\/admin$/, '');
    const s = Number(ctx.options.version) >= 6 ? await summary6(ctx, url) : await summary5(ctx, url);
    const percent = number(s.percent);
    return {
      blocks: [
        { key: 'queries', label: 'queries', value: number(s.queries) },
        { key: 'blocked', label: 'blocked', value: number(s.blocked) },
        { key: 'blocked_percent', label: 'blockedPercent', value: percent === null ? null : Math.round(percent * 10) / 10, unit: '%' },
        { key: 'gravity', label: 'gravity', value: number(s.gravity) },
      ],
    };
  },
};
