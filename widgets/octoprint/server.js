// OctoPrint: GET /api/printer and /api/job with the key in X-Api-Key. /api/printer answers 409
// while no printer is connected; then the job's state shows. The progress shows while printing.
// An error state is marked.

const STATES = {
  Operational: 'operational', Printing: 'printing', 'Printing from SD': 'printing', Paused: 'paused', Pausing: 'pausing', Resuming: 'resuming',
  Cancelling: 'cancelling', Finishing: 'finishing', Offline: 'offline', Connecting: 'connecting', Error: 'error', 'Offline after error': 'error',
};
const PRINTING = ['printing', 'paused', 'pausing', 'resuming'];
const deg = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : null);

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const headers = { accept: 'application/json', 'x-api-key': ctx.options.key };
    const [printerRes, jobRes] = await Promise.all([ctx.fetch(`${url}/printer`, { headers }), ctx.fetch(`${url}/job`, { headers })]);
    if (!jobRes.ok) throw new Error(`OctoPrint job answered ${jobRes.status}`);
    const job = await jobRes.json();
    if (printerRes.status === 409) {
      const state = STATES[job.state] ?? 'offline';
      return { blocks: [{ key: 'printer_state', label: 'printer_state', value: state, status: state === 'error' ? 'error' : 'warn' }] };
    }
    if (!printerRes.ok) throw new Error(`OctoPrint printer answered ${printerRes.status}`);
    const p = await printerRes.json();
    const text = p.state?.text ?? job.state;
    const state = STATES[text] ?? text ?? null;
    const completion = job.progress?.completion;
    return {
      blocks: [
        { key: 'printer_state', label: 'printer_state', value: state, ...(p.state?.flags?.error || state === 'error' ? { status: 'error' } : {}) },
        { key: 'temp_tool', label: 'temp_tool', value: deg(p.temperature?.tool0?.actual), unit: '°C' },
        { key: 'temp_bed', label: 'temp_bed', value: deg(p.temperature?.bed?.actual), unit: '°C' },
        { key: 'job_completion', label: 'job_completion', value: PRINTING.includes(state) && typeof completion === 'number' ? Math.round(completion * 10) / 10 : null, unit: '%' },
      ],
    };
  },
};
