// Game over risk: did this placement end the game.
//
// RULES.md 6 allows a block into a full column: it locks above row 6 and
// resolution runs, and if it merges its way back to legal height that is a
// clutch rescue and play continues. So "ends the game" is not a property of
// the column, it is a property of the outcome, and only the engine knows it.
// This feature reads the engine's verdict for the candidate move.
//
// Kept as a feature rather than a hard filter in the agent on purpose: every
// judgement an agent makes should live in one readable place, its weight
// vector, and a game-ending move must stay selectable when every move ends the
// game.

export default {
  name: 'game-over-risk',
  version: 1,
  status: 'active',
  describe: 'one if the engine reports this placement ended the game, else zero',
  score(ctx) {
    return ctx.gameOver ? 1 : 0;
  },
};
