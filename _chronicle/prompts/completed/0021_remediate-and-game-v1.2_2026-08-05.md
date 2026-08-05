---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: remediate-and-game-v1.2
job: 0021
date: 2026-08-05
model: claude-opus-5[1m]
effort: extended thinking
---

## Aim

Execute audit 0019's before-publish fixes (the expectimax leaf-preview leak, the banking probe
re-run, dated findings corrections, ladder uncertainty, the falling-tile CSS glitch), then ship
game v1.2 (post-game breakdown, in-browser accuracy grade, composite performance score, daily
board), then write the project's roadmap. No rule or spawn change anywhere.

## What it was told

Eleven numbered items across three parts plus a roadmap, with `01_rules/` read-only and eval-v1
frozen. Items exactly as costed by the audit: leak-free d2-v2 and d3-v2 re-run on eval-v1 with
the old rows kept and marked superseded; the banking probe restated from the leak-free agent;
append-only dated corrections to F001, F003, F004 and the decision log; bootstrap and paired
intervals plus a fixed-horizon panel from existing games.jsonl; F004 softened to what n=1
supports; the falling-tile transition fixed and verified live; the breakdown screen from data the
game already records; deterministic in-browser grading against the leak-free champion at depth 2;
the composite 0.5 accuracy + 0.3 scoreIndex + 0.2 paceIndex with all constants named tunables and
components shown; the daily seed only if genuinely trivial; NEXT_STEPS.md with value, cost and
invalidation per item, each tagged BEFORE-V2-RESULTS or PRODUCT-ONLY.

## What it did

Files changed. `03_train/lab/`: `agents/expectimax.js` (explicit `leafNext`, leak-free leaf,
`NEXT_DEPENDENT_FEATURES`), `agents/expectimax-d2-v1.js` and `-d3-v1.js` (leaf mode made explicit,
superseded notes; behaviour unchanged and proved so), new `agents/expectimax-d2-v2.js` and
`-d3-v2.js`, `agents/index.js`, `features/context.js` (the `next` honesty note), `metrics.js`
(`makeRng`, `bootstrapCI`, `medianOfIndexed`, `meanOfIndexed`), new
`cli/ladder-uncertainty.js`, `cli/knowledge.js` (champion updated, superseded rows marked),
`test/lab.test.js` (+8 tests). `03_train/output/`: `_FINDINGS.md` (F001, F003, F004 corrections),
`DECISION_LOG.md` (appended correction), `knowledge.json` (regenerated), four new run folders.
`03_train/CONTEXT.md`. `docs/`: new `js/grader.js`, `js/performance.js`, `test/grading.test.js`;
`js/ui.js`, `play.html`, `css/style.css`, `js/config.js`, `index.html`.
`02_build/output/BUILD.md` (the v1.2 section, decisions 9 to 11, verification record).
`04_publish/output/NEXT_STEPS.md` (new).
Tests: green. Engine and grading suites 39 pass (`node --test docs/test/`), lab suite 27 pass
(`node --test 03_train/lab/test/`), browser cross-environment determinism DETERMINISTIC at the
unchanged locked hash 437281e9.
Delegation: none.

## Deliverables

- 03_train/lab/agents/expectimax-d2-v2.js, expectimax-d3-v2.js -- the leak-free versions; leaf
  next-reading features integrated over the exact live spawn distribution.
- 03_train/output/runs/2026-08-05_eval-expectimax-d2-v2/ -- 500 eval-v1 games, median 428,990.
- 03_train/output/runs/2026-08-05_eval-expectimax-d3-v2/ -- 500 eval-v1 games, median 634,826;
  the honest champion row.
- 03_train/output/runs/2026-08-05_behaviour-probe-d2-v2/ -- F003's rates re-measured leak-free on
  the identical instrument and seeds.
- 03_train/output/runs/2026-08-05_leak-free-ladder/ -- ten-row ladder, bootstrap and paired
  intervals, the fixed-horizon panel, and SUMMARY.md's reading.
- 03_train/lab/cli/ladder-uncertainty.js -- the uncertainty and horizon instrument; plays nothing.
- docs/js/grader.js, docs/js/performance.js -- the in-browser leak-free judge and the composite.
- docs/test/grading.test.js -- 11 tests on judge purity, grade determinism and the index maths.
- 04_publish/output/NEXT_STEPS.md -- the roadmap, 15 sections, ranked.

## How it went

**The leak was real, the fix was cheap, and the leak was worth nothing.** That is the headline and
it took the whole exam to establish. Paired on all 500 eval-v1 seeds: depth 2 honest 428,990
against leaked 427,986 (ratio 1.00x, 95 per cent interval 0.89 to 1.09, win rate interval 44.0 to
52.8 per cent); depth 3 honest 634,826 against leaked 643,996 (0.99x, 0.92 to 1.07, 46.6 to 55.4
per cent). Both difference intervals contain zero and the direction is not consistent between
depths. Audit 0019 measured the leak flipping 7.8 per cent of depth-2 decisions, so the agent
genuinely was using the peek; it simply was not worth anything. F001's magnitude survives
untouched and only its mechanism sentence needed the correction.

**The design choice worth knowing.** The leak is in the FEATURE layer, not the search, and the
feature modules are pinned by version and must not be edited. So the honesty lives in the agent:
`makeExpectimax` now takes `leafNext` of `engine-draw` or `expectation` with NO default, because
the previous default was the leak and a silent default is how it survived a code review. At a leaf
the next-reading feature is scored as the exact expectation over `spawnNow`, and the reason that
is the right distribution is worth one line for a future job: the block after a leaf's block is
drawn when that block enters play, from the board as it then stands, and that is exactly the board
the leaf context was built from. The same identity holds at depth 2 and depth 3, which is why one
mechanism covers both.

Two things guard it now. Perturbing ONLY the engine's rng state, so every future draw changes and
nothing a player can see does, must never move a v2 choice and MUST move a v1 one, and both halves
are asserted. And every registered feature is scored at several `next` values, so an undeclared
preview-reading feature fails the suite rather than quietly re-opening the leak. I would rather
have written the second test than trusted the hand-maintained set it checks.

**Making the v1 rows reproducible required care.** Adding a required parameter meant editing two
immutable agent modules, which the stage contract forbids for anything behavioural. The edit is
`leafNext: 'engine-draw'`, provably the same code path, and the summation order is unchanged
because `next-merge-ready` was already last in heuristic-v2's key order. Proved rather than
argued: 60 recorded depth-2 games and 8 recorded depth-3 games re-chosen move for move from the
registered modules, zero mismatches on moves, score or final hash.

**The fixed-horizon panel found something the leak fix did not.** Most of the ladder's spread is
survival, not scoring rate. At 256 blocks placed rather than at game over, depth 2 over flat is
1.23x instead of 2.10x and the champion over heuristic-v0 is 1.66x instead of 5.56x. The ORDERING
holds at every horizon from 128 to 512 blocks, so the ladder is not an artefact, which is the
question the panel was built to answer, but the SIZE of every gap mostly says search dies later
rather than that it scores faster. The same panel gives F004 its first matched comparison: AB's
121,496 in 256 blocks sits between the two searching agents' 256-block medians (119,800 and
133,302), not the flat ones. Both are drafted as candidate findings in the leak-free ladder's
SUMMARY.md rather than promoted, because the work order's register authorisation was scoped to the
three corrections it named. A future job should expect these two to be the most publishable things
this analysis produced.

**Also found by the intervals, unrelated to the leak:** random-v1 and stacker-v1 are not
distinguishable on this exam (median paired difference 20 points, interval -164 to +256, win-rate
interval spanning 50 per cent). The campaign ladder's phrase "level with stacker" was right and
now has a number. Every other rung's interval excludes zero.

**The game half's one real architecture decision** is BUILD.md decision 9. Grading in the browser
with no network means the judgement exists twice, because Pages serves `docs/` only and the lab
cannot be loaded there. Moving the feature registry into `docs/` would give one implementation but
would restructure eleven immutable modules in the job that was fixing an honesty bug in them, so I
duplicated and bound it: the LAB suite imports `docs/js/grader.js` and fails on a single disagreed
column across 270 real positions. The weight vector's key order is copied deliberately, because
floating-point addition is not associative and summing the same eleven products in a different
order can flip a tie. That test passing first time was the moment I trusted the grader.

**Two live-verification findings the tests would not have caught.** The falling-tile fix needed
measuring, not just applying: computed `top` now equals styled `top` on 13 consecutive samples
during a fall, maximum lag 0px, where the audit had measured the transition active and lagging.
And grading a 256-move game took over forty seconds whenever the browser tab lost focus, because
Chrome clamps `setTimeout` in a backgrounded tab to about one call a second; a MessageChannel
message is a macrotask and is not throttled. That fix then hung `node --test docs/test/` after the
last grading test had already passed, because in Node a live port keeps the event loop alive, so
the channel is created per grade and closed when the grade ends. Both are recorded in BUILD.md;
the second is the kind of bug a test suite finds only by refusing to exit.

**CONTEXT gap hit.** `02_build/CONTEXT.md`'s "Do not" says no agent logic in this stage, and the
work order requires a judge in the browser, whose code home is `docs/`. I recorded the decision and
its rejected alternative in BUILD.md, which the work order named as in scope, and did NOT edit
`02_build/CONTEXT.md`, which it did not. Raised as a gap below so the line and the decision stop
contradicting each other.

**One judgement call inside the spec.** The work order fixes scoreIndex as "log-scaled and capped
at the champion eval median" and says nothing about a floor. A pure log ratio from 1 is very
generous at the top (the human game would have scored 87 of 100), so I added a named tunable floor
at 1,000, roughly the scale of play with no judgement at all, and the human game scores 74. Cap and
log scaling are as specified; the floor is an addition, named, commented and tested, and it is the
one place a reader might reasonably want a different number.

Grade: 4
Prompt quality: yes, unaided. The order's costings were accurate (d3 re-run 56 minutes against the
audit's 40 estimate, everything else as priced), the honesty items were specified precisely enough
to implement without interpretation, and item 5's "IF additional human replays exist at run time"
was exactly the right conditional to write, since none did. Two nicks. The order names "the
champion eval median" for the score cap without saying which champion, in a job whose whole point
is that the champion changes; I read it as the strongest honest agent, d3-v2. And item 8's "grade
against the leak-free champion judgement at depth 2" sets depth 2 without saying why, which is a
cost decision worth having stated, since it makes every accuracy figure slightly generous against
the d3 champion the same order defines.

## Correction passes

- The leaf expectation was first built on a derived context view (`Object.create` with a shadowed
  `next`) exported from `features/context.js`. Correct, and measured 1.45x slower end to end than
  swapping `next` in place on the agent's own throwaway context and restoring it. Both produce
  identical numbers (checked to the digit on a real board and by identical eval decisions); the
  swap shipped, the helper was removed rather than left dead, and the reason is commented where
  the swap happens.
- The leaf distribution was first read per leaf from `ctx.spawnNow`. It is the same distribution
  for every candidate column at a node, and at depth 3 for every hypothesised third block too, so
  the caller now computes it once and passes it in. Verified no number moved: the five-game train
  probe returned the identical five scores before and after.
- `docs/js/config.js`'s `scoreIndexCap` was written as 643,996 while the honest d3 row was still
  running, then set to 634,826 from the run that landed. Recorded because the wrong number was on
  disk for part of the job and the tests would not have caught it: they assert the index maths
  against whatever the constant says.

## Any errors

- Grading a 256-move replay took over forty seconds in a backgrounded browser tab -- status: recovered
  What was attempted: chunking the in-browser move grade so the page keeps painting, by yielding
  with `setTimeout(resolve, 0)` every 12ms of work. What actually happened: measured 45,000ms-plus
  for one 256-move grade (the CDP evaluate call timed out at 45s), against about 1,000ms in a
  focused tab. Observation core: Chrome clamps timer callbacks in a hidden or backgrounded tab to
  roughly one per second, and a 256-move grade yields 50 to 80 times. What it blocked: nothing
  shipped, but a player who switched tabs mid-grade would have watched a progress percentage crawl
  for a minute. Recovery: yield with a MessageChannel message, which is a macrotask and is not
  throttled; re-measured at 1,072ms for the same replay, byte-identical result.
- The MessageChannel fix hung `node --test docs/test/` -- status: recovered
  What was attempted: verifying the whole docs suite after the yield change. What actually
  happened: the runner printed every test as passing and then never exited; two runs were killed
  at 300s and 420s before the cause was found. Observation core: a module-lifetime MessagePort with
  an `onmessage` listener is a ref'd handle, so Node's event loop stays alive after the last test.
  What it mattered for: a suite that hangs is a suite nobody runs, and the failure looked like a
  slow test rather than a leak. Recovery: the channel is created per grade and closed in a
  `finally`; the suite now exits 0 in under a minute.

## Map flags

none

## Gaps

gap: `02_build/CONTEXT.md`'s "Do not" reads "No agent logic here; agents belong to `03_train/`,
and this stage only exposes the interface." Game v1.2 puts a faithful copy of one pinned agent
version in `docs/js/grader.js`, because the work order requires in-browser grading with no network
and GitHub Pages serves `docs/` only. The reasoning, the rejected alternative and the standing test
that binds the copy to `expectimax-d2-v2` are recorded in `02_build/output/BUILD.md` decision 9,
which the work order named as in scope; the CONTEXT line, which it did not, still reads as a flat
prohibition. It wants a qualifying clause pointing at that decision, or an explicit AB ruling that
the copy is a divergence to be removed later by moving the feature registry into `docs/`. Not
patched silently, per the work-order self-check.

gap: `03_train/output/runs/2026-08-05_eval-expectimax-d2-v2/manifest.json` records
`workingTreeDirty: true`, because that run launched after this job edited `docs/js/config.js` to
add the v1.2 `performance` and `daily` tunable blocks. The provenance is sound and stated in the
run note and in the leak-free ladder's SUMMARY.md (the eight spawn parameters are byte-identical
to HEAD, the worker pool is created before the first game and receives its spawn parameters
explicitly through `workerData`, and the manifest records the parameters used), but a future
reader meeting a dirty flag on a headline row should not have to reconstruct that. Worth a
convention: a job that will produce headline rows commits its unrelated tunable edits first, or
`buildManifest` records WHICH files were dirty rather than a bare boolean.

## Resolutions

- resolves: 1fb1e3204ae5 -- F004's Evidence field said the replay sat at the repo root,
  uncommitted. F004 now carries a dated correction whose first point names
  `03_train/output/reference/nbs-replay-121496.json`, committed, engine-verified (score 121,496,
  hash a613b2d4) and cinema-verified by audit 0019. The original Evidence wording stands above it
  unedited, per the work order's append-only instruction.
- resolves: 2f98c89f3276 -- `DECISION_LOG.md` recorded "the peek is now structurally impossible".
  The log is append-only and the claim is false as stated, so this job appended a dated correction
  entry that quotes the sentence, says plainly that the write-up must not quote it, explains that
  deleting the recursion closed one peek path while the feature layer was another, and carries the
  remediation and its measured worth. The original entry is untouched.
- resolves: 8574e31e5271 -- the product-zone gap carrying four audit items by id. Two are now
  DONE: 82cd659c3289, ladder uncertainty, is `runs/2026-08-05_leak-free-ladder` (bootstrap
  intervals on every row, paired intervals per rung, the fixed-horizon panel, by
  `lab/cli/ladder-uncertainty.js`, no games played); 508c6cbfabc4, the falling-tile hover, is the
  `.tile.falling` rule in `docs/css/style.css`, measured live at 0px lag over 13 samples. The other
  two are NOT done and are carried forward with value, cost and invalidation stated:
  d470bc09b68d becomes `04_publish/output/NEXT_STEPS.md` items 4 (strand-risk and tier-gap
  ablations, ranked first for value) and 3 (pricing the clutch rescue); c93923790a14 becomes items
  1 (the spawn-tuning study, with the audit's exact parameter tests and the panel's new evidence
  for judging it) and 2 (the two-block preview, marked AB's rule decision alone). Closing the
  routing item rather than leaving it part-open: its purpose was to keep four items visible until
  priced or done, and both remaining ones now sit in the roadmap AB commissioned. If the review
  disagrees it should re-raise the two by their original ids.

## Proposals

```
`buildManifest` should record WHICH paths were dirty rather than a bare `workingTreeDirty`
boolean. The flag currently inspects `docs/js/engine.js` and `docs/js/config.js` together, so a
run that touched neither in any meaningful way still reports true if either file has an unrelated
edit, and a reader of a headline row cannot tell a spawn-parameter change from a comment. It
already computes the porcelain listing; keeping it (paths only, no diff) turns a scary boolean
into a checkable fact. Cheap, and it would have removed one of this job's two gaps.
```

```
A `lab/cli/grade-replay.js` that grades any replay file against any named agent would be worth
its hour. It would price the browser grader's one known compromise (depth 2 rather than depth 3,
NEXT_STEPS item 11) by grading the same human replays at both depths where compute is free, give
the human study of items 9 and 10 its analysis tool, and provide a third independent check on
`docs/js/grader.js` beyond the standing equivalence test. Nothing in the lab can currently grade
a human game at all.
```

```
The two candidate findings drafted in `runs/2026-08-05_leak-free-ladder/SUMMARY.md` are worth an
AB promotion pass sooner than the next campaign. The first, that most of the depth ladder's
spread is survival rather than scoring rate, changes what the write-up should lead with and is
measured on all 500 seeds at four horizons. The second, that a plausible information leak changed
7.8 per cent of decisions and no measurable score, is a methodological finding about the
experiment's own rigour, which is exactly the kind of thing a sceptical reader looks for and
rarely finds stated.
```

```
Consider a standing convention that any browser-side mirror of a lab agent must be named in the
lab suite. `docs/js/grader.js` is the first, and it is only safe because a test in 03_train
imports it and fails on one disagreed column. If a second mirror ever appears (a cinema-mode
advisor, a hint button) the same discipline should be automatic rather than remembered, and the
cheapest form is a one-line rule in `03_train/CONTEXT.md` beside the existing paragraph.
```

## _tmp outputs

- none

## Work order verbatim

```
# Claude Code work order -- remediate-and-game-v1.2

From worker bee: nbs-[wor]-1.0-z
Model: opus | Effort: extended thinking | Rationale: a precisely
specified fix list from audit 0019 plus a scoped game feature; no open
design judgement.

## Task
Execute the audit's before-publish fixes, then ship game v1.2: post-
game stats, an AI accuracy grade, a composite performance score, and
a next-steps roadmap. No rule changes, no spawn changes, anywhere.

## In scope
- 03_train/ -- leak-free agents, re-runs, analysis, findings updates
- docs/ -- the CSS fix and the v1.2 features
- 04_publish/output/NEXT_STEPS.md -- new
- 03_train/CONTEXT.md, 02_build/output/BUILD.md -- record updates

## Out of scope
- 01_rules/ -- READ-ONLY. Any change to rules or spawn parameters is
  forbidden, whatever the audit recommended; those are recorded in
  NEXT_STEPS.md instead.
- eval-v1 -- frozen as ever.
- No RL, no leaderboard, no new game mechanics.

## CONTEXT to read
- 03_train/CONTEXT.md, 02_build/CONTEXT.md, CONTEXT.md (root),
  04_publish/CONTEXT.md
- Audit touchdown 0019 (completed/) -- the fix list and its evidence

## Do, part 1: honesty fixes (audit items, exactly as costed)
1. Leak-free expectimax: at search leaves the next-merge-ready
   feature must use expectation over the live spawn distribution (or
   zero), never the engine's real drawn-but-unknowable block. New
   immutable versions expectimax-d2-v2 and d3-v2; re-run both on
   eval-v1; update the ladder with the honest rows (keep the old rows
   visible, marked superseded-by-leak-fix).
2. Re-run the banking probe on the leak-free d2; restate F003's
   decline and banking rates from it.
3. Amend F001 and F003 in _FINDINGS.md with dated corrections (append,
   never rewrite): magnitude upheld, mechanism restated honestly.
   Append the same dated correction note to the decision log.
4. Ladder uncertainty: bootstrap confidence intervals and paired-
   difference intervals from the existing games.jsonl for every
   ladder row, plus the fixed-horizon panel (score at N blocks from
   recorded games). Pure analysis, no new games beyond item 1's.
5. F004 wording: soften to exactly what n=1 supports. IF additional
   human replays exist in 03_train/output/reference/ at run time,
   incorporate them and restate accordingly; do not wait for them.
6. The falling-tile CSS fix per the audit's diagnosis (disable the
   transition on the actively falling tile). Verify live: no hover
   lag, settled behaviour unchanged.

## Do, part 2: game v1.2 (features only, zero mechanics changes)
7. Post-game breakdown screen: score, max tile, blocks placed,
   merges by size, longest chain, total time, median seconds per
   move, all from data the game already records. Clean, readable,
   consistent with the current visual style.
8. Accuracy grade: after each human game, grade every recorded move
   against the leak-free champion judgement at depth 2, entirely in
   the browser, deterministic, no network. Show accuracy percent on
   the breakdown screen. Keep grading time acceptable (grade
   progressively or on a spinner if needed; never block gameplay).
9. Composite performance score on the same screen:
   0.5 x accuracy + 0.3 x scoreIndex + 0.2 x paceIndex, scoreIndex
   log-scaled and capped at the champion eval median, paceIndex 100
   at <=2s median move time falling to 0 at 12s. All constants named
   tunables in config.js. Show the three components, not just the
   total, so the number explains itself.
10. Daily seed: include only if it is genuinely trivial (a date-
    derived seed option on the home screen); if it complicates
    anything, record it in NEXT_STEPS.md and skip.

## Do, part 3: the roadmap
11. Write 04_publish/output/NEXT_STEPS.md: a comprehensive, plainly
    written roadmap of where this project could go next. Include at
    minimum, each with value, rough cost, and what it would
    invalidate: the spawn-tuning study and two-block preview (the
    audit's full reasoning), clutch-rescue pricing, strand-risk
    ablation, the RL baseline question, a Neon-backed leaderboard
    and daily competition, richer human study (many players, skill
    curves), mobile controls, and anything else the record suggests.
    Mark each BEFORE-V2-RESULTS or PRODUCT-ONLY.

## Verify (before you close)
- Leak-free ladder rows present with CIs; the leak's true measured
  cost stated plainly.
- All findings amendments dated and append-only.
- Live site: full game, breakdown screen with all stats, accuracy
  and composite showing with components, glitch gone.
- Grading determinism: the same replay grades identically twice.
- No diff anywhere under 01_rules/; eval-v1 hash unchanged.
```
