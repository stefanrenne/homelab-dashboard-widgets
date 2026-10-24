// pfSense with the pfSense REST API package (pfrest): /api/v1/status/system and interface, or
// /api/v2/status/system and interfaces. Basic authentication with a user, or the API key in
// `headers`. v1 gives memory and disk use as fractions. A WAN that is down is marked, as are
// memory and disk use above 90%.

const high = (n) => (n > 90 ? { status: 'warn' } : {});

export default {
  async fetch(ctx) {
    const { username, password, insecure, wan: wanName } = ctx.options;
    const v2 = Number(ctx.options.version) >= 2;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    for (const [k, v] of Object.entries(ctx.options.headers ?? {})) if (/^[\w-]+$/.test(k)) headers[k.toLowerCase()] = String(v);
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers, insecure });
      if (!res.ok) throw new Error(`pfSense ${path.split('?')[0]} answered ${res.status}`);
      return (await res.json()).data ?? {};
    };
    const [sys, ifaces] = await Promise.all([get(v2 ? 'v2/status/system' : 'v1/status/system'), get(v2 ? 'v2/status/interfaces?limit=0&offset=0' : 'v1/status/interface')]);
    const wan = (Array.isArray(ifaces) ? ifaces : Object.values(ifaces)).find((i) => i.hwif === wanName || i.name === wanName);
    if (!wan) throw new Error(`no pfSense interface "${wanName}"`);
    const pct = (n) => (typeof n === 'number' ? Math.round((v2 ? n : n * 100) * 10) / 10 : null);
    const memory = pct(sys.mem_usage);
    const disk = pct(sys.disk_usage);
    const load = (v2 ? sys.cpu_load_avg : sys.load_avg)?.[0];
    const up = wan.status === 'up';
    return {
      blocks: [
        { key: 'load', label: 'load', value: load ?? null },
        { key: 'memory', label: 'memory', value: memory, unit: '%', ...high(memory) },
        { key: 'temp', label: 'temp', value: typeof sys.temp_c === 'number' ? sys.temp_c : null, unit: '°C' },
        { key: 'wanStatus', label: 'wanStatus', value: up ? 'up' : 'down', ...(up ? {} : { status: 'error' }) },
        { key: 'wanIP', label: 'wanIP', value: wan.ipaddr || null },
        { key: 'disk', label: 'disk', value: disk, unit: '%', ...high(disk) },
      ],
    };
  },
};
