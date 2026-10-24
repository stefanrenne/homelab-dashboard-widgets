// Mailcow: GET /api/v1/get/domain/all with the API key in X-API-Key.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/get/domain/all`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
    if (!res.ok) throw new Error(`Mailcow answered ${res.status}`);
    const domains = await res.json();
    if (!Array.isArray(domains)) throw new Error('Mailcow answered 401 (no domains; check the key and its allowed IPs)');
    const sum = (k) => domains.reduce((s, d) => s + (parseInt(d[k], 10) || 0), 0);
    return {
      blocks: [
        { key: 'domains', label: 'domains', value: domains.length },
        { key: 'mailboxes', label: 'mailboxes', value: sum('mboxes_in_domain') },
        { key: 'mails', label: 'mails', value: sum('msgs_total') },
        { key: 'storage', label: 'storage', value: formatBytes(sum('bytes_total')) },
      ],
    };
  },
};
