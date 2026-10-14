# Verification report - v0.1.0

## Executed

`npm test` passed **44/44 tests** using Node.js 22.16.0. No third-party dependency installation was required.

The generated-puzzle tests independently solve **1,000 missions (4,000 puzzles)** from the provided clues. The reactor test also enumerates every distinct four-symbol candidate for 80 generated samples and checks that exactly one satisfies the constraints. PIN tests cover all three transformations and leading-zero outputs.

Engine tests cover two-, three- and four-player role rotation/privacy; complete successful missions; readiness; join limits; wrong-answer and hint penalties; malformed input; authorization; stale commands; timer expiry; disconnect pauses; late reconnection; host migration; explicit leave; replay and bounded chat.

HTTP/SSE integration tests start actual local Node servers and connect separate clients. Two- and four-client missions complete end to end. Tests also cover bearer-token/origin rejection, session resumption, per-client snapshots, duplicate-command protection, chat propagation, static-file exposure controls, expiry/replay and leaving.

View tests verify escaping of callsigns, chat and input values, time formatting, and the absence of operative controls in a non-operator view. OpenAI tests use mocked provider responses to verify request structure, successful parsing, provider errors, refusals, malformed output and a rolling local usage cap.

The optional `scripts/browser-smoke.py` test passed in Chromium. It loads the offline artifact inline, uses the actual interface to finish all four systems, replays a mission, opens/closes the help dialog, and checks horizontal overflow at 320, 390 and 768 pixels. The desktop viewport is 1440 x 1040; the mobile landing viewport is 390 x 844. No JavaScript page errors were recorded in that run.

A header overflow at 320 pixels was found and fixed during this process. The final run passes the corresponding check.

## Not verified

- No public deployment, production domain, hosting account or external-device playtest was performed.
- The browser environment blocks network navigation, so the browser UI test used the standalone local simulation. Live transport was exercised by independent HTTP/SSE integration clients, not by two networked browser windows.
- No real OpenAI API request was executed; no usable API key was supplied.
- Safari, Firefox, real mobile hardware, screen-reader behavior, full keyboard-only gameplay and a formal accessibility audit were not completed.
- No load test or independent security review was performed. This is a single-process prototype, not a high-availability service.
- The actual Handshake mission technical brief and entry eligibility were not verified.

Passing tests are evidence about these specific cases, not a guarantee against all defects.

## Reproduce

```sh
npm test
npm run build:training
# Optional, with a separately installed Python Playwright package and Chromium:
CHROMIUM_PATH=/path/to/chromium python scripts/browser-smoke.py
```
