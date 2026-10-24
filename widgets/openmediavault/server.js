// OpenMediaVault: its JSON-RPC (POST /rpc.php) with a session cookie from Session.login, renewed
// on a 401. smart.getListBg runs in the background: its output is read with Exec.getOutput until
// it is done. Stopped services and failed disks are marked.

const POLL_MS = 500;
const POLL_TRIES = 14; // stays inside the dashboard's 10-second limit

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/rpc.php`;
    const rpc = async (service, method, params = {}) => {
      const headers = { 'content-type': 'application/json', accept: 'application/json' };
      if (ctx.cache.get('cookie')) headers.cookie = ctx.cache.get('cookie');
      const res = await ctx.fetch(url, { method: 'POST', headers, body: JSON.stringify({ service, method, params }) });
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).filter((c) => !c.endsWith('=deleted')).join('; ');
      if (cookie) ctx.cache.set('cookie', cookie);
      return res;
    };
    const login = async () => {
      ctx.cache.delete('cookie');
      const res = await rpc('session', 'login', { username: o.username, password: o.password });
      const body = res.ok ? await res.json() : null;
      const r = body?.response;
      if (!r || (r.authenticated !== true && r.status !== 'authenticated')) throw new Error(`OpenMediaVault login answered ${res.ok ? 401 : res.status}`);
    };
    const call = async (service, method, params, retried = false) => {
      if (!ctx.cache.get('cookie')) await login();
      const res = await rpc(service, method, params);
      if (res.status === 401 && !retried) {
        await login();
        return call(service, method, params, true);
      }
      if (!res.ok) throw new Error(`OpenMediaVault ${service}.${method} answered ${res.status}`);
      const body = await res.json();
      if (body.error) throw new Error(`OpenMediaVault: ${body.error.message ?? 'error'}`);
      return body.response;
    };
    const [service, method] = o.method.split('.');
    let response = await call(service, method, { start: 0, limit: -1 });
    if (method.endsWith('Bg')) {
      // a background job: response is its output file
      const filename = response;
      let pos = 0;
      let output = '';
      for (let i = 0; ; i++) {
        const out = await call('exec', 'getOutput', { filename, pos });
        output += out.output ?? '';
        pos = out.pos ?? pos;
        if (!out.running && !out.outputPending) break;
        if (i >= POLL_TRIES) throw new Error('OpenMediaVault background job did not finish');
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      response = JSON.parse(output || '[]');
    }
    const list = Array.isArray(response) ? response : response?.data ?? [];
    const count = (f) => list.filter(f).length;
    if (o.method === 'services.getStatus') {
      const stopped = count((s) => !s.running);
      return { blocks: [
        { key: 'running', label: 'running', value: count((s) => s.running) },
        { key: 'stopped', label: 'stopped', value: stopped, ...(stopped > 0 ? { status: 'warn' } : {}) },
        { key: 'total', label: 'total', value: list.length },
      ] };
    }
    if (o.method === 'smart.getListBg') {
      const failed = count((d) => d.monitor && d.overallstatus !== 'GOOD');
      return { blocks: [
        { key: 'passed', label: 'passed', value: count((d) => d.monitor && d.overallstatus === 'GOOD') },
        { key: 'failed', label: 'failed', value: failed, ...(failed > 0 ? { status: 'error' } : {}) },
      ] };
    }
    return { blocks: [
      { key: 'downloading', label: 'downloading', value: count((d) => d.downloading) },
      { key: 'total', label: 'total', value: list.length },
    ] };
  },
};
