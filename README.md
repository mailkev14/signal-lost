# SIGNAL LOST

### A Cooperative Multiplayer Space-Station Escape Game

**Version:** `v1.0.0-rc.2`  
**Players:** 2–4  
**Genre:** Cooperative Puzzle / Escape Room / Sci-Fi  
**Platform:** Web Browser  
**Status:** Release Candidate

---

## 🚀 Overview

**Signal Lost** is a cooperative multiplayer puzzle game set aboard a damaged space station.

Players take on the roles of crew members trapped aboard **Meridian Station**, where critical systems have failed.

The crew must work together to restore the station's essential systems before time runs out.

However, there is a catch:

**No single player has all the information needed to solve the puzzles.**

Each player receives private information that must be communicated to teammates.

Success depends on communication, collaboration, deduction, and coordination.

The game supports 2–4 players and can be played directly in a web browser.

---

## 🎮 Gameplay

### The Mission

Meridian Station is experiencing a critical systems failure.

The crew has eight minutes to restore four essential systems:

1. **Reactor**
2. **Communications**
3. **Navigation**
4. **Airlock Override**

Each system presents a different cooperative puzzle.

Players must exchange information, interpret clues, and work together to restore the station.

Complete all four systems before time expires to escape successfully.

### Asymmetric Information

Signal Lost uses asymmetric information as a core gameplay mechanic.

Each player receives private clues.

These clues are distributed among the crew, meaning players must communicate to assemble the complete solution.

Players cannot solve every challenge independently.

### Multiplayer Communication

Players can communicate using the in-game chat.

The game also supports real-time updates, allowing players to see the current state of the mission as teammates interact with puzzles.

### Winning and Losing

**Victory:** Restore all four station systems before the countdown reaches zero.

**Defeat:** Fail to complete the mission before time expires.

The final mission report summarizes the crew's performance.

---

## ✨ Features

### Cooperative Multiplayer

- Supports 2–4 players.
- Create private multiplayer rooms.
- Join existing rooms using room codes.
- Real-time game state synchronization.
- Shared mission progress.
- Individual player information.

### Four Cooperative Puzzles

Players work together to restore:

- Reactor
- Communications
- Navigation
- Airlock Override

Each puzzle requires cooperation and information sharing.

### Private Clues

Every player receives information relevant to the mission.

Private clues encourage players to communicate rather than independently solve every challenge.

### Eight-Minute Countdown

The crew has a limited amount of time to restore the station.

The countdown creates urgency and encourages coordinated decision-making.

### In-Game Chat

Players can exchange information directly within the game.

This eliminates the need for external communication tools.

### Shared Scratchpad

A shared scratchpad helps players organize information and coordinate puzzle-solving.

### Training Mode

A training demonstration introduces players to the game's cooperative mechanics.

### Mission Scoring

After completing a mission, players receive a performance summary.

The game tracks mission outcomes and provides a final score.

### Shareable Mission Reports

Players can share the results of their completed missions.

### Optional AI Narration

Signal Lost supports AI-generated narrative content through:

- Google Gemini
- OpenAI

AI is used for storytelling and atmosphere.

The underlying puzzle mechanics remain deterministic.

---

## 🤖 AI Integration

Signal Lost includes two optional AI-powered narrative features:

1. **AI Mission Briefings**
2. **AI Mission Director**

Both features enhance the storytelling experience without affecting the game's underlying rules.

### AI Mission Briefings

At the beginning of a mission, the game can generate a unique narrative introduction.

The briefing establishes the atmosphere and provides context for the crew's mission.

For example:

> Meridian Station drifts silently through the darkness. Emergency
> lights flicker across abandoned corridors as the crew prepares
> to restore the station's failing systems.

AI-generated briefings are narrative content only.

They do not contain puzzle solutions or change gameplay mechanics.

### AI Mission Director

The Mission Director provides narrative reactions to important gameplay events.

These may include:

- Restoring a station system.
- Making an incorrect attempt.
- Successfully completing the mission.
- Failing the mission.

For example:

> Brilliant green cascade patterns spread across the main console
> as the massive airlock seals quietly open to the stars.

The Mission Director reacts to events but does not control the game's outcome.

### Supported AI Providers

| Provider | Integration | Status |
|---|---|---|
| Google Gemini | Mission Briefings + Mission Director | Live API verified |
| OpenAI | Mission Briefings + Mission Director | Implemented; live verification pending |
| Written Fallback | Mission Briefings + Mission Director | Available |

Gemini is the currently verified provider for this release candidate.

OpenAI compatibility testing is planned for a future verification pass.

### Deterministic Gameplay

AI does not determine:

- Puzzle answers.
- Player permissions.
- Mission outcomes.
- Scoring.
- Countdown behavior.
- Game progression.

These are controlled by the game's deterministic engine.

This separation ensures that gameplay remains consistent regardless of the selected AI provider.

---

## 🛠️ Technology Stack

Signal Lost is built using:

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js |
| Multiplayer Updates | Server-Sent Events (SSE) |
| Game Logic | JavaScript |
| AI Integration | Gemini API / OpenAI API |
| Testing | Node.js Built-in Test Runner |
| Version Control | Git / GitHub |

The project uses a lightweight architecture without requiring a frontend framework.

---

## 📋 Requirements

Before running Signal Lost locally, ensure you have:

- Node.js `22.16.0` or newer.
- npm.
- A modern web browser.
- Git, if cloning the repository.

An AI API key is optional.

The game can operate using prewritten narrative content when AI is disabled.

---

## 💻 Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mailkev14/signal-lost.git
```

Navigate to the project:

```bash
cd signal-lost
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

AI configuration is optional.

See the configuration examples below.

### 4. Start the Server

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

### 5. Open the Game

Open the local URL printed by the server.

The default local address may be:

```text
http://localhost:3000
```

If your server uses another port, use that port instead.

---

## 🔐 Environment Configuration

Signal Lost supports optional AI integration through environment variables.

Create a `.env` file in the project root.

### Gemini Configuration

The following configuration enables Gemini-generated briefings and Mission Director reactions:

```env
ENABLE_AI_BRIEFINGS=true

AI_PROVIDER=gemini

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-3.5-flash-lite

AI_MAX_CALLS_PER_HOUR=10
```

Replace `your_gemini_api_key` with your actual Gemini API key.

The `gemini-3.5-flash-lite` model was verified during development.

Model availability may vary by account and over time.

### OpenAI Configuration

OpenAI support is also implemented.

To configure OpenAI:

```env
ENABLE_AI_BRIEFINGS=true

AI_PROVIDER=openai

OPENAI_API_KEY=your_openai_api_key

OPENAI_MODEL=gpt-4.1-mini

AI_MAX_CALLS_PER_HOUR=10
```

OpenAI live verification is deferred for this release candidate.

### Disable AI

To run the game without an AI provider:

```env
ENABLE_AI_BRIEFINGS=false
```

The game will use prewritten narrative content.

### Environment Variables

| Variable | Description |
|---|---|
| `ENABLE_AI_BRIEFINGS` | Enables optional AI-generated narrative content |
| `AI_PROVIDER` | Selects `gemini` or `openai` |
| `GEMINI_API_KEY` | API key for Google Gemini |
| `GEMINI_MODEL` | Gemini model identifier |
| `OPENAI_API_KEY` | API key for OpenAI |
| `OPENAI_MODEL` | OpenAI model identifier |
| `AI_MAX_CALLS_PER_HOUR` | Limits AI requests |
| `PORT` | Server port |
| `PUBLIC_ORIGIN` | Public application origin |
| `MAX_ROOMS` | Maximum number of active rooms |

**Important:** Never commit your `.env` file or API keys to Git.

---

## 🛡️ AI Fallback System

AI features are optional.

Signal Lost includes prewritten narrative content that can be used when AI generation is unavailable.

Fallback scenarios include:

- AI integration is disabled.
- No API key is configured.
- The selected provider is unavailable.
- The provider returns an error.
- The provider exceeds the request timeout.
- The provider returns invalid content.
- The configured AI request budget is exhausted.

When fallback occurs, the game continues normally.

Players can still create rooms, communicate, solve puzzles, and complete missions.

### Why Fallback Matters

Signal Lost is designed to remain playable independently of external AI services.

The AI layer improves narrative variety but is not a requirement for gameplay.

---

## 👥 How to Play

### Creating a Room

1. Open Signal Lost in your browser.
2. Enter your player name.
3. Create a new multiplayer room.
4. Share the generated room code with your teammates.

### Joining a Room

1. Open Signal Lost.
2. Enter your player name.
3. Select the option to join a room.
4. Enter the room code provided by the host.

### Starting the Mission

Once the required players have joined:

1. Begin the mission.
2. Review the mission briefing.
3. Examine your private clues.
4. Communicate with your teammates.
5. Work together to restore the station's systems.

### Completing the Mission

Restore all four systems before the timer expires.

After the mission, review the final results and share your mission report.

---

## 🧪 Testing

Signal Lost uses Node.js's built-in test runner.

Run the automated tests using:

```bash
npm test
```

The test suite covers core gameplay and server functionality, including AI integration behavior.

### AI Testing

AI-related tests cover scenarios such as:

- Structured provider requests.
- Response validation.
- Error handling.
- Written fallback behavior.
- Request limits.
- Gemini integration.
- Mission Director reactions.

### Current Verification Status

| Component | Status |
|---|---|
| Automated test suite | Passed with zero failures |
| Gemini mission briefing | Verified |
| Gemini Mission Director | Verified |
| AI fallback logic | Covered by automated tests |
| OpenAI live integration | Pending |
| Final release smoke test | Pending |

Automated tests should be rerun before every release.

---

## 🌐 Multiplayer Architecture

Signal Lost uses a Node.js server to manage multiplayer sessions.

### Server Responsibilities

The server manages:

- Room creation.
- Player sessions.
- Room membership.
- Shared game state.
- Puzzle interactions.
- Mission progression.
- Countdown behavior.
- AI narration requests.

### Real-Time Updates

The game uses Server-Sent Events (SSE) to deliver updates to connected players.

This allows the browser to receive changes without repeatedly polling the server.

### Private Information

The game provides player-specific views so each player receives the information intended for them.

### Room Storage

Rooms and sessions are currently managed in server memory.

This means active rooms are not guaranteed to survive a server restart.

For deployment, use a single application instance unless shared room storage and synchronization are implemented.

---

## 🔒 Security

Signal Lost includes safeguards intended to protect game integrity and API credentials.

### Server-Side AI Requests

AI API requests are performed by the server.

API keys are not intentionally exposed to browser clients.

### Private Clues

Private clues are delivered through player-specific game views.

### Deterministic Puzzle Validation

Puzzle answers are validated by the game engine rather than an AI model.

### Input Validation

The backend validates incoming requests and player actions.

### Request Limits

The application includes request limiting to reduce abuse.

### AI Response Validation

AI-generated responses are checked before being displayed.

Invalid responses are rejected in favor of prewritten content.

### API Key Protection

Never:

- Commit `.env` files.
- Add API keys to frontend JavaScript.
- Include API keys in screenshots.
- Share API keys in issue reports.
- Expose API keys through application logs.

---

## 📡 Health Check

Signal Lost provides a server health endpoint:

```text
GET /api/health
```

For example:

```bash
curl http://localhost:3000/api/health
```

A successful response includes information such as:

```json
{
  "ok": true,
  "name": "Signal Lost",
  "version": "1.0.0-rc2",
  "aiEnabled": true,
  "directorEnabled": true
}
```

The AI flags indicate whether the corresponding features are enabled.

They do not guarantee that an external AI provider is currently reachable.

---

## 📦 Available Commands

| Command | Description |
|---|---|
| `npm start` | Start the application |
| `npm run dev` | Start in development mode |
| `npm test` | Run automated tests |
| `npm run build:training` | Build training-related assets |

---

## 🚢 Deployment Considerations

Signal Lost can run on a Node.js-compatible hosting platform.

Before deploying:

1. Configure the production environment variables.
2. Keep API keys in the hosting provider's secret management system.
3. Ensure the application is accessible over HTTPS.
4. Configure the correct public origin.
5. Verify Server-Sent Events work through the hosting platform.
6. Ensure the hosting environment supports long-lived connections.
7. Test room creation and multiplayer interactions.
8. Verify the health endpoint.
9. Test the application with AI enabled and disabled.
10. Confirm that a server restart does not unexpectedly affect the intended user experience.

### Important Deployment Limitation

The current multiplayer implementation stores rooms in memory.

Running multiple independent server instances without shared state can cause players to connect to different instances and lose access to their rooms.

For the current architecture, a single server instance is recommended.

---

## 📁 Project Structure

The main project directories include:

```text
signal-lost/
│
├── server/
│   ├── app.js
│   ├── briefing.js
│   └── index.js
│
├── shared/
│   ├── engine.js
│   └── score.js
│
├── src/
│   └── views.js
│
├── tests/
│   ├── briefing.test.js
│   └── director.test.js
│
├── scripts/
│
├── package.json
├── README.md
└── .env
```

This is a simplified overview of the main files rather than a complete directory listing.

---

## 🗺️ Development Roadmap

### Completed

- Cooperative multiplayer gameplay.
- Four station restoration puzzles.
- Private player clues.
- Multiplayer room system.
- Real-time updates.
- In-game chat.
- Shared scratchpad.
- Eight-minute mission timer.
- Training demonstration.
- Mission scoring.
- Shareable mission reports.
- Optional AI mission briefings.
- Optional AI Mission Director.
- Gemini API integration.
- AI fallback handling.
- Automated tests.

### Planned / Pending Verification

- Live OpenAI compatibility testing.
- Final Gemini fallback smoke test.
- Final multiplayer smoke test.
- Production deployment verification.
- Release candidate validation.

---

## 📌 Version History

### v1.0.0-rc.2 — Gemini Integration

**Release preparation in progress.**

Changes include:

- Added Google Gemini as an AI narration provider.
- Added Gemini support for mission briefings.
- Added Gemini support for Mission Director reactions.
- Updated AI source labels in the interface.
- Added provider-specific output token limits.
- Preserved optional OpenAI support.
- Extended automated tests for Gemini.
- Maintained written fallback behavior.

### v1.0.0-rc.1 — Release Candidate

Previous release candidate featuring:

- Complete cooperative gameplay.
- Multiplayer synchronization.
- Private clues.
- Four puzzles.
- Mission timer.
- Training mode.
- Mission scoring.
- Optional AI narration.

Earlier development versions include:

- v0.1.0
- v0.2.0
- v0.3.0
- v0.4.0
- v0.5.0

---

## 🏆 OpenAI Multiplayer Game Challenge

Signal Lost was developed as a project for the:

**Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge**

The challenge focuses on creating multiplayer gaming experiences using OpenAI.

Signal Lost was developed with assistance from ChatGPT/OpenAI throughout its design and implementation process.

The project also supports optional runtime AI narration, including Gemini.

The game itself does not depend on AI-generated puzzle solutions.

Contest eligibility and submission requirements are governed by the official challenge rules.

---

## 🤝 Contributing

Signal Lost is currently under active development.

For bug reports, feature suggestions, or technical discussions, use the repository's GitHub Issues section.

Repository:

https://github.com/mailkev14/signal-lost

---

## 👨‍💻 Development

**Project:** Signal Lost

**Repository:** https://github.com/mailkev14/signal-lost

**Current release candidate:** `v1.0.0-rc.2`

---

## 🌌 Final Transmission

> Meridian Station is failing.
>
> Four systems stand between the crew and survival.
>
> Every player holds a piece of the solution.
>
> Communication is your strongest tool.
>
> Restore the station before the signal is lost.

**SIGNAL LOST — Survive Together.**