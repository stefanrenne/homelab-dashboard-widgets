// QNAP QTS: logs in through /cgi-bin/authLogin.cgi (the password base64-encoded; the session
// id is kept and renewed when QTS refuses it), then sysinfo (manaRequest.cgi) and disk use
// (chartReq.cgi), both XML. CPU, memory and pool use above 90% are marked.

/** The text of <tag>, CDATA or not, in an XML fragment. */
export function tag(xml, name) {
  const m = new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${name}>`).exec(xml ?? '');
  return m ? (m[1] ?? m[2] ?? '').trim() : undefined;
}
const blocksOf = (xml, name) => xml.match(new RegExp(`<${name}>[\\s\\S]*?</${name}>`, 'g')) ?? [];
const high = (n) => (n > 90 ? { status: 'warn' } : {});

export default {
  async fetch(ctx) {
    const { username, password, volume, insecure } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/cgi-bin`;
    const login = async () => {
      const res = await ctx.fetch(`${url}/authLogin.cgi`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user: username, pwd: Buffer.from(String(password)).toString('base64') }).toString(), insecure });
      if (!res.ok) throw new Error(`QNAP login answered ${res.status}`);
      const sid = tag(await res.text(), 'authSid');
      if (!sid) throw new Error('QNAP login answered 401');
      ctx.cache.set('sid', sid);
      return sid;
    };
    const get = async (path, retried = false) => {
      const sid = ctx.cache.get('sid') ?? (await login());
      const res = await ctx.fetch(`${url}/${path}&sid=${encodeURIComponent(sid)}`, { insecure });
      const xml = res.ok ? await res.text() : '';
      if ((res.status === 404 || res.status === 401 || tag(xml, 'authPassed') === '0') && !retried) {
        ctx.cache.delete('sid');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`QNAP answered ${res.status}`);
      if (tag(xml, 'authPassed') === '0') throw new Error('QNAP answered 401');
      return xml;
    };
    const sys = await get('management/manaRequest.cgi?subfunc=sysinfo&hd=no&multicpu=1');
    const disk = await get('management/chartReq.cgi?chart_func=disk_usage&disk_select=all&include=all');
    const cpu = parseFloat(tag(sys, 'cpu_usage'));
    const total = parseFloat(tag(sys, 'total_memory'));
    const free = parseFloat(tag(sys, 'free_memory'));
    const memory = total ? Math.round(((total - free) / total) * 100) : null;
    const labels = blocksOf(blocksOf(disk, 'volumeList')[0] ?? '', 'volume').map((v) => tag(v, 'volumeLabel'));
    const uses = blocksOf(blocksOf(disk, 'volumeUseList')[0] ?? '', 'volumeUse').map((u) => ({ total: Number(tag(u, 'total_size')) || 0, free: Number(tag(u, 'free_size')) || 0 }));
    let picked = uses;
    if (volume) {
      const i = labels.indexOf(volume);
      if (i < 0 || !uses[i]) throw new Error(`no QNAP volume "${volume}" (${labels.filter(Boolean).join(', ') || 'none'})`);
      picked = [uses[i]];
    }
    const sum = picked.reduce((a, u) => ({ total: a.total + u.total, free: a.free + u.free }), { total: 0, free: 0 });
    const used = sum.total ? Math.round(((sum.total - sum.free) / sum.total) * 100) : null;
    const temp = parseFloat(tag(sys, 'sys_tempc'));
    return {
      blocks: [
        { key: 'cpuUsage', label: 'cpuUsage', value: Number.isFinite(cpu) ? Math.round(cpu) : null, unit: '%', ...high(cpu) },
        { key: 'memUsage', label: 'memUsage', value: memory, unit: '%', ...high(memory) },
        { key: 'systemTempC', label: 'systemTempC', value: Number.isFinite(temp) ? Math.round(temp * 10) / 10 : null, unit: '°C' },
        volume
          ? { key: 'volumeUsage', label: 'volumeUsage', vars: { volume }, value: used, unit: '%', ...high(used) }
          : { key: 'poolUsage', label: 'poolUsage', value: used, unit: '%', ...high(used) },
      ],
    };
  },
};
