// GameDig: homepage queries game servers with the gamedig library, which this collection cannot
// use (only node: imports). This widget speaks the protocol most of its games use: Valve's
// server query (A2S_INFO over UDP; Counter-Strike, Team Fortress, Rust, ARK, Valheim, DayZ,
// Garry's Mod, ...), with the challenge newer servers ask for. A server that does not answer
// is offline, marked. Minecraft has its own widget.

import dgram from 'node:dgram';

const REQUEST = Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]), Buffer.from('Source Engine Query\0', 'latin1')]);

/** A2S_INFO's answer (after the 0xFFFFFFFF 0x49 header) as { name, map, players, maxplayers, bots }. */
export function parseInfo(buf) {
  let i = 6; // header (4), type (1), protocol (1)
  const str = () => {
    const end = buf.indexOf(0, i);
    if (end < 0) throw new Error('game server answered a broken packet');
    const s = buf.toString('utf8', i, end);
    i = end + 1;
    return s;
  };
  const name = str();
  const map = str();
  str(); // folder
  str(); // game
  i += 2; // app id
  if (i + 3 > buf.length) throw new Error('game server answered a broken packet');
  return { name, map, players: buf[i], maxplayers: buf[i + 1], bots: buf[i + 2] };
}

/** Asks a server for A2S_INFO; resolves { info, ping } or rejects on a timeout. */
export function query(host, port, { timeoutMs = 3000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(host.includes(':') ? 'udp6' : 'udp4');
    let started = Date.now();
    const done = (err, value) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      socket.close();
      if (err) reject(err);
      else resolve(value);
    };
    const abort = () => done(new Error('game server: aborted'));
    const timer = setTimeout(() => done(new Error('game server did not answer')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    socket.on('error', (err) => done(err));
    socket.on('message', (msg) => {
      if (msg.length < 5 || msg.readInt32LE(0) !== -1) return;
      if (msg[4] === 0x41 && msg.length >= 9) { // a challenge: ask again with it
        started = Date.now();
        socket.send(Buffer.concat([REQUEST, msg.subarray(5, 9)]), port, host);
      } else if (msg[4] === 0x49) {
        try {
          done(null, { info: parseInfo(msg), ping: Date.now() - started });
        } catch (err) {
          done(err);
        }
      }
    });
    socket.send(REQUEST, port, host, (err) => err && done(err));
  });
}

export default {
  async fetch(ctx) {
    let u;
    try {
      u = new URL(String(ctx.options.url).includes('://') ? ctx.options.url : `udp://${ctx.options.url}`);
    } catch {
      throw new Error('url: the server as udp://host:port');
    }
    const port = Number(u.port);
    if (!u.hostname || !port) throw new Error('url: the server as udp://host:port');
    const host = u.hostname.replace(/^\[|\]$/g, '');
    let result = null;
    try {
      result = await query(host, port, { timeoutMs: Math.max(1, Number(ctx.options.timeout) || 3) * 1000, signal: ctx.signal });
    } catch (err) {
      ctx.log.warn?.(`${host}:${port}: ${err.message}`);
    }
    const s = result?.info;
    return {
      blocks: [
        { key: 'status', label: 'status', value: s ? 'online' : 'offline', ...(s ? {} : { status: 'error' }) },
        { key: 'name', label: 'name', value: s ? s.name : null },
        { key: 'map', label: 'map', value: s ? s.map : null },
        { key: 'currentPlayers', label: 'currentPlayers', value: s ? `${s.players} / ${s.maxplayers}` : null },
        { key: 'players', label: 'players', value: s ? s.players : null },
        { key: 'maxPlayers', label: 'maxPlayers', value: s ? s.maxplayers : null },
        { key: 'bots', label: 'bots', value: s ? s.bots : null },
        { key: 'ping', label: 'ping', value: s ? result.ping : null, unit: 'ms' },
      ],
    };
  },
};
