import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/app.js';
import { BriefingService } from '../server/briefing.js';
import { MISSION_MS } from '../shared/engine.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function eventually(predicate, timeout = 2500) {
  const end = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > end) throw new Error('State did not converge'); await sleep(15); }
}
async function fixture(t, count = 2, options = {}) {
  const app = createGameServer({ tickInterval: 40, briefingService: new BriefingService({ enabled: false }), ...options });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const clients = [];
  async function request(path, body, token, extra = {}) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json; try { json = await response.json(); } catch { json = null; }
    return { status: response.status, json };
  }
  async function connect(session) {
    const client = { session, view: null, controller: new AbortController() };
    const response = await fetch(base + '/api/events', { headers: { Authorization: `Bearer ${session.token}` }, signal: client.controller.signal });
    assert.equal(response.status, 200);
    client.task = (async () => {
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let i;
          while ((i = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, i); buffer = buffer.slice(i + 2);
            const line = block.split('\n').find(l => l.startsWith('data: '));
            if (line) client.view = JSON.parse(line.slice(6));
          }
        }
      } catch (error) { if (!client.controller.signal.aborted) throw error; }
      finally { reader.releaseLock(); }
    })();
    clients.push(client); await eventually(() => client.view !== null); return client;
  }
  t.after(async () => { clients.forEach(c => c.controller.abort()); await app.close(); await Promise.allSettled(clients.map(c => c.task)); });
  const created = await request('/api/rooms', { name: 'NOVA' });
  assert.equal(created.status, 201);
  const host = await connect(created.json.session), crew = [host];
  for (let i = 1; i < count; i++) {
    const joined = await request('/api/join', { code: host.session.code, name: `CREW ${i}` });
    assert.equal(joined.status, 200); crew.push(await connect(joined.json.session));
  }
  await eventually(() => host.view.players.length === count && host.view.players.every(p => p.connected));
  let commandId = 0;
  const action = (client, event, payload = {}, requestId = `test-command-${++commandId}`) => request('/api/action', { event, payload, requestId }, client.session.token);
  async function launch() {
    for (const client of crew) assert.equal((await action(client, 'ready', { ready: true })).status, 200);
    assert.equal((await action(crew.find(c => c.session.playerId === host.view.hostId), 'start')).status, 200);
    await eventually(() => crew.every(c => c.view.phase === 'playing'));
  }
  return { app, base, request, action, connect, crew, host, launch, room: app.rooms.get(host.session.code) };
}

for (const count of [2, 4]) test(`${count} independent HTTP/SSE clients finish a private, synchronized mission`, async t => {
  const f = await fixture(t, count); await f.launch();
  for (let round = 0; round < 4; round++) {
    const operator = f.crew.find(c => c.session.playerId === f.host.view.operatorId);
    assert.ok(operator);
    for (const c of f.crew) {
      assert.equal(Object.hasOwn(c.view.current, 'answer'), false);
      assert.equal(Object.hasOwn(c.view, 'puzzles'), false);
      assert.equal(c.view.current.console !== null, c === operator);
    }
    const puzzle = f.room.puzzles[round]; // Test-only server internals, not an HTTP endpoint.
    const result = await f.action(operator, 'answer', { moduleId: puzzle.id, answer: puzzle.answer });
    assert.equal(result.status, 200);
    await eventually(() => f.crew.every(c => c.view.completed.length === round + 1));
    if (round < 3) {
      assert.equal((await f.action(f.host, 'next')).status, 200);
      await eventually(() => f.crew.every(c => c.view.index === round + 1));
    }
  }
  assert.ok(f.crew.every(c => c.view.phase === 'won'));
  assert.equal(f.host.view.completed.length, 4);
});
test('invalid tokens cannot subscribe or control a room; origin checks block cross-site commands', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/events', null, 'f'.repeat(64))).status, 401);
  assert.equal((await f.request('/api/action', { event: 'start', requestId: 'bad-command-1' })).status, 401);
  assert.equal((await f.request('/api/rooms', { name: 'ATTACKER' }, null, { Origin: 'https://evil.invalid' })).status, 403);
});
test('a reconnect reuses the authenticated seat and resumes the shared mission clock', async t => {
  const f = await fixture(t); await f.launch();
  const client = f.crew[1]; client.controller.abort();
  await eventually(() => f.host.view.paused);
  const frozen = f.host.view.remainingMs;
  await sleep(130); assert.equal(f.host.view.remainingMs, frozen);
  const reconnected = await f.connect(client.session);
  await eventually(() => !f.host.view.paused && reconnected.view.players.every(p => p.connected));
  assert.equal(reconnected.view.meId, client.session.playerId);
  assert.equal(reconnected.view.clues.length, 3);
  assert.equal(f.host.view.players.length, 2);
});
test('duplicate commands do not double-charge penalties or post duplicate chat', async t => {
  const f = await fixture(t); await f.launch();
  const puzzle = f.room.puzzles[0], wrong = puzzle.answer.split(',').reverse().join(',');
  await f.action(f.host, 'answer', { moduleId: puzzle.id, answer: wrong }, 'duplicate-answer-1');
  await f.action(f.host, 'answer', { moduleId: puzzle.id, answer: wrong }, 'duplicate-answer-1');
  assert.equal(f.room.mistakes, 1);
  assert.ok(f.room.deadline - Date.now() < MISSION_MS - 19000);
  await f.action(f.host, 'chat', { text: 'Hello crew' }, 'duplicate-chat-1');
  await f.action(f.host, 'chat', { text: 'Hello crew' }, 'duplicate-chat-1');
  assert.equal(f.room.messages.length, 1);
});
test('client-supplied player and room identifiers cannot override session authority', async t => {
  const f = await fixture(t); await f.launch();
  const impostor = await f.request('/api/action', {
    event: 'answer', playerId: f.host.session.playerId, code: f.host.session.code,
    requestId: 'forged-actor-1', payload: { moduleId: 'reactor', answer: f.room.puzzles[0].answer },
  }, f.crew[1].session.token);
  assert.equal(impostor.status, 400); assert.match(impostor.json.error, /operator/);
  assert.equal(f.room.completed.length, 0);
});
test('chat reaches all crew and retains literal markup rather than executing it', async t => {
  const f = await fixture(t);
  await f.action(f.host, 'chat', { text: '<img src=x onerror=alert(1)>' });
  await eventually(() => f.crew[1].view.messages.length === 1);
  assert.equal(f.crew[1].view.messages[0].text, '<img src=x onerror=alert(1)>');
});
test('static allowlist never serves server source, tests, environment files or traversal paths', async t => {
  const f = await fixture(t, 1);
  for (const path of ['/server/app.js', '/tests/server.test.js', '/.env', '/package.json', '/%2e%2e/.env']) {
    assert.equal((await fetch(f.base + path)).status, 404, path);
  }
  const page = await fetch(f.base + '/'); assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await f.request('/api/health')).json.aiEnabled, false);
});
test('captain can replay after an expired mission; no additional players can join during play', async t => {
  const f = await fixture(t); await f.launch();
  assert.equal((await f.request('/api/join', { name: 'LATE', code: f.host.session.code })).status, 400);
  f.room.deadline = Date.now() - 1;
  await eventually(() => f.host.view.phase === 'lost');
  assert.equal((await f.action(f.host, 'reset')).status, 200);
  await eventually(() => f.crew.every(c => c.view.phase === 'lobby'));
  await f.launch(); assert.equal(f.host.view.phase, 'playing'); assert.equal(f.host.view.completed.length, 0);
});
test('explicit leave ends the mission and invalidates the departing token', async t => {
  const f = await fixture(t); await f.launch();
  assert.equal((await f.action(f.crew[1], 'leave')).status, 200);
  await eventually(() => f.host.view.phase === 'lost');
  assert.equal((await f.request('/api/events', null, f.crew[1].session.token)).status, 401);
});
