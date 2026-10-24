// Syncthing: system/connections, db/completion (all folders and devices) and system/error,
// with the API key. Errors are marked, and so is a sync that is not complete.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/rest`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', 'X-API-Key': ctx.options.key } });
      if (!res.ok) throw new Error(`Syncthing ${path} answered ${res.status}`);
      return res.json();
    };
    const [connections, completion, errors] = await Promise.all([get('system/connections'), get('db/completion'), get('system/error')]);
    const devices = Object.values(connections.connections ?? {});
    const synced = typeof completion.completion === 'number' ? Math.floor(completion.completion * 10) / 10 : null;
    const errorCount = errors.errors?.length ?? 0;
    return {
      blocks: [
        { key: 'connected', label: 'connected', value: `${devices.filter((d) => d.connected).length} / ${devices.length}` },
        { key: 'synced', label: 'synced', value: synced, unit: '%', ...(synced !== null && synced < 100 ? { status: 'warn' } : {}) },
        { key: 'errors', label: 'errors', value: errorCount, ...(errorCount > 0 ? { status: 'error' } : {}) },
        { key: 'storage', label: 'storage', value: completion.globalBytes === undefined ? null : formatBytes(completion.globalBytes) },
      ],
    };
  },
};
