// Sportarr (an *arr for sports): GET /api/wanted/missing (its total), /api/queue and
// /api/leagues with the API key in the query, as Sportarr's API takes it.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path, params = {}) => {
      const res = await ctx.fetch(`${url}/${path}?${new URLSearchParams({ ...params, apikey: ctx.options.key })}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Sportarr ${path} answered ${res.status}`);
      return res.json();
    };
    const [wanted, queue, leagues] = await Promise.all([get('wanted/missing', { page: '1', pageSize: '1' }), get('queue'), get('leagues')]);
    const len = (x) => (Array.isArray(x) ? x.length : Array.isArray(x?.records) ? x.totalRecords ?? x.records.length : 0);
    return {
      blocks: [
        { key: 'wanted', label: 'wanted', value: wanted.totalRecords ?? 0 },
        { key: 'queued', label: 'queued', value: len(queue) },
        { key: 'leagues', label: 'leagues', value: len(leagues) },
      ],
    };
  },
};
