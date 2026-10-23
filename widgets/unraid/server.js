// Unraid: CPU, memory, array and cache pools through the Unraid API (GraphQL).
//
// Block keys follow homepage's unraid widget, so `fields: [cpu, memoryPercent,
// pool1UsedPercent]` works the same. Sizes from the API are in KiB.

const QUERY = `{
  metrics { cpu { percentTotal } memory { total available percentTotal } }
  array { state capacity { kilobytes { free used total } } caches { name fsSize fsUsed fsFree } }
  notifications { overview { unread { total } } }
}`;

const UNITS = ['KB', 'MB', 'GB', 'TB', 'PB'];

export function formatKiB(kib) {
  let n = Number(kib) || 0;
  let i = 0;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  return `${Math.round(n * 10) / 10} ${UNITS[i]}`;
}

const pct = (used, total) => (total > 0 ? Math.round((100 * used) / total) : null);
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/graphql`;
    const res = await ctx.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': ctx.options.key },
      body: JSON.stringify({ query: QUERY }),
    });
    if (!res.ok) throw new Error(`Unraid API answered ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`Unraid API: ${json.errors[0].message}`);
    const { metrics = {}, array = {}, notifications = {} } = json.data ?? {};
    const mem = metrics.memory ?? {};
    const cap = array.capacity?.kilobytes ?? {};
    const memUsedBytes = (Number(mem.total) || 0) - (Number(mem.available) || 0);

    const blocks = [
      { key: 'memoryUsed', label: 'memoryUsed', value: formatKiB(memUsedBytes / 1024) },
      { key: 'memoryAvailable', label: 'memoryAvailable', value: formatKiB((Number(mem.available) || 0) / 1024) },
      { key: 'memoryPercent', label: 'memoryPercent', value: mem.percentTotal === undefined ? null : Math.round(mem.percentTotal), unit: '%' },
      { key: 'cpu', label: 'cpu', value: metrics.cpu?.percentTotal === undefined ? null : Math.round(metrics.cpu.percentTotal), unit: '%' },
      { key: 'notifications', label: 'notifications', value: notifications.overview?.unread?.total ?? 0 },
      { key: 'status', label: 'status', value: String(array.state ?? 'unknown').toLowerCase() },
      { key: 'arrayFree', label: 'arrayFree', value: formatKiB(cap.free) },
      { key: 'arrayUsed', label: 'arrayUsed', value: formatKiB(cap.used) },
      { key: 'arrayUsedPercent', label: 'arrayUsedPercent', value: pct(Number(cap.used), Number(cap.total)), unit: '%' },
    ];
    for (const n of [1, 2, 3, 4]) {
      const name = ctx.options[`pool${n}`];
      if (!name) continue;
      const pool = (array.caches ?? []).find((c) => c.name === name);
      if (!pool) {
        ctx.log.warn(`pool "${name}" not found; pools: ${(array.caches ?? []).map((c) => c.name).join(', ')}`);
      }
      blocks.push(
        { key: `pool${n}Free`, label: `${title(name)} Free`, value: pool ? formatKiB(pool.fsFree) : null },
        { key: `pool${n}Used`, label: `${title(name)} Used`, value: pool ? formatKiB(pool.fsUsed) : null },
        { key: `pool${n}UsedPercent`, label: `${title(name)} Used`, value: pool ? pct(Number(pool.fsUsed), Number(pool.fsSize)) : null, unit: '%' },
      );
    }
    return { status: 'up', blocks };
  },
};
