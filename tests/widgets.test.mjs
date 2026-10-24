// Every widget against its fixture, through the public ctx contract only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { startMock } from '../scripts/mock-homelab.mjs';

const WIDGETS = path.resolve('widgets');
const IDS = fs.readdirSync(WIDGETS).filter((d) => fs.existsSync(path.join(WIDGETS, d, 'widget.yaml'))).sort();
// homepage's languages plus Dutch, as the dashboard
const LANGS = ['en', 'nl', 'fr', 'de', 'es', 'ca', 'he', 'hr', 'hu', 'it', 'nb-NO', 'pt', 'ru', 'sv', 'vi', 'zh-Hans', 'zh-Hant'];

let mock;
before(async () => (mock = await startMock()));
after(() => mock.close());

const silent = { info() {}, warn() {}, error() {} };

// Options a widget cannot do without, for the tests that run every widget.
const REQUIRED = {
  openmeteo: { latitude: 52.37, longitude: 4.89, units: 'metric', cache: 5 },
  openweathermap: { latitude: 52.37, longitude: 4.89, apiKey: 'test-key', units: 'metric', cache: 5 },
  stocks: { watchlist: ['AAPL'], apiKey: 'test-key', color: true, cache: 1 },
  uptimekuma: { slug: 'home' },
};

async function run(id, options = {}, { params } = {}) {
  const { default: widget } = await import(path.join(WIDGETS, id, 'server.js'));
  return widget.fetch({
    apiVersion: 1,
    instanceId: 't',
    params: params ?? {},
    options: { url: `${mock.url}/${id}`, key: 'test-key', ...REQUIRED[id], ...options },
    signal: new AbortController().signal,
    cache: new Map(),
    log: silent,
    fetch: (u, init) => fetch(u, init),
  });
}

const values = (out) => Object.fromEntries(out.blocks.map((b) => [b.key, b.unit && b.value !== null ? `${b.value}${b.unit}` : b.value]));
const lastRequest = (id) => mock.requests.filter((r) => r.widget === id).at(-1);

test('every folder is a valid package: manifest, i18n in all languages, only node: imports', () => {
  // every widget has a row in the README table (rule 5), and every row a widget
  const rows = [...fs.readFileSync('README.md', 'utf8').matchAll(/^\| `([a-z0-9_-]+)` \|/gm)].map((m) => m[1]).sort();
  assert.deepEqual(IDS, rows);
  for (const id of IDS) {
    const m = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    assert.equal(m.id, id);
    assert.equal(m.apiVersion, 1);
    assert.match(m.version, /^\d+\.\d+\.\d+$/);
    for (const [name, def] of Object.entries(m.options)) {
      if (/key|password|token/i.test(name)) assert.equal(def.secret, true, `${id}.${name} must be secret`);
    }
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    const keys = Object.keys(i18n.en).sort();
    for (const lang of LANGS) assert.deepEqual(Object.keys(i18n[lang]).sort(), keys, `${id} ${lang}`);
    const src = fs.readFileSync(path.join(WIDGETS, id, 'server.js'), 'utf8');
    for (const [, spec] of src.matchAll(/^import .* from '([^']+)'/gm)) assert.match(spec, /^node:/, `${id} imports ${spec}`);
  }
});

test('every label, string value and row state has a translation', async () => {
  for (const id of IDS) {
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    const out = await run(id, { env: 1, pool1: 'trunk', enableQueue: true, queueLimit: 2 });
    for (const b of out.blocks ?? []) {
      assert.ok(b.label in i18n.en, `${id}: label ${b.label}`);
      if (typeof b.value === 'string' && /^[a-z]+$/.test(b.value)) assert.ok(b.value in i18n.en, `${id}: value ${b.value}`);
    }
    for (const r of out.rows ?? []) {
      if (/^[a-z][A-Za-z]+$/.test(r.label)) assert.ok(r.label in i18n.en, `${id}: row ${r.label}`);
      if (typeof r.value === 'string' && /^[a-z][A-Za-z]+$/.test(r.value)) assert.ok(r.value in i18n.en, `${id}: state ${r.value}`);
    }
  }
});

// row texts and client.js messages have the full card width
const ROW_TEXTS = new Set(['noLocation', 'locating', 'unknownSymbol', 'moreItems', 'noActiveStreams', 'downloading', 'queued', 'paused', 'completed', 'delay', 'failed', 'failedPending',
  'warning', 'importPending', 'importBlocked', 'importing', 'imported', 'downloadClientUnavailable']);
const BLOCK_LABELS = { radarr: ['wanted', 'missing', 'queued', 'movies'], sonarr: ['wanted', 'queued', 'series'] };

test('block labels fit a narrow block: no abbreviations, words of 12 letters or less, 24 in all', () => {
  for (const id of IDS) {
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    for (const [lang, texts] of Object.entries(i18n)) {
      for (const [key, text] of Object.entries(texts)) {
        const shown = text.replace('{pool}', 'Trunk').replace('{count}', '12');
        assert.ok(!/\w\.(\s|$)/.test(shown), `${id} ${lang} ${key}: abbreviation "${text}"`);
        if (ROW_TEXTS.has(key) && !(BLOCK_LABELS[id] ?? []).includes(key)) continue; // row texts have the full card width
        assert.ok(shown.length <= 24, `${id} ${lang} ${key}: "${text}" is ${shown.length} long`);
        for (const word of shown.split(/[\s-]+/)) assert.ok(word.length <= 12, `${id} ${lang} ${key}: "${word}" is too long`);
      }
    }
  }
});

test('one decimal unit system and one time format in every widget', async () => {
  const sab = await import(path.join(WIDGETS, 'sabnzbd', 'server.js'));
  const tdarr = await import(path.join(WIDGETS, 'tdarr', 'server.js'));
  const unraid = await import(path.join(WIDGETS, 'unraid', 'server.js'));
  const radarr = await import(path.join(WIDGETS, 'radarr', 'server.js'));
  const tautulli = await import(path.join(WIDGETS, 'tautulli', 'server.js'));
  assert.equal(sab.formatRate(1_500_000), '1.5 MB/s');
  assert.equal(tdarr.formatBytes(1_500_000), '1.5 MB');
  assert.equal(unraid.formatBytes(1_500_000), '1.5 MB');
  assert.equal(sab.clock('0:12:30'), '12:30');
  assert.equal(sab.clock('1:02:03'), '1:02:03');
  assert.equal(radarr.clock(radarr.parseTimeleft('00:12:30')), '12:30');
  assert.equal(radarr.clock(radarr.parseTimeleft('1.02:03:04')), '26:03:04');
  assert.equal(tautulli.clock(750_000), '12:30');
});

test('radarr: counts, and a queue that leads with problems and stops at queueLimit', async () => {
  const out = await run('radarr', { enableQueue: true, queueLimit: 5 });
  assert.deepEqual(values(out), { wanted: 8, missing: 13, queued: 7, movies: 62 });
  assert.equal(out.rows.length, 6);
  assert.deepEqual(out.rows[0], { label: 'The Social Reckoning (2026)', value: 'importBlocked', status: 'warn' });
  assert.deepEqual(out.rows[1], { label: 'Movie 1 (2020)', value: '10:30', progress: 88 });
  assert.deepEqual(out.rows.at(-1), { label: 'moreItems', vars: { count: 2 } });
  assert.equal(lastRequest('radarr').headers['x-api-key'], 'test-key');
  const noQueue = await run('radarr');
  assert.equal(noQueue.rows, undefined);
});

test('sonarr: counts and the queue with series names', async () => {
  const out = await run('sonarr', { enableQueue: true, queueLimit: 5 });
  assert.deepEqual(values(out), { wanted: 11, queued: 3, series: 24 });
  assert.deepEqual(out.rows.map((r) => [r.label, r.value]), [
    ['South Park · S29E04', 'importPending'],
    ['MobLand · S02E06', 'importPending'],
    ["Grey's Anatomy · S23E02", 'importPending'],
  ]);
  const short = await run('sonarr', { enableQueue: true, queueLimit: 1 });
  assert.deepEqual(short.rows.at(-1), { label: 'moreItems', vars: { count: 2 } });
});

test('bazarr, prowlarr, sabnzbd, seerr, whatsupdocker, portainer', async () => {
  assert.deepEqual(values(await run('bazarr')), { missingEpisodes: 200, missingMovies: 3 });
  assert.equal(lastRequest('bazarr').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('prowlarr')), { grabs: 37, queries: 44, failGrabs: 0, failQueries: 0 });
  assert.deepEqual(values(await run('sabnzbd')), { rate: '0 B/s', queue: 0, timeleft: '0:00' });
  assert.deepEqual(lastRequest('sabnzbd').query, { mode: 'queue', output: 'json', apikey: 'test-key' });
  assert.deepEqual(values(await run('seerr')), { pending: 0, approved: 11, completed: 0 });
  assert.deepEqual(values(await run('whatsupdocker', { username: 'u', password: 'p' })), { monitoring: 30, updates: 0 });
  assert.equal(lastRequest('whatsupdocker').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.deepEqual(values(await run('portainer', { env: 1 })), { running: 32, stopped: 2, total: 34 }, 'running + stopped = total');
  await assert.rejects(run('portainer', { env: 9 }), /no environment 9/);
});

test('stash: GraphQL stats with the API key header', async () => {
  const out = await run('stash');
  assert.deepEqual(values(out), { scenes: 5518, images: 10230, galleries: 88, performers: 2640, studios: 412, tags: 1418 });
  const req = lastRequest('stash');
  assert.equal(req.headers.apikey, 'test-key');
  assert.match(JSON.parse(req.body).query, /scene_count/);
});

test('tautulli: one row per stream, with episode number and user when asked', async () => {
  const out = await run('tautulli', { showEpisodeNumber: true, enableUser: true });
  assert.deepEqual(out.rows, [{ label: 'Silo: S03 · E09 - Farewell (alice)', icon: 'play', value: '3:54 / 58:00', progress: 7 }]);
  const plain = await run('tautulli');
  assert.equal(plain.rows[0].label, 'Silo - Farewell', 'no symbols in the text; the icon carries the state');
  const { clock } = await import(path.join(WIDGETS, 'tautulli', 'server.js'));
  assert.equal(clock(3723000), '1:02:03');
});

test('tdarr: transcode + health check totals and space saved', async () => {
  assert.deepEqual(values(await run('tdarr')), { queue: 3, processed: 2130, errored: 5, saved: '1.5 TB' });
  assert.equal(JSON.parse(lastRequest('tdarr').body).data.docID, 'statistics');
});

test('unraid: homepage field keys, pools by name', async () => {
  const out = await run('unraid', { pool1: 'trunk', pool2: 'frunk', pool3: 'missing' });
  const v = values(out);
  assert.equal(v.cpu, '2%');
  assert.equal(v.memoryPercent, '22%');
  assert.equal(v.pool1UsedPercent, '35%');
  assert.equal(v.pool2UsedPercent, '41%');
  assert.equal(v.pool3UsedPercent, null);
  assert.equal(v.status, 'started');
  assert.equal(v.arrayUsedPercent, '60%');
  assert.equal(v.memoryUsed, '15.1 GB', 'decimal units');
  const pool = out.blocks.find((b) => b.key === 'pool1UsedPercent');
  assert.deepEqual([pool.label, pool.vars], ['pool', { pool: 'Trunk' }], 'pool names are a variable, the label is translated');
  // one meaning per label: no two blocks share a label (with their vars)
  const labels = out.blocks.map((b) => b.label + JSON.stringify(b.vars ?? {}));
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(out.blocks.find((b) => b.key === 'notifications').status, 'warn', 'unread alerts need attention');
  const manifest = YAML.parse(fs.readFileSync(path.join(WIDGETS, 'unraid', 'widget.yaml'), 'utf8'));
  assert.deepEqual(manifest.defaultFields, ['memoryPercent', 'cpu', 'arrayUsedPercent', 'pool1UsedPercent']);
  assert.equal(lastRequest('unraid').headers['x-api-key'], 'test-key');
  // homepage order of the commonly picked fields: memory, cpu, pools
  const order = out.blocks.map((b) => b.key).filter((k) => ['cpu', 'memoryPercent', 'pool1UsedPercent', 'pool2UsedPercent'].includes(k));
  assert.deepEqual(order, ['memoryPercent', 'cpu', 'pool1UsedPercent', 'pool2UsedPercent']);
});

test('an API error becomes a readable exception without the key', async () => {
  for (const id of ['radarr', 'seerr', 'stash', 'unraid']) {
    await assert.rejects(run(id, { url: `${mock.url}/nothing-here` }), (err) => !err.message.includes('test-key') && /answered 404/.test(err.message), id);
  }
});

test('counts that need you are marked warn', async () => {
  const { default: prowlarr } = await import(path.join(WIDGETS, 'prowlarr', 'server.js'));
  const fake = (json) => ({ options: { url: 'http://x', key: 'k' }, fetch: async () => new Response(JSON.stringify(json)) });
  const out = await prowlarr.fetch(fake({ indexers: [{ numberOfGrabs: 1, numberOfFailedGrabs: 2, numberOfQueries: 3, numberOfFailedQueries: 0 }] }));
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), [null, null, 'warn', null]);
  const { default: wud } = await import(path.join(WIDGETS, 'whatsupdocker', 'server.js'));
  const w = await wud.fetch(fake([{ updateAvailable: true }, { updateAvailable: false }]));
  assert.equal(w.blocks[1].status, 'warn');
  const { default: seerr } = await import(path.join(WIDGETS, 'seerr', 'server.js'));
  assert.equal((await seerr.fetch(fake({ pending: 2 }))).blocks[0].status, 'warn');
  const { default: tdarr } = await import(path.join(WIDGETS, 'tdarr', 'server.js'));
  assert.equal((await tdarr.fetch(fake({ table3Count: 1 }))).blocks[2].status, 'warn');
  const { default: sab } = await import(path.join(WIDGETS, 'sabnzbd', 'server.js'));
  const paused = await sab.fetch(fake({ queue: { status: 'Paused', noofslots: 3, timeleft: '0:00:00' } }));
  assert.deepEqual(paused.blocks[0], { key: 'rate', label: 'rate', value: 'paused', status: 'warn' });
  const stash = YAML.parse(fs.readFileSync(path.join(WIDGETS, 'stash', 'widget.yaml'), 'utf8'));
  assert.deepEqual(stash.defaultFields, ['scenes', 'performers', 'tags']);
});

test('block labels need at most two lines on a phone (375px), estimated per widget', async () => {
  // Measured at 375px: a block in a card with 4 blocks is 65px wide, about 8 bold uppercase
  // characters per line; 3 blocks about 11; 2 blocks about 16. A longer word is hyphenated.
  for (const id of IDS) {
    const out = await run(id, { env: 1, pool1: 'trunk', enableQueue: true });
    const manifest = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    const keys = manifest.defaultFields ?? (out.blocks ?? []).map((b) => b.key);
    const shown = (out.blocks ?? []).filter((b) => keys.includes(b.key));
    if (shown.length === 0) continue;
    const perLine = shown.length >= 4 ? 8 : shown.length === 3 ? 11 : 16;
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    for (const [lang, texts] of Object.entries(i18n)) {
      for (const b of shown) {
        const text = (texts[b.label] ?? b.label).replace('{pool}', 'Trunk');
        // fill lines word by word; a word longer than a line is hyphenated over several
        let lines = 0;
        let used = perLine;
        for (const word of text.split(/\s+/)) {
          if (used + 1 + word.length <= perLine) used += 1 + word.length;
          else {
            lines += Math.ceil(word.length / perLine);
            used = word.length % perLine || perLine;
          }
        }
        assert.ok(lines <= 2, `${id} ${lang}: "${text}" needs ${lines} lines in a block of ${perLine} characters`);
      }
    }
  }
});

test('unraid: a server without array disks (pools only) gets no array blocks', async () => {
  const { default: unraid } = await import(path.join(WIDGETS, 'unraid', 'server.js'));
  const live = JSON.parse(fs.readFileSync(path.resolve('fixtures/unraid.json'), 'utf8')).routes['POST /graphql'];
  live.data.array.capacity.kilobytes = { free: '0', used: '0', total: '0' }; // as a live ZFS-only server answers
  const out = await unraid.fetch({ options: { url: 'http://x', key: 'k', pool1: 'trunk' }, log: { warn() {} }, fetch: async () => new Response(JSON.stringify(live)) });
  const keys = out.blocks.map((b) => b.key);
  assert.equal(keys.some((k) => k.startsWith('array')), false);
  assert.ok(keys.includes('pool1UsedPercent'));
});

test('every widget has a README for its docs page: title, every field, an example', async () => {
  for (const id of IDS) {
    const m = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    const readme = fs.readFileSync(path.join(WIDGETS, id, 'README.md'), 'utf8');
    assert.equal(readme.split('\n')[0], `# ${m.name}`, `${id}: the title is the manifest name`);
    // a service widget (type: <id>) or a header widget in widgets.yaml (- <id>:)
    assert.match(readme.split(/^## Example$/m)[1] ?? '', new RegExp(`type: ${id}\\b|^- ${id}:`, 'm'), `${id}: an example that uses it`);
    const fields = new Set([...(readme.split(/^## Fields$/m)[1]?.split(/^## /m)[0] ?? '').matchAll(/`([A-Za-z0-9_.]+)`/g)].map((x) => x[1]));
    const out = await run(id, { env: 1, pool1: 'trunk', enableQueue: true, queueLimit: 2 });
    for (const b of out.blocks ?? []) assert.ok(fields.has(b.key ?? b.label), `${id}: field ${b.key ?? b.label} missing from README`);
  }
});


test('glances: CPU, memory, the hottest CPU sensor, uptime and disks; version 4; basic auth', async () => {
  const out = await run('glances', { cputemp: true, uptime: true, disk: ['/', '/mnt/data'], expanded: true, username: 'g', password: 'p' });
  assert.deepEqual(values(out), {
    cpu: '23.4%', memory: '62.5%', memoryUsed: '10 GB', memoryTotal: '16 GB', cputemp: '51°C', uptime: '12d 4h',
    '/': '40%', '/Free': '300 GB', '/mnt/data': '75%', '/mnt/dataFree': '1 TB',
  });
  assert.equal(lastRequest('glances').headers.authorization, `Basic ${Buffer.from('g:p').toString('base64')}`);
  assert.deepEqual(values(await run('glances', { version: 4 })), { cpu: '11%', memory: '50%' });
  assert.equal(values(await run('glances', { cpu: false, mem: false, cputemp: true, unit: 'imperial', cpuSensorLabel: 'acpitz' })).cputemp, '123.8°F');
  assert.deepEqual(values(await run('glances', { cpu: false, mem: false, disk: ['/'], diskUnits: 'bbytes', expanded: true })), { disk: '40%', diskFree: '279 GiB' });
});


test('longhorn: total and per node over their disks, include, numbered labels and expanded rows', async () => {
  const out = await run('longhorn', { expanded: true, username: 'admin', password: 'pw' });
  assert.deepEqual(values(out), { total: '38.7%', node1: '40%', node2: '92%', node3: '25%' });
  assert.deepEqual(out.blocks[1].vars, { name: 'node-a' });
  assert.equal(out.blocks.find((b) => b.key === 'node2').status, 'warn');
  assert.deepEqual(out.rows.map((r) => [r.vars?.name ?? r.label, r.value, r.progress]), [
    ['total', '1.8 TB / 3 TB', 38.7], ['node-a', '300 GB / 500 GB', 40], ['node-b', '40 GB / 500 GB', 92], ['node-c', '1.5 TB / 2 TB', 25],
  ]);
  assert.equal(lastRequest('longhorn').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
  const some = await run('longhorn', { include: ['node-c'], total: false, labels: false });
  assert.deepEqual(some.blocks, [{ key: 'node1', label: 'nodeNumber', vars: { n: 1 }, value: 25, unit: '%' }]);
});


test('unifi: health with an API key, a site by its description, a subsystem that is down', async () => {
  const out = await run('unifi', { key: 'k3y' });
  assert.deepEqual(values(out), {
    uptime: '13d 0h', wan: 'up', lan: 'up', lan_users: 25, lan_devices: 4, wlan: 'up', wlan_users: 20, wlan_devices: 3,
  });
  assert.equal(lastRequest('unifi').headers['x-api-key'], 'k3y');
  const office = await run('unifi', { key: 'k3y', site: 'Office' });
  assert.deepEqual(office.blocks.map((b) => [b.key, b.value, b.status ?? null]), [
    ['uptime', null, null], ['lan', 'down', 'error'], ['lan_users', 0, null], ['lan_devices', 1, null],
  ]);
  await assert.rejects(run('unifi', { key: 'k3y', site: 'Nowhere' }), /UniFi has no site "Nowhere"/);
  await assert.rejects(run('unifi', { key: '' }), /UniFi needs key, or username and password/);
});

test('unifi: login on UniFi OS (cookie and CSRF token) or a classic controller, again after a 401', async () => {
  const { default: unifi } = await import(path.join(WIDGETS, 'unifi', 'server.js'));
  const http = await import('node:http');
  const seen = [];
  let classic = false;
  let expire = false;
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push(`${req.method} ${req.url} ${req.headers.cookie ?? ''} ${req.headers['x-csrf-token'] ?? ''}`.trim());
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/auth/login' && !classic) {
        assert.deepEqual(JSON.parse(body), { username: 'ro', password: 'pw' });
        res.setHeader('set-cookie', ['TOKEN=t1; Path=/; HttpOnly']);
        res.setHeader('x-csrf-token', 'c1');
        return res.end('{}');
      }
      if (req.url === '/api/auth/login') { res.statusCode = 404; return res.end('{}'); }
      if (req.url === '/api/login') { res.setHeader('set-cookie', ['unifises=s1; Path=/', 'csrf_token=x; Path=/']); return res.end('{}'); }
      const ok = classic ? req.url === '/api/s/default/stat/health' && req.headers.cookie === 'unifises=s1; csrf_token=x'
        : req.url === '/proxy/network/api/s/default/stat/health' && req.headers.cookie === 'TOKEN=t1' && req.headers['x-csrf-token'] === 'c1';
      if (!ok || expire) { expire = false; res.statusCode = 401; return res.end('{}'); }
      res.end(JSON.stringify({ data: [{ subsystem: 'wan', status: 'ok', 'gw_system-stats': { uptime: '7200' } }] }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const ctx = { options: { url, username: 'ro', password: 'pw' }, cache: new Map(), log: silent, signal: new AbortController().signal, fetch: (u, i) => fetch(u, i) };
  try {
    assert.deepEqual(values(await unifi.fetch(ctx)), { uptime: '2h 0m', wan: 'up' });
    await unifi.fetch(ctx);
    assert.equal(seen.filter((r) => r.startsWith('POST')).length, 1, 'the session is kept');
    expire = true;
    assert.deepEqual(values(await unifi.fetch(ctx)), { uptime: '2h 0m', wan: 'up' });
    assert.equal(seen.filter((r) => r.startsWith('POST')).length, 2, 'logged in again after a 401');

    classic = true;
    const old = { ...ctx, cache: new Map() };
    assert.deepEqual(values(await unifi.fetch(old)), { uptime: '2h 0m', wan: 'up' });
    assert.ok(seen.includes('POST /api/login'));
  } finally {
    srv.close();
  }
});


/** A widget's client.js in jsdom, as the dashboard mounts it. */
async function renderClient(id, options = {}) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.eval(fs.readFileSync(path.join(WIDGETS, id, 'client.js'), 'utf8'));
  const el = dom.window.document.createElement(`hd-${id}`);
  Object.assign(el, { options, t: (k) => k });
  dom.window.document.body.append(el);
  return { el, window: dom.window };
}

test('openmeteo: the current weather, units, the cache in minutes, and errors', async () => {
  const { condition } = await import(path.join(WIDGETS, 'openmeteo', 'server.js'));
  const cache = new Map();
  const out = await run('openmeteo', { label: 'Amsterdam' });
  assert.deepEqual(out.blocks, [{ key: 'temperature', label: 'temperature', value: 10.3, unit: '°C' }, { key: 'condition', label: 'condition', value: 'drizzle' }]);
  assert.deepEqual(out.weather, { temperature: 10.3, unit: '°C', condition: 'drizzle', day: false, label: 'Amsterdam', format: null });
  assert.deepEqual([lastRequest('openmeteo').query.latitude, lastRequest('openmeteo').query.timezone, lastRequest('openmeteo').query.temperature_unit], ['52.37', 'auto', undefined]);
  await run('openmeteo', { units: 'imperial', timezone: 'Europe/Amsterdam' });
  assert.deepEqual([lastRequest('openmeteo').query.temperature_unit, lastRequest('openmeteo').query.timezone], ['fahrenheit', 'Europe/Amsterdam']);
  const { default: widget } = await import(path.join(WIDGETS, 'openmeteo', 'server.js'));
  const ctx = { options: { url: `${mock.url}/openmeteo`, ...REQUIRED.openmeteo }, params: {}, cache, log: silent, fetch: (u, i) => fetch(u, i) };
  const before = mock.requests.length;
  await widget.fetch(ctx);
  await widget.fetch(ctx);
  assert.equal(mock.requests.length - before, 1, 'within cache minutes no new call');
  await assert.rejects(run('openmeteo', { url: `${mock.url}/nothing` }), /Open-Meteo answered 404/);
  assert.deepEqual([0, 2, 3, 45, 51, 63, 81, 73, 95, 7].map(condition),
    ['clear', 'partlyCloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'showers', 'snow', 'thunderstorm', 'unknown']);
});

test('openmeteo client: an icon, the temperature in the page language, label and condition', async () => {
  const { el, window } = await renderClient('openmeteo');
  window.document.documentElement.lang = 'nl';
  el.t = (k) => ({ drizzle: 'Motregen' })[k] ?? k;
  el.data = { weather: { temperature: 10.35, unit: '°C', condition: 'drizzle', day: false, label: 'Amsterdam', format: null } };
  const root = el.shadowRoot;
  assert.equal(root.querySelector('.temp').textContent, '10,4°C');
  assert.equal(root.querySelector('.cond').textContent, 'Amsterdam · Motregen');
  assert.ok(root.querySelector('svg'));
  assert.equal(root.querySelector('.w').getAttribute('aria-label'), 'Amsterdam, 10,4°C, Motregen');
});

test('weather widgets: no coordinates ask for the viewer\'s location, then use it', async () => {
  for (const id of ['openmeteo', 'openweathermap']) {
    assert.deepEqual(await run(id, { latitude: undefined, longitude: undefined }), { blocks: [], weather: null, needsLocation: true });
    const out = await run(id, { latitude: undefined, longitude: undefined }, { params: { latitude: '51.44', longitude: '5.47' } });
    assert.equal(typeof out.weather.temperature, 'number');
    const q = lastRequest(id).query;
    assert.deepEqual([q.latitude ?? q.lat, q.longitude ?? q.lon], ['51.44', '5.47']);
  }
  const secure = await renderClient('openmeteo');
  Object.defineProperty(secure.window, 'isSecureContext', { value: true });
  Object.defineProperty(secure.window.navigator, 'geolocation', { value: { getCurrentPosition: (ok) => ok({ coords: { latitude: 52.3676, longitude: 4.9041 } }) } });
  const events = [];
  secure.el.addEventListener('hd-widget-params', (e) => events.push(e.detail));
  secure.el.data = { blocks: [], weather: null, needsLocation: true };
  assert.deepEqual({ ...events[0] }, { latitude: '52.37', longitude: '4.90' }, 'rounded to two decimals'); // detail comes from the page's realm
  const plain = await renderClient('openweathermap');
  plain.el.t = (k) => ({ noLocation: 'Set latitude and longitude' })[k] ?? k;
  plain.el.data = { blocks: [], weather: null, needsLocation: true };
  assert.equal(plain.el.shadowRoot.querySelector('.cond').textContent, 'Set latitude and longitude', 'no HTTPS: an explanation');
});

test('openweathermap: the current weather with the key on the server, night icons and errors', async () => {
  const { condition } = await import(path.join(WIDGETS, 'openweathermap', 'server.js'));
  const out = await run('openweathermap', { apiKey: 'k3y', units: 'imperial', label: 'Amsterdam' });
  assert.deepEqual(out.weather, { temperature: 12.6, unit: '°F', condition: 'cloudy', day: false, label: 'Amsterdam', format: null });
  const q = lastRequest('openweathermap').query;
  assert.deepEqual([q.lat, q.lon, q.units, q.appid], ['52.37', '4.89', 'imperial', 'k3y']);
  await assert.rejects(run('openweathermap', { url: `${mock.url}/nothing` }), (err) => /OpenWeatherMap answered 404/.test(err.message) && !err.message.includes('test-key'));
  assert.deepEqual([211, 301, 501, 521, 601, 741, 800, 802, 804, 900].map(condition),
    ['thunderstorm', 'drizzle', 'rain', 'showers', 'snow', 'fog', 'clear', 'partlyCloudy', 'cloudy', 'unknown']);
});

test('stocks: Finnhub quotes for up to eight symbols, unknown ones, the cache and errors', async () => {
  const http = await import('node:http');
  const asked = [];
  let status = 200;
  const srv = http.createServer((req, res) => {
    const q = new URL(req.url, 'http://x').searchParams;
    asked.push([q.get('symbol'), q.get('token')]);
    res.statusCode = status;
    res.end(JSON.stringify({ AAPL: { c: 231.5, dp: 1.234 }, MSFT: { c: 410, dp: -0.5 }, NOPE: { c: 0, dp: null } }[q.get('symbol')] ?? { c: 10, dp: 0 }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const { default: stocks } = await import(path.join(WIDGETS, 'stocks', 'server.js'));
  const ctxFor = (options) => ({ options: { url, color: true, cache: 1, ...options }, params: {}, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const ctx = ctxFor({ watchlist: ['aapl', 'MSFT', 'nope', 'A', 'B', 'C', 'D', 'E', 'F'], apiKey: 'k3y' });
    const out = await stocks.fetch(ctx);
    assert.equal(asked.length, 8, 'at most eight symbols');
    assert.deepEqual(asked[0], ['AAPL', 'k3y']);
    assert.deepEqual(out.quotes.slice(0, 3), [
      { symbol: 'AAPL', price: 231.5, change: 1.23 }, { symbol: 'MSFT', price: 410, change: -0.5 }, { symbol: 'NOPE', price: null, change: null },
    ]);
    assert.deepEqual(out.blocks[0], { key: 'AAPL', label: 'symbol', vars: { symbol: 'AAPL' }, value: 231.5 });
    await stocks.fetch(ctx);
    assert.equal(asked.length, 8, 'cached');
    status = 403;
    await assert.rejects(stocks.fetch(ctxFor({ watchlist: ['AAPL'], apiKey: 'bad' })), /Finnhub answered 403/);
  } finally {
    srv.close();
  }
  assert.deepEqual(values(await run('stocks')), { AAPL: 231.5 }, 'the fixture through the mock');
});

test('stocks client: price, arrow and change; colour can be turned off', async () => {
  const { el } = await renderClient('stocks');
  el.t = (k) => ({ up: 'up', down: 'down', unknownSymbol: 'Unknown symbol' })[k] ?? k;
  el.data = { color: true, quotes: [{ symbol: 'AAPL', price: 231.5, change: 1.23 }, { symbol: 'MSFT', price: 410, change: -0.5 }, { symbol: 'NOPE', price: null, change: null }] };
  const items = [...el.shadowRoot.querySelectorAll('li')];
  assert.deepEqual(items.map((li) => li.textContent), ['AAPL231.50 ▲+1.23%', 'MSFT410.00 ▼-0.50%', 'NOPEUnknown symbol']);
  assert.equal(items[0].getAttribute('aria-label'), 'AAPL: 231.50, up 1.23%');
  assert.ok(items[1].querySelector('.chg').classList.contains('down'));
  assert.equal(el.shadowRoot.querySelector('ul').className, 'color');
  el.data = { color: false, quotes: [] };
  assert.equal(el.shadowRoot.querySelector('ul').className, '');
});

test('pihole: version 6 with a session from the password, version 5 with the token', async () => {
  const six = await run('pihole', { version: 6, key: 'pw' });
  assert.deepEqual(values(six), { queries: 48213, blocked: 7514, blocked_percent: '15.6%', gravity: 168437 });
  const login = mock.requests.filter((r) => r.widget === 'pihole' && r.route === 'POST /api/auth').at(-1);
  assert.deepEqual(JSON.parse(login.body), { password: 'pw' });
  assert.equal(lastRequest('pihole').headers['x-ftl-sid'], 'sid-123');
  const open = await run('pihole', { version: 6, key: undefined });
  assert.equal(open.blocks[0].value, 48213);
  assert.equal(lastRequest('pihole').headers['x-ftl-sid'], undefined, 'no password: no session');
  const five = await run('pihole', { key: 'token' });
  assert.deepEqual(values(five), { queries: 30500, blocked: 4200, blocked_percent: '13.8%', gravity: 120001 });
  assert.deepEqual(lastRequest('pihole').query, { summaryRaw: '', auth: 'token' });
  await assert.rejects(run('pihole', { version: 6, key: 'pw', url: `${mock.url}/nothing` }), /Pi-hole login answered 404/);
});

test('adguard: queries, blocked, filtered (Safe Browsing, Safe Search, parental) and latency', async () => {
  const out = await run('adguard', { username: 'admin', password: 'pw' });
  assert.deepEqual(values(out), { queries: 61234, blocked: 9876, filtered: 45, latency: '4.6ms' });
  assert.equal(lastRequest('adguard').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
});

test('plex: streams on every call, library counts per type, kept for a while', async () => {
  const { default: plex } = await import(path.join(WIDGETS, 'plex', 'server.js'));
  const ctx = { options: { url: `${mock.url}/plex`, key: 'tok' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  assert.deepEqual(values(await plex.fetch(ctx)), { streams: 2, albums: 527, movies: 876, tv: 143 });
  const req = mock.requests.filter((r) => r.widget === 'plex');
  assert.equal(req.at(-1).headers['x-plex-token'], 'tok');
  assert.equal(req.find((r) => r.route === 'GET /library/sections/1/all').headers['x-plex-container-size'], '0');
  const before = mock.requests.length;
  await plex.fetch(ctx);
  assert.deepEqual(mock.requests.slice(before).map((r) => r.route), ['GET /status/sessions'], 'libraries and counts are kept');
});

test('jellyfin and emby: a row per stream with position and progress, library counts with enableBlocks', async () => {
  for (const id of ['jellyfin', 'emby']) {
    const out = await run(id, { enableBlocks: true, enableUser: true, showEpisodeNumber: true });
    assert.deepEqual(out.rows, [
      { label: 'Silo: S01 · E01 - Pilot (anna)', icon: 'play', value: '3:54 / 58:00', progress: 6.7 },
      { label: 'Pink Floyd - The Dark Side of the Moon - Breathe (bob)', icon: 'pause', value: '1:00 / 2:43', progress: 36.8 },
    ], id);
    assert.deepEqual(values(out), { movies: 812, series: 143, episodes: 6021, songs: 9310, ...(id === 'jellyfin' ? { albums: 702 } : {}) });
    const plain = await run(id, {});
    assert.equal(plain.blocks, undefined, 'no blocks by default, as in homepage');
    assert.equal(plain.rows[0].label, 'Pilot - Silo');
  }
  assert.equal(lastRequest('jellyfin').headers.authorization, 'MediaBrowser Token="test-key"');
  assert.equal(lastRequest('emby').headers['x-emby-token'], 'test-key');
  const { default: jellyfin } = await import(path.join(WIDGETS, 'jellyfin', 'server.js'));
  const idle = await jellyfin.fetch({ options: { url: 'http://x', key: 'k' }, fetch: async () => new Response('[]') });
  assert.deepEqual(idle.rows, [{ label: 'noActiveStreams' }]);
});

test('homeassistant: people, lights and switches from one states call; custom states and templates', async () => {
  assert.deepEqual(values(await run('homeassistant')), { people_home: '2 / 3', lights_on: '2 / 4', switches_on: '1 / 2' });
  assert.equal(lastRequest('homeassistant').headers.authorization, 'Bearer test-key');
  const out = await run('homeassistant', { custom: [
    { state: 'sensor.total_power' },
    { state: 'weather.home', label: 'Wind', value: '{attributes.wind_speed} {attributes.wind_speed_unit}' },
    { template: "{{ states.switch | list | count }}", label: 'Switches' },
  ] });
  assert.deepEqual(out.blocks, [
    { key: 'custom1', label: 'Total power', value: '412 W' },
    { key: 'custom2', label: 'Wind', value: '14.4 km/h' },
    { key: 'custom3', label: 'Switches', value: '1' },
  ]);
  assert.deepEqual(JSON.parse(lastRequest('homeassistant').body), { template: '{{ states.switch | list | count }}' });
  await assert.rejects(run('homeassistant', { custom: [{ state: '../config' }] }), /entity id/);
});

test('proxmox: VMs and containers running of all (no templates), CPU and memory of the online nodes, or one node', async () => {
  assert.deepEqual(values(await run('proxmox', { username: 'api@pam!dash', password: 's3cret' })),
    { vms: '2 / 3', lxc: '2 / 2', 'resources.cpu': '33.3%', 'resources.mem': '33.3%' });
  assert.equal(lastRequest('proxmox').headers.authorization, 'PVEAPIToken=api@pam!dash=s3cret');
  assert.deepEqual(values(await run('proxmox', { node: 'pve-2' })), { vms: '1 / 1', lxc: '1 / 1', 'resources.cpu': '50%', 'resources.mem': '25%' });
  assert.deepEqual(values(await run('proxmox', { node: 'pve-3' })), { vms: '0 / 0', lxc: '0 / 0', 'resources.cpu': null, 'resources.mem': null }, 'an offline node');
});

test('proxmoxbackupserver: datastores, failed tasks of the last day (marked), CPU and memory', async () => {
  const out = await run('proxmoxbackupserver', { username: 'api@pbs!dash', password: 's3cret' });
  assert.deepEqual(values(out), { datastore_usage: '60%', failed_tasks_24h: 2, cpu_usage: '7.1%', memory_usage: '31.3%' });
  assert.equal(out.blocks[1].status, 'warn');
  const tasks = mock.requests.filter((r) => r.route === 'GET /api2/json/nodes/localhost/tasks').at(-1);
  assert.equal(tasks.headers.authorization, 'PBSAPIToken=api@pbs!dash:s3cret');
  assert.deepEqual([tasks.query.errors, tasks.query.limit], ['1', '100']);
  assert.ok(Math.abs(Number(tasks.query.since) - (Date.now() / 1000 - 86400)) < 60);
  assert.equal(values(await run('proxmoxbackupserver', { datastore: 'offsite' })).datastore_usage, '40%');
  await assert.rejects(run('proxmoxbackupserver', { datastore: 'nope' }), /no datastore "nope"/);
});

test('qbittorrent: leech, seed and rates; downloads per row with problems first; login with a cookie or an API key', async () => {
  const out = await run('qbittorrent', { key: 'qbt-key', enableLeechProgress: true, enableLeechSize: true, queueLimit: 3 });
  assert.deepEqual(values(out), { leech: 4, download: '2.5 MB/s', seed: 2, upload: '500 kB/s' });
  assert.equal(lastRequest('qbittorrent').headers.authorization, 'Bearer qbt-key');
  assert.deepEqual(out.rows, [
    { label: 'archlinux-2026.10.01-x86_64.iso', value: 'error', progress: 5, icon: 'play', status: 'error' },
    { label: 'ubuntu-24.04.3-desktop-amd64.iso', value: 'stalled', progress: 10, icon: 'play', status: 'warn' },
    { label: 'debian-13.1.0-amd64-DVD-1.iso', value: '12:30 · 3.9 GB', progress: 42, icon: 'play' },
    { label: 'moreItems', vars: { count: 1 } },
  ]);
  assert.equal((await run('qbittorrent')).rows, undefined, 'rows only with enableLeechProgress');

  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push(`${req.method} ${req.url} ${req.headers.cookie ?? ''}`.trim());
      if (req.url === '/api/v2/auth/login') {
        if (body !== 'username=admin&password=p%26w') { res.end('Fails.'); return; }
        res.setHeader('set-cookie', 'SID=abc; HttpOnly; path=/');
        return res.end('Ok.');
      }
      if (req.headers.cookie !== 'SID=abc') { res.statusCode = 403; return res.end('Forbidden'); }
      res.end('[]');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: qbt } = await import(path.join(WIDGETS, 'qbittorrent', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, username: 'admin', password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('p&w');
    assert.deepEqual(values(await qbt.fetch(c)), { leech: 0, download: '0 B/s', seed: 0, upload: '0 B/s' });
    await qbt.fetch(c);
    assert.deepEqual(seen, ['GET /api/v2/torrents/info', 'POST /api/v2/auth/login', 'GET /api/v2/torrents/info SID=abc', 'GET /api/v2/torrents/info SID=abc'], 'the session is kept');
    await assert.rejects(qbt.fetch(ctx('wrong')), /qBittorrent login answered 401/);
  } finally {
    srv.close();
  }
});

test('transmission: leech, seed and rates over RPC, with the session id after a 409', async () => {
  assert.deepEqual(values(await run('transmission', { username: 'u', password: 'p' })), { leech: 2, download: '2.8 MB/s', seed: 1, upload: '500 kB/s' });
  const req = lastRequest('transmission');
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.equal(JSON.parse(req.body).method, 'torrent-get');
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    seen.push(`${q.url} ${q.headers['x-transmission-session-id'] ?? '-'}`);
    if (q.headers['x-transmission-session-id'] !== 's1') { res.statusCode = 409; res.setHeader('x-transmission-session-id', 's1'); return res.end(); }
    res.end(JSON.stringify({ result: 'success', arguments: { torrents: [] } }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: transmission } = await import(path.join(WIDGETS, 'transmission', 'server.js'));
  const ctx = { options: { url: `http://127.0.0.1:${srv.address().port}`, rpcUrl: '/custom' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  try {
    await transmission.fetch(ctx);
    await transmission.fetch(ctx);
    assert.deepEqual(seen, ['/custom/rpc -', '/custom/rpc s1', '/custom/rpc s1']);
  } finally {
    srv.close();
  }
});

test('deluge: leech, seed and rates over JSON-RPC, downloads per row, a login when Deluge asks', async () => {
  const out = await run('deluge', { password: 'pw', enableLeechProgress: true });
  assert.deepEqual(values(out), { leech: 3, download: '3 MB/s', seed: 1, upload: '500 kB/s' });
  assert.deepEqual(out.rows.map((r) => [r.label, r.value, r.progress, r.status ?? null]), [
    ['archlinux-2026.10.01-x86_64.iso', 'error', 5, 'error'],
    ['fedora-43-x86_64.iso', '1:02:05', 75.5, null],
    ['debian-13.1.0-amd64-DVD-1.iso', '12:30', 42, null],
  ]);
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', (c) => (body += c));
    q.on('end', () => {
      const { method, params } = JSON.parse(body);
      seen.push(`${method} ${q.headers.cookie ?? '-'}`);
      if (method === 'auth.login') {
        if (params[0] === 'pw') res.setHeader('set-cookie', '_session_id=xyz; Path=/json');
        return res.end(JSON.stringify({ id: 1, error: null, result: params[0] === 'pw' }));
      }
      if (q.headers.cookie !== '_session_id=xyz') return res.end(JSON.stringify({ id: 1, result: null, error: { message: 'Not authenticated', code: 1 } }));
      res.end(JSON.stringify({ id: 1, error: null, result: { torrents: {} } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: deluge } = await import(path.join(WIDGETS, 'deluge', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('pw');
    await deluge.fetch(c);
    await deluge.fetch(c);
    assert.deepEqual(seen, ['web.update_ui -', 'auth.login -', 'web.update_ui _session_id=xyz', 'web.update_ui _session_id=xyz']);
    await assert.rejects(deluge.fetch(ctx('wrong')), /Deluge login answered 401/);
  } finally {
    srv.close();
  }
});

test('nzbget: rate, remaining and downloaded in decimal units; paused is marked', async () => {
  assert.deepEqual(values(await run('nzbget', { username: 'nzbget', password: 'pw' })), { rate: '12.5 MB/s', remaining: '4 GB', downloaded: '949.1 GB' });
  const req = lastRequest('nzbget');
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('nzbget:pw').toString('base64')}`);
  assert.equal(JSON.parse(req.body).method, 'status');
  const { default: nzbget } = await import(path.join(WIDGETS, 'nzbget', 'server.js'));
  const paused = await nzbget.fetch({ options: { url: 'http://x' }, fetch: async () => new Response(JSON.stringify({ result: { DownloadPaused: true } })) });
  assert.deepEqual(paused.blocks[0], { key: 'rate', label: 'rate', value: 'paused', status: 'warn' });
});

test('lidarr and readarr: wanted, queued (marked with warnings or errors), artists and books with a file', async () => {
  const lidarr = await run('lidarr');
  assert.deepEqual(values(lidarr), { wanted: 37, queued: 3, artists: 4 });
  assert.equal(lidarr.blocks[1].status, 'warn');
  assert.equal(lastRequest('lidarr').headers['x-api-key'], 'test-key');
  const readarr = await run('readarr');
  assert.deepEqual(values(readarr), { wanted: 12, queued: 0, books: 3 });
  assert.equal(readarr.blocks[1].status, undefined);
});

test('jackett: configured and errored indexers (marked), with the admin password\'s cookie', async () => {
  const out = await run('jackett');
  assert.deepEqual(values(out), { configured: 4, errored: 1 });
  assert.equal(out.blocks[1].status, 'warn');
  assert.deepEqual(lastRequest('jackett').query, { apikey: 'test-key', configured: 'true' });
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', (c) => (body += c));
    q.on('end', () => {
      seen.push(`${q.method} ${q.url.split('?')[0]} ${q.headers.cookie ?? '-'}`);
      if (q.url === '/UI/Dashboard') {
        res.statusCode = 302;
        res.setHeader('location', '/UI/Dashboard');
        if (body === 'password=pw') res.setHeader('set-cookie', 'Jackett=c1; path=/; HttpOnly');
        return res.end();
      }
      if (q.headers.cookie !== 'Jackett=c1') { res.statusCode = 302; res.setHeader('location', '/UI/Login'); return res.end(); }
      res.end('[]');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: jackett } = await import(path.join(WIDGETS, 'jackett', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, key: 'k', password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('pw');
    assert.deepEqual(values(await jackett.fetch(c)), { configured: 0, errored: 0 });
    await jackett.fetch(c);
    assert.deepEqual(seen, ['POST /UI/Dashboard -', 'GET /api/v2.0/indexers Jackett=c1', 'GET /api/v2.0/indexers Jackett=c1']);
    await assert.rejects(jackett.fetch(ctx('wrong')), /Jackett login answered 401/);
  } finally {
    srv.close();
  }
});

test('ombi: pending (marked), approved and available requests', async () => {
  const out = await run('ombi');
  assert.deepEqual(values(out), { pending: 3, approved: 12, available: 140 });
  assert.equal(out.blocks[0].status, 'warn');
  assert.equal(lastRequest('ombi').headers['x-api-key'], 'test-key');
});

test('nextcloud: free space, active users, files and shares, with the NC-Token or a login', async () => {
  assert.deepEqual(values(await run('nextcloud')), { cpuload: 0.52, memoryusage: '62.5%', freespace: '412.3 GB', activeusers: 4, numfiles: 184233, numshares: 57 });
  const req = lastRequest('nextcloud');
  assert.equal(req.headers['nc-token'], 'test-key');
  assert.equal(req.headers['ocs-apirequest'], 'true');
  await run('nextcloud', { key: undefined, username: 'admin', password: 'app-pw' });
  assert.equal(lastRequest('nextcloud').headers.authorization, `Basic ${Buffer.from('admin:app-pw').toString('base64')}`);
});

test('immich: users, photos, videos and storage, on the version 1 or 2 path', async () => {
  assert.deepEqual(values(await run('immich', { version: 2 })), { users: 3, photos: 48210, videos: 1834, storage: '612.4 GB' });
  assert.equal(lastRequest('immich').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('immich')), { users: 1, photos: 30000, videos: 1000, storage: '400 GB' });
});

test('paperlessngx: inbox (marked) and total documents, with a token or a login', async () => {
  const out = await run('paperlessngx');
  assert.deepEqual(values(out), { inbox: 7, total: 2384 });
  assert.equal(out.blocks[0].status, 'warn');
  assert.equal(lastRequest('paperlessngx').headers.authorization, 'Token test-key');
  await run('paperlessngx', { key: undefined, username: 'u', password: 'p' });
  assert.equal(lastRequest('paperlessngx').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('uptimekuma: up, down (marked), average uptime and the incident of a status page', async () => {
  const out = await run('uptimekuma', { slug: 'home' });
  const v = values(out);
  assert.deepEqual([v.up, v.down, v.uptime], [2, 1, '96.5%']);
  assert.match(v.incident, /^\d+:\d\d:\d\d$/);
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), [null, 'error', null, 'warn']);
  await assert.rejects(run('uptimekuma', { slug: '../x' }), /slug/);
});

test('traefik: routers, services and middlewares, marked with errors or warnings', async () => {
  const out = await run('traefik', { username: 'u', password: 'p' });
  assert.deepEqual(values(out), { routers: 24, services: 27, middleware: 8 });
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), ['warn', 'error', null]);
  assert.equal(lastRequest('traefik').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('npm: enabled, disabled and total proxy hosts, with a token that is kept', async () => {
  const { default: npm } = await import(path.join(WIDGETS, 'npm', 'server.js'));
  const ctx = { options: { url: `${mock.url}/npm`, username: 'viewer@example.com', password: 'pw' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  assert.deepEqual(values(await npm.fetch(ctx)), { enabled: 3, disabled: 1, total: 4 });
  const login = mock.requests.filter((r) => r.widget === 'npm' && r.route === 'POST /api/tokens').at(-1);
  assert.deepEqual(JSON.parse(login.body), { identity: 'viewer@example.com', secret: 'pw' });
  assert.equal(lastRequest('npm').headers.authorization, 'Bearer eyJ.test.token');
  const before = mock.requests.length;
  await npm.fetch(ctx);
  assert.deepEqual(mock.requests.slice(before).map((r) => r.route), ['GET /api/nginx/proxy-hosts'], 'the token is kept');
});

test('truenas: load, uptime and alerts (marked) over REST, pools per row, unhealthy first', async () => {
  const out = await run('truenas', { enablePools: true });
  assert.deepEqual(values(out), { load: 0.47, uptime: '12d 4h', alerts: 1 });
  assert.equal(out.blocks[2].status, 'warn');
  assert.deepEqual(out.rows, [
    { label: 'fast', value: '300 GB / 1 TB', progress: 30, status: 'error' },
    { label: 'tank', value: '6 TB / 8 TB', progress: 75 },
  ]);
  assert.equal(lastRequest('truenas').headers.authorization, 'Bearer test-key');
});

test('truenas version 2: the same over the JSON-RPC WebSocket API, with an API key login', async () => {
  const http = await import('node:http');
  const crypto = await import('node:crypto');
  const calls = [];
  const answers = {
    'auth.login_with_api_key': (p) => p[0] === 'k3y',
    'alert.list': () => [{ dismissed: false }, { dismissed: false }],
    'system.info': () => ({ loadavg: [1.5, 1, 1], uptime_seconds: 3700 }),
  };
  const srv = http.createServer();
  srv.on('upgrade', (req, sock) => {
    const accept = crypto.createHash('sha1').update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let buf = Buffer.alloc(0);
    sock.on('data', (c) => {
      buf = Buffer.concat([buf, c]);
      while (buf.length >= 6) {
        let len = buf[1] & 0x7f;
        let at = 2;
        if (len === 126) { len = buf.readUInt16BE(2); at = 4; }
        if (buf.length < at + 4 + len) return;
        const mask = buf.subarray(at, at + 4);
        const data = Buffer.from(buf.subarray(at + 4, at + 4 + len).map((b, i) => b ^ mask[i % 4]));
        const op = buf[0] & 0x0f;
        buf = buf.subarray(at + 4 + len);
        if (op === 8) { sock.end(); return; }
        const msg = JSON.parse(data.toString());
        calls.push(msg.method);
        const text = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: answers[msg.method](msg.params) }));
        sock.write(Buffer.concat([Buffer.from(text.length < 126 ? [0x81, text.length] : [0x81, 126, text.length >> 8, text.length & 255]), text]));
      }
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: truenas } = await import(path.join(WIDGETS, 'truenas', 'server.js'));
  const ctx = (key) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, key, version: 2 }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    assert.deepEqual(values(await truenas.fetch(ctx('k3y'))), { load: 1.5, uptime: '1h 1m', alerts: 2 });
    assert.deepEqual(calls, ['auth.login_with_api_key', 'alert.list', 'system.info']);
    await assert.rejects(truenas.fetch(ctx('wrong')), /TrueNAS login answered 401/);
  } finally {
    srv.close();
  }
});

test('diskstation: uptime, free space on a volume (marked below 10%), CPU and memory; the login is POSTed', async () => {
  const out = await run('diskstation', { username: 'remote_stats', password: 'p&w' });
  assert.deepEqual(values(out), { uptime: '5d 3h', volumeAvailable: '600 GB', 'resources.cpu': '6%', 'resources.mem': '37%' });
  assert.equal(out.blocks[1].status, 'warn');
  const login = mock.requests.filter((r) => r.widget === 'diskstation' && r.route === 'POST /webapi/entry.cgi').at(-1);
  assert.equal(new URLSearchParams(login.body).get('passwd'), 'p&w', 'the password goes in the body, not the address');
  assert.equal(lastRequest('diskstation').query._sid, 'sid-abc');
  assert.equal(values(await run('diskstation', { volume: 'volume_2' })).volumeAvailable, '1.5 TB');
  await assert.rejects(run('diskstation', { volume: 'volume_9' }), /no volume "volume_9"/);
});
