// cinema.js -- the replay viewer (rules v1.1, replay format v2). Loads a
// replay (file picker, ?replay=<url>, or ?last=1 for the auto-saved last
// game), verifies it by re-running it through the engine, then plays it back
// move by move. Each move shows the block FALLING into its column before it
// locks, so a viewer sees movement rather than blocks appearing; the fall
// duration scales with playback speed. Handles replays with and without the
// optional reasoning[] array. Format v1 replays (rules v1.0) are refused with
// a clear message, never replayed wrongly.

import { newGame, runReplay, verifyReplay, REPLAY_VERSION, RULES } from './engine.js';
import { CONFIG } from './config.js';
import { createBoardView, makeTileEl, leftFor, topFor } from './board-render.js';

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
// The one in-flight fall animation, if any: {complete}. complete() is
// idempotent and ALWAYS renders its step's final frame, so a fast next step
// (or a throttled background tab) can never lose a frame or desync the
// counter from the board.
let pending = null;

// ---------------------------------------------------------------------------
// loading

async function loadFromParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('replay')) {
    try {
      const res = await fetch(params.get('replay'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadReplay(await res.json(), 'from URL');
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
  if (pending) pending.complete(); // settle any in-flight fall on the old replay
  try {
    if (!data || data.version === undefined || !data.seed || !Array.isArray(data.moves)) {
      throw new Error('not a replay file (need version, seed, moves[])');
    }
    if (data.version === 1) {
      throw new Error('this is a format v1 replay, recorded under rules v1.0. '
        + 'The spawn model changed in rules v1.1, so v1 replays cannot be '
        + 'replayed correctly and cinema mode will not guess at one.');
    }
    if (data.version !== REPLAY_VERSION) {
      throw new Error(`unsupported replay version ${data.version} (this build plays v${REPLAY_VERSION})`);
    }
    const verdict = verifyReplay(data);
    replay = data;
    initialState = newGame(replay.seed, replay.spawn ?? CONFIG.spawn);
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

// Advance one move, showing the block fall into place first. The fall is
// presentation: the engine already computed everything in the timeline, and
// the step's final frame renders whether or not the animation gets to play
// (fast stepping, background-tab throttling).
function stepForward(fromTimer) {
  if (!timeline) { stop(); return; }
  if (pending) pending.complete(); // fast-forward any in-flight fall first
  if (index >= timeline.length - 1) { stop(); return; }
  const stateBefore = currentState();
  const value = stateBefore.current;
  index += 1;
  const events = timeline[index].events;
  const col = events.locked.col;
  const lockRow = events.locked.row;

  // Render the pre-move board, then animate the fall on top of it.
  boardView.render(stateBefore, {});
  const tile = makeTileEl(value);
  tile.classList.add('falling');
  tile.style.left = `${leftFor(col)}px`;
  tile.style.top = `${topFor(RULES.ROWS + 0.5)}px`;
  boardView.el.appendChild(tile);

  let done = false;
  let fallTimer = null;
  const complete = () => {
    if (done) return;
    done = true;
    clearTimeout(fallTimer);
    pending = null;
    tile.remove();
    renderFrame(true);
    if (fromTimer && index >= timeline.length - 1) stop();
  };
  pending = { complete };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { complete(); return; }
  const fallMs = CONFIG.animation.cinemaFallMs / speed;
  tile.getBoundingClientRect(); // commit the start position before transitioning
  tile.style.transition = `top ${fallMs}ms cubic-bezier(0.5, 0, 0.9, 0.6)`;
  tile.style.top = `${topFor(lockRow)}px`;
  fallTimer = setTimeout(complete, fallMs + 20);
}

function stepBack() {
  if (!timeline || index < 0) return;
  if (pending) pending.complete();
  if (index < 0) return; // completing a pending fall never moves index back
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
