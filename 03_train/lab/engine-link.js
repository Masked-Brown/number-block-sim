// engine-link.js -- the ONE place the lab reaches the game engine.
//
// Everything in 03_train/ imports the engine through this file and never by a
// second path. There is no game logic here and there is none anywhere else in
// this stage: no copied, adapted or re-implemented merge, spawn, scoring or
// game-over code. `docs/js/engine.js` is the only authority on what a move
// does, and the lab learns what happened by calling it and reading the events
// it returns.
//
// The engine is a browser file (GitHub Pages serves `docs/`) that also runs
// unchanged in Node, which is exactly why the harness can share it. If the
// engine ever moves, this file is the single edit.

export {
  RULES,
  REPLAY_VERSION,
  newGame,
  play,
  cloneState,
  fromPosition,
  previewValue,
  spawnDistribution,
  distributionFor,
  hashState,
  resultMetrics,
  makeReplay,
  runReplay,
  verifyReplay,
} from '../../docs/js/engine.js';

export { CONFIG } from '../../docs/js/config.js';

// Repo-relative paths, for manifests and for anything that needs to hash the
// engine it actually ran against.
export const ENGINE_PATH = 'docs/js/engine.js';
export const CONFIG_PATH = 'docs/js/config.js';

// The rules version this lab was built against. RULES.md sections 1 to 6 are
// the law; a bump there is AB's decision and invalidates frozen results.
export const RULES_VERSION = '1.1';
