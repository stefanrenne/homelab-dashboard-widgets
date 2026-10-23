// Every widget against its fixture, through the public ctx contract only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { startMock } from '../scripts/mock-homelab.mjs';

const WIDGETS = path.resolve('widgets');
const IDS = fs.readdirSync(WIDGETS).filter((d) => fs.existsSync(path.join(WIDGETS, d, 'widget.yaml'))).sort();
const LANGS = ['en', 'nl', 'fr', 'de', 'es'];

let mock;
before(async () => (mock = await startMock()));
after(() => mock.close());

const silent = { info() {}, warn() {}, error() {} };

async function run(id, options = {}) {
  const { default: widget } = await import(path.join(WIDGETS, id, 'server.js'));
  return widget.fetch({
    apiVersion: 1,
    instanceId: 't',
    options: { url: `${mock.url}/${id}`, key: 'test-key', ...options },
    signal: new AbortController().signal,
    cache: new Map(),
    log: silent,
    fetch: (u, init) => fetch(u, init),
  });
}

const values = (out) => Object.fromEntries(out.blocks.map((b) => [b.key, b.unit && b.value !== null ? `${b.value}${b.unit}` : b.value]));
const lastRequest = (id) => mock.requests.filter((r) => r.widget === id).at(-1);

test('every folder is a valid package: manifest, i18n in all languages, only node: imports', () => {
  assert.equal(IDS.length, 12);
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

test('every block label has a translation (except pool names)', async () => {
  for (const id of IDS) {
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    const out = await run(id, { env: 1, pool1: 'trunk' });
    for (const b of out.blocks ?? []) if (!/^pool/.test(b.key)) assert.ok(b.label in i18n.en, `${id}: ${b.label}`);
  }
});

test('radarr: counts and the queue', async () => {
  const out = await run('radarr', { enableQueue: true });
  assert.deepEqual(values(out), { wanted: 8, missing: 13, queued: 1, movies: 62 });
  assert.deepEqual(out.rows, [{ label: 'The Social Reckoning', value: 'import blocked - 00:00:00', progress: 100 }]);
  assert.equal(lastRequest('radarr').headers['x-api-key'], 'test-key');
  const noQueue = await run('radarr');
  assert.equal(noQueue.rows, undefined);
});

test('sonarr: counts and the queue with series names', async () => {
  const out = await run('sonarr', { enableQueue: true });
  assert.deepEqual(values(out), { wanted: 11, queued: 3, series: 24 });
  assert.equal(out.rows[0].label, 'South Park: South Park S29E04 1080p WEB H264-FLUX');
  assert.equal(out.rows[0].value, 'import pending - 00:00:00');
  assert.equal(out.rows.length, 3);
});

test('bazarr, prowlarr, sabnzbd, seerr, whatsupdocker, portainer', async () => {
  assert.deepEqual(values(await run('bazarr')), { missingEpisodes: 200, missingMovies: 3 });
  assert.equal(lastRequest('bazarr').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('prowlarr')), { grabs: 37, queries: 44, failGrabs: 0, failQueries: 0 });
  assert.deepEqual(values(await run('sabnzbd')), { rate: '0 B/s', queue: 0, timeleft: '0:00:00' });
  assert.deepEqual(lastRequest('sabnzbd').query, { mode: 'queue', output: 'json', apikey: 'test-key' });
  assert.deepEqual(values(await run('seerr')), { pending: 0, approved: 11, completed: 0 });
  assert.deepEqual(values(await run('whatsupdocker', { username: 'u', password: 'p' })), { monitoring: 30, updates: 0 });
  assert.equal(lastRequest('whatsupdocker').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.deepEqual(values(await run('portainer', { env: 1 })), { running: 32, stopped: 0, total: 32 });
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
  assert.deepEqual(out.rows, [{ label: '▶ Silo: S03 · E09 - Farewell (alice)', value: '03:54', progress: 7 }]);
  const plain = await run('tautulli');
  assert.equal(plain.rows[0].label, '▶ Silo - Farewell');
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
  assert.equal(out.blocks.find((b) => b.key === 'pool1UsedPercent').label, 'Trunk Used');
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
