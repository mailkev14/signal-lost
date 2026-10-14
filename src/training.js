import { createRoom, makePlayer, addPlayer, startMission, handleAction, tickRoom, viewFor } from '../shared/engine.js';
import { uniqueId } from '../shared/puzzles.js';

/** Explicit local simulation. No network, no AI request, no pretend human players. */
export class Training {
  constructor(name, onState) {
    this.onState = onState;
    this.me = uniqueId();
    const host = makePlayer(this.me, name || 'CADET');
    this.room = createRoom('SOLO', host, Date.now(), 'training');
    addPlayer(this.room, makePlayer('atlas-simulator', 'ATLAS / simulator'));
    this.room.players.forEach(p => p.ready = true);
    startMission(this.room, this.me);
    this.emit();
    this.timer = setInterval(() => { tickRoom(this.room); this.emit(); }, 500);
  }
  emit() { this.onState(viewFor(this.room, this.me)); }
  async action(event, payload) { handleAction(this.room, this.me, event, payload); this.emit(); }
  stop() { clearInterval(this.timer); }
}
