// Pangolin's Integration API: GET /v1/org/<org>/sites and /resources with an API key. A resource
// is healthy when one of its targets is (or it has none). Sites offline and unhealthy resources
// and targets are marked. Traffic comes in megabytes per site.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const org = String(ctx.options.org ?? '');
    if (!/^[A-Za-z0-9_-]+$/.test(org)) throw new Error('org: the organization ID from the address');
    const url = `${ctx.options.url.replace(/\/+$/, '')}/v1/org/${org}`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Pangolin ${path.split('?')[0]} answered ${res.status}`);
      return (await res.json()).data ?? {};
    };
    const [s, r] = await Promise.all([get('sites'), get('resources?pageSize=200')]);
    const sites = s.sites ?? [];
    const resources = r.resources ?? [];
    const ok = (t) => t.healthStatus !== 'unhealthy';
    const of = (good, all) => ({ value: `${good} / ${all}`, ...(good < all ? { status: 'warn' } : {}) });
    const healthy = resources.filter((x) => !x.targets?.length || x.targets.some(ok)).length;
    const targets = resources.flatMap((x) => x.targets ?? []);
    const mb = (k) => sites.reduce((sum, x) => sum + (Number(x[k]) || 0), 0) * 1e6;
    return {
      blocks: [
        { key: 'sites', label: 'sites', ...of(sites.filter((x) => x.online).length, sites.length) },
        { key: 'resources', label: 'resources', ...of(healthy, resources.length) },
        { key: 'targets', label: 'targets', ...of(targets.filter(ok).length, targets.length) },
        { key: 'traffic', label: 'traffic', value: formatBytes(mb('megabytesIn') + mb('megabytesOut')) },
        { key: 'in', label: 'in', value: formatBytes(mb('megabytesIn')) },
        { key: 'out', label: 'out', value: formatBytes(mb('megabytesOut')) },
      ],
    };
  },
};
