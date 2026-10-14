import { DEFAULT_BRIEFING } from '../shared/engine.js';

/** Optional flavor only: the model never receives clues, answers, names, or chat. */
export class BriefingService {
  constructor({
    enabled = process.env.ENABLE_AI_BRIEFINGS === 'true',
    apiKey = process.env.OPENAI_API_KEY || '',
    model = process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    maxCalls = Number(process.env.AI_MAX_CALLS_PER_HOUR || 10),
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
  } = {}) {
    this.enabled = enabled && Boolean(apiKey);
    this.apiKey = apiKey;
    this.model = model;
    this.maxCalls = Number.isFinite(maxCalls) ? Math.max(0, Math.min(1000, maxCalls)) : 10;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.calls = [];
  }
  async generate() {
    const now = this.now();
    this.calls = this.calls.filter(t => now - t < 3600000);
    if (!this.enabled || this.calls.length >= this.maxCalls) return { ...DEFAULT_BRIEFING };
    this.calls.push(now); // Count attempts, not only successful calls.
    try {
      const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: this.model,
          store: false,
          max_output_tokens: 240,
          input: [
            { role: 'system', content: 'Write a PG-rated opening briefing for Signal Lost, a cooperative space-station escape puzzle game. Meridian Station is damaged. The crew must restore reactor, comms, navigation, and airlock override. Write atmospheric fiction, NOT instructions, solutions, numbers, time limits, new mechanics, or dialogue. Title: at most 48 characters. Story: 35-65 words, at most 500 characters. Avoid gore and IP references.' },
            { role: 'user', content: 'Give this crew a fresh mission opening. The story is flavor only; the game rules do not change.' },
          ],
          text: { format: {
            type: 'json_schema', name: 'mission_briefing', strict: true,
            schema: {
              type: 'object', additionalProperties: false,
              properties: { title: { type: 'string' }, story: { type: 'string' } },
              required: ['title', 'story'],
            },
          } },
        }),
      });
      if (!response.ok) throw new Error('Provider request failed');
      const data = await response.json();
      if (data.status !== 'completed') throw new Error('Provider response incomplete');
      const text = (data.output || []).flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text').map(item => item.text).join('');
      const result = JSON.parse(text);
      if (typeof result.title !== 'string' || result.title.trim().length < 1 || result.title.length > 48 ||
          typeof result.story !== 'string' || result.story.trim().length < 20 || result.story.length > 500) {
        throw new Error('Invalid briefing');
      }
      return { title: result.title.trim(), story: result.story.trim(), source: 'openai' };
    } catch {
      // Never expose provider bodies, secrets, or rate-limit details to players.
      return { ...DEFAULT_BRIEFING };
    }
  }
}


/** Optional, bounded narrative reactions. No player content or puzzle secrets are sent. */
export class MissionDirector extends BriefingService {
  async react({ event, sector, mistakes = 0 }) {
    const fallback = {
      restored: 'A tremor moves through Meridian Station as another system returns to life. The crew pushes onward.',
      mistake: 'The console rejects the command. Static swallows the channel, but the crew still has a chance.',
      victory: 'The last lock releases. The station answers with a clear signal, and the crew is finally safe.',
      defeat: 'The station fades into silence. The crew gave everything, but the signal is lost this time.',
    }[event] || 'Meridian Station waits for the next command.';
    const now = this.now();
    this.calls = this.calls.filter(t => now - t < 3600000);
    if (!this.enabled || this.calls.length >= this.maxCalls) return { text: fallback, source: 'written' };
    this.calls.push(now);
    try {
      const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          model: this.model, store: false, max_output_tokens: 110,
          input: [
            { role: 'system', content: 'You are the mission director for Signal Lost, a PG-rated cooperative space-station escape game. Respond to a game milestone with exactly one vivid sentence of 12-30 words. Never add rules, clues, solutions, numbers, dialogue, instructions, or consequences. No gore. The game engine alone decides outcomes.' },
            { role: 'user', content: `Milestone: ${event}; system: ${sector}; wrong attempts so far: ${Math.min(20, Math.max(0, Number(mistakes) || 0))}. Write only a narrative reaction.` },
          ],
          text: { format: { type: 'json_schema', name: 'director_reaction', strict: true,
            schema: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' } }, required: ['text'] } } },
        }),
      });
      if (!response.ok) throw new Error('Provider request failed');
      const data = await response.json();
      if (data.status !== 'completed') throw new Error('Incomplete response');
      const raw = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
      const text = JSON.parse(raw).text;
      if (typeof text !== 'string' || text.length < 35 || text.length > 240 || /[\r\n]/.test(text)) throw new Error('Invalid reaction');
      return { text: text.trim(), source: 'openai' };
    } catch { return { text: fallback, source: 'written' }; }
  }
}
