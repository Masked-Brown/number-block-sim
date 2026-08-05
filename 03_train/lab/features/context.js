// context.js -- the scoring context a feature receives.
//
// One candidate placement is: "from THIS state, drop the falling block in THIS
// column". The context is built by asking the ENGINE what that does, never by
// working it out here, so every feature scores the truth.
//
// Fields:
//   col       the candidate column
//   before    the state before the move (never mutated; engine.play is pure)
//   after     the state the engine returned
//   events    the engine's event record for the move: {locked, passes[],
//             gameOver, spawned}. passes[] is the merge cascade, one entry per
//             chain index, each carrying its merges (RULES.md 4, 5).
//   gameOver  true if this placement ended the game (RULES.md 6)
//   current   the value of the block being placed
//   next      the previewed value that follows it (RULES.md 3, honest preview)
//   spawnNow  the live spawn distribution BEFORE the move
//   spawnNext the live spawn distribution from the resulting board, that is,
//             the exact probabilities the next draw will use (RULES.md 7: the
//             AI's lookahead uses the same numbers the UI shows)
//   scoreGain after.score - before.score, the game score this move earned
//   chainLen  number of cascade passes this move triggered

import { play, distributionFor } from '../engine-link.js';

// Both distributions are LAZY and memoised. A context is built for every
// candidate column of every move, so computing a distribution no feature ends
// up reading is pure waste, and spawnNow in particular is identical across all
// five candidates of a move. Laziness is not an optimisation of the maths: the
// numbers are exactly the same, they are just not computed until asked for.
export function buildContext(state, col) {
  const { state: after, events } = play(state, col);
  let now = null;
  let next = null;
  return {
    col,
    before: state,
    after,
    events,
    gameOver: events.gameOver === true,
    current: state.current,
    next: state.nextValue,
    get spawnNow() {
      if (now === null) now = distributionFor(state.board, state.spawn);
      return now;
    },
    // After a game-ending move the board is over-height, but the distribution
    // is still well defined and features may read it; nothing depends on it.
    get spawnNext() {
      if (next === null) next = distributionFor(after.board, after.spawn);
      return next;
    },
    scoreGain: after.score - state.score,
    chainLen: events.passes.length,
  };
}
