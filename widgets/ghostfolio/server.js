// Ghostfolio: GET /api/v2/portfolio/performance for 1d, 1y and max, and /api/v1/user for the
// base currency, with a bearer token. The percentage field moved in 2.79 and 2.106; all three
// are read. A loss is marked.

const pct = (perf) => {
  const p = perf?.netPerformancePercentageWithCurrencyEffect ?? perf?.grossPerformancePercentage ?? perf?.currentGrossPerformancePercent;
  return typeof p === 'number' ? Math.round(p * 10000) / 100 : null;
};

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/api/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Ghostfolio answered ${res.status}`);
      return res.json();
    };
    const [today, year, max, user] = await Promise.all(['1d', '1y', 'max'].map((r) => get(`v2/portfolio/performance?range=${r}`)).concat(get('v1/user')));
    const block = (key, perf) => {
      const p = pct(perf?.performance);
      return { key, label: key, value: p === null ? null : `${p > 0 ? '+' : ''}${p}%`, ...(p < 0 ? { status: 'warn' } : {}) };
    };
    const worth = today?.performance?.currentNetWorth;
    const currency = user?.settings?.baseCurrency ?? user?.settings?.currency ?? '';
    return {
      blocks: [
        block('gross_percent_today', today),
        block('gross_percent_1y', year),
        block('gross_percent_max', max),
        { key: 'net_worth', label: 'net_worth', value: typeof worth === 'number' ? `${worth.toFixed(2)} ${currency}`.trim() : null },
      ],
    };
  },
};
