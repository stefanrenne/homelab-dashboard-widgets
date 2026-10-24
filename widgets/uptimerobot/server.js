// UptimeRobot: POST /v2/getMonitors (form: api_key, format=json, logs=1). A read-only key gives
// every monitor (up and down counted), a monitor-specific key one: its state, how long it is up
// (the last up log), and when and how long it was last down. Times are spans ("2d 3h"); the
// date of the last downtime is YYYY-MM-DD HH:MM. Down is marked.

/** Seconds as "2d 3h", "3h 5m" or "5m". */
export function span(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
const pad = (n) => String(n).padStart(2, '0');
const STATES = { 0: 'paused', 1: 'notyetchecked', 2: 'up', 8: 'seemsdown', 9: 'down' };

export default {
  async fetch(ctx) {
    const base = String(ctx.options.url || 'https://api.uptimerobot.com').replace(/\/+$/, '');
    const res = await ctx.fetch(`${base}/v2/getMonitors`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cache-control': 'no-cache', accept: 'application/json' }, body: new URLSearchParams({ api_key: ctx.options.key, format: 'json', logs: '1' }).toString() });
    if (!res.ok) throw new Error(`UptimeRobot answered ${res.status}`);
    const body = await res.json();
    if (body.stat === 'fail') throw new Error(`UptimeRobot answered 401 (${String(body.error?.message ?? body.error?.type ?? 'failed').slice(0, 60)})`);
    const monitors = body.monitors ?? [];
    if ((body.pagination?.total ?? monitors.length) > 1) {
      const up = monitors.filter((m) => m.status === 2).length;
      const down = (body.pagination?.total ?? monitors.length) - up;
      return { blocks: [{ key: 'sitesUp', label: 'sitesUp', value: up }, { key: 'sitesDown', label: 'sitesDown', value: down, ...(down ? { status: 'warn' } : {}) }] };
    }
    const m = monitors[0];
    if (!m) throw new Error('UptimeRobot has no monitors for this key');
    const logs = Array.isArray(m.logs) ? m.logs : [];
    const lastUp = logs.find((l) => l.type === 2);
    const lastDown = logs.find((l) => l.type === 1);
    const state = STATES[m.status] ?? 'unknown';
    const blocks = [
      { key: 'status', label: 'status', value: state, ...(state === 'down' ? { status: 'error' } : state === 'seemsdown' ? { status: 'warn' } : {}) },
      { key: 'uptime', label: 'uptime', value: state === 'up' ? span(lastUp?.duration) : null },
    ];
    if (lastDown) {
      const d = new Date(lastDown.datetime * 1000);
      blocks.push({ key: 'lastDown', label: 'lastDown', value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` });
      blocks.push({ key: 'downDuration', label: 'downDuration', value: span(lastDown.duration) });
    }
    return { blocks };
  },
};
