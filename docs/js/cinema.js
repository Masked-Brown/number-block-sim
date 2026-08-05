// cinema.js -- the replay viewer. Loads a replay (file picker, ?replay=<url>,
// or ?last=1 for the auto-saved last game), verifies it by re-running it
// through the engine, then plays it back move by move. Handles replays with
// and without the optional reasoning[] array (human games omit it; the
// Phase 3 AI fills it).

import { newGame, runReplay, verifyReplay, hashState } from './engine.js';
import { CONFIG } from './config.js';
import { createBoardView } from './board-render.js';

const $ = (id) => document.getElementById(id);
const boardView = createBoardView($('board'));

const BASE_STEP_MS = 800;

let replay = null;
let timeline = null; // [{state, events}] per move
let initialState = null;
let index = -1; // -1 = before the first move
let playing = false;
let timer = null;
let speed = 1;

// ---------------------------------------------------------------------------
// loading

async function loadFromParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('replay')) {
    try {
      const res = await fetch(params.get('replay'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadReplay(await res.json(), `from URL`);
    } catch (err) {
      setStatus(`Could not fetch replay: ${err.message}`, 'fail');
    }
  } else if (params.get('last')) {
    loadLast();
  }
}

function loadLast() {
  const raw = localStorage.getItem('nbs.lastReplay');
  if (!raw) {
    setStatus('No auto-saved game found in this browser yet. Play one first.', 'fail');
    return;
  }
  try {
    loadReplay(JSON.parse(raw), 'auto-saved last game');
  } catch (err) {
    setStatus(`Auto-saved replay is unreadable: ${err.message}`, 'fail');
  }
}

function loadReplay(data, sourceLabel) {
  stop();
  try {
    if (!data || data.version === undefined || !data.seed || !Array.isArray(data.moves)) {
      throw new Error('not a replay file (need version, seed, moves[])');
    }
    const verdict = verifyReplay(data); // throws on unsupported version
    replay = data;
    initialState = newGame(replay.seed);
    timeline = [];
    runReplay(replay, (i, move, state, events) => timeline.push({ state, events }));

    const badge = $('verify-badge');
    if (verdict.ok && replay.meta && replay.meta.result) {
      badge.className = 'badge ok';
      badge.textContent = 'verified: engine re-run matches the recorded result';
    } else if (verdict.ok) {
      badge.className = 'badge neutral';
      badge.textContent = 'replayed clean (no recorded result to check against)';
    } else {
      badge.className = 'badge fail';
      badge.textContent = `verification FAILED: ${verdict.mismatches.join('; ')}`;
    }

    $('drop-hint').style.display = 'none';
    $('loaded').style.display = '';
    renderMeta(sourceLabel);
    index = -1;
    renderFrame(false);
    setStatus('', null);
  } catch (err) {
    replay = null;
    timeline = null;
    setStatus(`Could not load replay: ${err.message}`, 'fail');
  }
}

function renderMeta(sourceLabel) {
  const meta = replay.meta || {};
  const r = meta.result || {};
  const rows = [
    ['Source', sourceLabel],
    ['Player', meta.player || 'unknown'],
    ['Date', meta.date ? String(meta.date).slice(0, 10) : 'unknown'],
    ['Seed', replay.seed],
    ['Moves', String(replay.moves.length)],
    ['Final score', r.score !== undefined ? r.score.toLocaleString('en-GB') : 'n/a'],
    ['Reasoning', Array.isArray(replay.reasoning) ? 'present (AI game)' : 'none (human game)'],
  ];
  const el = $('meta');
  el.textContent = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div');
    const kEl = document.createElement('span');
    kEl.textContent = k;
    const vEl = document.createElement('span');
    vEl.textContent = v;
    row.append(kEl, vEl);
    el.appendChild(row);
  }
}

function setStatus(text, kind) {
  const el = $('load-status');
  el.textContent = text;
  el.style.color = kind === 'fail' ? 'var(--bad)' : 'var(--text-dim)';
}

// ---------------------------------------------------------------------------
// playback

function currentState() {
  return index < 0 ? initialState : timeline[index].state;
}

function renderFrame(withFlash) {
  const state = currentState();
  const events = index >= 0 ? timeline[index].events : null;
  boardView.render(state, events ? { lastLocked: lockedCellOf(events) } : {});
  if (withFlash && events && events.passes.length) {
    boardView.flashCells(events.passes.flatMap((p) => p.merges.map((m) => m.target)));
  }
  $('counter').textContent = `move ${index + 1} / ${timeline.length}`;
  $('running-score').textContent = state.score.toLocaleString('en-GB');
  $('step-back').disabled = index < 0;
  $('step-fwd').disabled = index >= timeline.length - 1;
  renderReasoning();
}

// Where the locked block ended up (after resolution it may have merged away;
// the outline is the lock cell, which still reads correctly as "the move").
function lockedCellOf(events) {
  return { c: events.locked.col, r: events.locked.row };
}

function renderReasoning() {
  const hasArray = replay && Array.isArray(replay.reasoning);
  $('reason-none').style.display = hasArray ? 'none' : '';
  $('reason-body').style.display = hasArray ? '' : 'none';
  if (!hasArray) return;
  const entry = index >= 0 ? replay.reasoning[index] : null;
  $('reason-line').textContent = entry && entry.text
    ? entry.text
    : (index < 0 ? 'Press play to step through the game.' : '');
  const bars = $('feature-bars');
  bars.textContent = '';
  if (!entry || !entry.features) return;
  const entries = Object.entries(entry.features);
  const maxAbs = Math.max(0.0001, ...entries.map(([, v]) => Math.abs(Number(v) || 0)));
  for (const [name, raw] of entries) {
    const value = Number(raw) || 0;
    const row = document.createElement('div');
    row.className = 'row';
    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = name;
    const barBox = document.createElement('span');
    barBox.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = `${Math.round((Math.abs(value) / maxAbs) * 100)}%`;
    if (value < 0) fill.style.background = 'var(--bad)';
    barBox.appendChild(fill);
    const valEl = document.createElement('span');
    valEl.className = 'val';
    valEl.textContent = value.toFixed(2);
    row.append(nameEl, barBox, valEl);
    bars.appendChild(row);
  }
}

function stepForward(fromTimer) {
  if (!timeline || index >= timeline.length - 1) { stop(); return; }
  index += 1;
  renderFrame(true);
  if (fromTimer && index >= timeline.length - 1) stop();
}

function stepBack() {
  if (!timeline || index < 0) return;
  index -= 1;
  renderFrame(false);
}

function playPause() {
  if (!timeline) return;
  if (playing) { stop(); return; }
  if (index >= timeline.length - 1) { index = -1; renderFrame(false); }
  playing = true;
  $('play-pause').textContent = 'Pause';
  timer = setInterval(() => stepForward(true), BASE_STEP_MS / speed);
}

function stop() {
  playing = false;
  clearInterval(timer);
  const btn = $('play-pause');
  if (btn) btn.textContent = 'Play';
}

function setSpeed(s) {
  speed = s;
  document.querySelectorAll('[data-speed]').forEach((el) => {
    el.classList.toggle('primary', Number(el.dataset.speed) === s);
  });
  if (playing) { clearInterval(timer); timer = setInterval(() => stepForward(true), BASE_STEP_MS / speed); }
}

// ---------------------------------------------------------------------------
// wiring

$('play-pause').addEventListener('click', playPause);
$('step-fwd').addEventListener('click', () => { stop(); stepForward(false); });
$('step-back').addEventListener('click', () => { stop(); stepBack(); });
document.querySelectorAll('[data-speed]').forEach((el) => {
  el.addEventListener('click', () => setSpeed(Number(el.dataset.speed)));
});

document.addEventListener('keydown', (e) => {
  if (!timeline) return;
  if (e.code === 'Space') { e.preventDefault(); playPause(); }
  if (e.code === 'ArrowRight') { e.preventDefault(); stop(); stepForward(false); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); stop(); stepBack(); }
});

$('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    loadReplay(JSON.parse(await file.text()), file.name);
  } catch (err) {
    setStatus(`Not a valid replay JSON: ${err.message}`, 'fail');
  }
});

$('load-last').addEventListener('click', loadLast);

const hint = $('drop-hint');
['dragover', 'dragenter'].forEach((ev) => hint.addEventListener(ev, (e) => {
  e.preventDefault();
  hint.classList.add('drag');
}));
['dragleave', 'drop'].forEach((ev) => hint.addEventListener(ev, (e) => {
  e.preventDefault();
  hint.classList.remove('drag');
}));
hint.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  try {
    loadReplay(JSON.parse(await file.text()), file.name);
  } catch (err) {
    setStatus(`Not a valid replay JSON: ${err.message}`, 'fail');
  }
});

setSpeed(1);
loadFromParams();
