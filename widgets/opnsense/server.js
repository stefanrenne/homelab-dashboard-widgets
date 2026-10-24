// OPNsense: GET /api/diagnostics/activity/getActivity (top's header lines: CPU idle, active
// memory) and /api/diagnostics/traffic/interface, with the API key and secret as Basic
// authentication. top writes memory in binary units (1188M); it is shown in decimal units.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

const BINARY = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };

export default {
  async fetch(ctx) {
    const { username, password, insecure } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/diagnostics`;
    const headers = { accept: 'application/json', authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers, insecure });
      if (!res.ok) throw new Error(`OPNsense ${path} answered ${res.status}`);
      return res.json();
    };
    const [activity, traffic] = await Promise.all([get('activity/getActivity'), get('traffic/interface')]);
    const lines = activity.headers ?? [];
    const idle = lines.map((l) => / ([0-9.]+)% idle/.exec(l)?.[1]).find(Boolean);
    const mem = lines.map((l) => /Mem: ([0-9.]+)([KMGT])? Active/.exec(l)).find(Boolean);
    const cpu = idle !== undefined ? Math.round((100 - parseFloat(idle)) * 10) / 10 : null;
    const wan = traffic.interfaces?.[ctx.options.wan || 'wan'];
    return {
      blocks: [
        { key: 'cpu', label: 'cpu', value: cpu, unit: '%', ...(cpu > 90 ? { status: 'warn' } : {}) },
        { key: 'memory', label: 'memory', value: mem ? formatBytes(parseFloat(mem[1]) * (BINARY[mem[2]] ?? 1)) : null },
        { key: 'wanUpload', label: 'wanUpload', value: wan ? formatBytes(wan['bytes transmitted']) : null },
        { key: 'wanDownload', label: 'wanDownload', value: wan ? formatBytes(wan['bytes received']) : null },
      ],
    };
  },
};
