// Syncthing Relay Server: GET /status on its status port. The rate is the hour's average
// (the last of kbps10s1m5m15m30m60m), in kbit/s from the relay.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}
const BITS = ['kbit/s', 'Mbit/s', 'Gbit/s'];
const rate = (kbps) => {
  let n = Number(kbps) || 0;
  let i = 0;
  while (n >= 1000 && i < BITS.length - 1) { n /= 1000; i++; }
  return `${n >= 100 ? Math.round(n) : Math.round(n * 10) / 10} ${BITS[i]}`;
};

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/status`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Syncthing relay answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'numActiveSessions', label: 'numActiveSessions', value: s.numActiveSessions ?? 0 },
        { key: 'numConnections', label: 'numConnections', value: s.numConnections ?? 0 },
        { key: 'dataRelayed', label: 'dataRelayed', value: formatBytes(s.bytesProxied) },
        { key: 'transferRate', label: 'transferRate', value: rate(s.kbps10s1m5m15m30m60m?.[5]) },
      ],
    };
  },
};
