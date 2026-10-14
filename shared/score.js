/** A deterministic, shareable after-action grade. Not used to change puzzle rules. */
export function missionGrade({ phase, completed, remainingMs, mistakes, totalHints }) {
  if (phase !== 'won') return { label: 'SIGNAL LOST', rank: 'INCOMPLETE', score: 0 };
  const score = Math.max(0, Math.min(100, Math.round(55 + remainingMs / 480000 * 45 - mistakes * 8 - totalHints * 5)));
  const rank = score >= 90 ? 'LEGENDARY' : score >= 75 ? 'EXPERT' : score >= 60 ? 'QUALIFIED' : 'SURVIVOR';
  return { label: `${score}/100`, rank, score };
}
