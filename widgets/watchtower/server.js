// Watchtower: its Prometheus metrics (/v1/metrics, with WATCHTOWER_HTTP_API_METRICS on) for the
// last run. Failed updates are marked.

/** Prometheus text: the value of each watchtower_* sample by name. */
export function metrics(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const m = /^(watchtower_[a-z_]+)(?:\{[^}]*\})?\s+(\S+)/.exec(line.trim());
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/v1/metrics`, { headers: { authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Watchtower metrics answered ${res.status}`);
    const m = metrics(await res.text());
    const failed = m.watchtower_containers_failed ?? null;
    return {
      blocks: [
        { key: 'containers_scanned', label: 'containers_scanned', value: m.watchtower_containers_scanned ?? null },
        { key: 'containers_updated', label: 'containers_updated', value: m.watchtower_containers_updated ?? null },
        { key: 'containers_failed', label: 'containers_failed', value: failed, ...(failed > 0 ? { status: 'error' } : {}) },
      ],
    };
  },
};
