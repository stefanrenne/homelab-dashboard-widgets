// Tdarr: queue, processed and errored files (transcode + health check) and space saved.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget

export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (Math.abs(n) >= 1000 && i < UNITS.length - 1) {
    n /= 1000;
    i++;
  }
  return `${Math.round(n * 10) / 10} ${UNITS[i]}`;
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
    const errored = n('table3Count') + n('table6Count');
    return {
      blocks: [
        { key: 'queue', label: 'queue', value: n('table1Count') + n('table4Count') },
        { key: 'processed', label: 'processed', value: n('table2Count') + n('table5Count') },
        { key: 'errored', label: 'errored', value: errored, ...(errored > 0 ? { status: 'warn' } : {}) },
        // Tdarr reports the space saved in GB
        { key: 'saved', label: 'saved', value: formatBytes((Number(s.sizeDiff) || 0) * 1e9) },
      ],
    };
  },
};
