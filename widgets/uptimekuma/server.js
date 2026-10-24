// Uptime Kuma: one status page (it has no full API): /api/status-page/<slug> for an incident and
// /api/status-page/heartbeat/<slug> for the last heartbeat and the 24-hour uptime per monitor.
// Monitors that are down and an incident are marked.

const pad = (n) => String(n).padStart(2, '0');
/** Seconds -> "12:30" or "26:03:04" (hours may pass 24), the one time format of these widgets. */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export default {
  async fetch(ctx) {
    const { url, slug } = ctx.options;
    if (!/^[a-z0-9-]+$/i.test(slug)) throw new Error('slug: letters, digits and dashes, as in the status page address');
    const base = `${url.replace(/\/+$/, '')}/api/status-page`;
    const get = async (path) => {
      const res = await ctx.fetch(`${base}${path}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Uptime Kuma status page answered ${res.status}`);
      return res.json();
    };
    const [page, beats] = await Promise.all([get(`/${slug}`), get(`/heartbeat/${slug}`)]);
    let up = 0;
    let down = 0;
    for (const list of Object.values(beats.heartbeatList ?? {})) {
      if (list.at(-1)?.status === 1) up++;
      else down++;
    }
    const uptimes = Object.values(beats.uptimeList ?? {});
    const uptime = uptimes.length ? Math.round((1000 * uptimes.reduce((a, b) => a + b, 0)) / uptimes.length) / 10 : null;
    const blocks = [
      { key: 'up', label: 'up', value: up },
      { key: 'down', label: 'down', value: down, ...(down > 0 ? { status: 'error' } : {}) },
      { key: 'uptime', label: 'uptime', value: uptime, unit: '%' },
    ];
    if (page.incident?.createdDate) {
      // Uptime Kuma writes UTC without a zone
      const since = Date.parse(`${String(page.incident.createdDate).replace(' ', 'T')}Z`);
      blocks.push({ key: 'incident', label: 'incident', value: Number.isFinite(since) ? clock((Date.now() - since) / 1000) : null, status: 'warn' });
    }
    return { blocks };
  },
};
