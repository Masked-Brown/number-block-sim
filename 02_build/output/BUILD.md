# BUILD.md -- the game build record (job build-game-engine-cinema, 2026-08-05)

The playable game exists and is deployed. This file is the architecture record: what was built,
the decisions taken, how to run it, and what was verified. The code itself lives in `docs/`
(see "Where the code lives" for why); this stage's folder keeps the intent and the records.

Live URL: https://masked-brown.github.io/number-block-sim/
Rules implemented: `01_rules/output/RULES.md` v1.0, exactly; no rule was invented or resolved
inline. Tuning constants (RULES.md section 8) live in `docs/js/config.js`.

## Where the code lives, and why

GitHub Pages serves one folder, and AB decided (2026-08-05) it serves `main` `/docs`. Push
equals deploy: no build step, no bundler, no dependencies. The engine must also be importable
from Node unchanged (the `03_train/` sim harness drives the same file), so the whole game is
vanilla JS ES modules under `docs/`:

- `docs/index.html` + `docs/js/ui.js` -- the browser game (renderer and input; owns time).
- `docs/cinema.html` + `docs/js/cinema.js` -- cinema mode, the replay viewer.
- `docs/js/engine.js` -- THE engine: pure logic, no DOM, no timers, no Math.random. The one
  file every consumer shares (browser game, cinema, Node tests, the later sim harness).
- `docs/js/config.js` -- the single tunables file: every RULES.md section 8 constant (fall
  speeds, animation timings, colours, board render geometry). No magic numbers elsewhere.
- `docs/js/board-render.js` -- the shared DOM board renderer (game and cinema).
- `docs/js/share.js` -- the canvas score card (personal best and screenshot sharing only).
- `docs/test/engine.test.js` -- the conformance suite (Node's built-in runner, no deps).
- `docs/test/scripted-game.js` -- the shared determinism fixture (seed, policy, locked hash).
- `docs/test.html` -- the browser half of the cross-environment determinism check.
- `docs/package.json` -- `"type": "module"` only, so Node parses the same `.js` files as ES
  modules the browser loads; nothing is installed.

This is a declared divergence from the plain stage shape (code in `02_build/src/`), recorded
in the root `CONTEXT.md` routing and `_infrastructure/CHANGELOG.md` 0004. One implementation,
two consumers, one home; `02_build/` holds intent and records, and git history holds the rest.

## Architecture decisions

1. **The engine is pure and the renderer owns time.** `play(state, col)` is the entire move
   interface: board state in, column in, new state and an events list out (lock, merge passes
   with cells and targets, gravity moves, floor rise, game over, spawn). The UI translates
   interactive play (nudges, soft drop, hard drop) into one engine call per locked block, so
   fall speed and input timing can never change what the engine computes from (seed, moves).
   Timing is recorded as replay metadata only.
2. **PCG32, bit-identical everywhere.** The seeded generator (RULES.md 3) is PCG32 XSH RR
   64/32 with 64-bit BigInt arithmetic, fixed stream 54, one uniform tier-offset draw per
   block. The Node suite asserts the reference vectors (seed 42, seq 54: 0xa15c02b7, ...)
   against an independently computed source, so the implementation is checked against the
   PCG32 spec, not against itself.
3. **The spawn draw binds at spawn time.** RULES.md 3 requires that no retired tier ever
   spawns and that the preview shows the next block. The engine therefore draws each block's
   tier OFFSET (0..3) one block ahead, and binds it to a value under the floor as it stands
   at that block's own spawn, after any floor rise. The preview (`floor * 2^offset`) is
   always honest and rebinds on a rise; a retired tier can never spawn. This is the one
   design point the rules force rather than state; it is an implementation decision recorded
   here, not a rule resolution.
4. **Determinism is a tested property.** A scripted game (fixed seed, deterministic policy)
   is locked into `docs/test/scripted-game.js` with its final FNV-1a state hash. The Node
   suite asserts it; `docs/test.html` runs the identical script in the browser and compares
   the same hash. Both environments produce `ffb7f2f9` (54 moves, score 840, game over).
5. **Replay schema v1, versioned from day one.**
   `{version, seed, moves[], meta{date, player, result{score, maxTile, blocksPlaced,
   mergeCounts, longestChain, finalHash}, durationMs, moveTimestamps[]}}` plus an OPTIONAL
   `reasoning[]` array (one entry per move: `{text, features{name: score}}`). Human replays
   omit `reasoning[]`; the Phase 3 AI fills it. Cinema mode handles both and re-runs every
   loaded replay through the engine before playing it, showing a verified / mismatch badge.
6. **Game-over and clutch mechanics are engine truth.** A block may be directed into a full
   column; it locks above row 7 and resolution runs. Rescue and game over follow RULES.md 6
   inside the engine; the UI merely renders the overflow row.

## How to run locally

    python -m http.server 8000 --directory docs

then open http://localhost:8000/ (verified working; any static server does).
Tests: `node --test docs/test/` (Node 18+; no dependencies).
Cross-environment check: open `/test.html` locally or on the live site.

## Deployment

GitHub Pages, enabled 2026-08-05 via the API (`gh api -X POST repos/{owner}/{repo}/pages`
with source `{branch: main, path: /docs}`), build type legacy, HTTPS enforced. Every push to
`main` that touches `docs/` redeploys. No workflow file, no publishing infrastructure; the
04_publish write-up remains its own later concern.

## Verification record (2026-08-05)

- Engine suite: 23 tests, 23 pass (`node --test docs/test/`), covering pair/triple/quad/quint
  2^(n-1) merges, simultaneous disjoint groups sharing a chain index, multi-pass cascades with
  lowest-leftmost landing, chain-index scoring, floor rise at exactly 128x with no purge and
  repeated doubling, stranded-block merging, spawn-window membership over a long seeded game,
  spawn binding after a rise, clutch rescue, game over with and without merges elsewhere,
  input-state purity, replay determinism round-trip, and the PCG32 reference vectors.
- Browser determinism: `/test.html` on the live URL reports DETERMINISTIC, hash `ffb7f2f9`
  equal to the locked Node value, all six checks PASS.
- Live playthrough: a full game played start to game-over on the live URL; metrics screen,
  personal best, auto-saved replay all live. Cinema mode at `/cinema.html?last=1` loaded that
  exact auto-saved replay, verified it against the engine, and played it back; the reasoning
  panel was additionally exercised with a synthetic reasoning[] replay.
