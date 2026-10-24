// Zabbix 7: trigger.get over JSON-RPC (POST /api_jsonrpc.php) with an API token: the monitored
// triggers in a problem state, counted per priority. Warning and average are marked as warnings,
// high and disaster as errors.

const PRIORITIES = ['unclassified', 'information', 'warning', 'average', 'high', 'disaster'];

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api_jsonrpc.php`, {
      method: 'POST',
      headers: { 'content-type': 'application/json-rpc', accept: 'application/json', authorization: `Bearer ${ctx.options.key}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'trigger.get', params: { output: ['triggerid', 'description', 'priority'], filter: { value: 1 }, sortfield: 'priority', sortorder: 'DESC', monitored: 'true' } }),
    });
    if (!res.ok) throw new Error(`Zabbix answered ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(`Zabbix answered ${/auth|session|token/i.test(`${body.error.message} ${body.error.data}`) ? 401 : 500} (${String(body.error.data ?? body.error.message).slice(0, 80)})`);
    const triggers = body.result ?? [];
    return {
      blocks: PRIORITIES.map((p, i) => {
        const n = triggers.filter((t) => String(t.priority) === String(i)).length;
        const status = n && i >= 4 ? { status: 'error' } : n && i >= 2 ? { status: 'warn' } : {};
        return { key: p, label: p, value: n, ...status };
      }),
    };
  },
};
