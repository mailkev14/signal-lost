import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/icons.js';
import { formatTime, homeView, roomView } from '../src/views.js';
import { createRoom, makePlayer, addPlayer, startMission, handleAction, viewFor } from '../shared/engine.js';
const ui = { name: '"><img src=x onerror=alert(1)>', code: 'ABC234', homeMode: 'join', offline: false, connected: true, answer: '', sequence: [], chat: '<script>bad</script>' };
test('callsigns, input values and chat are escaped in rendered templates', () => {
  const home = homeView(ui);
  assert.ok(!home.includes('<img src=x onerror'));
  assert.ok(home.includes('&lt;img'));
  const room = createRoom('ABC234', makePlayer('p0', '<img src=x>'));
  addPlayer(room, makePlayer('p1', 'SECOND'));
  handleAction(room, 'p0', 'chat', { text: '<svg onload=alert(1)>' });
  const html = roomView(viewFor(room, 'p0'), ui);
  assert.ok(!html.includes('<img src=x>')); assert.ok(!html.includes('<svg onload='));
  assert.ok(html.includes('&lt;svg onload=')); assert.ok(html.includes('&lt;script&gt;bad'));
});
test('clock rounds up, clamps zero and formats whole minutes', () => {
  assert.equal(formatTime(480000), '08:00'); assert.equal(formatTime(1), '00:01');
  assert.equal(formatTime(0), '00:00'); assert.equal(formatTime(-400), '00:00');
});
test('expert view contains private intel but never operative controls', () => {
  const room = createRoom('ABC234', makePlayer('p0', 'NOVA'));
  addPlayer(room, makePlayer('p1', 'ECHO')); room.players.forEach(p => p.ready = true); startMission(room, 'p0');
  const html = roomView(viewFor(room, 'p1'), ui);
  assert.ok(html.includes('YOUR PRIVATE INTEL')); assert.ok(html.includes('has the console.'));
  assert.ok(!html.includes('data-action="submit-answer"')); assert.ok(!html.includes('class="glyph-grid"'));
});
test('escaping covers quotes, apostrophes and ampersands', () => {
  assert.equal(escapeHtml('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
});
