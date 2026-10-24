// CoinMarketCap: quotes/latest for the symbols or slugs, one row per currency with its price and
// its change over `defaultinterval`. homepage's interval menu is the option here.

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const list = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
    const slugs = list(o.slugs);
    const symbols = list(o.symbols);
    if (slugs.length === 0 && symbols.length === 0) return { rows: [{ label: 'noSymbols' }] };
    const currency = String(o.currency ?? 'USD').toUpperCase();
    const query = new URLSearchParams({ convert: currency, ...(slugs.length ? { slug: slugs.join(',') } : { symbol: symbols.join(',') }) });
    const res = await ctx.fetch(`${String(o.url).replace(/\/+$/, '')}/v1/cryptocurrency/quotes/latest?${query}`, { headers: { accept: 'application/json', 'X-CMC_PRO_API_KEY': o.key } });
    if (!res.ok) throw new Error(`CoinMarketCap answered ${res.status}`);
    const field = `percent_change_${o.defaultinterval ?? '1h'}`;
    const coins = Object.values((await res.json()).data ?? {}).flat();
    return {
      rows: coins.filter((c) => c.quote?.[currency]?.[field] !== null && c.quote?.[currency]).map((c) => {
        const q = c.quote[currency];
        const price = q.price >= 100 ? Math.round(q.price * 100) / 100 : Number(q.price.toPrecision(4));
        const change = Math.round(q[field] * 100) / 100;
        return { label: c.name, value: `${price} ${currency} ${change >= 0 ? '▲' : '▼'} ${change > 0 ? '+' : ''}${change}%` };
      }),
    };
  },
};
