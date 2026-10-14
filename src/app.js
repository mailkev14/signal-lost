import { Network } from './network.js';
import { Training } from './training.js';
import { homeView, roomView, helpView, header, formatTime } from './views.js';
import { escapeHtml } from './icons.js';
import { missionGrade } from '../shared/score.js';

const appRoot = document.getElementById('app');
const safeRead = (store, key) => { try { return window[store].getItem(key); } catch { return null; } };
const safeWrite = (store, key, value) => { try { value === null ? window[store].removeItem(key) : window[store].setItem(key, value); } catch { /* Private browsing may disable storage. */ } };
const initialCode = new URLSearchParams(location.search).get('room') || '';
const ui = {
  name: safeRead('localStorage', 'signal-callsign') || '', code: initialCode.toUpperCase().slice(0, 6),
  homeMode: initialCode ? 'join' : 'host', offline: Boolean(window.__SIGNAL_OFFLINE__),
  busy: false, connected: false, restoring: false, sound: safeRead('localStorage', 'signal-sound') === 'on',
  answer: '', sequence: [], chat: '', notes: '', help: false, toast: null,
};
let view = null, training = null, fingerprint = '', latestReceived = performance.now();
let toastTimer, audioContext, lastClockAlert = null;
const network = new Network({
  onState: receiveView,
  onConnection(connected) { ui.connected = connected; render(); },
  onExpired(message) { returnHome(); showToast(message, 'error'); },
});

function displayFingerprint(next) {
  const { remainingMs, serverNow, pauseRemainingMs, ...rest } = next;
  return JSON.stringify(rest);
}
function receiveView(next) {
  if (view && next.code === view.code && next.serverNow < view.serverNow) return;
  const changedModule = !view || view.code !== next.code || view.index !== next.index || view.phase !== next.phase;
  const latestEvent = next.events[next.events.length - 1];
  const previousEvent = view?.events[view.events.length - 1];
  if (latestEvent && previousEvent && latestEvent.id !== previousEvent.id) {
    if (latestEvent.kind === 'success') beep(600, .12);
    else if (latestEvent.kind === 'error') beep(160, .2);
  }
  if (changedModule) { ui.answer = ''; ui.sequence = []; ui.notes = ''; lastClockAlert = null; if (view && next.phase === 'playing') beep(730, .18); }
  view = next; latestReceived = performance.now(); ui.restoring = false;
  if (next.mode === 'training') ui.connected = true;
  const updatedFingerprint = displayFingerprint(next);
  if (fingerprint !== updatedFingerprint || changedModule) { fingerprint = updatedFingerprint; render(); }
  updateClock();
  if (changedModule) window.scrollTo({ top: 0, behavior: 'instant' });
}
function render() {
  const focused = document.activeElement;
  const focusId = focused?.id;
  const focusKey = focused?.dataset?.focus;
  let selection = null;
  try { if (focused instanceof HTMLInputElement) selection = [focused.selectionStart, focused.selectionEnd]; } catch { /* Non-text input. */ }
  const oldChat = document.getElementById('chat-scroll');
  const chatAtBottom = !oldChat || oldChat.scrollHeight - oldChat.scrollTop - oldChat.clientHeight < 60;
  const chatScroll = oldChat?.scrollTop;
  appRoot.innerHTML = (ui.restoring && !view ? `${header(ui)}<main class="startup-loading"><div class="loading-dot"></div><h2>Recovering your signal.</h2><p>Reconnecting to your station and restoring your seat.</p><button class="button button-secondary" data-action="abandon-session">Start a new connection</button></main>` : view ? roomView(view, ui) : homeView(ui)) +
    (ui.toast ? `<div id="toast" class="toast-${ui.toast.type}" role="${ui.toast.type === 'error' ? 'alert' : 'status'}">${escapeHtml(ui.toast.message)}</div>` : '') +
    (ui.help ? helpView() : '');
  if (ui.help) {
    const dialog = document.getElementById('help-dialog');
    dialog.showModal();
    dialog.addEventListener('cancel', () => { ui.help = false; }, { once: true });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) { ui.help = false; render(); } }
    });
  } else {
    const nextFocus = focusId ? document.getElementById(focusId) : focusKey ? document.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`) : null;
    if (nextFocus && !nextFocus.disabled) {
      nextFocus.focus({ preventScroll: true });
      if (selection && nextFocus.setSelectionRange) try { nextFocus.setSelectionRange(...selection); } catch { /* No selection API. */ }
    }
  }
  const newChat = document.getElementById('chat-scroll');
  if (newChat) newChat.scrollTop = chatAtBottom ? newChat.scrollHeight : chatScroll || 0;
  updateClock();
}
function updateClock() {
  if (!view) return;
  const elapsed = performance.now() - latestReceived;
  const counting = (view.phase === 'playing' || view.phase === 'between') && !view.paused && (ui.connected || view.mode === 'training');
  const ms = Math.max(0, view.remainingMs - (counting ? elapsed : 0));
  const clock = document.getElementById('mission-clock');
  if (clock) { clock.textContent = formatTime(ms); clock.parentElement.classList.toggle('critical', ms < 60000); }
  const meter = document.getElementById('timer-fill');
  if (meter) meter.style.width = `${Math.max(0, ms / 480000 * 100)}%`;
  // One alert per threshold per mission stage, even during frequent clock refreshes.
  if (counting && ms > 0 && (ms <= 10000 || ms <= 30000 || ms <= 60000)) {
    const threshold = ms <= 10000 ? 10 : ms <= 30000 ? 30 : 60;
    if (lastClockAlert !== threshold) { lastClockAlert = threshold; beep(threshold === 10 ? 900 : 480, .15); }
  }
  const pause = document.getElementById('pause-clock');
  if (pause) pause.textContent = String(Math.max(0, Math.ceil((view.pauseRemainingMs - elapsed) / 1000)));
}
function showToast(message, type = 'info') {
  clearTimeout(toastTimer); ui.toast = { message, type }; render();
  toastTimer = setTimeout(() => { ui.toast = null; render(); }, 5200);
}
function beep(frequency = 420, duration = .07) {
  if (!ui.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.frequency.value = frequency; oscillator.type = 'sine';
    gain.gain.setValueAtTime(.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* Audio is optional. */ }
}
async function copyText(text, success) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement('textarea'); textarea.value = text;
      textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.append(textarea); textarea.select();
      const copied = document.execCommand('copy'); textarea.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    showToast(success);
  } catch { showToast(`Clipboard unavailable. Copy this: ${text}`); }
}
function returnHome() {
  training?.stop(); training = null; network.stop();
  safeWrite('sessionStorage', 'signal-session', null);
  view = null; fingerprint = ''; ui.restoring = false; ui.connected = false; ui.busy = false;
  ui.answer = ''; ui.sequence = []; ui.chat = ''; ui.help = false;
  render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function startTraining() {
  network.stop(); training?.stop(); view = null; fingerprint = ''; ui.restoring = false; ui.busy = false;
  safeWrite('sessionStorage', 'signal-session', null);
  training = new Training(ui.name.trim().slice(0, 18) || 'CADET', receiveView);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
async function command(event, payload = {}) {
  if (ui.busy) return;
  if (!ui.connected && view?.mode !== 'training') { showToast('Wait for your crew link to reconnect.', 'error'); return; }
  ui.busy = true; render();
  try { await (training ? training.action(event, payload) : network.action(event, payload)); }
  catch (error) { showToast(error.message || 'The command could not be sent.', 'error'); }
  finally { ui.busy = false; render(); }
}
async function connectCrew() {
  if (ui.offline) { showToast('This file is solo training. Run the full project for multiplayer.'); return; }
  if (ui.busy) return;
  const name = ui.name.trim();
  if (!name || name.length > 18) { showToast('Choose a callsign with 1-18 characters.', 'error'); return; }
  ui.busy = true; render();
  try {
    const result = ui.homeMode === 'join' ? await network.join(name, ui.code.trim()) : await network.create(name);
    safeWrite('localStorage', 'signal-callsign', name);
    safeWrite('sessionStorage', 'signal-session', JSON.stringify(result.session));
    receiveView(result.view);
    network.connect(result.session);
  } catch (error) { showToast(error.message || 'Could not reach the station. Is the server running?', 'error'); }
  finally { ui.busy = false; render(); }
}
function submitAnswer() {
  if (!view?.current) return;
  const answer = view.current.kind === 'sequence' ? ui.sequence.join(',') : ui.answer;
  return command('answer', { moduleId: view.current.id, answer });
}
appRoot.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'callsign') ui.name = target.value;
  else if (target.id === 'room-code') { ui.code = target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); target.value = ui.code; }
  else if (target.id === 'chat-message') ui.chat = target.value;
  else if (target.id === 'crew-scratchpad') ui.notes = target.value.slice(0, 500);
  else if (target.id === 'numeric-answer') {
    ui.answer = target.value.replace(/\D/g, ''); target.value = ui.answer;
    const submit = document.getElementById('numeric-submit');
    if (submit) submit.disabled = ui.answer.length !== (view.current.kind === 'frequency' ? 3 : 4) || ui.busy || view.paused || !ui.connected;
  }
});
appRoot.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'connect-form') await connectCrew();
  else if (event.target.id === 'answer-form') await submitAnswer();
  else if (event.target.id === 'chat-form') {
    const text = ui.chat.trim(); if (!text || ui.busy) return;
    const previous = ui.chat; ui.chat = '';
    // Chat errors retain the unsent text so a brief outage does not lose it.
    try { await network.action('chat', { text }); }
    catch (error) { ui.chat = previous; showToast(error.message, 'error'); }
    render(); document.getElementById('chat-message')?.focus({ preventScroll: true });
  }
});
appRoot.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action; event.preventDefault();
  if (action === 'host-tab' || action === 'join-tab') { ui.homeMode = action === 'host-tab' ? 'host' : 'join'; render(); }
  else if (action === 'help') { ui.help = true; render(); }
  else if (action === 'close-help') { ui.help = false; render(); }
  else if (action === 'sound') { ui.sound = !ui.sound; safeWrite('localStorage', 'signal-sound', ui.sound ? 'on' : 'off'); beep(500, .1); render(); }
  else if (action === 'training' || action === 'replay') startTraining();
  else if (action === 'ready') await command('ready', { ready: !view.players.find(p => p.id === view.meId)?.ready });
  else if (['start', 'next', 'hint', 'reset'].includes(action)) await command(action);
  else if (action === 'glyph') {
    const value = button.dataset.value;
    if (ui.sequence.includes(value)) ui.sequence = ui.sequence.filter(s => s !== value);
    else if (ui.sequence.length < 4) ui.sequence.push(value);
    else { showToast('Four slots are full. Deselect a symbol or clear the sequence.'); return; }
    beep(); render();
  } else if (action === 'coordinate') { ui.answer = button.dataset.value; beep(); render(); }
  else if (action === 'clear-answer') { ui.sequence = []; ui.answer = ''; render(); }
  else if (action === 'submit-answer') await submitAnswer();
  else if (action === 'copy-code') await copyText(view.code, 'Room code copied. Send it to your crew.');
  else if (action === 'copy-invite') {
    const link = `${location.origin}/?room=${encodeURIComponent(view.code)}`;
    await copyText(link, 'Invite link copied. Teammates can open it on their own devices.');
  } else if (action === 'share-result') {
    await copyText(`SIGNAL LOST | ${view.mode === 'training' ? 'Solo training' : `${view.players.length}-player crew`} | ${view.phase === 'won' ? 'Crew recovered' : 'Mission incomplete'} | ${view.completed.length}/4 systems | ${formatTime(view.remainingMs)} remaining | ${view.mistakes} mistakes | ${view.totalHints} hints | ${missionGrade(view).rank} (${missionGrade(view).label})`, 'Mission report copied.');
  } else if (action === 'abandon-session') returnHome();
  else if (action === 'leave' || action === 'brand') {
    if (view && !window.confirm(view.mode === 'training' ? 'Leave this training simulation?' : 'Leave the crew? Leaving during a mission ends it for everyone.')) return;
    if (view && !training && network.session) {
      try { await network.action('leave'); } catch { /* Disconnect still reserves a seat briefly; server expires it. */ }
    }
    returnHome();
  }
});

// Accessible shortcuts: ? opens the manual, Escape closes it. Ignore text fields.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && ui.help) { ui.help = false; render(); return; }
  if (event.key !== '?' || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  event.preventDefault(); ui.help = !ui.help; render();
});
setInterval(updateClock, 250);
render();
if (!ui.offline) {
  let saved = null;
  try { saved = JSON.parse(safeRead('sessionStorage', 'signal-session') || 'null'); } catch { /* Discard malformed state. */ }
  if (saved && typeof saved.token === 'string' && /^[a-f0-9]{64}$/.test(saved.token) && typeof saved.code === 'string') {
    ui.restoring = true; render(); network.connect(saved);
  }
}
