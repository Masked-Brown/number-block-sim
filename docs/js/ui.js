// ui.js -- the browser game. The renderer owns time; the engine owns truth.
// Interactive play is translated into engine moves: one call to play() per
// locked block, with the column as the move. Fall speed, nudges and drops are
// presentation; they cannot change what the engine computes from (seed, moves).

import {
  newGame, play, spawnWindow, previewValue, RULES,
  makeReplay, resultMetrics, hashState,
} from './engine.js';
import { CONFIG } from './config.js';
import {
  createBoardView, makeTileEl, styleMiniTile, leftFor, topFor,
} from './board-render.js';
import { downloadShareCard } from './share.js';

const LS_BEST = 'nbs.best';
const LS_LAST_REPLAY = 'nbs.lastReplay';

const $ = (id) => document.getElementById(id);

const boardView = createBoardView($('board'));

let game; // engine state
let phase; // 'falling' | 'resolving' | 'over'
let fall; // {col, y, el}
let softDrop = false;
let moves = [];
let stamps = [];
let runStart = 0;
let lastFrame = null;
let lastReplay = null;

// ---------------------------------------------------------------------------
// game lifecycle

function randomSeed() {
  const words = new Uint32Array(2);
  crypto.getRandomValues(words);
  return ((BigInt(words[0]) << 32n) | BigInt(words[1])).toString();
}

function startGame() {
  game = newGame(randomSeed());
  phase = 'falling';
  moves = [];
  stamps = [];
  lastReplay = null;
  runStart = performance.now();
  lastFrame = null;
  $('over-overlay').classList.remove('show');
  boardView.render(game);
  spawnFallingTile();
  refreshHud();
}

function spawnFallingTile() {
  if (fall && fall.el) fall.el.remove();
  const el = makeTileEl(game.current, game.floor);
  el.classList.add('falling');
  boardView.el.appendChild(el);
  const ghost = makeTileEl(game.current, game.floor);
  ghost.classList.add('ghost');
  boardView.el.appendChild(ghost);
  fall = { col: 2, y: RULES.ROWS + 0.5, el, ghost };
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
  const speed = CONFIG.fallCellsPerSecond * (softDrop ? CONFIG.softDropMultiplier : 1);
  fall.y -= speed * dt;
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
  moves.push(col);
  stamps.push(Math.round(performance.now() - runStart));
  const { state: next, events } = play(game, col);

  fall.el.remove();
  fall.ghost.remove();

  // Animate the resolution from the events, pass by pass, on a visual copy.
  let visual = game.board.map((c) => c.slice());
  visual[col] = visual[col].concat([events.locked.value]);
  boardView.render({ board: visual, floor: game.floor }, { lastLocked: { c: col, r: events.locked.row } });

  for (const pass of events.passes) {
    boardView.flashCells(pass.merges.flatMap((m) => m.cells));
    await wait(CONFIG.animation.mergeFlashMs);
    visual = applyPassVisual(visual, pass.merges);
    boardView.render({ board: visual, floor: game.floor });
    await wait(CONFIG.animation.gravityMs);
  }

  game = next;
  boardView.render(game);
  refreshHud();

  if (events.floorRose) {
    showBanner(`Floor rise: spawn window now ${spawnWindow(game).join(' – ')}`);
  }

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
  });
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
  const m = $('over-metrics');
  m.textContent = '';
  const mergeSummary = Object.entries(result.mergeCounts)
    .map(([size, count]) => `${count}×${sizeName(size)}`)
    .join(', ') || 'none';
  for (const [k, v] of [
    ['Max tile', result.maxTile.toLocaleString('en-GB')],
    ['Blocks placed', String(result.blocksPlaced)],
    ['Merges', mergeSummary],
    ['Longest chain', `${result.longestChain}×`],
    ['Duration', formatDuration(durationMs)],
    ['Seed', game.seed],
  ]) {
    const row = document.createElement('div');
    const kEl = document.createElement('span');
    kEl.textContent = k;
    const vEl = document.createElement('span');
    vEl.textContent = v;
    row.append(kEl, vEl);
    m.appendChild(row);
  }
  $('over-overlay').classList.add('show');
  refreshHud();
}

function sizeName(size) {
  return { 2: 'pair', 3: 'triple', 4: 'quad', 5: 'quint' }[size] || `group of ${size}`;
}

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
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
  const windowRow = $('window-row');
  windowRow.textContent = '';
  for (const v of spawnWindow(game)) {
    const el = document.createElement('span');
    el.className = 'mini-tile';
    styleMiniTile(el, v);
    windowRow.appendChild(el);
  }
  $('floor-label').textContent = `floor ${game.floor}`;
  $('placed').textContent = String(game.blocksPlaced);
  $('seed-label').textContent = `seed ${game.seed}`;
}

let bannerTimer = null;
function showBanner(text) {
  const el = $('banner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), CONFIG.animation.floorRiseBannerMs);
}

// ---------------------------------------------------------------------------
// input (RULES 2: Z X C V B direct send, arrows nudge/soft drop, space hard)

const DIRECT_KEYS = { KeyZ: 0, KeyX: 1, KeyC: 2, KeyV: 3, KeyB: 4 };

document.addEventListener('keydown', (e) => {
  if (e.code in DIRECT_KEYS || ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (phase === 'over' && (e.code === 'Enter' || e.code === 'KeyR')) { startGame(); return; }
  if (phase !== 'falling') return;

  if (e.code in DIRECT_KEYS) {
    fall.col = DIRECT_KEYS[e.code];
    const h = game.board[fall.col].length;
    if (fall.y <= h) { fall.y = h; positionFalling(); lockNow(); return; }
    positionFalling();
  } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    const target = fall.col + (e.code === 'ArrowLeft' ? -1 : 1);
    if (target >= 0 && target < RULES.COLS && fall.y >= game.board[target].length) {
      fall.col = target;
      positionFalling();
    }
  } else if (e.code === 'ArrowDown') {
    softDrop = true;
  } else if (e.code === 'Space') {
    fall.y = game.board[fall.col].length;
    positionFalling();
    lockNow();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') softDrop = false;
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
