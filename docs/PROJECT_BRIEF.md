# Signal Lost - prototype brief

## Experience

A tense but approachable cooperative communication puzzle. Two to four people recover a failing space station using fragmented displays. Each round gives one player control of a console and distributes three essential clue packets among the others. No individual gets the full picture in live play. Solo training is explicitly different and shows all the clues.

The intended audience is small groups of friends, remote colleagues and judges testing a short browser experience. No account is needed. A complete round of play is bounded by an eight-minute mission clock.

## Implemented in v0.1

Private six-character rooms; two to four seats; readiness checks; captain-only launch and progression; four randomized puzzle systems; rotating operators; per-player private intel; crew text chat; authoritative deadline, penalties, hints and victory/loss; refresh/reconnect support; captain migration; a 60-second disconnect pause; rematch; a responsive interface; optional audio; a local training artifact; and optional server-side OpenAI mission-opening stories with fallback.

The optional AI story is deliberately outside the critical game logic. It is not described as a live AI teammate. The gameplay still works without credentials or provider availability.

## Why these choices

A short mission with four clear systems keeps the prototype small enough to finish and test. Asymmetric information gives the multiplayer component a purpose beyond shared presence. Operator rotation gives everyone control at least once in a four-player mission. Deterministic validation avoids asking a language model to arbitrate ambiguous guesses. A local training mode makes the rules accessible to a judge who does not immediately have a second player.

This is a design rationale, not a prediction of a contest score or a claim that the concept has no precedents.

## Next development pass

1. Read the actual Handshake mission technical brief and reconcile every requirement before expanding scope.
2. Put the single-server build on a public HTTPS origin and test two/four real devices, reconnects and mobile backgrounding there.
3. Conduct playtests with people who have not seen the clues before. Check whether 8 minutes, 20-second error penalties and 15-second hints feel fair.
4. Improve onboarding and module difficulty based on those playtests rather than adding features indiscriminately.
5. Validate an actual OpenAI API call with a restricted project key if enabling that feature for the submission.
6. Audit accessibility, session behavior, proxy rate limits and abuse prevention for the expected public audience. Add durable state only if the hosting/scale needs it.
7. Capture the final cover/demo and finalize the project description against what is actually deployed.

## Out of scope for this prototype

Public matchmaking, accounts, progression economies, cosmetic purchases, a persistent leaderboard, real-time voice, spectator access, generated puzzle solutions, a database, multi-instance scaling and production-level abuse moderation.
