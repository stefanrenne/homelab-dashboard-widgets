// DeveLanCacheUI: the backend's DownloadStats/GetTotalDownloadStats.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/DownloadStats/GetTotalDownloadStats`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`DeveLanCacheUI answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'cachehitbytes', label: 'cachehitbytes', value: formatBytes(s.totalCacheHitBytes) },
        { key: 'cachemissbytes', label: 'cachemissbytes', value: formatBytes(s.totalCacheMissBytes) },
      ],
    };
  },
};
