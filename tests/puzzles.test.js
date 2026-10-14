import test from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzles, normalizeAnswer, SYMBOLS, randomInt } from '../shared/puzzles.js';

function seeded(seed) {
  let state = seed >>> 0;
  return max => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % max; };
}
function solveFromClues(puzzle) {
  const [a, b, c] = puzzle.clues.map(clue => clue.text);
  if (puzzle.kind === 'sequence') {
    const first = a.match(/^(\w+) begins/)[1];
    const [, second, third] = b.match(/^(\w+) must be followed immediately by (\w+)/);
    const last = c.match(/^(\w+) is always/)[1];
    return [first, second, third, last].join(',');
  }
  if (puzzle.kind === 'frequency') {
    const base = Number(a.match(new RegExp(`${puzzle.console.detail}: (\\d+)`))[1]);
    const gain = Number(b.match(/by (\d+)/)[1]);
    const [, operation, drift] = c.match(/(ADD|SUBTRACT) (\d+)/);
    return String(base * gain + (operation === 'ADD' ? 1 : -1) * Number(drift));
  }
  if (puzzle.kind === 'grid') {
    const [, row, col] = a.match(/Begin at ([A-E])([1-5])/);
    const dy = Number(b.match(/Move (\d+)/)[1]) * (b.includes('UP') ? -1 : 1);
    const dx = Number(c.match(/Move (\d+)/)[1]) * (c.includes('LEFT') ? -1 : 1);
    return String.fromCharCode(row.charCodeAt(0) + dy) + (Number(col) + dx);
  }
  const digits = a.match(/packet is (\d{4})/)[1].split('').map(Number);
  const shifted = b.includes('RIGHT TO LEFT') ? digits.reverse() : b.includes('FIRST digit') ? [...digits.slice(1), digits[0]] : [digits[0], digits[2], digits[1], digits[3]];
  const shift = Number(c.match(/ADD (\d+)/)[1]);
  return shifted.map(n => (n + shift) % 10).join('');
}

test('1,000 generated missions have four valid, independently solvable puzzles', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const puzzles = makePuzzles(seeded(seed));
    assert.equal(puzzles.length, 4);
    for (const puzzle of puzzles) {
      assert.equal(puzzle.clues.length, 3);
      assert.equal(puzzle.hints.length, 2);
      assert.equal(solveFromClues(puzzle), puzzle.answer, `seed=${seed}, kind=${puzzle.kind}`);
      assert.equal(normalizeAnswer(puzzle, puzzle.answer), puzzle.answer);
    }
  }
});
test('reactor constraints have exactly one solution among all distinct four-symbol sequences', () => {
  const symbols = SYMBOLS.map(s => s.id);
  for (let seed = 1; seed <= 80; seed++) {
    const puzzle = makePuzzles(seeded(seed))[0];
    const [first, second, third, last] = solveFromClues(puzzle).split(',');
    let valid = 0;
    for (const a of symbols) for (const b of symbols) for (const c of symbols) for (const d of symbols) {
      const sequence = [a, b, c, d];
      if (new Set(sequence).size !== 4) continue;
      if (a === first && d === last && sequence.indexOf(third) === sequence.indexOf(second) + 1 && sequence.includes(second)) valid++;
    }
    assert.equal(valid, 1);
  }
});
test('all pin transformations and leading-zero answers occur across the generator', () => {
  const types = new Set(); let leadingZero = false;
  for (let seed = 1; seed <= 1000; seed++) {
    const puzzle = makePuzzles(seeded(seed))[3];
    types.add(puzzle.clues[1].text); leadingZero ||= puzzle.answer.startsWith('0');
  }
  assert.equal(types.size, 3); assert.equal(leadingZero, true);
});
test('answer validation rejects malformed input without accepting alternate formats', () => {
  const puzzles = makePuzzles(seeded(42));
  assert.throws(() => normalizeAnswer(puzzles[0], 'NOVA,NOVA,NOVA,NOVA'));
  assert.throws(() => normalizeAnswer(puzzles[1], '12'));
  assert.throws(() => normalizeAnswer(puzzles[1], 123));
  assert.throws(() => normalizeAnswer(puzzles[2], 'F6'));
  assert.throws(() => normalizeAnswer(puzzles[3], '00000'));
  assert.equal(normalizeAnswer(puzzles[2], ' a1 '), 'A1');
});
test('secure RNG validates bounds and stays in bounds', () => {
  assert.throws(() => randomInt(0)); assert.throws(() => randomInt(1.5));
  for (let i = 0; i < 100; i++) { const n = randomInt(6); assert.ok(n >= 0 && n < 6); }
});
