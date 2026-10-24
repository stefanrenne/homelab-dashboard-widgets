// Wallos: GET /api/subscriptions/get_subscriptions.php (active, by next payment) and
// get_monthly_cost.php for last, this and next month, with the API key in the query. The cost
// is as Wallos formats it (the total of that month, not an average).

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/subscriptions`;
    const get = async (path, params) => {
      const res = await ctx.fetch(`${url}/${path}?${new URLSearchParams({ ...params, api_key: ctx.options.key })}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Wallos answered ${res.status}`);
      const body = await res.json();
      if (body?.success === false) throw new Error(`Wallos answered 401 (${String(body.title ?? body.message ?? 'refused').slice(0, 60)})`);
      return body;
    };
    const now = new Date();
    const month = (offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return { month: String(d.getMonth() + 1), year: String(d.getFullYear()) };
    };
    const [subs, prev, cur, next] = await Promise.all([
      get('get_subscriptions.php', { state: '0', sort: 'next_payment' }),
      get('get_monthly_cost.php', month(-1)),
      get('get_monthly_cost.php', month(0)),
      get('get_monthly_cost.php', month(1)),
    ]);
    const list = subs.subscriptions ?? [];
    return {
      blocks: [
        { key: 'activeSubscriptions', label: 'activeSubscriptions', value: list.length },
        { key: 'nextRenewingSubscription', label: 'nextRenewingSubscription', value: list[0]?.name ?? null },
        { key: 'previousMonthlyCost', label: 'previousMonthlyCost', value: prev.localized_monthly_cost ?? null },
        { key: 'thisMonthlyCost', label: 'thisMonthlyCost', value: cur.localized_monthly_cost ?? null },
        { key: 'nextMonthlyCost', label: 'nextMonthlyCost', value: next.localized_monthly_cost ?? null },
      ],
    };
  },
};
