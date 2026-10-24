// RomM: GET /api/stats (Basic authentication with a user when needed).

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/stats`, { headers });
    if (!res.ok) throw new Error(`RomM answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'platforms', label: 'platforms', value: s.PLATFORMS ?? 0 },
        { key: 'totalRoms', label: 'totalRoms', value: s.ROMS ?? 0 },
        { key: 'saves', label: 'saves', value: s.SAVES ?? 0 },
        { key: 'states', label: 'states', value: s.STATES ?? 0 },
        { key: 'screenshots', label: 'screenshots', value: s.SCREENSHOTS ?? 0 },
        { key: 'totalfilesize', label: 'totalfilesize', value: formatBytes(s.FILESIZE ?? s.TOTAL_FILESIZE_BYTES) },
      ],
    };
  },
};
