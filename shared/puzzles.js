/** Pure puzzle generation; answers are NEVER included in network views. */
export const SYMBOLS = Object.freeze([
  { id: 'NOVA', shape: 'star' },
  { id: 'ORBIT', shape: 'orbit' },
  { id: 'ECHO', shape: 'wave' },
  { id: 'FLARE', shape: 'bolt' },
  { id: 'APEX', shape: 'triangle' },
  { id: 'HALO', shape: 'ring' },
]);
export const MODULES = Object.freeze([
  { id: 'reactor', title: 'Reactor sequence', short: 'Reactor', sector: '01', kind: 'sequence', subtitle: 'Bring the station back to life.' },
  { id: 'comms', title: 'Frequency lock', short: 'Comms', sector: '02', kind: 'frequency', subtitle: 'Find a voice in the static.' },
  { id: 'navigation', title: 'Escape vector', short: 'Navigation', sector: '03', kind: 'grid', subtitle: 'Chart a course through the debris.' },
  { id: 'override', title: 'Final override', short: 'Override', sector: '04', kind: 'pin', subtitle: 'Tell the station to let you go.' },
]);

/** Uniform random integer in [0, max). Rejection sampling avoids modulo bias. */
export function randomInt(max) {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new Error('Invalid random bound');
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % max;
}
export function shuffled(items, rand = randomInt) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function uniqueId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** @param {(max: number) => number} rand Inject a deterministic RNG in tests only. */
export function makePuzzles(rand = randomInt) {
  const sequence = shuffled(SYMBOLS.map(s => s.id), rand).slice(0, 4);
  const carrierNames = ['KESTREL', 'MIRA', 'POLARIS'];
  const carriers = shuffled(Array.from({ length: 15 }, (_, i) => 120 + i * 10), rand).slice(0, 3);
  const beaconIndex = rand(3);
  const base = carriers[beaconIndex];
  const gain = rand(2) + 2;
  const drift = (rand(2) ? 1 : -1) * (rand(9) + 1);
  const frequency = base * gain + drift;

  const originRow = rand(5), originCol = rand(5);
  const rowMoves = [-2, -1, 1, 2].filter(d => originRow + d >= 0 && originRow + d < 5);
  const colMoves = [-2, -1, 1, 2].filter(d => originCol + d >= 0 && originCol + d < 5);
  const dy = rowMoves[rand(rowMoves.length)], dx = colMoves[rand(colMoves.length)];
  const destination = String.fromCharCode(65 + originRow + dy) + (originCol + dx + 1);
  const origin = String.fromCharCode(65 + originRow) + (originCol + 1);

  const packet = shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rand).slice(0, 4);
  const transforms = [
    { label: 'Read the raw packet RIGHT TO LEFT.', run: d => [...d].reverse() },
    { label: 'Move the FIRST digit to the END. Keep the other three in order.', run: d => [...d.slice(1), d[0]] },
    { label: 'Swap the TWO MIDDLE digits. Keep the first and last in place.', run: d => [d[0], d[2], d[1], d[3]] },
  ];
  const transform = transforms[rand(transforms.length)];
  const shift = rand(4) + 1;
  const reordered = transform.run(packet);
  const pin = reordered.map(d => (d + shift) % 10).join('');

  return [
    {
      ...MODULES[0],
      instructions: 'Transmit four DIFFERENT symbols in the correct order. Your crew has the ignition rules.',
      console: { label: 'IGNITION ARRAY', detail: 'FOUR SIGNALS / NO REPEATS', symbols: SYMBOLS },
      clues: [
        { label: 'Starting signal', text: `${sequence[0]} begins the four-signal ignition chain.` },
        { label: 'Linked signals', text: `${sequence[1]} must be followed immediately by ${sequence[2]}. They stay together, in that order.` },
        { label: 'Closing signal', text: `${sequence[3]} is always transmitted LAST.` },
      ],
      hints: [
        'Find the first signal and the last signal. The linked pair fits between them.',
        `The chain begins with ${sequence[0]} and ends with ${sequence[3]}. Ask your crew for the linked pair.`,
      ],
      answer: sequence.join(','), answerLabel: sequence.join(' / '),
    },
    {
      ...MODULES[1],
      instructions: 'Read your beacon name to the crew. Calculate CARRIER x GAIN + DRIFT, then enter the three-digit frequency.',
      console: { label: 'ACTIVE BEACON', detail: carrierNames[beaconIndex], digits: 3 },
      clues: [
        { label: 'Carrier directory', text: carrierNames.map((n, i) => `${n}: ${carriers[i]}`).join('  |  ') + '. Ask the operator which beacon is active.' },
        { label: 'Amplifier gain', text: `Multiply the active beacon's carrier by ${gain}. Do this BEFORE applying thermal drift.` },
        { label: 'Thermal drift', text: `After amplification, ${drift > 0 ? 'ADD' : 'SUBTRACT'} ${Math.abs(drift)}. Enter all three digits.` },
      ],
      hints: [
        'The operator has the beacon name. One crew member has its carrier. Multiply first; apply drift last.',
        `${carrierNames[beaconIndex]}'s carrier is ${base}. The gain is ${gain}. Ask your crew for the final drift correction.`,
      ],
      answer: String(frequency).padStart(3, '0'), answerLabel: `${frequency} MHz`,
    },
    {
      ...MODULES[2],
      instructions: 'Combine the crew\'s starting coordinate and two moves. Rows run A (top) to E (bottom); columns run 1 (left) to 5 (right). No wrapping.',
      console: { label: 'DEBRIS FIELD', detail: 'SELECT ONE SAFE COORDINATE', size: 5 },
      clues: [
        { label: 'Last known position', text: `Begin at ${origin}. The letter is the ROW; the number is the COLUMN.` },
        { label: 'Vertical vector', text: `Move ${Math.abs(dy)} row${Math.abs(dy) === 1 ? '' : 's'} ${dy < 0 ? 'UP, toward A' : 'DOWN, toward E'}. Do not wrap around the grid.` },
        { label: 'Horizontal vector', text: `Move ${Math.abs(dx)} column${Math.abs(dx) === 1 ? '' : 's'} ${dx < 0 ? 'LEFT, toward 1' : 'RIGHT, toward 5'}. Do not wrap around the grid.` },
      ],
      hints: [
        'Find the starting square, move vertically, then horizontally. Read the final row letter and column number.',
        `The starting coordinate is ${origin}. After the vertical move you are on row ${destination[0]}. Apply the horizontal move next.`,
      ],
      answer: destination, answerLabel: `Safe vector ${destination}`,
    },
    {
      ...MODULES[3],
      instructions: 'Get the raw packet from your crew. Rearrange it first, then apply the digit shift. Leading zeroes count.',
      console: { label: 'AIRLOCK AUTHORIZATION', detail: 'FOUR-DIGIT RECOVERY PIN', digits: 4 },
      clues: [
        { label: 'Raw recovery packet', text: `The raw packet is ${packet.join('')}. This is NOT the final PIN. Keep any leading zero.` },
        { label: 'Reordering protocol', text: `${transform.label} Do this BEFORE applying the digit shift.` },
        { label: 'Digit shift', text: `After rearranging, ADD ${shift} to EACH digit separately. Wrap 9 back to 0; do not carry to the next digit.` },
      ],
      hints: [
        'This is a two-step cipher: rearrange, then shift each digit. For example, 9 + 2 becomes 1, not 11.',
        `After rearranging, the packet is ${reordered.join('')}. Ask your crew how far to shift each digit.`,
      ],
      answer: pin, answerLabel: `Override ${pin}`,
    },
  ];
}

export function normalizeAnswer(puzzle, answer) {
  if (typeof answer !== 'string' || answer.length > 64) throw new Error('Enter a valid answer.');
  const value = answer.trim().toUpperCase();
  if (puzzle.kind === 'sequence') {
    const parts = value.split(',');
    if (parts.length !== 4 || new Set(parts).size !== 4 || parts.some(p => !SYMBOLS.some(s => s.id === p))) {
      throw new Error('Choose four different symbols before transmitting.');
    }
  } else if (puzzle.kind === 'frequency' && !/^\d{3}$/.test(value)) {
    throw new Error('Enter exactly three digits.');
  } else if (puzzle.kind === 'grid' && !/^[A-E][1-5]$/.test(value)) {
    throw new Error('Choose a coordinate on the grid.');
  } else if (puzzle.kind === 'pin' && !/^\d{4}$/.test(value)) {
    throw new Error('Enter exactly four digits, including any leading zero.');
  }
  return value;
}
