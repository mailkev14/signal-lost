import { missionGrade } from '../shared/score.js';
import { icon, glyph, stationArt, escapeHtml } from './icons.js';
import { SYMBOLS } from '../shared/puzzles.js';
const e = escapeHtml;
const disabled = value => value ? 'disabled' : '';
const padded = value => String(value).padStart(2, '0');
export function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${padded(Math.floor(seconds / 60))}:${padded(seconds % 60)}`;
}
export function header(ui, view = null) {
  return `<header class="site-header">
    <a class="brand" href="${ui.offline ? '#' : '/'}" data-action="brand" aria-label="Signal Lost home"><span class="brand-mark">${icon('signal', 24)}</span><span>SIGNAL<span class="brand-light">LOST</span><small>MERIDIAN ORBITAL SYSTEMS</small></span></a>
    <div class="header-actions">
      <span class="status-chip ${view && !ui.connected && view.mode !== 'training' ? 'status-warn' : ''}"><i></i>${view ? view.mode === 'training' ? 'SOLO SIMULATION' : ui.connected ? 'CREW LINK LIVE' : 'RECONNECTING' : ui.offline ? 'LOCAL TRAINING BUILD' : 'COOPERATIVE / 2-4 PLAYERS'}</span>
      <button class="icon-button" data-action="sound" aria-label="${ui.sound ? 'Mute sound' : 'Enable sound'}" title="${ui.sound ? 'Mute sound' : 'Enable sound'}">${icon(ui.sound ? 'sound' : 'mute')}</button>
      <button class="icon-button" data-action="help" aria-label="How to play" title="How to play">${icon('question')}</button>
      ${view ? `<button class="quiet-button leave-button" data-action="leave">${icon('exit', 17)}<span>Leave</span></button>` : ''}
    </div>
  </header>`;
}
export function homeView(ui) {
  const joining = ui.homeMode === 'join';
  return `${header(ui)}<main class="landing">
    <section class="hero-copy">
      <div class="eyebrow"><span class="tiny-line"></span>INCOMING TRANSMISSION &nbsp; / &nbsp; M-07</div>
      <h1>One station.<br>Different clues.<br><span>Only together.</span></h1>
      <p class="hero-description">The signal is breaking. Your crew is scattered.<br>Everyone has part of the answer.<br>Talk it through. Find your way back.</p>
      <div class="mission-metrics"><div><b>02-04</b><span>CREW MEMBERS</span></div><div><b>08:00</b><span>ESCAPE WINDOW</span></div><div><b>04</b><span>BROKEN SYSTEMS</span></div></div>
      ${stationArt('hero-station')}
      <div class="transmission-caption"><span class="pulse-dot"></span><span>LAST CONTACT &nbsp; // &nbsp; MERIDIAN STATION</span><span class="waveform"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    </section>
    <section class="connection-card" aria-labelledby="connect-heading">
      <div class="card-topline"><span class="eyebrow">FLIGHT DECK / ACCESS</span>${icon('terminal', 19)}</div>
      <h2 id="connect-heading">Assemble your crew.</h2><p class="muted">No accounts. Just a room code, your crew, and a shared countdown.</p>
      <div class="segmented" role="group" aria-label="Connection mode"><button class="${joining ? '' : 'selected'}" data-action="host-tab">Create a room</button><button class="${joining ? 'selected' : ''}" data-action="join-tab">Join a room</button></div>
      <form id="connect-form">
        <label class="field-label" for="callsign">YOUR CALLSIGN <span>01-18 CHARACTERS</span></label>
        <div class="input-shell">${icon('users', 18)}<input id="callsign" name="callsign" autocomplete="nickname" maxlength="18" placeholder="e.g. NOVA" value="${e(ui.name)}" ${disabled(ui.busy)} required></div>
        ${joining ? `<label class="field-label" for="room-code">ROOM CODE <span>FROM YOUR CAPTAIN</span></label><div class="input-shell">${icon('radio', 18)}<input id="room-code" class="code-input" name="room-code" autocomplete="off" maxlength="6" placeholder="6-CHARACTER CODE" value="${e(ui.code)}" ${disabled(ui.busy)} required></div>` : ''}
        ${ui.offline ? `<div class="inline-note">This standalone file is solo training. Run the full project to create or join live multiplayer rooms.</div>` : ''}
        <button class="button button-primary full" type="submit" ${disabled(ui.busy || ui.offline)}>${ui.busy ? '<span class="loading-dot"></span> Establishing signal...' : `${joining ? 'Join the crew' : 'Create a room'} ${icon('arrow', 20)}`}</button>
      </form>
      <div class="connection-note">${icon('lock', 13)}<span>Private room &nbsp; / &nbsp; Play from separate devices</span></div>
      <div class="divider-label"><span>OR GET YOUR BEARINGS</span></div>
      <button class="button button-secondary full" data-action="training">${icon('play', 18)} Try solo training <span class="small-tag">LOCAL</span></button>
      <p class="training-note">Explore all four puzzles with every clue visible.<br>No teammate or API key needed.</p>
      <div class="card-footer"><span class="pulse-dot"></span> SYSTEMS AWAITING RECOVERY <span>V.03</span></div>
    </section>
    <section class="how-strip" aria-label="How it works">
      <article><span class="step-number">01</span><div><h3>Open a channel.</h3><p>Create a room. Send the code to your crew.</p></div></article>
      <article><span class="step-number">02</span><div><h3>Read your part.</h3><p>The operator has controls. The crew has clues.</p></div></article>
      <article><span class="step-number">03</span><div><h3>Make it home.</h3><p>Restore four systems before time runs out.</p></div></article>
    </section>
  </main><footer class="site-footer"><span>A SHARED MISSION. A DIFFERENT VIEW.</span><span>BUILT WITH OPENAI ASSISTANCE &nbsp; / &nbsp; PROTOTYPE 03</span></footer>`;
}
function crewCards(view) {
  return `<div class="crew-grid">${Array.from({ length: 4 }, (_, i) => {
    const p = view.players[i];
    return p ? `<article class="crew-card ${p.ready ? 'is-ready' : ''} ${p.connected ? '' : 'is-away'}"><div class="crew-avatar seat-${i}">${e(p.name.slice(0, 2).toUpperCase())}</div><div class="crew-identity"><h3>${e(p.name)} ${p.id === view.meId ? '<small>YOU</small>' : ''}</h3><span>${p.id === view.hostId ? 'CAPTAIN' : `CREW ${padded(i + 1)}`}</span></div><span class="crew-state">${p.connected ? p.ready ? `${icon('check', 14)} READY` : '<i></i> STANDBY' : 'LINK LOST'}</span></article>` : `<article class="crew-card empty-seat"><div class="crew-avatar">+</div><div class="crew-identity"><h3>Open seat</h3><span>AWAITING CONNECTION</span></div><span class="seat-number">${padded(i + 1)}</span></article>`;
  }).join('')}</div>`;
}
function roomIdentity(view, ui) {
  return `<div class="room-identity"><span class="eyebrow">${view.mode === 'training' ? 'LOCAL SIMULATION / ALL INTEL VISIBLE' : 'PRIVATE CHANNEL'}</span><button class="room-code" data-action="copy-code" ${disabled(view.mode === 'training')} aria-label="Copy room code ${e(view.code)}">${e(view.code)} ${view.mode !== 'training' ? icon('copy', 16) : ''}</button>${view.mode !== 'training' ? `<button class="quiet-button" data-action="copy-invite">Copy invite ${icon('link', 14)}</button>` : ''}</div>`;
}
function chatView(view, ui) {
  if (view.mode === 'training') return `<section class="panel comms-panel training-comms"><div class="panel-heading"><span>${icon('radio', 17)} TRAINING CHANNEL</span><span class="small-tag">LOCAL ONLY</span></div><h3>No crew required here.</h3><p>All three intel packets are visible beside your console, and you operate every system. In multiplayer, those packets are split between your teammates.</p><p class="muted">No other players are connected. No live AI calls are made.</p></section>`;
  return `<section class="panel comms-panel" aria-labelledby="comms-heading"><div class="panel-heading"><span id="comms-heading">${icon('radio', 17)} CREW COMMS</span><span class="online-count">${view.players.filter(p => p.connected).length} CONNECTED</span></div>
    <div id="chat-scroll" class="chat-scroll" role="log" aria-label="Crew messages" aria-live="polite">${view.messages.length ? view.messages.map(m => `<div class="chat-message ${m.playerId === view.meId ? 'own-message' : ''}"><span class="chat-name">${e(m.name)}</span><span>${e(m.text)}</span></div>`).join('') : '<p class="chat-empty">Your crew\'s words are your best instrument.<br>Say hello, or share your first clue.</p>'}</div>
    <form id="chat-form" class="chat-form"><input id="chat-message" autocomplete="off" maxlength="280" placeholder="Send a message to the crew..." value="${e(ui.chat)}" aria-label="Message to crew" ${disabled(!ui.connected)}><button type="submit" aria-label="Send message" ${disabled(!ui.connected)}>${icon('arrow', 19)}</button></form>
    <div class="chat-footnote">Use text here or talk on your own call. Voice is not built in.</div></section>`;
}
function lobbyView(view, ui) {
  const me = view.players.find(p => p.id === view.meId);
  const captain = view.hostId === view.meId;
  const allReady = view.players.length >= 2 && view.players.every(p => p.ready && p.connected);
  return `<main class="room-main">${roomIdentity(view, ui)}<div class="section-title"><div><div class="eyebrow">PRE-FLIGHT / CREW ASSEMBLY</div><h1>Better together.</h1><p>Every screen sees something different. Share the invite link, then mark ready.</p></div><span class="crew-counter">${view.players.length}<small>/ 4 CREW</small></span></div>
    <div class="lobby-layout"><section class="lobby-main">${crewCards(view)}
      <div class="lobby-action-panel panel"><div><h3>${me?.ready ? 'You are ready for departure.' : 'Your crew is waiting for you.'}</h3><p>${allReady ? 'All systems checked. Captain, you are clear to launch.' : 'At least two players are needed. Everyone must mark themselves ready.'}</p></div><button class="button ${me?.ready ? 'button-secondary' : 'button-primary'}" data-action="ready" ${disabled(ui.busy || !ui.connected)}>${icon(me?.ready ? 'check' : 'radio', 18)} ${me?.ready ? 'Ready - undo' : "I'm ready"}</button></div>
      <div class="launch-row"><div class="launch-checks"><span class="${view.players.length >= 2 ? 'passed' : ''}">${icon('users', 15)} ${view.players.length}/2 minimum crew</span><span class="${allReady ? 'passed' : ''}">${icon('check', 15)} ${view.players.filter(p => p.ready).length}/${view.players.length} ready</span></div>${captain ? `<button class="button button-primary" data-action="start" ${disabled(!allReady || ui.busy || !ui.connected)}>Launch mission ${icon('arrow')}</button>` : `<span class="muted">Your captain will launch the mission.</span>`}</div>
      <section class="flight-instructions panel"><div class="eyebrow">THE FLIGHT PLAN</div><h3>Four systems. Eight minutes. All of you.</h3><div class="flight-steps"><p><b>Take turns at the console.</b> The operator changes with each system. Only they can submit the team's answer.</p><p><b>Say what you see.</b> The rest of the crew receives private intel. Share it in comms or over a call.</p><p><b>Be deliberate.</b> A wrong answer costs 20 seconds. Each recovery hint costs 15 seconds.</p></div></section>
    </section><aside class="lobby-aside"><div class="station-panel panel">${stationArt('lobby-station')}<div class="station-panel-caption"><span class="eyebrow">MERIDIAN / M-07</span><h3>Still out there.<br>Still waiting for you.</h3></div></div>${chatView(view, ui)}</aside></div></main>`;
}
function progressView(view) {
  return `<div class="system-progress" aria-label="Mission progress">${view.modules.map((m, i) => {
    const done = view.completed.some(c => c.id === m.id), active = view.index === i && view.phase !== 'won' && view.phase !== 'lost';
    return `<div class="system-step ${done ? 'complete' : active ? 'active' : ''}"><span class="system-step-icon">${done ? icon('check', 17) : padded(i + 1)}</span><span><b>${e(m.short)}</b><small>${done ? 'RESTORED' : active ? 'RECOVERY ACTIVE' : 'OFFLINE'}</small></span><span class="system-dot"></span></div>`;
  }).join('')}</div>`;
}
function consoleView(view, ui) {
  const cur = view.current;
  const active = view.operatorId === view.meId;
  const blocked = ui.busy || view.paused || (!ui.connected && view.mode !== 'training');
  if (!active) return `<section class="panel locked-console"><div class="panel-heading"><span>${icon('lock', 17)} OPERATOR CHANNEL</span><span class="small-tag">PRIVATE</span></div><div class="locked-display">${icon('terminal', 42)}<h3>${e(view.players.find(p => p.id === view.operatorId)?.name || 'Your teammate')} has the console.</h3><p>Your job is to make their picture complete.<br>Read your intel aloud or send it in crew comms.</p><div class="standby-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="eyebrow">RECEIVING TELEMETRY / AWAITING YOUR INTEL</span></div></section>`;
  let controls = '';
  if (cur.kind === 'sequence') {
    controls = `<div class="sequence-slots">${Array.from({ length: 4 }, (_, i) => `<div class="sequence-slot ${ui.sequence[i] ? 'filled' : ''}"><span class="slot-index">${padded(i + 1)}</span>${ui.sequence[i] ? `${glyph(ui.sequence[i], 28)}<span>${ui.sequence[i]}</span>` : '<span class="slot-empty">-</span>'}</div>`).join('')}</div><div class="glyph-grid">${SYMBOLS.map(s => `<button class="glyph-button ${ui.sequence.includes(s.id) ? 'selected' : ''}" data-action="glyph" data-value="${s.id}" data-focus="glyph-${s.id}" aria-label="${s.id}${ui.sequence.includes(s.id) ? ', selected' : ''}" aria-pressed="${ui.sequence.includes(s.id)}" ${disabled(blocked)}>${glyph(s.id, 32)}<span>${s.id}</span></button>`).join('')}</div><div class="console-buttons"><button class="quiet-button" data-action="clear-answer" ${disabled(blocked || !ui.sequence.length)}>Clear sequence</button><button class="button button-primary" data-action="submit-answer" ${disabled(blocked || ui.sequence.length !== 4)}>Transmit sequence ${icon('arrow', 18)}</button></div>`;
  } else if (cur.kind === 'grid') {
    controls = `<div class="coordinate-grid" role="group" aria-label="Navigation coordinates"><span></span>${[1, 2, 3, 4, 5].map(n => `<span class="grid-label">${n}</span>`).join('')}${['A', 'B', 'C', 'D', 'E'].map(row => `<span class="grid-label">${row}</span>${[1, 2, 3, 4, 5].map(col => `<button class="coordinate ${ui.answer === row + col ? 'selected' : ''}" data-action="coordinate" data-value="${row}${col}" data-focus="coord-${row}${col}" aria-label="Coordinate ${row}${col}" aria-pressed="${ui.answer === row + col}" ${disabled(blocked)}>${ui.answer === row + col ? icon('target', 21) : '<span class="grid-star"></span>'}<small>${row}${col}</small></button>`).join('')}`).join('')}</div><div class="console-buttons"><span class="coordinate-readout">VECTOR <b>${ui.answer || '--'}</b></span><button class="button button-primary" data-action="submit-answer" ${disabled(blocked || !ui.answer)}>Set escape vector ${icon('arrow', 18)}</button></div>`;
  } else {
    const digits = cur.kind === 'frequency' ? 3 : 4;
    controls = `<form id="answer-form"><div class="numeric-display"><label for="numeric-answer">${cur.kind === 'frequency' ? 'TUNING FREQUENCY' : 'RECOVERY PIN'}</label><div class="digital-input-wrap"><input id="numeric-answer" inputmode="numeric" type="text" autocomplete="off" spellcheck="false" maxlength="${digits}" pattern="[0-9]{${digits}}" placeholder="${'-'.repeat(digits)}" value="${e(ui.answer)}" aria-label="${digits}-digit ${cur.kind === 'frequency' ? 'frequency' : 'recovery PIN'}" ${disabled(blocked)}>${cur.kind === 'frequency' ? '<span>MHz</span>' : icon('lock', 22)}</div><span class="numeric-caption">${cur.kind === 'frequency' ? 'CARRIER x GAIN + DRIFT' : 'REARRANGE FIRST / SHIFT SECOND'}</span></div><button id="numeric-submit" class="button button-primary full" type="submit" ${disabled(blocked || !new RegExp(`^\\d{${digits}}$`).test(ui.answer))}>${cur.kind === 'frequency' ? 'Lock frequency' : 'Authorize escape'} ${icon('arrow', 18)}</button></form>`;
  }
  return `<section class="panel console-panel"><div class="panel-heading"><span>${icon('terminal', 17)} YOUR CONSOLE</span><span class="small-tag tag-accent">OPERATOR</span></div><div class="console-readout"><div><span class="eyebrow">${e(cur.console.label)}</span><b>${e(cur.console.detail)}</b></div><span class="pulse-dot"></span></div><div class="console-controls">${controls}</div><div class="console-bottom">${icon('lock', 13)} ONLY YOU CAN TRANSMIT &nbsp; / &nbsp; WRONG ANSWER: -20 SEC</div></section>`;
}
function intelView(view, ui) {
  const training = view.mode === 'training';
  return `<section class="panel intel-panel"><div class="panel-heading"><span>${icon('radio', 17)} ${training ? 'SIMULATED CREW INTEL' : 'YOUR PRIVATE INTEL'}</span><span class="small-tag">${training ? 'ALL PACKETS' : 'FOR YOUR EYES'}</span></div>
    <div class="intel-body">${view.clues.length ? view.clues.map((clue, i) => `<article class="intel-card"><div class="intel-index">${icon('signal', 16)} TELEMETRY / ${padded(i + 1)}</div><h3>${e(clue.label)}</h3><p>${e(clue.text)}</p></article>`).join('') : `<div class="operator-instructions">${icon('users', 36)}<h3>You have the controls.<br>They have the missing pieces.</h3><p>Ask the crew to read their private intel. Your console readout may be exactly what they need.</p><div class="expert-names">${view.players.filter(p => p.id !== view.operatorId).map(p => `<span><i class="${p.connected ? '' : 'offline-dot'}"></i>${e(p.name)}</span>`).join('')}</div></div>`}
    ${training ? '<div class="intel-tip">TRAINING MODE: You can see every packet. In live play, these are divided between your crew.</div>' : '<div class="intel-tip">Your teammates cannot see these packets. Communication is the puzzle.</div>'}
    </div><div class="scratchpad"><label for="crew-scratchpad">${icon('terminal', 15)} PERSONAL SCRATCHPAD</label><textarea id="crew-scratchpad" maxlength="500" rows="3" placeholder="Write down clues and calculations. Only visible on this device.">${e(ui.notes || '')}</textarea><small>Private to your browser tab · Clears when the next system starts</small></div><div class="hint-area">${view.hints.map((hint, i) => `<div class="hint-card"><b>RECOVERY HINT ${i + 1}</b><p>${e(hint)}</p></div>`).join('')}<button class="quiet-button hint-button" data-action="hint" ${disabled(view.hints.length >= 2 || ui.busy || view.paused || !ui.connected && !training)}>${icon('sparkles', 16)} ${view.hints.length >= 2 ? 'All hints used' : 'Request a recovery hint'} <span>${view.hints.length}/2 &nbsp; -15 SEC</span></button></div></section>`;
}
function briefingView(view) {
  return `<section class="panel briefing-panel"><div class="panel-heading"><span>${icon('signal', 17)} MISSION TRANSMISSION</span><span class="small-tag">${view.briefingLoading ? 'GENERATING...' : view.briefing.source === 'openai' ? 'OPENAI BRIEFING' : 'WRITTEN BRIEFING'}</span></div><h3>${e(view.briefing.title)}</h3><p>${e(view.briefing.story)}</p>${view.director ? `<div class="director-transmission" role="status"><strong>MISSION DIRECTOR / ${view.director.source === 'openai' ? 'LIVE AI' : view.director.source === 'loading' ? 'RECEIVING' : 'BACKUP'}</strong><p>${e(view.director.text)}</p></div>` : ''}<div class="briefing-note">${view.briefing.source === 'openai' ? 'AI-generated story. Puzzle rules and answers are deterministic.' : 'Prewritten fallback. Optional live AI changes the story, never the solution.'}</div></section>`;
}
function betweenView(view, ui) {
  const last = view.completed[view.completed.length - 1];
  const next = view.modules[view.index + 1];
  return `<section class="panel between-panel"><div class="success-orbit">${icon('check', 42)}</div><span class="eyebrow">SYSTEM ${padded(view.index + 1)} / RECOVERED</span><h2>${e(last.title)} restored.</h2><p>${e(last.answerLabel)}</p><div class="next-system"><span>NEXT UP</span><b>${e(next?.title)}</b><small>The operator rotates. New intel arrives.</small></div>${view.hostId === view.meId ? `<button class="button button-primary" data-action="next" ${disabled(ui.busy || view.paused)}>Activate ${e(next?.short)} ${icon('arrow')}</button>` : '<p class="muted">Waiting for your captain to activate the next system.</p>'}<div class="between-note">${icon('clock', 14)} The mission clock is still running.</div></section>`;
}
function resultView(view, ui) {
  const grade = missionGrade(view);
  const won = view.phase === 'won';
  return `<section class="result-panel panel ${won ? 'result-won' : 'result-lost'}"><div class="result-glow"></div><div class="result-emblem">${icon(won ? 'signal' : 'warning', 42)}</div><div class="eyebrow">${won ? 'TRANSMISSION RECEIVED / CREW RECOVERED' : 'TRANSMISSION ENDED / MISSION INCOMPLETE'}</div><h1>${won ? 'Signal found.<br><span>Crew safe.</span>' : 'The signal<br><span>went quiet.</span>'}</h1><p>${won ? 'You never had the whole picture. You had each other.' : e(view.failure)}</p><div class="mission-grade" aria-label="Mission performance grade"><span>CREW PERFORMANCE</span><strong>${e(grade.rank)}</strong><b>${e(grade.label)}</b></div><div class="result-stats"><div><b>${formatTime(view.remainingMs)}</b><span>TIME REMAINING</span></div><div><b>${padded(view.completed.length)} / 04</b><span>SYSTEMS RESTORED</span></div><div><b>${padded(view.mistakes)}</b><span>WRONG SIGNALS</span></div><div><b>${padded(view.totalHints)}</b><span>HINTS USED</span></div></div><div class="result-crew">${view.players.map(p => `<span>${icon('check', 14)} ${e(p.name)}</span>`).join('')}</div><div class="result-actions">${view.mode === 'training' ? '<button class="button button-primary" data-action="replay">Run another simulation</button>' : view.hostId === view.meId ? '<button class="button button-primary" data-action="reset">Return crew to lobby</button>' : '<span class="muted">Your captain can return the crew to the lobby.</span>'}<button class="button button-secondary" data-action="share-result">Copy mission report ${icon('copy', 16)}</button></div>${view.mode === 'training' ? '<p class="result-mode-note">SOLO TRAINING RESULT / ALL CLUES WERE VISIBLE</p>' : ''}</section>`;
}
function missionView(view, ui) {
  const ended = view.phase === 'won' || view.phase === 'lost';
  const active = view.operatorId === view.meId;
  const latest = view.events[view.events.length - 1];
  return `<main class="room-main">${roomIdentity(view, ui)}${!ended ? `<div class="mission-title-row"><div><div class="eyebrow">SYSTEM ${padded(view.index + 1)} / 04 &nbsp; ${view.mode === 'training' ? 'SOLO TRAINING' : active ? 'YOU ARE THE OPERATOR' : 'YOU ARE AN INTEL OFFICER'}</div><h1>${e(view.current.title)}</h1><p>${e(view.current.instructions)}</p></div><div class="mission-timer ${view.remainingMs < 60000 ? 'critical' : ''}"><span>${view.paused ? 'CLOCK PAUSED' : 'ESCAPE WINDOW'}</span><b id="mission-clock" aria-label="Mission time remaining">${formatTime(view.remainingMs)}</b><div class="timer-meter"><i id="timer-fill" style="width:${Math.max(0, view.remainingMs / 480000 * 100)}%"></i></div></div></div>` : ''}
    ${!ended ? `<div class="mission-atmosphere" aria-hidden="true"><span class="atmosphere-beacon"></span><span>MERIDIAN // LIVE TELEMETRY</span><div class="atmosphere-track"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>SECTOR ${padded(view.index + 1)} · SIGNAL ${view.paused ? 'INTERRUPTED' : 'ACTIVE'}</span></div>` : ''}
    ${progressView(view)}
    <div id="connection-warning" class="connection-warning ${view.mode === 'training' || ui.connected ? 'hidden' : ''}" role="status">${icon('warning', 16)} Your signal was interrupted. Reconnecting automatically; commands are disabled.</div>
    ${view.paused ? `<div class="pause-banner" role="status">${icon('clock', 18)} <div><b>Holding for ${e(view.missing.join(', '))}.</b> The mission clock is paused. Reconnect within <span id="pause-clock">${Math.ceil(view.pauseRemainingMs / 1000)}</span> seconds.</div></div>` : ''}
    ${ended ? resultView(view, ui) : view.phase === 'between' ? betweenView(view, ui) : `<div class="game-layout">${consoleView(view, ui)}${intelView(view, ui)}</div>`}
    ${latest ? `<div class="event-ticker event-${e(latest.kind)}" role="status">${icon(latest.kind === 'error' ? 'warning' : latest.kind === 'success' ? 'check' : 'signal', 15)}<span>${e(latest.text)}</span><span class="event-time">MISSION LOG</span></div>` : ''}
    <div class="comms-layout">${chatView(view, ui)}${briefingView(view)}</div>
    </main>`;
}
export function roomView(view, ui) {
  return `${header(ui, view)}${view.phase === 'lobby' ? lobbyView(view, ui) : missionView(view, ui)}<footer class="site-footer"><span>${view.mode === 'training' ? 'LOCAL SIMULATION / NO OTHER PLAYERS CONNECTED' : 'PRIVATE CREW LINK / DO NOT SHARE YOUR SESSION TOKEN'}</span><span>EVERY SIGNAL MATTERS.</span></footer>`;
}
export function helpView() {
  return `<dialog id="help-dialog" aria-labelledby="help-title"><button class="icon-button dialog-close" data-action="close-help" aria-label="Close instructions">${icon('x')}</button><span class="eyebrow">MERIDIAN / FLIGHT MANUAL</span><h2 id="help-title">Communication is<br>your best instrument.</h2><p>Signal Lost is a cooperative escape game for <b>2-4 players</b>. Recover four systems in <b>8 minutes</b>. Everyone shares the same clock.</p><div class="help-sections"><section><span>01</span><div><h3>Start together.</h3><p>Choose callsigns, join the same six-character room, and mark everyone ready. The captain launches the mission.</p></div></section><section><span>02</span><div><h3>Two different jobs.</h3><p>The operator sees and controls the console. Other players get private clues. Read the console and clues to each other in text chat or on your own voice call. The operator changes each system.</p></div></section><section><span>03</span><div><h3>Protect your time.</h3><p>Wrong answers cost 20 seconds. Hints cost 15 seconds each, with two available per system. The captain activates the next system; the clock keeps running between systems.</p></div></section><section><span>04</span><div><h3>A dropped signal is not the end.</h3><p>A disconnected crew member pauses the mission for up to 60 seconds. Keep the same browser tab to recover your seat. Leaving deliberately ends the current mission.</p></div></section></div><div class="inline-note">Solo training is a local simulation. You operate all consoles and see every clue. Optional OpenAI briefings add story only; they do not set the puzzle rules. Press ? at any time to open this manual. Sound preferences are saved on this device.</div><button class="button button-primary full" data-action="close-help">Understood. Let's find the signal. ${icon('arrow', 18)}</button></dialog>`;
}
