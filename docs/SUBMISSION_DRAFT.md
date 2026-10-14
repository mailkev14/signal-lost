# Signal Lost - submission preparation draft

## Source boundary

Contest facts below come from the uploaded `[AI_Skills_Studio_Challenge]_Contest_Official_Rules.pdf`, not from an independently verified mission page. The game concept and implementation are development choices. The separate Handshake "Create a Multiplayer Game" mission technical brief was not provided.

The official rules require a project title, project cover image, project description and project URL, submitted inside that Handshake mission (page 1, "How to Enter"). The PDF's stated deadline is October 30, 2026 at 11:59 p.m. Pacific Time (page 1). The judging criteria are Execution, Creativity, Usefulness / Value, and Polish & Thoughtfulness, each weighted 25% (pages 2-3). Round 1 also refers to that month's project requirements, which must still be checked (page 2).

Do not claim this prototype is eligible or fully compliant until the entrant's eligibility and the missing mission brief have been checked. Do not automate the contest submission.

## Draft title

Signal Lost - Find Your Way Back

## Draft description

Signal Lost is a cooperative browser puzzle game for two to four players. A damaged space station has four systems left to recover and an eight-minute escape window. Each screen reveals a different part of the problem: one player operates the console while the rest of the crew receives private intel. Players must communicate to reconstruct symbol sequences, tune a distress frequency, chart a safe coordinate and decode the final override.

The operator rotates after each system, so every crew member contributes from both sides of the conversation. A server-controlled timer, limited hints and wrong-answer penalties create tension, while built-in text comms and a reconnect grace period help the crew recover from both mistakes and interrupted connections.

The project was developed with OpenAI assistance. An optional server-side OpenAI Responses API integration generates mission-opening fiction; it never determines the solutions or evaluates player answers. The interface identifies whether a story is AI-generated or the written fallback. A separate solo-training mode exposes every clue so a first-time player can learn without assembling a crew.

No account is required to play. Create a room, share its code and find your way back together.

**Before submitting:** verify and edit this description to match the deployed build. In particular, do not imply live AI is enabled if the public server is using written briefings only.

## Final submission checklist

- [ ] Obtain the mission technical brief and map each requirement to the build.
- [ ] Confirm the entrant's age, account, residency and physical-location eligibility under the official rules.
- [ ] Review the referenced Challenge Code of Conduct and relevant OpenAI terms.
- [ ] Deploy the actual multiplayer Node service on a stable HTTPS origin.
- [ ] Verify the public URL from devices not signed into the hosting account.
- [ ] Complete a real two-player and four-player playtest on that deployment.
- [ ] Verify the solo-training path is clearly labeled and not passed off as multiplayer.
- [ ] Use a real API key only on the server if enabling optional AI; verify costs and limits.
- [ ] Replace `docs/preview.png` with the chosen final cover if the interface changes.
- [ ] Finalize the description so it claims only tested, available features.
- [ ] Submit title, cover image, description and live project URL through the correct Handshake mission before the PDF's stated deadline.
- [ ] Save proof of the completed submission and monitor the Handshake account email.

## Project URL

Not deployed yet. No live URL has been created by this delivery.
