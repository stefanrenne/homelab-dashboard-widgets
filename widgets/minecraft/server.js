// Minecraft (Java Edition): the Server List Ping over TCP (a handshake, then a status request,
// answered with JSON), as the server list in the game does. Without a port in the url the
// _minecraft._tcp SRV record is looked up, else port 25565. A server that does not answer is
// down, marked.

import net from 'node:net';
import dns from 'node:dns/promises';

const varint = (n) => {
  const out = [];
  let v = n >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v) b |= 0x80;
    out.push(b);
  } while (v);
  return Buffer.from(out);
};
const packet = (...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([varint(body.length), body]);
};
/** A VarInt at `offset` as [value, bytes], or null when the buffer ends first. */
export function readVarint(buf, offset = 0) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null;
    const b = buf[offset + i];
    value |= (b & 0x7f) << (7 * i);
    if (!(b & 0x80)) return [value >>> 0, i + 1];
  }
  throw new Error('Minecraft server answered a broken packet');
}

/** Asks a server for its status; resolves the status JSON. */
export function status(host, port, { timeoutMs = 3000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    let buf = Buffer.alloc(0);
    const done = (err, value) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      socket.destroy();
      if (err) reject(err);
      else resolve(value);
    };
    const abort = () => done(new Error('Minecraft server: aborted'));
    const timer = setTimeout(() => done(new Error('Minecraft server did not answer')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    socket.on('error', done);
    socket.on('connect', () => {
      const name = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);
      socket.write(Buffer.concat([
        packet(varint(0), varint(767), varint(name.length), name, portBuf, varint(1)), // handshake, next state: status
        packet(varint(0)), // status request
      ]));
    });
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length > 1 << 20) return done(new Error('Minecraft server answered too much'));
      try {
        const len = readVarint(buf);
        if (!len || buf.length < len[1] + len[0]) return;
        let at = len[1];
        const id = readVarint(buf, at);
        at += id[1];
        const strLen = readVarint(buf, at);
        at += strLen[1];
        done(null, JSON.parse(buf.toString('utf8', at, at + strLen[0])));
      } catch (err) {
        done(err instanceof SyntaxError ? new Error('Minecraft server answered broken JSON') : err);
      }
    });
    socket.on('end', () => done(new Error('Minecraft server closed the connection')));
  });
}

export default {
  async fetch(ctx) {
    let u;
    try {
      const raw = String(ctx.options.url);
      u = new URL(raw.includes('://') ? raw : `tcp://${raw}`);
    } catch {
      throw new Error('url: the server, e.g. minecraft.lan or udp://minecraft.lan:25565');
    }
    let host = u.hostname.replace(/^\[|\]$/g, '');
    let port = Number(u.port);
    if (!host) throw new Error('url: the server, e.g. minecraft.lan or udp://minecraft.lan:25565');
    if (!port) {
      port = 25565;
      if (!net.isIP(host)) {
        const srv = await dns.resolveSrv(`_minecraft._tcp.${host}`).catch(() => []);
        if (srv[0]) ({ name: host, port } = srv[0]);
      }
    }
    let s = null;
    try {
      s = await status(host, port, { timeoutMs: Math.max(1, Number(ctx.options.timeout) || 3) * 1000, signal: ctx.signal });
    } catch (err) {
      ctx.log.warn?.(`${host}:${port}: ${err.message}`);
    }
    return {
      blocks: [
        { key: 'status', label: 'status', value: s ? 'up' : 'down', ...(s ? {} : { status: 'error' }) },
        { key: 'players', label: 'players', value: s?.players ? `${s.players.online ?? 0} / ${s.players.max ?? 0}` : null },
        { key: 'version', label: 'version', value: s?.version?.name ?? null },
      ],
    };
  },
};
