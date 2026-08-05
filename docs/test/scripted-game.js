// scripted-game.mjs -- the shared cross-environment determinism fixture.
//
// One scripted game: a fixed seed and a deterministic move policy. The Node
// test suite and the browser test page (docs/test.html) both run it through
// the same engine and must land on the same final hash and score. EXPECTED
// below was produced by the Node run and locked in; either environment
// disagreeing with it is a determinism failure.

import { newGame, play } from '../js/engine.js';

export const SCRIPT_SEED = '20260805';
export const SCRIPT_MOVE_CAP = 400;

// Deterministic policy, a pure function of move index and state: mostly cycle
// the columns, every fourth move drop on the shortest column. Exercises
// merges, cascades, floor rises and (usually) a game over within the cap.
export function pickMove(i, state) {
  if (i % 4 === 3) {
    let best = 0;
    for (let c = 1; c < state.board.length; c++) {
      if (state.board[c].length < state.board[best].length) best = c;
    }
    return best;
  }
  return (i * 2 + 1) % 5;
}

// Play the scripted game; returns {state, moves}.
export function runScriptedGame() {
  let state = newGame(SCRIPT_SEED);
  const moves = [];
  for (let i = 0; i < SCRIPT_MOVE_CAP && state.status === 'playing'; i++) {
    const col = pickMove(i, state);
    moves.push(col);
    state = play(state, col).state;
  }
  return { state, moves };
}

// Locked-in expected outcome (filled from the first verified Node run).
export const EXPECTED = {
  finalHash: 'ffb7f2f9',
  score: 840,
  status: 'over',
  moveCount: 54,
};
