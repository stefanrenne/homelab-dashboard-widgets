// Tdarr: queue, processed and errored files (transcode + health check) and space saved.

export function formatGB(gb) {
  const n = Number(gb) || 0;
  return Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10} TB` : `${Math.round(n * 10) / 10} GB`;
}

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v2/cruddb`;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (ctx.options.key) headers['x-api-key'] = ctx.options.key;
    const body = { data: { collection: 'StatisticsJSONDB', mode: 'getById', docID: 'statistics', obj: {} } };
    const res = await ctx.fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Tdarr answered ${res.status}`);
    const s = await res.json();
    const n = (k) => Number(s[k]) || 0;
    return {
      blocks: [
        { key: 'queue', label: 'queue', value: n('table1Count') + n('table4Count') },
        { key: 'processed', label: 'processed', value: n('table2Count') + n('table5Count') },
        { key: 'errored', label: 'errored', value: n('table3Count') + n('table6Count') },
        { key: 'saved', label: 'saved', value: formatGB(s.sizeDiff) },
      ],
    };
  },
};
