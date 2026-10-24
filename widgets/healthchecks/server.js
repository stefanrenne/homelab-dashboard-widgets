// Healthchecks.io: GET /api/v3/checks/ (all checks of the key's project) or /api/v3/checks/<uuid>
// with X-Api-Key. Last ping is a span ("2d 3h") so it needs no words in code. Down is marked
// as an error, a check in its grace period as a warning.

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const STATES = ['up', 'down', 'grace', 'paused', 'new', 'started'];

export default {
  async fetch(ctx) {
    const { uuid, key } = ctx.options;
    if (uuid && !/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error('uuid: the check\'s UUID');
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v3/checks/${uuid ?? ''}`, { headers: { accept: 'application/json', 'x-api-key': key } });
    if (!res.ok) throw new Error(`Healthchecks answered ${res.status}`);
    const body = await res.json();
    if (uuid) {
      const state = STATES.includes(body.status) ? body.status : 'new';
      const ping = Date.parse(body.last_ping ?? '');
      return {
        blocks: [
          { key: 'status', label: 'status', value: state, ...(state === 'down' ? { status: 'error' } : state === 'grace' ? { status: 'warn' } : {}) },
          { key: 'last_ping', label: 'last_ping', value: Number.isFinite(ping) ? span(Date.now() - ping) : 'never' },
        ],
      };
    }
    const checks = body.checks ?? [];
    const down = checks.filter((c) => c.status === 'down').length;
    return {
      blocks: [
        { key: 'up', label: 'up', value: checks.filter((c) => c.status === 'up').length },
        { key: 'down', label: 'down', value: down, ...(down ? { status: 'error' } : {}) },
      ],
    };
  },
};
