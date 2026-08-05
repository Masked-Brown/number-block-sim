// ui.js -- the browser game (rules v1.1). The renderer owns time; the engine
// owns truth. Interactive play is translated into engine moves: one call to
// play() per locked block, with the column as the move. Nudges and the fall
// are presentation; they cannot change what the engine computes from
// (seed, moves). Effects are fire-and-forget overlays (fx.js) and never gate
// input or the game loop.

import {
  newGame, play, spawnDistribution, previewValue, RULES,
  makeReplay, resultMetrics,
} from './engine.js';
import { CONFIG, tileColour } from './config.js';
import {
  createBoardView, makeTileEl, styleMiniTile, leftFor, topFor, cellCentre,
} from './board-render.js';
import { downloadShareCard } from './share.js';
import { shake, burst, ring, chainPop, squash, pop } from './fx.js';
import { assess } from './performance.js';

const LS_BEST = 'nbs.best';
const LS_LAST_REPLAY = 'nbs.lastReplay';

const $ = (id) => document.getElementById(id);

const boardView = createBoardView($('board'));
const boardWrap = $('board').parentElement;

let game; // engine state
let phase; // 'falling' | 'resolving' | 'over'
let fall; // {col, y, el, ghost}
let moves = [];
let stamps = [];
let runStart = 0;
let lastFrame = null;
let lastReplay = null;
let lastLockedCol = 2; // v1.1: the next block enters where the last one landed
let runId = 0; // bumped on every new game, so a slow grade cannot land on a fresh screen

// Daily mode (v1.2): the same board for everyone, derived from the UTC date, with
// no server and no leaderboard. `?daily=1` chooses it; New game and R restart the
// SAME board, because that is the whole point of a daily.
const dailyMode = new URLSearchParams(location.search).has('daily');

// ---------------------------------------------------------------------------
// game lifecycle

function randomSeed() {
  const words = new Uint32Array(2);
  crypto.getRandomValues(words);
  return ((BigInt(words[0]) << 32n) | BigInt(words[1])).toString();
}

// FNV-1a 32-bit, twice, to fill a 64-bit seed. Hashing a date is not a rule and
// not a tunable in itself; the label it hashes with is (CONFIG.daily.label).
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function dailySeed(day = todayUTC()) {
  const key = `${CONFIG.daily.label}:${day}`;
  return ((BigInt(fnv1a(key)) << 32n) | BigInt(fnv1a(`${key}#tail`))).toString();
}

function startGame() {
  runId += 1;
  game = newGame(dailyMode ? dailySeed() : randomSeed());
  phase = 'falling';
  moves = [];
  stamps = [];
  lastReplay = null;
  lastLockedCol = Math.floor(RULES.COLS / 2); // first block: centre column
  runStart = performance.now();
  lastFrame = null;
  $('over-overlay').classList.remove('show');
  boardView.render(game);
  spawnFallingTile();
  refreshHud();
}

function spawnFallingTile() {
  if (fall && fall.el) { fall.el.remove(); fall.ghost.remove(); }
  const el = makeTileEl(game.current);
  el.classList.add('falling');
  boardView.el.appendChild(el);
  const ghost = makeTileEl(game.current);
  ghost.classList.add('ghost');
  boardView.el.appendChild(ghost);
  fall = { col: lastLockedCol, y: RULES.ROWS + 0.5, el, ghost };
  positionFalling();
}

function positionFalling() {
  fall.el.style.left = `${leftFor(fall.col)}px`;
  fall.el.style.top = `${topFor(fall.y)}px`;
  const h = game.board[fall.col].length;
  fall.ghost.style.left = `${leftFor(fall.col)}px`;
  fall.ghost.style.top = `${topFor(h)}px`;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (phase !== 'falling') { lastFrame = null; return; }
  if (lastFrame === null) { lastFrame = now; return; }
  const dt = Math.min(now - lastFrame, 100) / 1000;
  lastFrame = now;
  fall.y -= CONFIG.fallCellsPerSecond * dt;
  const h = game.board[fall.col].length;
  if (fall.y <= h) {
    fall.y = h;
    positionFalling();
    lockNow();
    return;
  }
  positionFalling();
}

async function lockNow() {
  phase = 'resolving';
  const col = fall.col;
  lastLockedCol = col;
  moves.push(col);
  stamps.push(Math.round(performance.now() - runStart));
  const { state: next, events } = play(game, col);

  fall.el.remove();
  fall.ghost.remove();

  // Animate the resolution from the events, pass by pass, on a visual copy.
  let visual = game.board.map((c) => c.slice());
  visual[col] = visual[col].concat([events.locked.value]);
  boardView.render({ board: visual }, { lastLocked: { c: col, r: events.locked.row } });
  squash(boardView.tileAt(col, events.locked.row));
  shake(boardWrap, events.passes.length ? 0 : CONFIG.fx.landShakePx);

  for (const pass of events.passes) {
    boardView.flashCells(pass.merges.flatMap((m) => m.cells));
    chainPop(boardWrap, pass.chain);
    await wait(CONFIG.animation.mergeFlashMs);
    visual = applyPassVisual(visual, pass.merges);
    boardView.render({ board: visual });
    let shakePx = 0;
    for (const m of pass.merges) {
      const target = boardView.tileAt(m.target.c, m.target.r);
      pop(target);
      const centre = cellCentre(m.target.c, m.target.r);
      burst(boardView.el, centre.x, centre.y, tileColour(m.result), m.size);
      if (m.result >= CONFIG.fx.bigMergeValue || m.size >= 4) {
        ring(boardView.el, centre.x, centre.y);
      }
      shakePx = Math.max(shakePx,
        CONFIG.fx.mergeShakeBase + CONFIG.fx.mergeShakePerSize * (m.size - 2)
        + CONFIG.fx.chainShakePerPass * (pass.chain - 1));
    }
    shake(boardWrap, shakePx);
    await wait(CONFIG.animation.gravityMs);
  }

  game = next;
  boardView.render(game);
  refreshHud();

  if (events.gameOver) {
    finishGame();
    return;
  }
  spawnFallingTile();
  phase = 'falling';
}

function applyPassVisual(board, merges) {
  const remove = board.map((colArr) => colArr.map(() => false));
  for (const m of merges) for (const cell of m.cells) remove[cell.c][cell.r] = true;
  const entries = board.map((colArr, c) =>
    colArr.map((v, r) => ({ r, v })).filter((e) => !remove[c][e.r]));
  for (const m of merges) entries[m.target.c].push({ r: m.target.r, v: m.result });
  return entries.map((list) => list.sort((a, b) => a.r - b.r).map((e) => e.v));
}

function finishGame() {
  phase = 'over';
  const durationMs = Math.round(performance.now() - runStart);
  const result = resultMetrics(game);
  lastReplay = makeReplay(game.seed, moves, {
    date: new Date().toISOString(),
    player: 'human',
    result,
    durationMs,
    moveTimestamps: stamps,
  }, game.spawn);
  try {
    localStorage.setItem(LS_LAST_REPLAY, JSON.stringify(lastReplay));
  } catch { /* storage full or blocked; the download button still works */ }

  const prevBest = readBest();
  const isBest = !prevBest || game.score > prevBest.score;
  if (isBest) {
    try {
      localStorage.setItem(LS_BEST, JSON.stringify({ score: game.score, date: new Date().toISOString() }));
    } catch { /* non-fatal */ }
  }

  $('final-score').textContent = game.score.toLocaleString('en-GB');
  $('best-note').textContent = isBest ? 'New personal best' : '';
  renderBreakdown(result, durationMs);
  $('over-overlay').classList.add('show');
  refreshHud();
  gradeThisGame(lastReplay, runId);
}

// ---------------------------------------------------------------------------
// the v1.2 breakdown screen
//
// Everything here comes from what the game already recorded: the engine's own
// result metrics (RULES.md 7) plus the per-move timestamps the replay carries.
// Nothing is recomputed and nothing is estimated.

function renderBreakdown(result, durationMs) {
  const m = $('over-metrics');
  m.textContent = '';
  const perMove = medianGapSeconds(stamps);
  for (const [k, v] of [
    ['Score', result.score.toLocaleString('en-GB')],
    ['Max tile', result.maxTile.toLocaleString('en-GB')],
    ['Blocks placed', String(result.blocksPlaced)],
    ['Merges', mergeSummary(result.mergeCounts)],
    ['Longest chain', `${result.longestChain} pass${result.longestChain === 1 ? '' : 'es'}`],
    ['Total time', formatDuration(durationMs)],
    ['Median per move', perMove === null ? '–' : `${perMove.toFixed(1)} s`],
    ['Seed', dailyMode ? `${game.seed} (daily ${todayUTC()})` : game.seed],
  ]) {
    m.appendChild(metricRow(k, v));
  }
}

function metricRow(label, value) {
  const row = document.createElement('div');
  const kEl = document.createElement('span');
  kEl.textContent = label;
  const vEl = document.createElement('span');
  vEl.textContent = value;
  row.append(kEl, vEl);
  return row;
}

function mergeSummary(mergeCounts) {
  const parts = Object.entries(mergeCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([size, count]) => `${count.toLocaleString('en-GB')} ${sizeName(size)}${count === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'none';
}

function sizeName(size) {
  return { 2: 'pair', 3: 'triple', 4: 'quad', 5: 'quint' }[size] || `group of ${size}`;
}

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

// The same median the grader uses, computed here for the breakdown row so the
// two numbers can never drift apart in the reader's eye: gaps between successive
// cumulative stamps, first gap measured from the start of the run.
function medianGapSeconds(timestamps) {
  if (!timestamps || timestamps.length === 0) return null;
  const gaps = [];
  let prev = 0;
  for (const t of timestamps) {
    gaps.push(Math.max(0, t - prev) / 1000);
    prev = t;
  }
  gaps.sort((a, b) => a - b);
  const n = gaps.length;
  return n % 2 === 1 ? gaps[(n - 1) / 2] : (gaps[n / 2 - 1] + gaps[n / 2]) / 2;
}

// ---------------------------------------------------------------------------
// the accuracy grade and the composite
//
// Grading runs in this tab, on this CPU, with no network: performance.js walks
// the recorded moves past the leak-free champion and reports how often the human
// agreed. It is chunked across frames, so the buttons on this very screen stay
// clickable while it works, and `generation` makes a slow grade from the previous
// game harmless.

function gradeThisGame(replay, generation) {
  const total = $('perf-total');
  const parts = $('perf-parts');
  const note = $('perf-note');
  total.className = 'perf-total pending';
  total.textContent = 'grading';
  parts.textContent = '';
  note.textContent = `judging ${replay.moves.length} moves against the champion…`;

  assess(replay, {
    onProgress: (done, all) => {
      if (generation !== runId) return;
      note.textContent = `judging ${all} moves against the champion… ${Math.round((done / all) * 100)}%`;
    },
  }).then((verdict) => {
    if (generation !== runId) return;
    renderPerformance(verdict);
  }).catch((err) => {
    if (generation !== runId) return;
    total.className = 'perf-total pending';
    total.textContent = '–';
    note.textContent = `grading failed: ${err.message}`;
  });
}

function renderPerformance(verdict) {
  const total = $('perf-total');
  total.className = 'perf-total';
  total.textContent = '';
  const big = document.createElement('span');
  big.textContent = verdict.composite.toFixed(0);
  const of = document.createElement('span');
  of.className = 'of';
  of.textContent = '/100';
  total.append(big, of);

  const parts = $('perf-parts');
  parts.textContent = '';
  for (const [key, name, weight] of [
    ['accuracy', 'Accuracy', verdict.weights.accuracy],
    ['score', 'Score', verdict.weights.score],
    ['pace', 'Pace', verdict.weights.pace],
  ]) {
    const value = verdict.indices[key];
    const box = document.createElement('div');
    box.className = value === null ? 'part absent' : 'part';
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = name;
    const valEl = document.createElement('div');
    valEl.className = 'val';
    valEl.textContent = value === null ? '–' : value.toFixed(0);
    const wtEl = document.createElement('div');
    wtEl.className = 'wt';
    wtEl.textContent = value === null ? 'not counted' : `weight ${weight}`;
    const meter = document.createElement('div');
    meter.className = 'meter';
    const fill = document.createElement('i');
    fill.style.width = `${value === null ? 0 : Math.max(1, Math.round(value))}%`;
    meter.appendChild(fill);
    box.append(nameEl, valEl, wtEl, meter);
    parts.appendChild(box);
  }

  const pct = verdict.graded > 0 ? (verdict.agreed / verdict.graded) * 100 : 0;
  const bits = [
    `played the champion's column on ${verdict.agreed} of ${verdict.graded} moves `
    + `(${pct.toFixed(1)}%), judged by ${verdict.championId} in this tab`,
  ];
  if (verdict.clutchMoves > 0) {
    bits.push(`${verdict.clutchMoves} into a full column, which the champion never considers`);
  }
  if (!verdict.paceCounted) {
    bits.push('no move timings recorded, so pace is left out and the other two are reweighted');
  }
  $('perf-note').textContent = `${bits.join('; ')}.`;
}

// ---------------------------------------------------------------------------
// HUD

function readBest() {
  try {
    const raw = localStorage.getItem(LS_BEST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function refreshHud() {
  $('score').textContent = game.score.toLocaleString('en-GB');
  const best = readBest();
  $('best').textContent = best ? best.score.toLocaleString('en-GB') : '–';
  styleMiniTile($('next-tile'), previewValue(game));

  // Spawn possibilities: each live value with its current percentage, the
  // exact numbers the engine will draw the block after next from.
  const dist = spawnDistribution(game);
  const rows = $('poss-rows');
  rows.textContent = '';
  for (const e of dist.entries) {
    const row = document.createElement('div');
    row.className = 'row';
    const tile = document.createElement('span');
    tile.className = 'mini-tile';
    styleMiniTile(tile, e.value);
    const barBox = document.createElement('span');
    barBox.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = `${Math.max(2, Math.round(e.probability * 100))}%`;
    barBox.appendChild(fill);
    const pct = document.createElement('span');
    pct.className = 'pct';
    pct.textContent = `${(e.probability * 100).toFixed(1)}%`;
    row.append(tile, barBox, pct);
    rows.appendChild(row);
  }

  $('placed').textContent = String(game.blocksPlaced);
  $('seed-label').textContent = `seed ${game.seed}`;
  const daily = $('daily-note');
  if (dailyMode) {
    daily.hidden = false;
    daily.textContent = `daily board for ${todayUTC()} · everyone gets this one`;
  }
}

// ---------------------------------------------------------------------------
// input (RULES 2, v1.1: arrows move, space drops; nothing else)

document.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (phase === 'over' && (e.code === 'Enter' || e.code === 'KeyR')) { startGame(); return; }
  if (phase !== 'falling') return;

  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    const target = fall.col + (e.code === 'ArrowLeft' ? -1 : 1);
    if (target >= 0 && target < RULES.COLS && fall.y >= game.board[target].length) {
      fall.col = target;
      positionFalling();
    }
  } else if (e.code === 'Space') {
    fall.y = game.board[fall.col].length;
    positionFalling();
    lockNow();
  } else if (e.code === 'KeyR') {
    startGame();
  }
});

// ---------------------------------------------------------------------------
// buttons

$('new-game').addEventListener('click', () => startGame());
$('again').addEventListener('click', () => startGame());
$('download-replay').addEventListener('click', () => {
  if (!lastReplay) return;
  const blob = new Blob([JSON.stringify(lastReplay, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nbs-replay-${lastReplay.meta.result.score}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('share-card').addEventListener('click', () => {
  if (!lastReplay) return;
  const r = lastReplay.meta.result;
  downloadShareCard({
    score: r.score,
    maxTile: r.maxTile,
    longestChain: r.longestChain,
    blocksPlaced: r.blocksPlaced,
    date: lastReplay.meta.date.slice(0, 10),
    seed: lastReplay.seed,
  });
});

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// go
startGame();
requestAnimationFrame(frame);
