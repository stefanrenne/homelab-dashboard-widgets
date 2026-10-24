// Trilium Notes (TriliumNext 0.94+): GET /etapi/metrics?format=json with the ETAPI token as the
// Authorization header.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/etapi/metrics?format=json`, { headers: { accept: 'application/json', authorization: ctx.options.key } });
    if (!res.ok) throw new Error(`Trilium answered ${res.status}`);
    const m = await res.json();
    return {
      blocks: [
        { key: 'version', label: 'version', value: m.version?.app ? `v${m.version.app}` : 'unknown' },
        { key: 'notesCount', label: 'notesCount', value: m.database?.activeNotes ?? 0 },
        { key: 'dbSize', label: 'dbSize', value: formatBytes(m.statistics?.databaseSizeBytes) },
      ],
    };
  },
};
