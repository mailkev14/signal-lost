import { DEFAULT_BRIEFING } from '../shared/engine.js';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

function providerConfig(provider) {
  if (!['openai', 'gemini'].includes(provider)) throw new Error('AI_PROVIDER must be openai or gemini.');
  return provider;
}

async function requestNarration({ provider, apiKey, model, fetchImpl, system, user, schema, maxTokens, timeout }) {
  if (provider === 'gemini') {
    const response = await fetchImpl(`${GEMINI_ENDPOINT}${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: Object.fromEntries(Object.keys(schema.properties).map(k => [k, { type: 'STRING' }])), required: schema.required }, maxOutputTokens: maxTokens, temperature: 0.8 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (candidate?.finishReason !== 'STOP') throw new Error('Provider response incomplete');
    const raw = candidate.content?.parts?.filter(part => typeof part.text === 'string').map(part => part.text).join('') || '';
    const parsed = JSON.parse(raw);

    return parsed;
  }
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({ model, store: false, max_output_tokens: maxTokens, input: [{ role: 'system', content: system }, { role: 'user', content: user }], text: { format: { type: 'json_schema', name: schema.name, strict: true, schema: { type: 'object', additionalProperties: false, properties: schema.properties, required: schema.required } } } }),
  });
  if (!response.ok) throw new Error('Provider request failed');
  const data = await response.json();
  if (data.status !== 'completed') throw new Error('Provider response incomplete');
  const raw = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
  const parsed = JSON.parse(raw);

  return parsed;
}


/** Optional flavor only: the model never receives clues, answers, names, or chat. */
export class BriefingService {
  constructor({
    enabled = process.env.ENABLE_AI_BRIEFINGS === 'true',
    provider = process.env.AI_PROVIDER || 'openai',
    apiKey,
    model,
    maxCalls = Number(process.env.AI_MAX_CALLS_PER_HOUR || 10),
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
  } = {}) {
    this.provider = providerConfig(provider);
    this.apiKey = apiKey ?? (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY) ?? '';
    this.model = model ?? (provider === 'gemini' ? process.env.GEMINI_MODEL || 'gemini-2.5-flash' : process.env.OPENAI_MODEL || 'gpt-4.1-mini');
    this.enabled = enabled && Boolean(this.apiKey);
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
      const result = await requestNarration({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model,
        fetchImpl: this.fetchImpl,
        timeout: this.provider === 'gemini' ? 15000 : 8000,
        maxTokens: this.provider === 'gemini' ? 1024 : 240,
        system: 'Write a PG-rated opening briefing for Signal Lost, a cooperative space-station escape puzzle game. Meridian Station is damaged. The crew must restore reactor, comms, navigation, and airlock override. Write atmospheric fiction, NOT instructions, solutions, numbers, time limits, new mechanics, or dialogue. Title: at most 48 characters. Story: 35-65 words, at most 500 characters. Avoid gore and IP references.',
        user: 'Give this crew a fresh mission opening. The story is flavor only; the game rules do not change.',
        schema: { name: 'mission_briefing', properties: { title: { type: 'string' }, story: { type: 'string' } }, required: ['title', 'story'] },
      });
      if (typeof result.title !== 'string' || result.title.trim().length < 1 || result.title.length > 48 ||
          typeof result.story !== 'string' || result.story.trim().length < 20 || result.story.length > 500) {
        throw new Error('Invalid briefing');
      }
      const briefing = {
        title: result.title.trim(),
        story: result.story.trim(),
        source: this.provider,
      };

      return briefing;
    } catch {
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
      const result = await requestNarration({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model,
        fetchImpl: this.fetchImpl,
        timeout: this.provider === 'gemini' ? 12000 : 6000,
        maxTokens: this.provider === 'gemini' ? 512 : 110,
        system: 'You are the mission director for Signal Lost, a PG-rated cooperative space-station escape game. Respond to a game milestone with exactly one vivid sentence of 12-30 words. Never add rules, clues, solutions, numbers, dialogue, instructions, or consequences. No gore. The game engine alone decides outcomes.',
        user: `Milestone: ${event}; system: ${sector}; wrong attempts so far: ${Math.min(20, Math.max(0, Number(mistakes) || 0))}. Write only a narrative reaction.`,
        schema: { name: 'director_reaction', properties: { text: { type: 'string' } }, required: ['text'] },
      });
      const text = result.text;
      if (typeof text !== 'string' || text.length < 35 || text.length > 240 || /[\r\n]/.test(text)) throw new Error('Invalid reaction');
      return { text: text.trim(), source: this.provider };
    } catch {
      return { text: fallback, source: 'written' };
    }
  }
}
