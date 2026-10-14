import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, makePlayer, addPlayer, removePlayer, handleAction, startMission, viewFor, operatorId, tickRoom, setConnected, remainingTime, MISSION_MS } from '../shared/engine.js';

const NOW = 1000000;
function roomWithCrew(count = 2, start = true) {
  const room = createRoom('ABC234', makePlayer('p0', 'NOVA', NOW), NOW);
  for (let i = 1; i < count; i++) addPlayer(room, makePlayer(`p${i}`, `CREW ${i}`, NOW), NOW);
  room.players.forEach(p => p.ready = true);
  if (start) startMission(room, 'p0', NOW);
  return room;
}
test('launch requires two connected, ready players and captain authority', () => {
  const room = roomWithCrew(1, false);
  assert.throws(() => startMission(room, 'p0', NOW), /At least two/);
  addPlayer(room, makePlayer('p1', 'ECHO', NOW), NOW);
  assert.throws(() => startMission(room, 'p0', NOW), /ready/);
  room.players.forEach(p => p.ready = true);
  assert.throws(() => startMission(room, 'p1', NOW), /captain/);
  room.players[1].connected = false;
  assert.throws(() => startMission(room, 'p0', NOW), /connected/);
});
test('joining resets readiness, caps the crew at four, and blocks mid-mission joins', () => {
  const room = roomWithCrew(2, false);
  addPlayer(room, makePlayer('p2', 'THIRD', NOW), NOW);
  assert.ok(room.players.every(p => !p.ready));
  addPlayer(room, makePlayer('p3', 'FOURTH', NOW), NOW);
  assert.throws(() => addPlayer(room, makePlayer('p4', 'FIFTH', NOW), NOW), /four crew/);
  room.players.forEach(p => p.ready = true); startMission(room, 'p0', NOW);
  assert.throws(() => addPlayer(room, makePlayer('x', 'NEW', NOW), NOW), /underway/);
});
for (const count of [2, 3, 4]) {
  test(`${count}-player privacy: no answers, operator-only readout, non-overlapping crew intel`, () => {
    const room = roomWithCrew(count);
    for (let round = 0; round < 4; round++) {
      room.index = round;
      const op = operatorId(room);
      const allClues = [];
      for (const player of room.players) {
        const view = viewFor(room, player.id, NOW);
        assert.equal(Object.hasOwn(view, 'puzzles'), false);
        assert.equal(Object.hasOwn(view.current, 'answer'), false);
        assert.equal(Object.hasOwn(view, 'token'), false);
        if (player.id === op) { assert.ok(view.current.console); assert.deepEqual(view.clues, []); }
        else { assert.equal(view.current.console, null); assert.ok(view.clues.length >= 1); allClues.push(...view.clues); }
      }
      assert.equal(allClues.length, 3);
      assert.equal(new Set(allClues.map(c => c.text)).size, 3);
    }
  });
  test(`${count}-player full mission rotates operators and freezes a successful result`, () => {
    const room = roomWithCrew(count);
    for (let round = 0; round < 4; round++) {
      assert.equal(operatorId(room), `p${round % count}`);
      handleAction(room, operatorId(room), 'answer', { moduleId: room.puzzles[round].id, answer: room.puzzles[round].answer }, NOW + (round + 1) * 10000);
      if (round < 3) {
        assert.equal(room.phase, 'between');
        assert.throws(() => handleAction(room, 'p1', 'next', {}, NOW + (round + 1) * 10000 + 1), /captain/);
        handleAction(room, 'p0', 'next', {}, NOW + (round + 1) * 10000 + 2);
      }
    }
    assert.equal(room.phase, 'won'); assert.equal(room.completed.length, 4);
    assert.equal(remainingTime(room, NOW + 500000), MISSION_MS - 40000);
    assert.throws(() => handleAction(room, 'p0', 'answer', { moduleId: 'override', answer: '0000' }, NOW + 51000));
  });
}
test('only the current operator may answer; stale module commands are rejected', () => {
  const room = roomWithCrew();
  assert.throws(() => handleAction(room, 'p1', 'answer', { moduleId: 'reactor', answer: room.puzzles[0].answer }, NOW), /operator/);
  assert.throws(() => handleAction(room, 'p0', 'answer', { moduleId: 'wrong', answer: room.puzzles[0].answer }, NOW), /previous system/);
  assert.equal(room.mistakes, 0);
});
test('malformed input has no penalty; valid wrong answers cost 20 seconds and have a cooldown', () => {
  const room = roomWithCrew();
  assert.throws(() => handleAction(room, 'p0', 'answer', { moduleId: 'reactor', answer: 'INVALID' }, NOW));
  assert.equal(remainingTime(room, NOW), MISSION_MS);
  const wrong = room.puzzles[0].answer.split(',').reverse().join(',');
  handleAction(room, 'p0', 'answer', { moduleId: 'reactor', answer: wrong }, NOW);
  assert.equal(room.mistakes, 1); assert.equal(remainingTime(room, NOW), MISSION_MS - 20000);
  assert.throws(() => handleAction(room, 'p0', 'answer', { moduleId: 'reactor', answer: wrong }, NOW + 100), /reset/);
  assert.equal(room.mistakes, 1);
});
test('hints cost 15 seconds, respect a cooldown, and cap at two per system', () => {
  const room = roomWithCrew();
  handleAction(room, 'p1', 'hint', {}, NOW);
  assert.equal(room.totalHints, 1); assert.equal(remainingTime(room, NOW), MISSION_MS - 15000);
  assert.throws(() => handleAction(room, 'p0', 'hint', {}, NOW + 100), /moment/);
  handleAction(room, 'p0', 'hint', {}, NOW + 5000);
  assert.equal(viewFor(room, 'p0', NOW + 5000).hints.length, 2);
  assert.throws(() => handleAction(room, 'p1', 'hint', {}, NOW + 10000), /already/);
});
test('disconnect pauses the clock; reconnect restores the reserved identity and clock', () => {
  const room = roomWithCrew();
  setConnected(room, 'p1', false, NOW + 10000);
  assert.equal(remainingTime(room, NOW + 30000), MISSION_MS - 10000);
  assert.throws(() => handleAction(room, 'p0', 'hint', {}, NOW + 30000), /paused/);
  setConnected(room, 'p1', true, NOW + 40000);
  assert.equal(room.pausedAt, null);
  assert.equal(remainingTime(room, NOW + 45000), MISSION_MS - 15000);
});
test('disconnect grace cannot be renewed by another offline player or late reconnect', () => {
  const room = roomWithCrew(3);
  setConnected(room, 'p1', false, NOW + 10000);
  const until = room.pauseUntil;
  setConnected(room, 'p2', false, NOW + 30000);
  assert.equal(room.pauseUntil, until);
  setConnected(room, 'p1', true, NOW + 40000);
  assert.equal(room.pauseUntil, until);
  setConnected(room, 'p2', true, NOW + 70001);
  assert.equal(room.phase, 'lost'); assert.match(room.failure, /60 seconds/);
});
test('captain transfers on disconnect and when the first player returns to an empty station', () => {
  const room = roomWithCrew();
  setConnected(room, 'p0', false, NOW + 10000); assert.equal(room.hostId, 'p1');
  setConnected(room, 'p1', false, NOW + 11000);
  setConnected(room, 'p0', true, NOW + 12000); assert.equal(room.hostId, 'p0');
});
test('deadline is authoritative even when an answer arrives before the next interval tick', () => {
  const room = roomWithCrew();
  assert.throws(() => handleAction(room, 'p0', 'answer', { moduleId: 'reactor', answer: room.puzzles[0].answer }, NOW + MISSION_MS));
  assert.equal(room.phase, 'lost'); assert.equal(room.completed.length, 0);
  assert.equal(remainingTime(room, NOW + MISSION_MS), 0);
});
test('a disconnect at the deadline cannot pause an already expired mission', () => {
  const room = roomWithCrew();
  setConnected(room, 'p1', false, NOW + MISSION_MS);
  assert.equal(room.phase, 'lost'); assert.equal(room.pausedAt, null);
});
test('a penalty can immediately end the mission', () => {
  const room = roomWithCrew();
  handleAction(room, 'p0', 'hint', {}, NOW + MISSION_MS - 10000);
  assert.equal(room.phase, 'lost'); assert.equal(remainingTime(room), 0);
});
test('deliberately leaving an active mission fails it for everyone', () => {
  const room = roomWithCrew(); removePlayer(room, 'p1', NOW + 1000);
  assert.equal(room.phase, 'lost'); assert.match(room.failure, /left/); assert.equal(room.players.length, 1);
});
test('lobby reset clears mission identity, old puzzles and readiness', () => {
  const room = roomWithCrew(); tickRoom(room, NOW + MISSION_MS);
  handleAction(room, 'p0', 'reset', {}, NOW + MISSION_MS + 1);
  assert.equal(room.phase, 'lobby'); assert.equal(room.missionId, null); assert.deepEqual(room.puzzles, []);
  assert.ok(room.players.every(p => !p.ready));
});
test('chat is length-limited and bounded; commands are validated', () => {
  const room = roomWithCrew();
  assert.throws(() => handleAction(room, 'p0', 'chat', { text: 'x'.repeat(281) }, NOW));
  assert.throws(() => handleAction(room, 'p0', 'does-not-exist', {}, NOW));
  assert.throws(() => handleAction(room, 'p0', 'chat', null, NOW));
  for (let i = 0; i < 50; i++) handleAction(room, 'p0', 'chat', { text: `message ${i}` }, NOW + i);
  assert.equal(room.messages.length, 40); assert.equal(room.messages[0].text, 'message 10');
});
test('training is explicitly identified and exposes all intel to the local operator', () => {
  const room = roomWithCrew(); room.mode = 'training';
  room.index = 3;
  const view = viewFor(room, 'p0', NOW);
  assert.equal(view.mode, 'training'); assert.equal(view.operatorId, 'p0'); assert.equal(view.clues.length, 3);
});
