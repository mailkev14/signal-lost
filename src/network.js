const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export class Network {
  constructor({ onState, onConnection, onExpired }) {
    this.onState = onState; this.onConnection = onConnection; this.onExpired = onExpired;
    this.session = null; this.controller = null; this.generation = 0;
  }
  async api(path, body, token) {
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) { const error = new Error(result.error || 'The station could not process that command.'); error.status = response.status; throw error; }
    return result;
  }
  async create(name) { return this.api('/api/rooms', { name }); }
  async join(name, code) { return this.api('/api/join', { name, code }); }
  connect(session) {
    this.stop(); this.session = session;
    const generation = ++this.generation;
    this.controller = new AbortController();
    this.streamLoop(session, generation, this.controller.signal);
  }
  async streamLoop(session, generation, signal) {
    let delay = 700;
    while (!signal.aborted && generation === this.generation) {
      try {
        const response = await fetch('/api/events', {
          headers: { Authorization: `Bearer ${session.token}` }, signal, cache: 'no-store',
        });
        if (response.status === 401 || response.status === 403) {
          this.onExpired('Your station session has expired. Join or create a new room.'); return;
        }
        if (!response.ok || !response.body) throw new Error('Signal interrupted');
        if (generation !== this.generation) return;
        this.onConnection(true); delay = 700;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        try {
          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            pending += decoder.decode(value, { stream: true });
            if (pending.length > 262144) throw new Error('Oversized signal');
            let boundary;
            while ((boundary = pending.indexOf('\n\n')) >= 0) {
              const event = pending.slice(0, boundary); pending = pending.slice(boundary + 2);
              const data = event.split('\n').find(line => line.startsWith('data: '));
              if (data && generation === this.generation) this.onState(JSON.parse(data.slice(6)));
            }
          }
        } finally { reader.releaseLock(); }
      } catch (error) {
        if (signal.aborted) return;
      }
      if (signal.aborted || generation !== this.generation) return;
      this.onConnection(false);
      await wait(delay); delay = Math.min(8000, delay * 1.7);
    }
  }
  async action(event, payload = {}) {
    if (!this.session) throw new Error('Join a room first.');
    const token = this.session.token;
    const body = { event, payload, requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}` };
    let result;
    try { result = await this.api('/api/action', body, token); }
    catch (error) {
      if (error.status) throw error;
      // One retry with the SAME command ID. A lost acknowledgement never double-charges a penalty.
      await wait(500);
      result = await this.api('/api/action', body, token);
    }
    if (this.session?.token === token && result.view) this.onState(result.view);
    return result;
  }
  stop() { this.generation++; this.controller?.abort(); this.controller = null; this.session = null; }
}
