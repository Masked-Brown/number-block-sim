# BUILD.md -- the game build record

The playable game exists and is deployed; this file is the architecture record: what was
built, the decisions taken, how to run it, and what was verified. The code lives in `docs/`
(see "Where the code lives"); this stage's folder keeps the intent and the records.

Two build events so far: the v1.0 build (job build-game-engine-cinema, 2026-08-05) and the
v1.1 revision (job game-revision-v1.1, same day, AB's playtest decision). The current state
below describes v1.1; the v1.1 section near the end records exactly what changed and why.

Live URL: https://masked-brown.github.io/number-block-sim/
Rules implemented: `01_rules/output/RULES.md` v1.1, exactly; no rule was invented or resolved
inline. Tuning constants (RULES.md section 8, the spawn curve parameters included) live in
`docs/js/config.js`.

## Where the code lives, and why

GitHub Pages serves one folder, and AB decided (2026-08-05) it serves `main` `/docs`. Push
equals deploy: no build step, no bundler, no dependencies. The engine must also be importable
from Node unchanged (the `03_train/` sim harness drives the same file), so the whole game is
vanilla JS ES modules under `docs/`:

- `docs/index.html` -- the home screen: Play, Cinema mode, How to play, the rules link.
- `docs/play.html` + `docs/js/ui.js` -- the browser game (renderer and input; owns time).
- `docs/cinema.html` + `docs/js/cinema.js` -- cinema mode, the replay viewer.
- `docs/js/engine.js` -- THE engine: pure logic, no DOM, no timers, no rendering randomness.
  The one file every consumer shares (browser game, cinema, Node tests, the later sim
  harness). Imports config.js only for the default spawn parameters.
- `docs/js/config.js` -- the single tunables file: every RULES.md section 8 constant,
  including the eight spawn-curve parameters. Retuning difficulty is an edit here, never a
  code edit. No magic numbers elsewhere.
- `docs/js/board-render.js` -- the shared DOM board renderer (game and cinema).
- `docs/js/fx.js` -- feedback effects (shake, bursts, chain popups, squash, pop), all
  fire-and-forget and all gated behind prefers-reduced-motion.
- `docs/js/share.js` -- the canvas score card (personal best and screenshot sharing only).
- `docs/test/engine.test.js` -- the conformance suite (Node's built-in runner, no deps).
- `docs/test/scripted-game.js` -- the shared determinism fixture (seed, PINNED spawn
  parameters, policy, locked hash), immune to config retunes by design.
- `docs/test.html` -- the browser half of the cross-environment determinism check.
- `docs/package.json` -- `"type": "module"` only; nothing is installed.

This is a declared divergence from the plain stage shape (code in `02_build/src/`), recorded
in the root `CONTEXT.md` routing and `_infrastructure/CHANGELOG.md` 0004. One implementation,
two consumers, one home; `02_build/` holds intent and records, and git history holds the rest.

## Architecture decisions

1. **The engine is pure and the renderer owns time.** `play(state, col)` is the entire move
   interface: board state in, column in, new state and an events list out (lock, merge passes
   with cells and targets, gravity moves, game over, spawn). The UI translates interactive
   play (nudges, the drop) into one engine call per locked block, so input timing can never
   change what the engine computes from (seed, moves). Timing is replay metadata only.
2. **PCG32, bit-identical everywhere.** The seeded generator (RULES.md 3) is PCG32 XSH RR
   64/32 with 64-bit BigInt arithmetic, fixed stream 54, one 32-bit draw per block. The Node
   suite asserts the reference vectors (seed 42, seq 54: 0xa15c02b7, ...) against an
   independently computed source, so the implementation is checked against the PCG32 spec,
   not against itself.
3. **The spawn distribution is integer maths, end to end.** The v1.1 drifting curve (RULES.md
   3 carries the exact formula) deliberately avoids Math.exp and float weights: linear decay
   from a milli-tier centre, integer floor division, integer weights, and a draw by
   cumulative weight against `r mod W`. Reason: transcendental float functions are not
   guaranteed bit-identical across JS engines, and cross-environment determinism is a tested
   property here, not a hope. The engine exposes `spawnDistribution(state)` /
   `distributionFor(board, params)` as pure functions: the exact numbers the UI shows are
   the exact numbers the Phase 3 AI's lookahead will use (RULES.md 7).
4. **Draw timing.** The next block's value is drawn at the moment the current block enters
   play, from the board as it then stands (RULES.md 3). The preview is therefore exactly the
   value that will spawn, always honest, and the drawn sequence is one draw per block in
   fixed order.
5. **Determinism is a tested property.** A scripted game (fixed seed, pinned spawn
   parameters, deterministic policy) is locked into `docs/test/scripted-game.js` with its
   final FNV-1a state hash. The Node suite asserts it; `docs/test.html` runs the identical
   script in the browser and compares the same hash. Both environments produce `437281e9`
   (46 moves, score 948, game over).
6. **Replay schema v2, embedding its tuning.** `{version: 2, seed, spawn: {the eight curve
   parameters}, moves[], meta{date, player, result, durationMs, moveTimestamps[]}}` plus the
   OPTIONAL `reasoning[]` array (one entry per move; human replays omit it, the Phase 3 AI
   fills it). A replay carries the spawn parameters it ran under and verifies against them,
   so AB can retune config.js freely without breaking a single recorded game. Format v1
   replays (rules v1.0) are refused with a clear message by the engine and by cinema mode;
   replaying one wrongly would be worse than refusing.
7. **Game-over and clutch mechanics are engine truth.** A block may be directed into a full
   column; it locks above row 6 and resolution runs (RULES.md 6). The UI merely renders the
   overflow row.
8. **Effects never gate the loop.** Every feedback effect (fx.js) is a fire-and-forget
   overlay via the Web Animations API; the game loop and cinema playback advance and render
   regardless of whether any animation gets to play. Cinema's fall animation force-completes
   on the next step, so fast stepping or a throttled background tab can never desynchronise
   the board from the move counter (a real bug found and fixed in verification).

## Game feel research (2026-08-05, written before the v1.1 look-and-feel work)

Sources read: Jonasson and Purho's "Juice it or lose it" (Nordic Game Jam 2012, via
gamejuice.co.uk and eolt.org's Game Feel entry), Jan Willem Nijman's "The Art of Screenshake"
(Vlambeer; write-ups at theengineeringofconsciousexperience.com and victorweidar.wordpress.com),
egmatic.com's game-feel guide, the Disney animation principles as applied to games (squash and
stretch, anticipation, follow-through), Purple Pwny's visual-hierarchy guide for game
developers, and the 2048 repository's own readability issue (gabrielecirulli/2048 issue 71).
What they say, distilled to what binds this build:

1. Feel is three layers in strict order: instant input response, readable feedback for every
   action, then polish. Juice rides ON TOP of responsiveness; an effect that delays or blocks
   input is a regression, not polish. All effects here are fire-and-forget overlays; input is
   never gated on an animation finishing.
2. Juice must echo and clarify the core gameplay, never decorate it. This game's core is the
   cascade, so feedback escalates with merge size and chain index, exactly the quantities the
   scoring rewards: bigger merges shake harder, later passes burst brighter, and a chain popup
   names the multiplier the player just earned.
3. Screenshake works when proportional and brief (Vlambeer): stacked micro-effects beat one
   big one, and shake beyond ~150 ms or beyond a few pixels reads as damage, not impact.
   Landing gets a 2-3 px nudge; merges add amplitude per group size and per chain pass.
4. Squash and stretch conveys weight without cost (Disney via game-feel writing): the locked
   block squashes on impact and recovers; a merged block pops with a small overshoot. Weight
   is the feeling AB asked high tiers to carry, so high tiers get depth (glow, inset edge)
   rather than brightness.
5. The 2048 failure to avoid: from 128 upward its tiles converge on similar light golds and
   become confusable in motion (their issue 71). The ramp here therefore keeps a distinct hue
   step per tier all the way up, keeps dark high-contrast numerals on every tile, and marks
   the high band by depth styling, never by washing the colour out.
6. Visual hierarchy: one thing loud at a time. The board and falling block are the loudest;
   NEXT is the one prominent side element (it is the only thing the player must plan with);
   the spawn possibilities list is deliberately quiet reference material; danger state is an
   ambient signal (edge glow, slow pulse) that cuts through precisely because everything else
   is calm.
7. Tension needs an ambient channel, not a modal one (the Tetris danger-zone analogue): the
   near-full board gets a low-frequency pulse that builds dread without obscuring play.
8. Accessibility is part of feel: prefers-reduced-motion disables shake, particles and
   popups (colour flashes remain, they carry the information); every effect is cut if it
   makes the board harder to read, legibility first.

## The v1.1 revision (2026-08-05): what changed and why

AB's playtest verdict drove five changes, carried by the work order game-revision-v1.1 and
versioned in RULES.md v1.1 (v1.0 preserved beside it as `rules-v1.0.md`):

- **Spawn model** (rules change): the hard four-tier window with floor rise and tier
  retirement is gone. In its place, a probability distribution over every live tier with a
  centre that drifts up as the board's max tile grows, linear decay each side, and a floor
  weight so nothing ever hits zero: low tiers stay possible late (rare), high tiers appear
  occasionally early. Early game is harder than v1.0 (five live tiers with real mass versus
  four uniform) while a competent player still reaches a few hundred points; the eight curve
  parameters are config tunables for AB's fine-tuning pass.
- **Board** (rules change): 7 rows to 6; columns stay 5. Games are tighter and danger
  arrives sooner.
- **Controls** (rules change): arrows and space only. Z X C V B direct-send and soft drop
  removed; a new block enters in the column where the previous one locked (centre for the
  first). Fewer controls, more board reading.
- **Interface**: a home screen (Play, Cinema mode, How to play, rules link; every page links
  back); NEXT split out as the one prominent side box; SPAWN POSSIBILITIES as a quiet list
  of every live value with its exact live percentage (the engine's own numbers); the words
  "window" and "floor" removed from the UI entirely.
- **Look and feel**: researched first (previous section), then rebuilt: near-black ground,
  sharp 4 px tile corners, hard panel lines, a deeper muted-to-warm colour ramp with a
  distinct hue per tier, heavy styling (glow and inset depth) from 256 up, landing squash,
  merge bursts scaled to group size, chain popups and shake that escalate with the chain
  index, an expanding-ring signal for large merges, an ambient red danger pulse when any
  column reaches height 5, and prefers-reduced-motion honoured throughout. Cinema mode now
  shows each block falling into place before it locks (duration scales with playback speed)
  so a viewer sees movement, not appearance.

One observation for AB's tuning pass, from verification: an unattended game (blocks dropping
into one column with no steering) reached roughly 5,300 points through self-fed vertical
merges, which suggests repeated same-column stacking is generously rewarded under the launch
parameters. The curve parameters are config tunables precisely so this can be adjusted
without a code edit.

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

## Verification record (2026-08-05, v1.1)

- Engine suite: 28 tests, 28 pass (`node --test docs/test/`): PCG32 reference vectors; exact
  integer spawn weights on the empty board and after drift (hand-computed expectations);
  monotonic centre drift; no-tier-ever-zero across game stages; probabilities summing to 1
  at every stage of a full game; preview-equals-spawn; config carrying all eight named
  parameters; the unchanged merge suite (2^(n-1) through quintuples, simultaneous groups,
  four-pass cascade, lowest-leftmost landing); 6-row clutch rescue and game-over edges;
  purity and deep cloning; replay determinism round-trip; replays verifying under their own
  embedded tuning; v1 refusal; metrics.
- Cross-environment determinism: `/test.html` locally and on the live URL reports
  DETERMINISTIC, hash `437281e9` equal to the locked Node value, all six checks PASS.
- Live playthrough: a full game start to game-over on the live URL using only arrows and
  space (28 blocks, score 228 from a mindless steering pattern: harder than v1.0, still
  scoring); the auto-saved v2 replay carries spawn parameters and per-move timestamps.
- Cinema: refused the genuine v1.0 replay left in the live site's localStorage from the
  previous session with the clear v1 message; loaded the fresh v2 replay, verified it
  against the engine, and played all 28 moves with the falling-block animation at 1x, 2x
  and 4x (every frame advancing, no orphan tiles, final score matching).
- Navigation: home reaches Play and Cinema; play, cinema and test all link back to home.
- The in-game possibilities percentages were hand-checked against the RULES.md formula at
  two board states (empty and max-tile 32) and matched exactly.

## Correction (2026-08-05): the stacking observation above did not survive measurement

The line under "The v1.1 revision" reading "an unattended game ... reached roughly 5,300
points through self-fed vertical merges, which suggests repeated same-column stacking is
generously rewarded under the launch parameters" stands above, unedited (norm B3: this file
is a record), and is now known to be false. It was one unsteered sample, not a measurement.

The 03a job (touchdown 0013, train-lab-and-baselines) commissioned a stacker agent over the
frozen 500-game eval-v1 seed set to quantify the claim honestly, and split it into the two
policies "stacking" conflates. Strict never-steer stacking has a median score of 24 (best 516)
and is exactly column-invariant across all five columns on every seed: a one-column game
merges only vertically, and the spawn curve depends only on the max tile, so the column index
cannot enter the score. That is roughly one seventieth of the random baseline's median of
1,700. The spill variant (falls back to the shortest column once its home column fills) reaches
a median of 1,626, level with random and losing the head-to-head 247 games to 253. A 5,300 game
sits at about the 94th percentile of the spill distribution, so the original observation was
almost certainly steered at least once, not left unattended as recorded. Evidence:
`03_train/output/runs/2026-08-05_smoke-ladder/supplementary/stacker-sweep.json` and that run's
`SUMMARY.md`.

No retuning follows from this: the spawn-curve retune the observation had been motivating a
case for is withdrawn along with it. The 03a gate is otherwise healthy (heuristic-v0 median
114,210 against the recorded human playthrough's 228; throughput a best-of-five 820 games/min
serial, this machine's run-to-run noise on identical code spanning 548 to 812), so training on
the game as it stands, unchanged, proceeds. Decision recorded in
`_infrastructure/CHANGELOG.md` 0006.

## The v1.2 revision (2026-08-05, job remediate-and-game-v1.2)

Features only. **No rule changed, no spawn parameter changed, no engine behaviour changed**: the
engine's exported API, its hashes and every existing replay are untouched, and the
cross-environment determinism check still reports the same locked hash `437281e9`. What changed
is what the game shows you after you die, plus one CSS line.

### New files under `docs/js/`

- `grader.js` -- the move judge. A faithful browser implementation of ONE pinned lab agent,
  `expectimax-d2-v2`: heuristic-v2's eleven bred weights, a depth-2 max-max over the falling
  block and the honest preview, and the leak-free leaf (see the decision below). It calls
  `play()` for every candidate placement like everything else here and reimplements no game
  logic; what it does duplicate is the eleven feature functions and the search, because the lab
  is not served to browsers.
- `performance.js` -- the product side: walks a recorded game past the judge, turns score and
  pace into indices, and combines them into the composite. Every constant it uses is a named
  tunable in `config.js` under `performance`.
- `docs/test/grading.test.js` -- 11 tests: judge purity, judge leak-freeness, grade determinism,
  chunk-budget independence, and the exact arithmetic of all three indices and the composite.

### Decision 9: the grader is a second implementation, held down by a test

`02_build/CONTEXT.md` says agent logic belongs to `03_train/`, and this file is where that is
now qualified rather than quietly broken. The v1.2 work order requires grading "entirely in the
browser, deterministic, no network". GitHub Pages serves `docs/` only, so the lab's agent cannot
be loaded by the game, and the judgement therefore exists twice.

The alternative considered and rejected: move the feature registry and the expectimax search
into `docs/js/` and have the lab import them, which would give one implementation and the same
dependency direction the engine already uses. Rejected as out of scope and genuinely risky:
`03_train/`'s documented architecture, its per-feature versioning and its immutable agent
modules would all have to move at once, in a job whose main purpose was to fix an honesty bug in
those same modules.

What makes the duplication acceptable is that it is tested from the other side.
`03_train/lab/test/lab.test.js` imports `docs/js/grader.js`, plays 270 positions from real games,
and fails on a single disagreed column. A re-versioned feature or a retuned weight turns that
test red instead of leaving the browser copy silently stale. The weight vector's KEY ORDER is
copied too, and deliberately: floating-point addition is not associative, so summing the same
eleven products in a different order can move a total by an ulp and flip a tie.

### Decision 10: grade against the leak-free champion, at depth 2

Audit 0019 found that expectimax-d2-v1 and d3-v1 read the engine's real but unknowable next
block at their search leaves, through `next-merge-ready`. Grading a human against a judge that
peeks would mark them down for not knowing the unknowable, so the grader mirrors the fixed
version, `expectimax-d2-v2`, and the standing test names it.

Depth 2 rather than the stronger depth 3 is a cost decision: depth 3 is roughly twenty times
slower per position, which would turn a five-second grade into two minutes in a browser tab.
Depth 3 is the better judge (F001), so agreement measured against depth 2 is slightly generous,
and by how much is not yet measured; `04_publish/output/NEXT_STEPS.md` item 11 prices the
measurement.

Two blind spots are reported rather than hidden. The champion only considers columns that do not
overflow on their own, so a clutch lock into a full column (RULES.md 6) always grades as a
disagreement and is counted separately on screen. And agreement is exact-column agreement, so a
move that is second-best by a hair scores the same as a catastrophe.

### Decision 11: yield with a MessageChannel, not setTimeout

Grading is chunked so the page keeps painting (`CONFIG.performance.gradeChunkMs`, 12ms of work
per slice). The first implementation yielded with `setTimeout(0)` and was measured at over forty
seconds for a 256-move game whenever the tab lost focus, because Chrome clamps timers in a
backgrounded tab to about one call a second. A MessageChannel message is a macrotask and is not
throttled. Same grade either way, and `grading.test.js` pins that: a chunk budget of zero and a
budget of infinity must produce identical numbers, or the grade would depend on the CPU.

The channel is created per grade and closed when the grade ends, which is not a tidiness
preference: an open port with a listener is a live handle, and holding one for the module's
lifetime hung `node --test docs/test/` after the last grading test had already passed, because in
Node a live port keeps the event loop alive. Caught by the test suite refusing to exit.

### The falling-tile hover glitch, fixed

`.tile` carries `transition: top 130ms ease-in`, and the falling tile, unlike settled tiles
(`no-anim`) and the ghost, never disabled it. `ui.js` rewrites `style.top` every animation frame,
so each write restarted the 130ms ease-in near zero velocity and the rendered tile lagged its
true position by up to a cell, visibly hovering above the stack (AB's reported glitch, diagnosed
from code by audit 0019). `.tile.falling` now declares `transition: left 80ms ease-out`: the
sideways nudge still animates, the fall does not, and settled tiles are untouched so gravity and
merges still read.

Verified live on a local server: the falling tile's computed transition is `left` at 0.08s, and
its computed `top` equals its styled `top` on 13 consecutive samples during a fall, maximum lag
0px. Before the fix the audit measured the same tile carrying `top 0.13s ease-in` with computed
lagging styled.

### The daily board

`play.html?daily=1` derives the seed from the UTC date and `CONFIG.daily.label`, hashed with
FNV-1a twice to fill 64 bits. New game and R restart the SAME board, which is the point of a
daily. No server, no leaderboard, no verification, no attempt limit: two people can compare a
score by agreeing to play today's board and nothing more is claimed. The leaderboard version,
which would need the database the CLAUDE.md guardrail holds back, is priced in
`04_publish/output/NEXT_STEPS.md` item 12.

### Verification record (2026-08-05, v1.2)

- Engine suite: 28 pass, unchanged. New grading suite: 11 pass. Lab suite: 27 pass, including
  the two new tests that bind the browser grader to `expectimax-d2-v2`.
- Cross-environment determinism: `/test.html` still reports DETERMINISTIC at hash `437281e9`.
- Falling-tile fix: measured live, 0px lag over 13 samples (above).
- A full game played to game over in the browser through synthetic key events only, so the same
  handler a player uses: breakdown screen showed score, max tile, blocks placed, merges by size,
  longest chain, total time, median seconds per move and the seed, plus a composite of 22/100
  decomposing as accuracy 12 at weight 0.5, score 0 at weight 0.3 and pace 80 at weight 0.2
  (22 = 6 + 0 + 16, checked by hand), and the clutch-lock note fired correctly on the one move
  into a full column.
- Realistic-scale grading, on AB's homed 256-move human replay loaded into the page: 1.07s to
  grade at 4.2ms a move on an idle machine (5.7s at 22ms a move while two eval runs held six
  cores), and the two consecutive grades of the same replay were byte-identical as JSON. Result:
  46.5 per cent agreement with the champion, 2 clutch locks, median 1.852s a move, composite
  65.56/100 (accuracy 46.48, score 74.38, pace 100) at the champion cap of 634,826.
- Daily board: `?daily=1` shows the date note and holds its seed across New game and R; the
  plain game still draws a fresh random seed per game.
- No console errors on the home, play, daily or test pages.
