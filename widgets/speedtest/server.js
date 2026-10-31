// Speedtest Tracker: the latest result. Version 1 (/api/speedtest/latest, Mbit/s) also fits
// henrywhitaker3's Speedtest-Tracker; version 2 (/api/v1/results/latest, bytes/s) wants a token.
// Rates in decimal bits per second.

const UNITS = ['bit/s', 'kbit/s', 'Mbit/s', 'Gbit/s'];
export function formatBitrate(bitsPerSecond, decimals = 0) {
  let n = Number(bitsPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  const f = 10 ** Math.max(0, Math.min(3, Math.round(decimals)));
  return `${Math.round(n * f) / f} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const v2 = Number(o.version) >= 2;
    const headers = { accept: 'application/json', ...(o.key ? { authorization: `Bearer ${o.key}` } : {}) };
    const res = await ctx.fetch(`${o.url.replace(/\/+$/, '')}/api/${v2 ? 'v1/results/latest' : 'speedtest/latest'}`, { headers });
    if (!res.ok) throw new Error(`Speedtest Tracker answered ${res.status}`);
    const d = (await res.json()).data;
    if (!d) return { blocks: [{ key: 'download', label: 'download', value: null }, { key: 'upload', label: 'upload', value: null }, { key: 'ping', label: 'ping', value: null }] };
    const bits = (v) => (v2 ? Number(v) * 8 : Number(v) * 1e6);
    const mbits = (v) => (v === null || v === undefined ? null : Math.round(bits(v) / 1e5) / 10);
    return {
      // public, for a service's filter: (filter: widget.download < 100)
      attributes: { download: mbits(d.download), upload: mbits(d.upload) },
      blocks: [
        { key: 'download', label: 'download', value: formatBitrate(bits(d.download), o.bitratePrecision) },
        { key: 'upload', label: 'upload', value: formatBitrate(bits(d.upload), o.bitratePrecision) },
        { key: 'ping', label: 'ping', value: d.ping === null || d.ping === undefined ? null : Math.round(Number(d.ping) * 10) / 10, unit: 'ms' },
      ],
    };
  },
};
