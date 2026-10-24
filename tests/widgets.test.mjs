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

const ROW_TEXTS = new Set(['moreItems', 'noActiveStreams', 'downloading', 'queued', 'paused', 'completed', 'delay', 'failed', 'failedPending',
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
