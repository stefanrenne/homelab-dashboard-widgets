// xTeVe: POST /api/ with { cmd: "status" }; with authentication on, first { cmd: "login" } for a
// token.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/`;
    const post = async (body) => {
      const res = await ctx.fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`xTeVe answered ${res.status}`);
      return res.json();
    };
    const cmd = { cmd: 'status' };
    if (username && password) {
      const login = await post({ cmd: 'login', username, password });
      if (login?.status !== true || !login.token) throw new Error('xTeVe login answered 401');
      cmd.token = login.token;
    }
    const s = await post(cmd);
    return {
      blocks: [
        { key: 'streams_all', label: 'streams_all', value: s['streams.all'] ?? 0 },
        { key: 'streams_active', label: 'streams_active', value: s['streams.active'] ?? 0 },
        { key: 'streams_xepg', label: 'streams_xepg', value: s['streams.xepg'] ?? 0 },
      ],
    };
  },
};
