// SABnzbd: download rate, number of items in the queue and time left.

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatRate(bytesPerSecond) {
  let n = bytesPerSecond;
  let i = 0;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

export default {
  async fetch(ctx) {
    const url = new URL(`${ctx.options.url.replace(/\/+$/, '')}/api`);
    url.search = new URLSearchParams({ mode: 'queue', output: 'json', apikey: ctx.options.key }).toString();
    const res = await ctx.fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`SABnzbd answered ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`SABnzbd: ${json.error}`);
    const q = json.queue ?? {};
    return {
      blocks: [
        { key: 'rate', label: 'rate', value: formatRate((Number(q.kbpersec) || 0) * 1024) },
        { key: 'queue', label: 'queue', value: Number(q.noofslots) || 0 },
        { key: 'timeleft', label: 'timeleft', value: q.timeleft ?? '0:00:00' },
      ],
    };
  },
};
