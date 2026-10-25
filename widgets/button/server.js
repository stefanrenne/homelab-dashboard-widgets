// One button: a link (client side only), or a script or shell command run on the server through
// the widget API's action call. The run is a process group of its own, so a timeout or an abort
// stops everything it started.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const OUTPUT_LIMIT = 64 * 1024;
export const CUT_MARKER = '[earlier output cut]\n';
const KILL_GRACE = 2000;

/** The one thing the button does: { href } | { script } | { command }; throws on zero or several. */
export function targetOf(options = {}) {
  const set = ['href', 'script', 'command'].filter((k) => typeof options[k] === 'string' && options[k].trim() !== '');
  if (set.length === 0) throw new Error('set one of href, script or command');
  if (set.length > 1) throw new Error(`set only one of href, script or command (found ${set.join(', ')})`);
  return { [set[0]]: options[set[0]] };
}

/** Keeps the last `limit` bytes of output, with a marker when earlier output was cut. */
class Tail {
  constructor(limit) {
    this.limit = limit;
    this.chunks = [];
    this.size = 0;
    this.cut = false;
  }
  push(chunk) {
    this.chunks.push(chunk);
    this.size += chunk.length;
    while (this.size - this.chunks[0].length >= this.limit) {
      this.size -= this.chunks.shift().length;
      this.cut = true;
    }
  }
  toString() {
    let buf = Buffer.concat(this.chunks);
    if (buf.length > this.limit) {
      buf = buf.subarray(buf.length - this.limit);
      this.cut = true;
    }
    return (this.cut ? CUT_MARKER : '') + buf.toString('utf8');
  }
}

function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
}

/** Runs bash with `args` in `cwd`; resolves with the action result, never rejects. */
function run(args, { cwd, env, timeoutMs, signal }) {
  return new Promise((resolve) => {
    const out = new Tail(OUTPUT_LIMIT);
    let child;
    try {
      // stderr onto stdout inside bash: one pipe keeps both in the order they were written
      child = spawn('bash', ['-c', 'exec 2>&1; exec bash "$@"', 'bash', ...args], { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ status: 'error', output: '', error: err.message });
      return;
    }
    let stopped = null;
    let killTimer;
    const stop = (reason) => {
      if (stopped) return;
      stopped = reason;
      killGroup(child, 'SIGTERM');
      killTimer = setTimeout(() => {
        killGroup(child, 'SIGKILL');
        // a process that left the group may hold the pipes open; stop waiting for it
        child.stdout.destroy();
        child.stderr.destroy();
      }, KILL_GRACE);
    };
    const timer = setTimeout(() => stop(`timed out after ${timeoutMs / 1000} s`), timeoutMs);
    const onAbort = () => stop('stopped');
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => out.push(c));
    const finish = (result) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(killTimer);
      resolve(result);
    };
    child.on('error', (err) => finish({ status: 'error', output: out.toString(), error: err.code === 'ENOENT' ? 'bash is not installed' : err.message }));
    // close (not exit): all output is read, also from children that kept the pipes open
    child.on('close', (code) => {
      if (stopped) return finish({ status: 'error', output: out.toString(), error: stopped });
      finish(code === 0 ? { status: 'ok', output: out.toString(), exitCode: 0 } : { status: 'error', output: out.toString(), exitCode: code });
    });
  });
}

export default {
  async fetch(ctx) {
    targetOf(ctx.options);
    return { blocks: [] };
  },

  async action(ctx) {
    const o = ctx.options ?? {};
    const target = targetOf(o);
    if (target.href) throw new Error('a button with href opens a link and has nothing to run');
    const cwd = ctx.configDir ?? process.cwd();
    const env = o.inheritEnv === true ? { ...process.env } : Object.fromEntries(['PATH', 'HOME'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
    const seconds = Number(o.timeout) > 0 ? Number(o.timeout) : 300;
    const opts = { cwd, env, timeoutMs: seconds * 1000, signal: ctx.signal };
    if (target.script) {
      const file = path.resolve(cwd, target.script);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return { status: 'error', output: '', error: `script not found: ${file}` };
      return run([file], opts);
    }
    return run(['-c', target.command], opts);
  },
};
