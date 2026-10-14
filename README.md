# Signal Lost v0.2.0

**What changed from v0.1:** persistent sound preference, timed audio urgency alerts, role-transition cues, `?` help shortcut, more explicit lobby guidance, and refined mission-state styling. This is an incremental polish release, not a new AI gameplay system.

# Signal Lost

**One station. Different clues. Only together.**

A playable first prototype for the Handshake AI Skills Studio x OpenAI Multiplayer Game Challenge. Two to four people have eight minutes to restore a damaged space station. One person operates a console; the others have the private information needed to solve it. The operator rotates between four systems.

This is a working prototype, not a deployed or compliance-certified contest submission. The separate Handshake mission technical brief still needs to be checked. "Signal Lost" is a working title, not a claim of trademark clearance.

## Run it

Use **Node.js 22.16 or newer**. This project has **zero third-party runtime dependencies** and no build step. You do not need an API key, database, or account to play.

```sh
cd signal-lost
npm start
```

Open this address in your browser:

```text
http://localhost:3000
```

Create a room, then open a **second independent tab or browser** and join using the room code. Enter a different callsign in each. Mark everyone ready; the captain launches.

For a quick two-tab test, open a NEW tab and type the address; do not use "Duplicate tab," which can copy session storage and take over the same player's seat. Separate browser profiles or devices are the most realistic multiplayer test.

### Play from separate devices

For a same-network test, keep the Node server running, permit inbound TCP port 3000 in the host computer's firewall, and open the host computer's LAN address on each device:

```text
http://YOUR-COMPUTER-LAN-IP:3000
```

All players must open the SAME server address. `localhost` on a phone means the phone, not your computer. Use HTTPS on a public deployment. Do not expose a development machine directly to the public internet without suitable network security.

### Try the standalone training file

Open `dist/signal-lost-training.html` in a browser and choose **Try solo training**. This self-contained file has no external imports or network requirement. It deliberately disables room creation/joining. You see every clue and operate all four systems yourself; the displayed ATLAS seat is explicitly a simulator, not another human or an AI player.

Rebuild it after changing the interface or game engine:

```sh
npm run build:training
```

## How to play

| System | Operator's task | What the crew provides |
| --- | --- | --- |
| Reactor sequence | Transmit four distinct symbols in order. | Starting symbol, linked middle pair, closing symbol. |
| Frequency lock | Enter a three-digit frequency. | Carrier directory, amplifier gain, thermal drift. The operator must report the active beacon. |
| Escape vector | Select a coordinate on a 5 x 5 grid. | Starting coordinate, vertical movement, horizontal movement. |
| Final override | Enter a four-digit recovery PIN. | Raw packet, reordering protocol, per-digit shift. |

Only the operator can submit an answer. Other players share their private intel through crew text chat or an external voice call. There is no built-in voice chat.

The team starts with **8 minutes**. Each valid-but-wrong answer costs **20 seconds**; malformed input is rejected without a penalty. A recovery hint costs **15 seconds**, with two hints per system. The captain activates the next system after a successful answer; the clock continues between systems.

If a player disconnects, the server pauses the mission for up to **60 seconds**. The player can refresh or reconnect in the same tab to recover their seat. If the captain disconnects, captain authority moves to a connected teammate. Deliberately leaving during play ends the mission. Closing a tab does not send a deliberate leave; it triggers the disconnect grace period.

## Optional OpenAI briefings

The game was developed with OpenAI assistance. Separately, the server contains an **optional live Responses API integration** that generates a short mission-opening story. It never creates answers, changes rules, interprets guesses, or decides a win. If the provider is unavailable, disabled, over the local cap, or returns unusable output, the game uses an explicitly labeled written briefing.

To enable it, copy `.env.example` to `.env` and set the variables locally:

```dotenv
ENABLE_AI_BRIEFINGS=true
OPENAI_API_KEY=your_key_goes_here
OPENAI_MODEL=gpt-4.1-mini
AI_MAX_CALLS_PER_HOUR=10
```

Restart the server. Do not put the key in browser code, commit `.env`, or paste a production secret into chat. The included default model is configurable; your API account must have access to the selected model. API calls can incur charges.

The integration uses the Responses API with a strict JSON schema, local output validation, `store: false`, a 240-output-token limit, and an eight-second timeout. The prompt sends no player names, messages, room codes, clues, or solutions. It is a fixed fiction-generation request. One attempt is made per mission start, with a rolling per-process cap that counts failures as well as successes. That cap resets when the process restarts; use provider-side spending controls as well.

**Verification boundary:** request structure, parsing, refusal/error fallback and the local cap are tested with mocks. No real API key was supplied, so an actual live OpenAI call has not been verified for this build.

## Tests

```sh
npm test
```

The current build passes **44 tests**. These include 1,000 independently solved generated missions, exhaustive checks of sampled reactor sequences, engine permissions, per-player privacy, timers, penalties, replay, reconnects, HTTP endpoints, separate two-/four-client HTTP/SSE sessions, idempotency, escaping, and mocked OpenAI responses.

The optional browser smoke test needs Python, Playwright, and a Chromium installation. It is not needed to run or test the server logic.

```sh
npm run build:training
# Install Playwright separately if you need this optional test.
CHROMIUM_PATH=/path/to/chromium python scripts/browser-smoke.py
```

This script plays the complete offline training mission through the interface, checks the help dialog and replay, and checks horizontal overflow at 320, 390, and 768 pixels. It exercised Chromium only, not Safari/Firefox. See `docs/TESTING.md` for what is and is not verified.

## Deploy as one Node service

A `Dockerfile` is included. Use one long-running service and **one replica**; the server holds rooms in process memory. The same process serves the frontend, HTTP commands and streaming updates.

```sh
docker build -t signal-lost .
docker run --rm -p 3000:3000 --env-file .env signal-lost
```

The `--env-file` argument is optional; omit it when no `.env` exists and you do not need custom settings.

For a Railway deployment, use the repository root and its Dockerfile, keep the service at one replica, expose its HTTP port, generate a public domain, and set `PUBLIC_ORIGIN` to that exact HTTPS origin. Set the health check to `/api/health`. The server reads `PORT` and binds to `0.0.0.0` by default. Verify the exact deployment with two real devices before submitting its URL. Nothing in this delivery has been deployed to your account.

```dotenv
PUBLIC_ORIGIN=https://your-actual-public-domain
```

Do not upload only `index.html` to static hosting and expect multiplayer to work. This build requires the accompanying Node process. Proxy buffering must be disabled for `/api/events`; the response sends `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`. The server broadcasts fresh per-player snapshots every 500 ms and the browser resynchronizes on reconnect.

## Architecture

The browser uses plain JavaScript modules and CSS. Live state travels from server to browser through server-sent events (SSE); commands travel back through authenticated JSON HTTP POST requests. This is real cross-client multiplayer, not a same-browser local-storage simulation. The training artifact is deliberately separate from live multiplayer.

```text
server/app.js          HTTP routes, SSE streams, sessions, limits, static allowlist
server/briefing.js     Optional server-side OpenAI story generation
shared/engine.js      Authoritative state machine and per-player projection
shared/puzzles.js     Puzzle generation, clues, answer validation
src/network.js        Authenticated stream, reconnection, idempotent commands
src/training.js       Explicit offline local simulation
src/views.js          Interface templates with escaped dynamic text
src/app.js            Browser interaction and render lifecycle
src/styles.css        Responsive interface
scripts/              Offline artifact builder and optional browser smoke test
tests/                Node's built-in test runner; no test package installation
```

Live puzzle answers and other players' private clues are never included in a player's network view. The puzzle-generation algorithm is available in the training bundle, but a live room's random values and solutions remain on the server. Each seat gets a server-generated 256-bit bearer token held in that tab's session storage, not in invite URLs. Room codes are invitations, not account authentication: anyone given the code can join a lobby with a free seat.

Server authority covers readiness, launch, operator permissions, answers, deadlines, hints, captain transfer and results. Retried commands carry the same request ID to avoid duplicate penalties or duplicate messages. Input limits, command cooldowns, basic rate limits, a static-file allowlist, HTML escaping and security headers are included. There has not been an independent security audit.

## Current limits

- Room state and chat are **in memory**. Restarting/redeploying the service clears all rooms. A single replica is required. Persistent rooms or horizontal scaling require a shared state design.
- Rooms idle for 30 minutes expire; disconnected lobby seats are released after 60 seconds, and unattended rooms are cleaned up. There are at most 100 rooms by default (`MAX_ROOMS`). Basic IP limits use the direct connection address, not untrusted forwarding headers; a reverse proxy may cause multiple visitors to share that limit. Plan trusted-proxy/rate-limit behavior before a broad public launch.
- No accounts, matchmaking, persistent leaderboards, spectator mode, voice chat, bot opponents, analytics or moderation service. Room chat is visible to the current crew. Do not use it for sensitive information.
- A mobile browser placed in the background may lose its connection. Keep the game visible during a mission; the reconnect grace is finite. Private/blocked browser storage may prevent seat recovery after a reload.
- No external fonts or image downloads. The visual station and symbol art are code-generated interface assets. Audio feedback is optional and off by default.
- The precise mission brief, contest compliance, public hosting, live-provider call, real-device network QA, full accessibility audit and name clearance remain launch tasks, not completed claims.

## Contest materials

`docs/PROJECT_BRIEF.md` records the prototype scope and next improvements. `docs/SUBMISSION_DRAFT.md` contains a project-description draft and a requirement checklist grounded in the uploaded official rules. `docs/preview.png` is an actual interface capture, not a promise of deployed availability.

## Technical references checked while building

- MDN, Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- Node.js, environment-variable loading: https://nodejs.org/learn/command-line/how-to-read-environment-variables-from-nodejs
- OpenAI, Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI, GPT-4.1 mini capabilities: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- Railway, Dockerfiles: https://docs.railway.com/builds/dockerfiles

These references describe technology, not the missing Handshake mission requirements.

## v0.4 AI mission director

Set `ENABLE_AI_BRIEFINGS=true` and `OPENAI_API_KEY` in `.env` to enable live mission openings and milestone reactions. The director reacts to a restored system, an incorrect answer, victory, or defeat. Only the milestone type, sector title, and bounded mistake count reach OpenAI: no player names, chat, puzzle clues, answers, or tokens. AI never changes puzzle rules or the timer. Calls are limited separately for briefings and reactions (`AI_MAX_CALLS_PER_HOUR`, default 10 for each service), with a six-second reaction timeout and prewritten fallbacks. This version has not been tested against the live OpenAI API.
