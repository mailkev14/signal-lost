import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRoom, makePlayer, addPlayer, removePlayer, setConnected, tickRoom, viewFor, handleAction, touch } from '../shared/engine.js';
import { randomInt, uniqueId } from '../shared/puzzles.js';
import { BriefingService, MissionDirector } from './briefing.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATIC_FILES = new Set([
  'index.html', 'src/app.js', 'src/styles.css', 'src/icons.js', 'src/network.js',
  'src/training.js', 'src/views.js', 'shared/puzzles.js', 'shared/engine.js', 'public/favicon.svg',
]);
class HttpError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
class Limiter {
  constructor() { this.entries = new Map(); }
  check(key, limit, period = 60000) {
    const now = Date.now();
    let entry = this.entries.get(key);
    if (!entry || now >= entry.until) { entry = { count: 0, until: now + period }; this.entries.set(key, entry); }
    if (++entry.count > limit) throw new HttpError('Too many requests. Please wait a moment.', 429);
  }
  cleanup() { const now = Date.now(); for (const [k, v] of this.entries) if (now >= v.until) this.entries.delete(k); }
}
function cleanName(value) {
  if (typeof value !== 'string') throw new HttpError('Choose a crew callsign.');
  const name = value.replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '').trim();
  if (name.length < 1 || name.length > 18) throw new HttpError('Callsigns must be 1-18 characters.');
  return name;
}
function cleanCode(value) {
  if (typeof value !== 'string' || !/^[A-Z2-9]{6}$/.test(value.trim().toUpperCase())) throw new HttpError('Enter a six-character room code.');
  return value.trim().toUpperCase();
}
function sendJson(res, status, value) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError('Send JSON commands.', 415);
  const buffers = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new HttpError('Command too large.', 413);
    buffers.push(chunk);
  }
  let result;
  try { result = JSON.parse(Buffer.concat(buffers).toString('utf8')); }
  catch { throw new HttpError('Invalid JSON command.'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new HttpError('Invalid command.');
  return result;
}

/** Dependency-free, single-process game server. Maps are exposed to tests, NEVER HTTP. */
export function createGameServer({
  publicOrigin = process.env.PUBLIC_ORIGIN || '',
  maxRooms = Number(process.env.MAX_ROOMS || 100),
  briefingService = new BriefingService(),
  missionDirector = new MissionDirector(),
  tickInterval = 500,
} = {}) {
  if (!Number.isInteger(maxRooms) || maxRooms < 1 || maxRooms > 10000) throw new Error('MAX_ROOMS must be 1-10000.');
  if (publicOrigin) publicOrigin = new URL(publicOrigin).origin;
  const rooms = new Map(), sessions = new Map(), streams = new Map();
  const limiter = new Limiter();
  let shuttingDown = false;
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      if (shuttingDown) throw new HttpError('The station is restarting. Reconnect shortly.', 503);
      const url = new URL(req.url || '/', 'http://internal');
      const path = url.pathname;
      const ip = req.socket.remoteAddress || 'unknown'; // Do NOT trust arbitrary X-Forwarded-For headers.
      if (path.startsWith('/api/')) {
        const origin = req.headers.origin;
        if (origin) {
          let allowed = false;
          try {
            allowed = publicOrigin ? new URL(origin).origin === publicOrigin : new URL(origin).host === req.headers.host;
          } catch { /* Invalid origins are rejected. */ }
          if (!allowed) throw new HttpError('This origin is not allowed.', 403);
        }
        limiter.check(`http:${ip}`, 400);
        if (req.method === 'GET' && path === '/api/health') {
          return sendJson(res, 200, { ok: true, name: 'Signal Lost', version: '1.0.0-rc1', aiEnabled: briefingService.enabled, directorEnabled: missionDirector.enabled });
        }
        if (req.method === 'POST' && path === '/api/rooms') {
          limiter.check(`create:${ip}`, 8);
          if (rooms.size >= maxRooms) throw new HttpError('The station is at capacity. Please try again later.', 503);
          const body = await readJson(req);
          let code;
          do { code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); } while (rooms.has(code));
          const player = makePlayer(uniqueId(), cleanName(body.name));
          player.connected = false; player.disconnectedAt = Date.now();
          const room = createRoom(code, player);
          rooms.set(code, room);
          const session = mintSession(room, player);
          return sendJson(res, 201, { ok: true, session: publicSession(session), view: viewFor(room, player.id) });
        }
        if (req.method === 'POST' && path === '/api/join') {
          limiter.check(`join:${ip}`, 30);
          const body = await readJson(req);
          const room = rooms.get(cleanCode(body.code));
          if (!room) throw new HttpError('Room not found. Check the code with your captain.', 404);
          const player = makePlayer(uniqueId(), cleanName(body.name));
          player.connected = false; player.disconnectedAt = Date.now();
          addPlayer(room, player);
          const session = mintSession(room, player);
          broadcast(room);
          return sendJson(res, 200, { ok: true, session: publicSession(session), view: viewFor(room, player.id) });
        }
        if (req.method === 'GET' && path === '/api/events') {
          const session = authenticate(req);
          const room = rooms.get(session.code);
          // A token gets one active stream. New stream takes over cleanly on refresh.
          const previous = streams.get(session.token);
          streams.set(session.token, res);
          if (previous && previous !== res) previous.end();
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
          });
          res.flushHeaders();
          res.write(': signal-link-established\n\n');
          setConnected(room, session.playerId, true);
          broadcast(room);
          res.on('close', () => {
            if (streams.get(session.token) !== res) return;
            streams.delete(session.token);
            if (rooms.has(room.code)) { setConnected(room, session.playerId, false); broadcast(room); }
          });
          return;
        }
        if (req.method === 'POST' && path === '/api/action') {
          const session = authenticate(req);
          limiter.check(`action:${session.token}`, 100);
          const body = await readJson(req);
          if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(body.requestId)) throw new HttpError('Invalid command ID.');
          const room = rooms.get(session.code);
          if (session.seen.has(body.requestId)) return sendJson(res, 200, { ok: true, view: viewFor(room, session.playerId) });
          if (body.event === 'chat') limiter.check(`chat:${session.token}`, 30);
          if (body.event === 'leave') {
            removePlayer(room, session.playerId);
            sessions.delete(session.token);
            streams.get(session.token)?.end(); streams.delete(session.token);
            broadcast(room);
            return sendJson(res, 200, { ok: true });
          }
          const beforePhase = room.phase;
          const beforeMistakes = room.mistakes;
          handleAction(room, session.playerId, body.event, body.payload || {});
          const milestone = room.phase === 'won' ? 'victory' : room.phase === 'lost' ? 'defeat' :
            room.phase === 'between' && beforePhase === 'playing' ? 'restored' :
            room.mistakes > beforeMistakes ? 'mistake' : null;
          if (milestone) {
            const missionId = room.missionId;
            const sequence = (room.directorSequence || 0) + 1;
            room.directorSequence = sequence;
            const sector = room.puzzles[room.index]?.title || 'Station';
            room.director = { text: 'Incoming mission director transmission...', source: 'loading' };
            Promise.resolve(missionDirector.react({ event: milestone, sector, mistakes: room.mistakes }))
              .then(result => {
                if (!rooms.has(room.code) || room.missionId !== missionId || room.directorSequence !== sequence) return;
                room.director = result; touch(room, Date.now()); broadcast(room);
              }).catch(() => { /* Director failures never block gameplay. */ });
          }

          session.seen.add(body.requestId);
          if (session.seen.size > 128) session.seen.delete(session.seen.values().next().value);
          if (body.event === 'start' && briefingService.enabled) {
            const missionId = room.missionId;
            room.briefingLoading = true;
            Promise.resolve(briefingService.generate()).then(briefing => {
              if (!rooms.has(room.code) || room.missionId !== missionId) return;
              room.briefing = briefing; room.briefingLoading = false; touch(room, Date.now()); broadcast(room);
            }).catch(() => { room.briefingLoading = false; broadcast(room); });
          }
          broadcast(room);
          return sendJson(res, 200, { ok: true, view: viewFor(room, session.playerId) });
        }
        throw new HttpError('Endpoint not found.', 404);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError('Method not allowed.', 405);
      const file = path === '/' ? 'index.html' : path.slice(1);
      if (!STATIC_FILES.has(file)) throw new HttpError('Not found.', 404);
      const content = await readFile(resolve(ROOT, file));
      const ext = file.split('.').pop();
      const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' }[ext];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Content-Length': content.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      sendJson(res, error.status || 400, { ok: false, error: error.status === 500 ? 'Station error. Try again.' : error.message || 'Invalid command.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;

  function mintSession(room, player) {
    const token = randomBytes(32).toString('hex');
    const session = { token, code: room.code, playerId: player.id, seen: new Set() };
    sessions.set(token, session);
    return session;
  }
  function publicSession(s) { return { code: s.code, playerId: s.playerId, token: s.token }; }
  function authenticate(req) {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
    const session = match ? sessions.get(match[1]) : null;
    const room = session && rooms.get(session.code);
    if (!session || !room || !room.players.some(p => p.id === session.playerId)) {
      throw new HttpError('Your room session expired. Join or create a new room.', 401);
    }
    return session;
  }
  function broadcast(room, now = Date.now()) {
    for (const [token, session] of sessions) {
      if (session.code !== room.code) continue;
      const res = streams.get(token);
      if (!res || res.destroyed || res.writableEnded) continue;
      // Bounded backpressure: a stalled client is disconnected and can resynchronize.
      if (res.writableLength > 128 * 1024) { res.destroy(); continue; }
      res.write(`event: state\ndata: ${JSON.stringify(viewFor(room, session.playerId, now))}\n\n`);
    }
  }
  function deleteRoom(room) {
    rooms.delete(room.code);
    for (const [token, session] of sessions) {
      if (session.code !== room.code) continue;
      sessions.delete(token);
      streams.get(token)?.end(); streams.delete(token);
    }
  }
  const timer = setInterval(() => {
    const now = Date.now();
    limiter.cleanup();
    for (const room of rooms.values()) {
      tickRoom(room, now);
      if (room.phase === 'lobby') {
        for (const p of [...room.players]) {
          if (!p.connected && p.disconnectedAt !== null && now - p.disconnectedAt > 60000) {
            removePlayer(room, p.id, now);
            for (const [token, s] of sessions) if (s.code === room.code && s.playerId === p.id) sessions.delete(token);
          }
        }
      }
      if (!room.players.length ||
          (!room.players.some(p => p.connected) && now - room.lastActivity > 120000) ||
          now - room.lastActivity > 30 * 60000) { deleteRoom(room); continue; }
      broadcast(room, now);
    }
  }, tickInterval);
  timer.unref();
  return {
    server, rooms, sessions, streams,
    async listen(port = 0, host = '127.0.0.1') {
      await new Promise((resolvePromise, reject) => { server.once('error', reject); server.listen(port, host, resolvePromise); });
      return server.address();
    },
    async close() {
      shuttingDown = true;
      clearInterval(timer);
      for (const res of streams.values()) res.end();
      streams.clear();
      await new Promise(resolvePromise => { server.close(resolvePromise); server.closeAllConnections(); });
    },
  };
}
