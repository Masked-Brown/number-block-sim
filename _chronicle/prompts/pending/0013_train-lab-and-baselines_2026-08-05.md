---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: train-lab-and-baselines
job: 0013
date: 2026-08-05
model: claude-opus-5[1m]
effort: extended thinking
---

## Aim
Build the simulation lab in `03_train/`: headless harness on the shared engine, frozen evaluation
seeds, three baselines, the first heuristic agent with an extensible feature registry, enriched
replay export, and a smoke campaign proving speed, determinism and the baseline ladder.

## What it was told
Harness in a sensible subfolder of `03_train/`, importing `docs/js/engine.js` directly with no
copied or re-implemented game logic and no npm dependencies. Settle the stage's
seed-and-repetition TBD with the given protocol (eval-v1 exactly 500 frozen seeds, disjoint
train-v1, training never touches eval). Agent interface as one pure function per player. Manifest
on every run. Four agents x 500 games on eval-v1, the ladder reported, throughput stated with the
cheapest fix proposed if under roughly 1,000 games per minute, determinism proved across Node and
the live site's cinema mode, two enriched sample replays saved and watched. Engine editable only
if a missing export blocked the harness.

## What it did
New: `03_train/lab/` (25 files: engine link, board views, feature registry and nine feature
modules, four agents, runner, metrics, seeds, manifest, replay, determinism, six CLIs, test
suite, README), `03_train/seeds/` (eval-v1 500 seeds, train-v1 2,000, both frozen and checksummed),
`03_train/output/runs/2026-08-05_smoke-ladder/` (campaign manifest, four series folders with
streamed games.jsonl, ladder tables, stacker sweep, throughput, determinism proof, hand-authored
SUMMARY.md), `03_train/output/samples/` (three verified enriched replays). Modified:
`03_train/CONTEXT.md`. Engine and `02_build/` untouched: no missing export was found, so neither
the permitted `docs/js/engine.js` change nor the BUILD.md interface note was needed.
Tests: green. `node --test 03_train/lab/test/` 14 pass; `node --test docs/test/` 28 pass
(unchanged, confirming the engine was not touched).
Delegation: none.

## Deliverables
- `03_train/lab/` -- the harness: agent interface, feature registry, runner, replay export, CLIs, tests
- `03_train/seeds/eval-v1.json` -- the frozen exam, exactly 500 seeds, checksum-verified on load
- `03_train/seeds/train-v1.json` -- the practice pool, 2,000 seeds, disjoint from eval-v1
- `03_train/output/runs/2026-08-05_smoke-ladder/` -- the first measured run, four agents x 500 games
- `03_train/output/runs/2026-08-05_smoke-ladder/SUMMARY.md` -- the ladder read, with four candidate findings
- `03_train/output/samples/` -- three enriched replays, each verified in cinema mode on the live URL
- `03_train/CONTEXT.md` -- Inputs/Process/Outputs rewritten; seed-and-repetition TBD settled

## How it went
The engine needed nothing. Every export the harness wanted was already there (`play` is genuinely
pure, `distributionFor` is exposed as RULES.md 7 requires, `makeReplay`/`verifyReplay` speak the
format cinema already reads), so the harness imports it and never models it. That is the single
biggest reason this went smoothly, and it is worth naming as a design win of the 02_build job
rather than luck: because every candidate placement is evaluated by calling `play()` and reading
its events, no agent can score a position the engine would disagree with, and the "no
re-implemented game logic" constraint cost nothing at all to honour.

The result AB will care about most is that BUILD.md's stacking observation does not survive
measurement. BUILD.md records an unattended game reaching roughly 5,300 points and reads it as
evidence that same-column stacking is generously rewarded. Measured over 500 eval seeds, strict
never-steer stacking has a median of 24 and a best game of 516, about one seventieth of the
random baseline's median of 1,700; and it is EXACTLY column-invariant, all five columns producing
identical scores, tiles and block counts on every seed (the mechanism is that a one-column game
merges only vertically and the spawn curve depends only on the max tile, so the column index
cannot enter the computation). The registered spill variant, which falls back to the shortest
column when its home column fills, reaches median 1,626, level with random and losing the
head-to-head 247 to 253. A 5,300 game sits at roughly the 94th percentile of the SPILL
distribution, so the observed game was almost certainly steered at least once. The stacker was
commissioned to quantify the claim honestly and the honest answer is that the claim is wrong;
BUILD.md is a record and was not edited, so this is raised as a gap below.

The unasked finding is larger. heuristic-v0, nine features, one move of lookahead, hand-set
weights, no search and no training, has a median of 114,210 on the same rules and tuning where
BUILD.md's recorded live human playthrough scored 228, and its WORST game in 500 was 11,856. The
score compounds because chain index multiplies a tile value that keeps inflating as the spawn
centre drifts. Two consequences are in the run summary as candidate findings: raw game score is a
poor headline axis for comparing strong agents, and the Phase 4 human composite will have to
reckon with the AI being in a different regime rather than merely better.

Throughput fought back in an instructive way. The first measurement put heuristic-v0 at 873
games/min, under the work order's roughly 1,000 bar, so I profiled, found two behaviour-neutral
wins (five of the ten spawn distributions built per move were never read; `chain-potential` used
a Map keyed by strings) and applied them. The component profile showed `chain-potential` dropping
from 647 ms to 55 ms. End to end, nothing moved. A controlled A/B, alternating old and new three
times each, showed why: this machine varies between 548 and 812 games/min on IDENTICAL code, so a
real thirty per cent improvement is invisible inside the noise. The lesson is now built into the
lab as `cli/throughput.js`, which repeats each measurement and reports best, median and worst, and
it is why the summary quotes a best-of-five figure of 820 rather than any single pass. A future
job should not trust one timed run on this hardware, and should not chase a regression that is
only visible in one. The optimisations were kept because they provably do less work and were
verified bit-identical across all 500 heuristic games; the campaign was then discarded and re-run
so the committed record was produced by the shipped code.

What a future job should know, beyond that: the feature registry auto-discovers
`features/registered/*.js`, so 03b adds and retires features without touching the harness, and an
agent version pins its feature versions so a re-versioned feature makes every old agent fail
loudly instead of silently scoring different maths. Do not edit an existing agent version; cut a
new one. And the four-environment determinism proof (two in-process Node runs, a separate Node
process, and the live site's cinema) is cheap to re-run and is the thing that makes the frozen
seed set an exam rather than a lottery.

No CONTEXT.md gap was hit: the stage contract's Inputs table named `02_build/src/` as the
upstream code home, which no longer exists after the `docs/` divergence, but that file was in
scope for this job and is now corrected in place rather than flagged.

Grade: 5
Prompt quality: yes, unaided. The work order was unusually good: it named the constraint that
mattered most (import the engine, stop and report rather than copy), it gave the seed protocol
rather than leaving a TBD for the job to invent, it asked for the registry to be extensible by
03b rather than merely present, and it pre-committed to an honest verdict on the stacking
question including the possibility that the answer would be "weak". The one thing it could not
anticipate is that "stacker" hides two genuinely different policies; the job split them, and the
split is where the real answer was.

## Correction passes
- Fixed a nonsense always-true condition in the stacker's `choose` (`length < length + 1`) before
  its first run; it would have made the agent never spill.
- Split the stacker into spill and strict variants after the first probe showed the work order's
  specified fallback ("else lowest") makes it a materially different and much stronger policy
  than the unattended game BUILD.md described. Both are measured; the registered ladder agent is
  the specified one.
- Changed the runner to omit `reasoning[]` entirely when an agent has no `explain`, rather than
  filling it with empty strings; a replay should not claim commentary it does not have.
- Applied two behaviour-neutral performance fixes mid-job, then discarded the first campaign and
  re-ran it so the committed run was produced by the shipped code. Verified bit-identical first:
  same moves, score and final hash across all 500 heuristic games.
- Rewrote `determinism.json`'s browser-leg block after the first attempt (see Any errors).

## Any errors
- wrote JavaScript string concatenation into a JSON record file -- status: recovered
  What was attempted: recording the verified browser leg of the determinism proof into the run
  folder's `determinism.json` after watching the replay in cinema mode on the live site.
  What actually happened: the long `observed` value was written as a multi-line `"..." + "..."`
  expression, which is valid JavaScript and invalid JSON, so the file no longer parsed.
  What it blocks or why it matters: a run record that does not parse is worse than a missing one,
  because the run folder is immutable once complete and a later job would inherit a broken
  artefact it must not edit. Caught immediately by validating every JSON file in `03_train/output/`
  with `node -e require(...)`, rewritten as single string literals, and all sixteen JSON outputs
  now parse. The validation sweep is worth repeating in any job that hand-edits a record file.

- the touchdown quarantined on its own close, because the number placeholder lives in two places
  and the close step fills only one -- status: recovered
  What was attempted: the standard close. Touchdown written to `pending/` with the literal `NNNN`
  placeholder in the filename per CC_TOUCHDOWN.md, `commit_safe.py --pick-number` to have the
  number picked under the lock, then `sweep.py --apply`.
  What actually happened: commit-safe picked 0013 and renamed the FILE, and the sweep then
  quarantined it with `frontmatter field job='NNNN' fails pattern ^\d{4}$`. The placeholder sits
  in the filename AND in the `job:` frontmatter field, and `--pick-number` rewrites only the
  filename (commit_safe.py lines 377 to 387 rename and re-stage; nothing in that file touches
  frontmatter).
  What it blocks or why it matters: every job that follows CC_TOUCHDOWN.md literally will
  quarantine its own touchdown on its first close. This is the SECOND time: the commit log
  carries `becac94 game-revision-v1.1: fix touchdown frontmatter job number to match the picked
  filename (0011)`, which is the same trap hit by job 0011 on the same day. Recovered here by
  setting `job: 0013` to match the picked filename, moving the file back to `pending/` with its
  reason file removed, and re-running the sweep. Recovering a touchdown this job wrote ninety
  seconds earlier, for a stated mechanical reason, is completing a close rather than clearing
  quarantine on a job's own judgement (norm B12); no other quarantined file was touched. The
  durable fix is a one-line change in one of two places, proposed below.

## Map flags
none

## Gaps
gap: `02_build/output/BUILD.md`'s v1.1 tuning observation ("an unattended game ... reached roughly
5,300 points ... which suggests repeated same-column stacking is generously rewarded under the
launch parameters") is contradicted by measurement. Strict unattended stacking has a median of 24
and a best of 516 over 500 eval-v1 seeds, is exactly column-invariant, and never approaches
5,300; the observed figure sits at the 94th percentile of the SPILL variant, so that game was
steered. BUILD.md is a record (norm B3) and was not edited. The reason this needs a decision
rather than a note: the observation is currently the stated motivation for a spawn-curve retuning
pass, and retuning on it would be retuning on a false signal. Evidence:
`03_train/output/runs/2026-08-05_smoke-ladder/supplementary/stacker-sweep.json` and SUMMARY.md.

gap: the only human reference score for rules v1.1 is BUILD.md's single live playthrough of 228,
by an unpractised player. It is now load-bearing for a candidate finding (the AI-versus-human gap)
and it will be load-bearing for the Phase 4 composite performance score, which is a lot of weight
for one game. Worth commissioning a small set of deliberate human playthroughs before 04_publish
quotes the gap.

## Resolutions
none

## Proposals
```
When 03b needs more simulation throughput, fan the runner out over seeds with node's
worker_threads rather than optimising the agent. Games are completely independent and playGame is
already a pure function of (agent version, seed), so the change is roughly forty lines, needs no
engine change and no dependency, and should scale close to linearly (heuristic-v0 near 8,000
games/min on twelve cores against 820 single-threaded). Deliberately not built in this job: it is
speculative until a campaign is actually waiting on it. About 40 per cent of the heuristic's
runtime is inside engine.play(), which the harness must not touch, so there is no large
single-thread win left after the two fixes already applied.
```
```
Probe an agent weighted to BANK quads and quintuples rather than take pairs. Across 500 games
each, only the weak agents ever recorded merges of five or more blocks (random 8 quintuples and
one sextuple, stacker 7 quintuples); greedy and heuristic-v0 recorded none, because taking a pair
on sight prevents equal blocks from ever accumulating. Since a group of n merges to value x
2^(n-1), a quad is four times a pair of the same value, so the current feature weights may be
systematically leaving the game's best line on the table. If such an agent beats heuristic-v0,
the finding is that the whole ladder so far has been playing the wrong game.
```
```
Timing claims on this hardware need repeats, not runs. A controlled A/B during this job measured
548 to 812 games/min on identical code, a spread wide enough to hide a real thirty per cent
change in either direction. `03_train/lab/cli/throughput.js` now repeats each measurement and
reports best, median and worst, and treats the BEST pass as the most informative single figure
since contention can only ever make a run slower than the code deserves. Any future job quoting a
performance number, in any stage, should do the same rather than quoting one pass.
```

```
Close the touchdown-number trap for good. The `NNNN` placeholder lives in two places, the
filename and the `job:` frontmatter field, and `commit_safe.py --pick-number` fills only the
first, so a job that follows CC_TOUCHDOWN.md literally quarantines its own touchdown on its first
close. It has now happened twice on the same day: job 0011 (commit becac94, "fix touchdown
frontmatter job number to match the picked filename") and this job. Two candidate fixes, both
one-liners, and the choice is AB's because they sit in different zones:
(a) commit_safe.py, under the lock, also rewrites the `job:` frontmatter field to the number it
just picked. This makes "never pick it yourself" true of both places and needs no job to
remember anything. It is a loop-code change, so it carries the design-pack and CHANGELOG
couplings.
(b) td_v2.json widens the `job` pattern to `^(NNNN|\d{4})$` and the sweep stamps the number from
the filename when it routes. Cheaper, but it leaves a placeholder in the landed record.
Recommending (a): the filename is already the authority the numbering rule is written against,
and one field should not have two owners.
```

## _tmp outputs
- none

## Work order verbatim
```
# Claude Code work order -- train-lab-and-baselines

From worker bee: nbs-[wor]-1.0-z
Model: opus | Effort: extended thinking | Rationale: this lab is the
measurement instrument for the whole training phase; a subtle
unfairness here silently invalidates every later result.

## Task
Build the simulation lab in 03_train/: a headless harness running the
shared engine, frozen evaluation seeds, three trivial baselines, the
first heuristic agent with an extensible feature registry, enriched
replay export, and a smoke campaign proving speed, determinism and the
baseline ladder.

## In scope
- 03_train/ -- harness code in a sensible subfolder of the stage
  (record the placement in 03_train/CONTEXT.md), results to
  output/runs/, seed sets to a versioned home within the stage.
- 03_train/CONTEXT.md -- update Inputs/Process/Outputs to what is
  actually built; settle the stage's seed-and-repetition TBD with the
  protocol below.
- 02_build/output/BUILD.md -- append a short interface note if the
  engine needs any export it does not already have.
- docs/js/engine.js -- ONLY if a missing export blocks the harness;
  smallest possible change, no behaviour change, tests still pass.

## Out of scope
- No weight training, no search, no orchestrator. That is 03b.
- No game or UI changes, no config retuning (the stacking observation
  gets measured here, not fixed here).
- 01_rules/, 04_publish/ -- untouched.

## CONTEXT to read
- 03_train/CONTEXT.md
- 01_rules/output/RULES.md -- the law
- 02_build/output/BUILD.md -- engine interface and the stacking note
- CONTEXT.md (root)

## Constraints
- The harness imports docs/js/engine.js directly. No copied, adapted
  or re-implemented game logic anywhere in 03_train/. If an import
  problem tempts a copy, stop and report instead.
- Node built-ins only. No npm dependencies.
- Determinism is load-bearing: a harness-played game exported as a
  replay must verify and play in cinema mode on the live site.
- Every run folder starts with a manifest: agent name and version,
  feature list and weights if any, seed set id, engine git commit,
  timestamp, games played. No manifest, no run.

## Do, part 1: the instrument
1. Agent interface, one shape for every player in the experiment:
   a pure function receiving (engine state, falling block, next block,
   spawn probabilities) and returning a column. Document it in the
   stage CONTEXT.
2. Runner: play agent X on seed set S for N games, streaming per-game
   metrics (RULES.md section 7) to JSON lines in a run folder, with
   the manifest, plus an aggregate summary: median, quartiles, mean,
   max-tile distribution, blocks-placed distribution.
3. Seed sets: eval-v1, exactly 500 seeds, generated once, committed,
   and FROZEN, never regenerated. A separate train-v1 pool, disjoint
   from eval, for later campaigns. Record the discipline in the stage
   CONTEXT: every headline comparison runs on eval-v1; training never
   touches it.
4. Enriched replay export: any harness game can be saved as a replay
   JSON, optionally with reasoning[] per move (plain-English line plus
   named feature scores). Verify one such file in cinema mode on the
   live site.

## Do, part 2: the players
5. Baselines, three: random legal column; greedy (take any immediate
   merge, else lowest column); stacker (always the same column while
   legal, else lowest). The stacker exists to quantify BUILD.md's
   centre-stacking observation honestly.
6. Heuristic v0 with a feature REGISTRY, not a hard-coded list: each
   feature is a named pure module scoring a candidate placement, an
   agent is a weight vector over registered features, and the
   registry is designed for 03b to add, version and retire features
   without touching the harness. Seed the registry with at least:
   immediate merge value, chain potential, height and unevenness cost,
   strand risk (burying low under high, depth-weighted), setup
   adjacency (banking triples and quads), spawn-aware pressure using
   the live probabilities, and column flexibility. Hand-set v0 weights
   with one line of reasoning each in the code.
7. Feature and agent versioning: an agent version pins its feature
   list and weights; results are recorded against that version. State
   the rule in the stage CONTEXT: the exam is frozen, versions are
   immutable, comparisons happen between named versions only.

## Do, part 3: the smoke campaign
8. Run all four agents on eval-v1, 500 games each. Report the ladder.
9. Measure and report throughput (games per minute, single process).
   If below roughly 1,000 games per minute, say so and propose the
   cheapest fix rather than building parallelism speculatively.
10. Determinism proof: one seed, same agent, run twice in Node and
    once exported to cinema on the live site; identical final hash
    and score all three times.
11. Save two enriched sample replays to output/: the heuristic's best
    eval game and the stacker's best eval game, so AB can watch both
    in cinema mode and see exactly what 5,300-by-stacking looks like.

## Verify (before you close)
- The ladder table: median and quartiles for random, stacker, greedy,
  heuristic v0 on eval-v1, plus max-tile distributions.
- An explicit verdict on the stacking question with numbers: is
  same-column stacking degenerate-dominant, mid-table, or weak once
  measured properly over 500 games?
- Throughput number stated. Determinism proof stated with hashes.
- Both sample replays verified playing in cinema mode on the live URL.
- Engine untouched, or the minimal export named with tests passing.
```
