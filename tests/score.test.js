import test from 'node:test';
import assert from 'node:assert/strict';
import { missionGrade } from '../shared/score.js';
test('mission grade rewards speed and penalizes mistakes and hints', () => {
  const base = { phase: 'won', completed: [{}, {}, {}, {}], remainingMs: 360000, mistakes: 0, totalHints: 0 };
  assert.equal(missionGrade(base).rank, 'EXPERT');
  assert.ok(missionGrade(base).score > missionGrade({ ...base, mistakes: 2 }).score);
  assert.ok(missionGrade(base).score > missionGrade({ ...base, totalHints: 2 }).score);
  assert.equal(missionGrade({ ...base, phase: 'lost' }).rank, 'INCOMPLETE');
  assert.equal(missionGrade({ ...base, remainingMs: 999999 }).score, 100);
});
