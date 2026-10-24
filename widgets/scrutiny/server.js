// Scrutiny: /api/summary (devices and their status) and /api/settings (which failures count:
// S.M.A.R.T., Scrutiny's own or both), as homepage. Archived devices are left out; failed
// disks are marked.

// device_status: 0 passed, 1 failed S.M.A.R.T., 2 failed Scrutiny, 3 both; else unknown
const FAILED_BOTH = 3;
const isFailed = (s) => s > 0 && s <= FAILED_BOTH;
const isUnknown = (s) => !(s >= 0 && s <= FAILED_BOTH);

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Scrutiny ${path} answered ${res.status}`);
      return res.json();
    };
    const [summary, settings] = await Promise.all([get('summary'), get('settings')]);
    const devices = Object.values(summary.data?.summary ?? {}).filter((d) => !d.device?.archived);
    // 1 counts S.M.A.R.T. failures, 2 Scrutiny's, 3 either (status_threshold, as homepage reads it)
    const threshold = settings.settings?.metrics?.status_threshold ?? FAILED_BOTH;
    const failed = devices.filter(({ device: { device_status: s } }) => (isFailed(s) && threshold === FAILED_BOTH) || s === threshold || s === FAILED_BOTH).length;
    const unknown = devices.filter((d) => isUnknown(d.device?.device_status)).length;
    return {
      blocks: [
        { key: 'passed', label: 'passed', value: devices.length - failed - unknown },
        { key: 'failed', label: 'failed', value: failed, ...(failed > 0 ? { status: 'error' } : {}) },
        { key: 'unknown', label: 'unknown', value: unknown },
      ],
    };
  },
};
