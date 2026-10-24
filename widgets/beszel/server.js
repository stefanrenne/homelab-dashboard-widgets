// Beszel (on PocketBase): a superuser token (admins/auth-with-password before 0.9,
// collections/_superusers/auth-with-password from 0.9; kept, renewed on a 401 or 403) and the
// systems collection. All systems: how many and how many are up. One system: its status, when it
// last reported, CPU, memory, disk and network. Systems that are down are marked.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
const rate = (mbPerSecond) => {
  let n = (Number(mbPerSecond) || 0) * 1e6;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
};
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const api = `${o.url.replace(/\/+$/, '')}/api`;
    const login = async () => {
      const path = Number(o.version) >= 2 ? 'collections/_superusers/auth-with-password' : 'admins/auth-with-password';
      const res = await ctx.fetch(`${api}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: o.username, password: o.password }) });
      const body = res.ok ? await res.json() : null;
      if (!body?.token) throw new Error(`Beszel login answered ${res.ok ? 401 : res.status}`);
      ctx.cache.set('token', body.token);
    };
    const get = async (retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${api}/collections/systems/records?page=1&perPage=500&sort=%2Bcreated`, { headers: { accept: 'application/json', authorization: ctx.cache.get('token') } });
      if ((res.status === 401 || res.status === 403) && !retried) {
        ctx.cache.delete('token');
        return get(true);
      }
      if (!res.ok) throw new Error(`Beszel systems answered ${res.status}`);
      return res.json();
    };
    const systems = await get();
    const items = systems.items ?? [];
    if (!o.systemId) {
      const up = items.filter((s) => s.status === 'up').length;
      const total = systems.totalItems ?? items.length;
      return { blocks: [
        { key: 'systems', label: 'systems', value: total },
        { key: 'up', label: 'up', value: `${up} / ${total}`, ...(up < total ? { status: 'warn' } : {}) },
      ] };
    }
    const s = items.find((x) => x.id === o.systemId || x.name === o.systemId);
    if (!s) throw new Error(`Beszel has no system "${o.systemId}"`);
    const pct = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : null);
    const updated = Date.parse(String(s.updated).replace(' ', 'T'));
    return { blocks: [
      { key: 'name', label: 'name', value: s.name },
      { key: 'status', label: 'status', value: s.status, ...(s.status === 'down' ? { status: 'error' } : s.status === 'paused' || s.status === 'pending' ? { status: 'warn' } : {}) },
      { key: 'updated', label: 'updated', value: Number.isFinite(updated) ? span(Date.now() - updated) : null },
      { key: 'cpu', label: 'cpu', value: pct(s.info?.cpu), unit: '%' },
      { key: 'memory', label: 'memory', value: pct(s.info?.mp), unit: '%' },
      { key: 'disk', label: 'disk', value: pct(s.info?.dp), unit: '%' },
      { key: 'network', label: 'network', value: s.info?.b === undefined && s.info?.bb === undefined ? null : rate(s.info.b ?? (s.info.bb / 1e6)) },
    ] };
  },
};
