// Firefly III: GET /api/v1/summary/basic (net worth per currency, as Firefly formats it) and
// /api/v1/available-budgets for this month (spent / available). A budget that is overspent
// is marked.

const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const now = new Date();
    const range = new URLSearchParams({ start: day(new Date(now.getFullYear(), now.getMonth(), 1)), end: day(new Date(now.getFullYear(), now.getMonth() + 1, 0)) });
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/api/v1/${path}?${range}`, { headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Firefly III ${path} answered ${res.status}`);
      return res.json();
    };
    const [summary, budgets] = await Promise.all([get('summary/basic'), get('available-budgets')]);
    const worth = Object.entries(summary ?? {}).filter(([k]) => k.startsWith('net-worth-in')).map(([, v]) => v.value_parsed).filter(Boolean);
    const blocks = [{ key: 'networth', label: 'networth', value: worth.join(' · ') || null }];
    const b = budgets?.data?.[0]?.type === 'available_budgets' ? budgets.data[0].attributes : null;
    if (b) {
      const amount = parseFloat(b.amount) || 0;
      const spent = -(parseFloat(b.spent_in_budgets?.[0]?.sum ?? '0') || 0);
      const money = (n) => `${b.currency_symbol}${Math.round(n)}`; // whole amounts: it must fit a block
      blocks.push({ key: 'budget', label: 'budget', value: `${money(spent)} / ${money(amount)}`, ...(spent > amount ? { status: 'warn' } : {}) });
    } else {
      blocks.push({ key: 'budget', label: 'budget', value: null });
    }
    return { blocks };
  },
};
