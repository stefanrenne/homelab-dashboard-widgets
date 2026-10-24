// UrBackup: its web interface's JSON API (POST /x?a=...). Login as the web interface does: a
// salt for the user, then md5(salt + password), through PBKDF2-SHA256 when the server asks for
// rounds, then md5(rnd + that); the session is kept and made anew when the server refuses it.
// A client is fine when its file backup (and image backup, when it has those) is recent and
// without errors. Failed clients are marked as an error, not recent ones as a warning.

import crypto from 'node:crypto';

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

/** The password as UrBackup's login wants it, from the salt answer. */
export function loginHash(password, { salt, rnd, pbkdf2_rounds: rounds }) {
  let hash = md5(`${salt}${password}`);
  if (Number(rounds) > 0) hash = crypto.pbkdf2Sync(Buffer.from(hash, 'hex'), String(salt), Number(rounds), 32, 'sha256').toString('hex');
  return md5(`${rnd}${hash}`);
}

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/x`;
    const post = async (action, params) => {
      const res = await ctx.fetch(`${url}?a=${action}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', accept: 'application/json' }, body: new URLSearchParams(params).toString() });
      if (!res.ok) throw new Error(`UrBackup ${action} answered ${res.status}`);
      return res.json();
    };
    const login = async () => {
      let r;
      if (username) {
        const salt = await post('salt', { username });
        if (!salt.salt) throw new Error('UrBackup login answered 401 (unknown user)');
        r = await post('login', { username, password: loginHash(password ?? '', salt), ses: salt.ses ?? '' });
      } else {
        r = await post('login', {});
      }
      if (!r.success || !r.session) throw new Error('UrBackup login answered 401');
      ctx.cache.set('ses', r.session);
      return r.session;
    };
    const call = async (action) => {
      let ses = ctx.cache.get('ses') ?? (await login());
      let r = await post(action, { ses });
      if (r.error === 1 || r.error === 2) { // the session is gone
        ses = await login();
        r = await post(action, { ses });
      }
      if (r.error) throw new Error(`UrBackup ${action} answered 401 (error ${r.error})`);
      return r;
    };
    const clients = (await call('status')).status ?? [];
    const usage = (await call('usage')).usage ?? [];
    const since = Date.now() / 1000 - Math.max(1, Number(ctx.options.maxDays) || 3) * 86400;
    let ok = 0;
    let errored = 0;
    let noRecent = 0;
    for (const c of clients) {
      const noImages = c.image_not_supported || c.image_disabled;
      const recent = c.lastbackup > since && (noImages || c.lastbackup_image > since);
      if (!recent) noRecent++;
      else if (c.file_ok && (c.image_ok || noImages)) ok++;
      else errored++;
    }
    return {
      blocks: [
        { key: 'ok', label: 'ok', value: ok },
        { key: 'errored', label: 'errored', value: errored, ...(errored ? { status: 'error' } : {}) },
        { key: 'noRecent', label: 'noRecent', value: noRecent, ...(noRecent ? { status: 'warn' } : {}) },
        { key: 'totalUsed', label: 'totalUsed', value: formatBytes(usage.reduce((s, u) => s + (Number(u.used) || 0), 0)) },
      ],
    };
  },
};
