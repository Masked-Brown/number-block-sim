// board-render.js -- the shared DOM board renderer (game and cinema mode).
// Rendering only; all truth comes from the engine state it is handed.

import { RULES } from './engine.js';
import { CONFIG, tileColour } from './config.js';

const T = () => CONFIG.board.tilePx;
const G = () => CONFIG.board.gapPx;
const PAD = 10; // inner padding of the board box, px

// Visible rows: the 7 legal rows plus the overflow row a clutch lock uses.
const VISIBLE_ROWS = RULES.ROWS + 1;

export function boardSize() {
  return {
    width: RULES.COLS * T() + (RULES.COLS - 1) * G() + 2 * PAD,
    height: VISIBLE_ROWS * T() + (VISIBLE_ROWS - 1) * G() + 2 * PAD,
  };
}

export function leftFor(c) { return PAD + c * (T() + G()); }
// y is a row in cell units, 0 = bottom; fractional y positions the falling block.
export function topFor(y) { return PAD + (VISIBLE_ROWS - 1 - y) * (T() + G()); }

export function fontSizeFor(value) {
  const digits = String(value).length;
  const base = T();
  if (digits <= 2) return base * 0.42;
  if (digits === 3) return base * 0.36;
  if (digits === 4) return base * 0.30;
  return base * 0.25;
}

export function makeTileEl(value, floor) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.textContent = String(value);
  el.style.background = tileColour(value);
  el.style.fontSize = `${fontSizeFor(value)}px`;
  el.style.borderRadius = `${CONFIG.board.radiusPx}px`;
  if (floor !== undefined && value < floor) el.classList.add('retired');
  return el;
}

export function styleMiniTile(el, value) {
  el.textContent = String(value);
  el.style.background = tileColour(value);
}

// A board view owns one .board element and re-renders settled tiles from a
// state. The falling block is NOT its business; the game loop overlays that.
export function createBoardView(container) {
  container.classList.add('board');
  const { width, height } = boardSize();
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  const overflow = document.createElement('div');
  overflow.className = 'overflow-zone';
  overflow.style.height = `${PAD + T() + G() / 2}px`;
  container.appendChild(overflow);

  const layer = document.createElement('div');
  container.appendChild(layer);

  function render(state, opts = {}) {
    layer.textContent = '';
    for (let c = 0; c < RULES.COLS; c++) {
      for (let r = 0; r < state.board[c].length; r++) {
        const el = makeTileEl(state.board[c][r], state.floor);
        el.classList.add('no-anim');
        el.style.left = `${leftFor(c)}px`;
        el.style.top = `${topFor(r)}px`;
        el.dataset.cell = `${c},${r}`;
        if (opts.lastLocked && opts.lastLocked.c === c && opts.lastLocked.r === r) {
          el.classList.add('last-locked');
        }
        layer.appendChild(el);
      }
    }
  }

  function flashCells(cells) {
    for (const { c, r } of cells) {
      const el = layer.querySelector(`[data-cell="${c},${r}"]`);
      if (el) el.classList.add('flash');
    }
  }

  return { el: container, layer, render, flashCells };
}
