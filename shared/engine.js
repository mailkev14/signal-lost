import { makePuzzles, MODULES, uniqueId, normalizeAnswer } from './puzzles.js';

export const MISSION_MS = 8 * 60 * 1000;
export const RECONNECT_MS = 60 * 1000;
export const WRONG_PENALTY_MS = 20 * 1000;
export const HINT_PENALTY_MS = 15 * 1000;
export const DEFAULT_BRIEFING = Object.freeze({
  title: 'The quiet after the impact',
  story: 'An uncharted debris cloud has knocked Meridian Station off course. The escape craft is intact, but four systems stand between your crew and open space. Your consoles are fragmented. Your only complete system is each other.',
  source: 'written',
});
const activePhase = phase => phase === 'playing' || phase === 'between';
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

export function makePlayer(id, name, now = Date.now()) {
  return { id, name, ready: false, connected: true, disconnectedAt: null, joinedAt: now };
}
export function createRoom(code, host, now = Date.now(), mode = 'online') {
  return {
    code, mode, hostId: host.id, players: [host], phase: 'lobby', version: 1,
    createdAt: now, updatedAt: now, lastActivity: now,
    index: 0, puzzles: [], deadline: null, pausedAt: null, pauseUntil: null,
    frozenRemaining: MISSION_MS, mistakes: 0, totalHints: 0, hintCounts: [0, 0, 0, 0],
    lastHintAt: -Infinity, lastGuessAt: -Infinity, completed: [], messages: [], events: [],
    briefing: { ...DEFAULT_BRIEFING }, briefingLoading: false, director: null, missionId: null, failure: '',
  };
}
export function touch(room, now) {
  room.version++;
  room.updatedAt = now;
  room.lastActivity = now;
}
function logEvent(room, text, kind, now) {
  room.events.push({ id: uniqueId(), text, kind, at: now });
  room.events = room.events.slice(-16);
}
export function addPlayer(room, player, now = Date.now()) {
  ensure(room.phase === 'lobby', 'A mission is already underway. Join after the crew returns to the lobby.');
  ensure(room.players.length < 4, 'This room already has four crew members.');
  ensure(!room.players.some(p => p.id === player.id), 'You are already in this room.');
  room.players.push(player);
  // Any roster change clears readiness so players knowingly accept the new crew.
  room.players.forEach(p => p.ready = false);
  touch(room, now);
}
export function removePlayer(room, playerId, now = Date.now()) {
  if (activePhase(room.phase)) {
    failMission(room, 'A crew member left the mission. Return to the lobby to assemble a new crew.', now);
  }
  room.players = room.players.filter(p => p.id !== playerId);
  room.players.forEach(p => p.ready = false);
  if (room.hostId === playerId) room.hostId = room.players.find(p => p.connected)?.id ?? room.players[0]?.id ?? '';
  touch(room, now);
}
export function remainingTime(room, now = Date.now()) {
  if (room.phase === 'lobby') return MISSION_MS;
  if (!activePhase(room.phase)) return room.frozenRemaining;
  return Math.max(0, room.deadline - (room.pausedAt ?? now));
}
function failMission(room, reason, now) {
  room.frozenRemaining = remainingTime(room, now);
  room.phase = 'lost';
  room.failure = reason;
  room.pausedAt = null;
  room.pauseUntil = null;
  logEvent(room, reason, 'error', now);
  touch(room, now);
}
export function tickRoom(room, now = Date.now()) {
  if (!activePhase(room.phase)) return;
  if (room.pausedAt !== null && now >= room.pauseUntil) {
    failMission(room, 'The crew link was lost for more than 60 seconds. Reassemble and try again.', now);
  } else if (remainingTime(room, now) <= 0) {
    room.frozenRemaining = 0;
    failMission(room, 'The escape window closed. Your next mission starts with what you learned.', now);
  }
}
export function setConnected(room, playerId, connected, now = Date.now()) {
  // Settle elapsed time before pausing: reconnects cannot revive an expired mission.
  tickRoom(room, now);
  const player = room.players.find(p => p.id === playerId);
  if (!player || player.connected === connected) return;
  player.connected = connected;
  player.disconnectedAt = connected ? null : now;
  if ((!connected && room.hostId === playerId) || !room.players.find(p => p.id === room.hostId)?.connected) {
    room.hostId = room.players.find(p => p.connected)?.id ?? room.hostId;
  }
  if (activePhase(room.phase)) {
    const missing = room.players.filter(p => !p.connected);
    if (missing.length && room.pausedAt === null) {
      room.pausedAt = now;
      room.pauseUntil = now + RECONNECT_MS;
      logEvent(room, 'Crew link interrupted. Mission clock paused for up to 60 seconds.', 'info', now);
    } else if (!missing.length && room.pausedAt !== null) {
      room.deadline += now - room.pausedAt;
      room.pausedAt = null;
      room.pauseUntil = null;
      logEvent(room, 'All crew links restored. Mission clock resumed.', 'success', now);
    }
  }
  touch(room, now);
}
export function operatorId(room) {
  return room.mode === 'training' ? room.players[0].id : room.players[room.index % room.players.length]?.id;
}
export function startMission(room, actorId, now = Date.now(), puzzles = makePuzzles()) {
  ensure(room.phase === 'lobby', 'Return to the lobby before starting another mission.');
  ensure(actorId === room.hostId, 'Only the captain can launch the mission.');
  ensure(room.players.length >= 2, 'At least two crew members are required. Try solo training to practice.');
  ensure(room.players.every(p => p.connected && p.ready), 'Every crew member must be connected and ready.');
  room.phase = 'playing'; room.index = 0; room.puzzles = puzzles;
  room.deadline = now + MISSION_MS; room.pausedAt = null; room.pauseUntil = null;
  room.frozenRemaining = MISSION_MS; room.mistakes = 0; room.totalHints = 0;
  room.hintCounts = [0, 0, 0, 0]; room.lastHintAt = -Infinity; room.lastGuessAt = -Infinity;
  room.completed = []; room.events = []; room.failure = ''; room.missionId = uniqueId();
  room.briefing = { ...DEFAULT_BRIEFING }; room.briefingLoading = false; room.director = null;
  logEvent(room, 'Mission launched. Restore all four systems before the escape window closes.', 'info', now);
  touch(room, now);
}
export function handleAction(room, actorId, event, payload = {}, now = Date.now()) {
  tickRoom(room, now);
  const actor = room.players.find(p => p.id === actorId);
  ensure(actor && actor.connected, 'Reconnect to the room before sending commands.');
  ensure(typeof payload === 'object' && payload !== null && !Array.isArray(payload), 'Invalid command.');
  if (event === 'ready') {
    ensure(room.phase === 'lobby', 'Readiness can only change in the lobby.');
    ensure(typeof payload.ready === 'boolean', 'Choose ready or not ready.');
    actor.ready = payload.ready;
  } else if (event === 'start') {
    startMission(room, actorId, now);
    return;
  } else if (event === 'chat') {
    ensure(typeof payload.text === 'string', 'Enter a message.');
    const text = payload.text.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
    ensure(text.length >= 1 && text.length <= 280, 'Messages must be 1-280 characters.');
    room.messages.push({ id: uniqueId(), playerId: actor.id, name: actor.name, text, at: now });
    room.messages = room.messages.slice(-40);
  } else if (event === 'reset') {
    ensure(actorId === room.hostId, 'Only the captain can return everyone to the lobby.');
    ensure(room.phase === 'won' || room.phase === 'lost', 'Finish the current mission first.');
    room.phase = 'lobby'; room.players.forEach(p => p.ready = false);
    room.puzzles = []; room.index = 0; room.completed = []; room.events = [];
    room.deadline = null; room.pausedAt = null; room.pauseUntil = null;
    room.missionId = null; room.briefingLoading = false; room.director = null; room.briefing = { ...DEFAULT_BRIEFING };
  } else if (event === 'next') {
    ensure(actorId === room.hostId, 'Only the captain can activate the next system.');
    ensure(room.phase === 'between', 'There is no next system ready yet.');
    ensure(room.pausedAt === null, 'Wait for the missing crew member to reconnect.');
    room.index++;
    room.phase = 'playing';
    room.lastGuessAt = -Infinity; room.lastHintAt = -Infinity;
    logEvent(room, `${room.puzzles[room.index].title} online. A new operator has the console.`, 'info', now);
  } else if (event === 'answer') {
    ensure(room.phase === 'playing', 'This system is not accepting commands.');
    ensure(room.pausedAt === null, 'The mission is paused until all crew reconnect.');
    ensure(actorId === operatorId(room), 'Only the current operator can submit an answer. Share your clues with them.');
    ensure(payload.moduleId === room.puzzles[room.index].id, 'That command belongs to a previous system.');
    ensure(now - room.lastGuessAt >= 1200, 'Let the console reset for a moment.');
    const puzzle = room.puzzles[room.index];
    const answer = normalizeAnswer(puzzle, payload.answer);
    room.lastGuessAt = now;
    if (answer === puzzle.answer) {
      room.completed.push({ id: puzzle.id, title: puzzle.title, answerLabel: puzzle.answerLabel });
      logEvent(room, `${puzzle.title} restored. ${puzzle.answerLabel}.`, 'success', now);
      if (room.index === room.puzzles.length - 1) {
        room.frozenRemaining = remainingTime(room, now);
        room.phase = 'won';
        logEvent(room, 'Escape confirmed. Every signal mattered.', 'success', now);
      } else room.phase = 'between';
    } else {
      room.mistakes++;
      room.deadline -= WRONG_PENALTY_MS;
      logEvent(room, 'Signal rejected. 20 seconds lost. Recheck the crew\'s instructions.', 'error', now);
      tickRoom(room, now);
    }
  } else if (event === 'hint') {
    ensure(room.phase === 'playing', 'Hints are available during an active system.');
    ensure(room.pausedAt === null, 'The mission is paused until all crew reconnect.');
    ensure(room.hintCounts[room.index] < 2, 'Both hints for this system have already been used.');
    ensure(now - room.lastHintAt >= 4000, 'Give the crew a moment to read the last hint.');
    room.lastHintAt = now;
    room.hintCounts[room.index]++; room.totalHints++;
    room.deadline -= HINT_PENALTY_MS;
    logEvent(room, 'Recovery hint requested. 15 seconds spent.', 'info', now);
    tickRoom(room, now);
  } else throw new Error('Unknown command.');
  touch(room, now);
}

/** Per-player projection. Do not spread the room or puzzle into this response. */
export function viewFor(room, playerId, now = Date.now()) {
  const puzzle = room.puzzles[room.index];
  const opId = puzzle ? operatorId(room) : null;
  const experts = room.players.filter(p => p.id !== opId);
  const myExpertIndex = experts.findIndex(p => p.id === playerId);
  const myClues = !puzzle ? [] : room.mode === 'training' ? puzzle.clues :
    myExpertIndex < 0 ? [] : puzzle.clues.filter((_, i) => i % experts.length === myExpertIndex);
  const consoleVisible = room.mode === 'training' || opId === playerId;
  return {
    code: room.code, mode: room.mode, phase: room.phase, version: room.version,
    meId: playerId, hostId: room.hostId,
    players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, connected: p.connected })),
    index: room.index, modules: MODULES, operatorId: opId,
    current: puzzle ? {
      id: puzzle.id, title: puzzle.title, kind: puzzle.kind, subtitle: puzzle.subtitle,
      instructions: puzzle.instructions, console: consoleVisible ? puzzle.console : null,
    } : null,
    clues: myClues, completed: room.completed.map(c => ({ ...c })),
    hints: puzzle ? puzzle.hints.slice(0, room.hintCounts[room.index]) : [],
    mistakes: room.mistakes, totalHints: room.totalHints,
    remainingMs: remainingTime(room, now), serverNow: now,
    paused: room.pausedAt !== null,
    pauseRemainingMs: room.pauseUntil ? Math.max(0, room.pauseUntil - now) : 0,
    missing: room.players.filter(p => !p.connected).map(p => p.name),
    briefing: { ...room.briefing }, briefingLoading: room.briefingLoading, director: room.director ? { ...room.director } : null,
    messages: room.messages.map(m => ({ ...m })), events: room.events.map(e => ({ ...e })),
    failure: room.failure,
  };
}
