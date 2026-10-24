// Prometheus Metric: GET /api/v1/query?query=<PromQL> per metric (at most four), the first
// result of a vector or a scalar. The format follows homepage's: scale (a number or "1/16"),
// type, prefix and suffix. Units are decimal and times are spans, as in every widget of this
// collection, so bbytes and bibyterate show decimal units too.

const UNITS = ['', 'k', 'M', 'G', 'T', 'P'];
const decimal = (n, unit) => {
  let v = Math.abs(n);
  let i = 0;
  while (v >= 1000 && i < UNITS.length - 1) { v /= 1000; i++; }
  return `${n < 0 ? '-' : ''}${i === 0 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10} ${UNITS[i]}${unit}`;
};
/** Seconds as "2d 3h", "3h 5m", "5m" or "12s". */
const span = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`;
};
const pad = (n) => String(n).padStart(2, '0');

/** A raw query value with a homepage `format`. */
export function formatValue(raw, format) {
  if (!format) return raw ?? null;
  if (raw === undefined || raw === null || raw === '') return null;
  let v = Number(raw);
  if (typeof format.scale === 'number') v *= format.scale;
  else if (typeof format.scale === 'string' && format.scale.includes('/')) {
    const [a, b] = format.scale.split('/');
    v = (v * (a ? parseFloat(a) : 1)) / (b ? parseFloat(b) : 1);
  }
  const digits = format.options?.maximumFractionDigits;
  const round = (n) => (Number.isInteger(digits) ? Number(n.toFixed(Math.min(20, Math.max(0, digits)))) : Math.round(n * 100) / 100);
  let out;
  switch (format.type) {
    case 'number': out = String(round(v)); break;
    case 'percent': out = `${round(v)}%`; break;
    case 'bytes': case 'bbytes': out = decimal(v, 'B'); break;
    case 'bits': case 'bbits': out = decimal(v, 'bit'); break;
    case 'byterate': case 'bibyterate': out = `${decimal(v, 'B')}/s`; break;
    case 'bitrate': case 'bibitrate': out = `${decimal(v, 'bit')}/s`; break;
    case 'duration': out = span(v); break;
    case 'relativeDate': out = span(Math.abs(Date.now() / 1000 - v / 1000)); break; // homepage's relativeDate takes milliseconds
    case 'date': {
      const d = new Date(v);
      out = Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : null;
      break;
    }
    default: out = String(raw);
  }
  if (out === null) return null;
  return `${format.prefix ?? ''}${out}${format.suffix ?? ''}`;
}

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const metrics = (Array.isArray(ctx.options.metrics) ? ctx.options.metrics : []).slice(0, 4);
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1/query`;
    const blocks = await Promise.all(metrics.map(async (m, i) => {
      if (!m?.query) throw new Error(`metrics[${i}]: a query is needed`);
      const res = await ctx.fetch(`${url}?${new URLSearchParams({ query: String(m.query) })}`, { headers });
      if (!res.ok) throw new Error(`Prometheus answered ${res.status} for metrics[${i}]`);
      const d = (await res.json()).data ?? {};
      const raw = d.resultType === 'vector' ? d.result?.[0]?.value?.[1] : d.resultType === 'scalar' ? d.result?.[1] : undefined;
      const label = String(m.label ?? m.query);
      return { key: String(m.key ?? label), label, value: formatValue(raw, m.format) };
    }));
    return { blocks };
  },
};
