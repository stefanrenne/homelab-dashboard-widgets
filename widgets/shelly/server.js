// Shelly: the firmware version, an available update (marked), and the update itself through the
// widget API's action call. Gen2 and newer speak RPC over HTTP (digest auth as admin, SHA-256);
// Gen1 has /shelly and /ota (basic auth). GET /shelly answers without auth on both and says which.
import crypto from 'node:crypto';

// how often the device is asked to look for new firmware (it also looks by itself, about daily)
export const CHECK_MS = 60 * 60 * 1000;

const hash = (algorithm, s) => crypto.createHash(algorithm === 'MD5' ? 'md5' : 'sha256').update(s).digest('hex');

/** The parameters of a `WWW-Authenticate: Digest ...` header. */
export function parseChallenge(header) {
  if (!/^Digest\s/i.test(header ?? '')) return null;
  const out = {};
  for (const [, k, quoted, bare] of header.slice(7).matchAll(/([a-z]+)=(?:"([^"]*)"|([^,\s]*))/gi)) out[k.toLowerCase()] = quoted ?? bare;
  return out;
}

/** The Authorization header answering a digest challenge (RFC 7616, qop=auth), as Gen2 asks. */
export function digestHeader(challenge, { username, password, method, uri, cnonce = crypto.randomBytes(8).toString('hex'), nc = '00000001' }) {
  const algorithm = (challenge.algorithm ?? 'MD5').toUpperCase() === 'MD5' ? 'MD5' : 'SHA-256';
  const ha1 = hash(algorithm, `${username}:${challenge.realm}:${password}`);
  const ha2 = hash(algorithm, `${method}:${uri}`);
  const response = hash(algorithm, `${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`);
  return `Digest username="${username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", algorithm=${algorithm}, response="${response}", qop=auth, nc=${nc}, cnonce="${cnonce}"`;
}

/** "20230913-112003/v1.14.0-gcb84623" (Gen1, Gen2's fw_id) → "1.14.0"; a plain version stays. */
export function cleanVersion(fw) {
  if (typeof fw !== 'string' || fw === '') return null;
  return fw.split('/').at(-1).replace(/^v/, '').replace(/-g[0-9a-f]+$/, '');
}

/** <0, 0 or >0 as version a is older, the same or newer than b; a pre-release is older than its release. */
export function compareVersions(a, b) {
  const parse = (v) => {
    const [main, pre = ''] = String(v).split(/-(.*)/s);
    return { nums: main.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d) return d;
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre.localeCompare(y.pre, 'en', { numeric: true });
}

function client(ctx) {
  const o = ctx.options;
  const base = o.url.replace(/\/+$/, '');
  /** GET a path; Gen2 answers a digest challenge, Gen1 gets basic auth up front. */
  return async function get(path, { gen = 2 } = {}) {
    const url = `${base}${path}`;
    const headers = { accept: 'application/json' };
    if (gen === 1 && o.password) headers.authorization = `Basic ${Buffer.from(`${o.username ?? 'admin'}:${o.password}`).toString('base64')}`;
    let res = await ctx.fetch(url, { headers });
    const challenge = res.status === 401 && gen >= 2 && o.password ? parseChallenge(res.headers.get('www-authenticate')) : null;
    if (challenge) {
      await res.body?.cancel();
      const uri = new URL(url).pathname + new URL(url).search;
      res = await ctx.fetch(url, { headers: { ...headers, authorization: digestHeader(challenge, { username: 'admin', password: o.password, method: 'GET', uri }) } });
    }
    const name = path.split('?')[0].replace(/^\/(rpc\/)?/, '');
    // the browser never sees the password: say which case a 401 is, for client.js's advice
    if (res.status === 401) throw new Error(`Shelly ${name} answered 401 (${o.password ? 'password refused' : 'no password set'})`);
    if (!res.ok) throw new Error(`Shelly ${name} answered ${res.status}`);
    return res.json();
  };
}

/** The device's state: generation, current version and the update the widget would install. */
export async function deviceState(ctx) {
  const get = client(ctx);
  const beta = ctx.options.beta === true;
  const info = await get('/shelly');
  if (Number(info.gen) >= 2) {
    // Shelly.CheckForUpdate asks the cloud (at most once per CHECK_MS); Sys.GetStatus has what the device knows
    let updates = null;
    const last = ctx.cache?.get('checked') ?? 0;
    if (Date.now() - last >= CHECK_MS) {
      try {
        updates = await get('/rpc/Shelly.CheckForUpdate');
        ctx.cache?.set('checked', Date.now());
      } catch (err) {
        if (/answered 401/.test(err.message)) throw err;
        ctx.log?.warn(`update check failed: ${err.message}`);
      }
    }
    if (!updates) updates = (await get('/rpc/Sys.GetStatus')).available_updates ?? {};
    const stage = updates.stable?.version ? 'stable' : beta && updates.beta?.version ? 'beta' : null;
    return { gen: Number(info.gen), version: cleanVersion(info.ver ?? info.fw_id), stage, available: stage ? updates[stage].version : null, updating: false };
  }
  // Gen1: /ota/check makes the device look now; /ota answers what it found before
  const last = ctx.cache?.get('checked') ?? 0;
  if (Date.now() - last >= CHECK_MS) {
    try {
      await get('/ota/check', { gen: 1 });
      ctx.cache?.set('checked', Date.now());
    } catch (err) {
      if (/answered 401/.test(err.message)) throw err;
      ctx.log?.warn(`update check failed: ${err.message}`);
    }
  }
  const ota = await get('/ota', { gen: 1 });
  const version = cleanVersion(ota.old_version ?? info.fw);
  const betaVersion = cleanVersion(ota.beta_version);
  let stage = null;
  let available = null;
  if (ota.has_update && ota.new_version) [stage, available] = ['stable', cleanVersion(ota.new_version)];
  else if (beta && betaVersion && version && compareVersions(betaVersion, version) > 0) [stage, available] = ['beta', betaVersion];
  return { gen: 1, version, stage, available, updating: ota.status === 'updating' };
}

export default {
  async fetch(ctx) {
    const s = await deviceState(ctx);
    const update = s.updating
      ? { key: 'update', label: 'update', value: 'updating', status: 'warn' }
      : s.available
        ? { key: 'update', label: 'update', value: s.available, status: 'warn' }
        : { key: 'update', label: 'update', value: 'upToDate' };
    return {
      blocks: [{ key: 'firmware', label: 'firmware', value: s.version }, update],
      update: { available: Boolean(s.available) && !s.updating, version: s.available, stage: s.stage },
    };
  },

  async action(ctx) {
    const s = await deviceState(ctx);
    if (s.updating) return { status: 'error', output: '', error: 'the device is already updating' };
    if (!s.available) return { status: 'error', output: '', error: `no firmware update available (running ${s.version})` };
    const get = client(ctx);
    if (s.gen >= 2) await get(`/rpc/Shelly.Update?stage=${s.stage}`);
    else await get(s.stage === 'beta' ? '/ota?beta=true' : '/ota?update=true', { gen: 1 });
    return { status: 'ok', output: `Updating from ${s.version} to ${s.available}; the device restarts when it is done.\n` };
  },
};
