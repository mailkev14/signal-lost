import test from 'node:test';
import assert from 'node:assert/strict';
import { MissionDirector } from '../server/briefing.js';
const completed = text => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ text }) }] }] }), { status: 200 });
test('director reacts with bounded structured server-side prompt', async () => {
  let body;
  const director = new MissionDirector({ enabled: true, apiKey: 'secret', fetchImpl: async (_, options) => { body = JSON.parse(options.body); return completed('The recovered reactor pulses gently, casting new light across the shattered corridors of Meridian Station.'); } });
  const reaction = await director.react({ event: 'restored', sector: 'Reactor', mistakes: 2 });
  assert.equal(reaction.source, 'openai');
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.ok(!JSON.stringify(body).includes('secret'));
});
test('director uses written fallback without key and on malformed output', async () => {
  assert.equal((await new MissionDirector({ enabled: false }).react({ event: 'victory', sector: 'Airlock' })).source, 'written');
  const director = new MissionDirector({ enabled: true, apiKey: 'key', fetchImpl: async () => completed('bad') });
  assert.equal((await director.react({ event: 'mistake', sector: 'Comms' })).source, 'written');
});
