import test from 'node:test';
import assert from 'node:assert/strict';
import { BriefingService } from '../server/briefing.js';
const completed = value => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }), { status: 200 });
test('no key or disabled AI uses a written briefing without a network call', async () => {
  const fail = () => { throw new Error('Must not call'); };
  assert.equal((await new BriefingService({ enabled: false, apiKey: 'test', fetchImpl: fail }).generate()).source, 'written');
  assert.equal((await new BriefingService({ enabled: true, apiKey: '', fetchImpl: fail }).generate()).source, 'written');
});
test('structured Responses request is server-only, schema-constrained, bounded, and not stored', async () => {
  let request;
  const service = new BriefingService({ enabled: true, apiKey: 'test-only', fetchImpl: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return completed({ title: 'A light in the dark', story: 'The station turns silently above the clouds. Somewhere beyond the static, a crew is listening for the last clear signal.' });
  } });
  const result = await service.generate();
  assert.equal(result.source, 'openai');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false); assert.equal(request.body.max_output_tokens, 240);
  assert.equal(request.body.text.format.strict, true);
  assert.equal(request.options.headers.Authorization, 'Bearer test-only');
  assert.deepEqual(Object.keys(result).sort(), ['source', 'story', 'title']);
});
test('provider errors, refusals, malformed output and overlong text fall back safely', async () => {
  const cases = [
    () => new Response('unavailable', { status: 503 }),
    () => { throw new Error('network down'); },
    () => new Response(JSON.stringify({ status: 'incomplete', output: [] })),
    () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] })),
    () => completed({ title: 'x'.repeat(60), story: 'A valid enough story, but a title that is far too long.' }),
    () => completed({ title: 'Brief', story: 'x'.repeat(501) }),
  ];
  for (const fetchImpl of cases) {
    const service = new BriefingService({ enabled: true, apiKey: 'test-only', fetchImpl });
    assert.equal((await service.generate()).source, 'written');
  }
});
test('hourly budget counts failed attempts and recovers after the hour', async () => {
  let now = 0, calls = 0;
  const service = new BriefingService({ enabled: true, apiKey: 'test', maxCalls: 2, now: () => now, fetchImpl: async () => { calls++; throw new Error('failed'); } });
  await service.generate(); await service.generate(); await service.generate();
  assert.equal(calls, 2);
  now = 3600001; await service.generate(); assert.equal(calls, 3);
});

test('Gemini briefing uses server-side key and structured JSON output', async () => {
  let request;
  const service = new BriefingService({ provider: 'gemini', enabled: true, apiKey: 'gemini-test-key', model: 'gemini-2.5-flash', fetchImpl: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ title: 'A light in the dark', story: 'The station turns silently above the clouds. Somewhere beyond the static, a crew is listening for the last clear signal.' }) }] } }] }), { status: 200 });
  } });
  const result = await service.generate();
  assert.equal(result.source, 'gemini');
  assert.match(request.url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(request.options.headers['x-goog-api-key'], 'gemini-test-key');
  assert.equal(request.body.generationConfig.responseMimeType, 'application/json');
  assert.ok(!JSON.stringify(request.body).includes('gemini-test-key'));
});

test('Gemini errors and blocked responses fall back to written briefing', async () => {
  for (const fetchImpl of [async () => new Response('quota', { status: 429 }), async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }))]) {
    const service = new BriefingService({ provider: 'gemini', enabled: true, apiKey: 'test', fetchImpl });
    assert.equal((await service.generate()).source, 'written');
  }
});
