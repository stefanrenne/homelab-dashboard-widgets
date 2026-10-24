// HDHomeRun: GET /lineup.json (channels) and /status.json (a line per tuner; a tuner in use has
// a VctNumber). The tuner fields describe tuner `tuner`; they are empty when it is idle. A weak
// signal (below 50%) is marked.

const weak = (n) => (typeof n === 'number' && n < 50 ? { status: 'warn' } : {});

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HDHomeRun ${path} answered ${res.status}`);
      return res.json();
    };
    const [lineup, status] = await Promise.all([get('lineup.json'), get('status.json')]);
    const tuners = (Array.isArray(status) ? status : []).filter((s) => s.Resource?.startsWith?.('tuner') ?? true);
    const t = tuners[Math.max(0, Math.floor(Number(ctx.options.tuner) || 0))] ?? {};
    const rate = typeof t.NetworkRate === 'number' ? Math.round(t.NetworkRate / 100_000) / 10 : null;
    return {
      blocks: [
        { key: 'channels', label: 'channels', value: (lineup ?? []).length },
        { key: 'hd', label: 'hd', value: (lineup ?? []).filter((c) => c.HD === 1).length },
        { key: 'tunerCount', label: 'tunerCount', value: `${tuners.filter((s) => s.VctNumber != null).length} / ${tuners.length}` },
        { key: 'channelNumber', label: 'channelNumber', value: t.VctNumber ?? null },
        { key: 'channelNetwork', label: 'channelNetwork', value: t.VctName ?? null },
        { key: 'signalStrength', label: 'signalStrength', value: t.SignalStrengthPercent ?? null, unit: '%', ...weak(t.SignalStrengthPercent) },
        { key: 'signalQuality', label: 'signalQuality', value: t.SignalQualityPercent ?? null, unit: '%', ...weak(t.SignalQualityPercent) },
        { key: 'symbolQuality', label: 'symbolQuality', value: t.SymbolQualityPercent ?? null, unit: '%', ...weak(t.SymbolQualityPercent) },
        { key: 'clientIP', label: 'clientIP', value: t.TargetIP ?? null },
        { key: 'networkRate', label: 'networkRate', value: rate, unit: 'Mbit/s' },
      ],
    };
  },
};
