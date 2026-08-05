---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: orchestrated-training-campaign
job: 0017
date: 2026-08-05
model: claude-fable-5
effort: maximum extended thinking
---

## Aim
Run the training campaign as an orchestrator: build the parallel runner, breed and extend the
strongest interpretable agent the game allows, measure every step honestly on the frozen exam,
and close with findings, a knowledge file, a decision log and the champion's enriched replay.

## What it was told
Parallel runner first (worker_threads, bit-identical, throughput from repeats). Then a campaign
of the job's own judgement inside the cage: frozen eval-v1, immutable named versions, findings
with mechanism and evidence and confidence, features as pure registry modules, determinism as
stop-and-report, cost routed to scripts, a decision log written as it went. Close with the
ladder, the ablation, the knowledge file, _FINDINGS.md, and the champion's best game verified
in cinema on the live site.

## What it did
New: `lab/parallel.js` (pool + worker), `lab/train/cem.js`, `lab/agents/weighted.js`,
`lab/agents/expectimax.js`, four registered versions (`heuristic-v1`, `heuristic-v2`,
`expectimax-d2-v1`, `expectimax-d3-v1`), two features (`tier-gap-cost`, `next-merge-ready`),
seven CLIs (`breed.js`, `run-parallel.js`, `parallel-check.js`, `throughput-parallel.js`,
`probe-behaviour.js`, `ladder-tables.js`, `knowledge.js`), five lab tests. Runs:
`2026-08-05_parallel-proof`, `_breed-h0`, `_eval-heuristic-v1`, `_breed-h1-features`,
`_eval-heuristic-v2`, `_eval-expectimax-d2-v1`, `_eval-expectimax-d3-v1`,
`_behaviour-probes`, `_campaign-ladder`. Campaign records: `output/DECISION_LOG.md`,
`output/knowledge.json`, `output/_FINDINGS.md` (six findings, work-order authorised),
champion replay in `output/samples/`. Modified: `03_train/CONTEXT.md`, `lab/README.md`,
`lab/agents/index.js`, `lab/test/lab.test.js`. Engine and docs/ untouched.
Tests: green (`node --test 03_train/lab/test/` 19 pass; `node --test docs/test/` 28 pass,
unchanged). eval-v1 sha256 identical before and after the campaign
(cb22c4933ca5600f673c25dc5e9a98028630f367daf74070df0a76f00d5df7d3).
Delegation: none beyond scripts; all game-playing in Node workers, recon done inline where it
was load-bearing for design.

## Deliverables
- 03_train/lab/parallel.js -- the worker-pool fan-out, bit-identical by proof and by standing test
- 03_train/lab/train/cem.js + lab/cli/breed.js -- seeded deterministic CEM breeding as run folders
- 03_train/lab/agents/expectimax.js -- honest-information-set lookahead (preview exact, third block expected)
- 03_train/lab/agents/heuristic-v1.js, heuristic-v2.js, expectimax-d2-v1.js, expectimax-d3-v1.js -- the named versions
- 03_train/lab/features/registered/tier-gap-cost.js, next-merge-ready.js -- the two features the death boards earned
- 03_train/output/runs/2026-08-05_campaign-ladder/ -- the final ladder and ablation tables on eval-v1
- 03_train/output/knowledge.json -- champion weights, feature list, curves, ladder (machine-assembled)
- 03_train/output/DECISION_LOG.md -- the dated decision record, written as the campaign ran
- 03_train/output/_FINDINGS.md -- six findings, each with mechanism, evidence, confidence
- 03_train/output/samples/expectimax-d3-v1-best-eval-v1.replay.json -- 1,094 moves with reasoning, engine-verified, watched to the end in cinema on the live site (badge green, final 2,710,108)

## How it went
The campaign's shape held: instrument first, then judgement inside the cage. The parallel
runner went in as scoped by touchdown 0013 (one file, pool plus worker half, agents crossing
the thread boundary as specs) and the bit-identity proof was clean, but the throughput hope
did not survive contact with the silicon: 0013 projected near 8,000 games/min on twelve
cores, and the measured truth is about 3x at SIX workers (best 3,442), because this 15 W part
throttles under all-core load and ten workers are slower than six. Every later budget
decision used the measured figure, and the worker sweep is in the proof run for the next job.

The campaign itself taught three things worth a future job's attention. First, the biggest
single lever was not tuning but INFORMATION: two full CEM breeds bought 1.79x together, while
one ply of lookahead over the preview bought 2.09x at identical weights, and the expected
third block another 1.50x (the final ladder on eval-v1, all 500 seeds: v0 114,210, v1
141,424, v2 204,618, expectimax-d2 427,986, expectimax-d3 643,996). Second, the most valuable diagnostic of the whole job was looking at
DEATH BOARDS: re-weighting nine features could not fix a failure mode none of them measured
(tier fragmentation), and one look at how the worst games actually end produced the two
features that beat both breeding campaigns combined. Third, honesty infrastructure paid for
itself twice: the frozen-seed paired comparisons made 150-game fitness blocks rank candidates
reliably, and the determinism discipline turned breed 2's external kill from an incident into
a non-event (delete, relaunch, bit-identical reproduction, confirmed against the first run's
streamed lines).

The expectimax information set deserves a line for Phase 4's benefit: depth 2 is exact over
the two KNOWN blocks (current plus honest preview), depth 3 adds one expectation over the
third block using the distribution the engine itself drew from, and the agent never reads a
simulated state's own preview, which would be clairvoyance. An early draft could have made
that mistake; the recursion was deleted in favour of a structure where the peek is
impossible. The d3 version truncates the expectation at 0.9 mass (recorded in its module and
every manifest) after measurement showed full expectation cost about 1.8x more for no
observed decision-quality gain at probe sizes.

Mid-campaign, an uncommitted HUMAN replay at the repo root (121,496, engine-verified, nine
minutes of play) collapsed the smoke ladder's three-orders-of-magnitude human gap into "a
practised human sits level with flat heuristic play, and only search pulls clearly ahead";
F004 carries it as suggestive-and-thin until AB commissions the practised set 0013 already
asked for.

One contract tension, resolved by reading rather than silently: the stage CONTEXT gates
_FINDINGS.md behind AB's promotion pass, while the work order names it deliverable 7 with an
entry discipline. Read as AB pre-authorising this campaign's entries; recorded in
DECISION_LOG.md and here so AB can reverse it cheaply (the six entries are cleanly excisable
and the same text exists nowhere else, so a reversal is one revert of that file).

CONTEXT gaps: none hit; the stage CONTEXT was accurate throughout, and the campaign
conventions it lacked are now written into it (this job's in-scope edit).

Grade: 5
Prompt quality: yes, unaided. The order's cage (frozen exam, immutable versions, evidence
discipline, determinism as stop-and-report) is exactly what kept a fast-moving campaign
honest, and the freedom inside it ("expected moves, not mandated") was real: the two features
came from death boards, not from the order.

## Correction passes
- The first bit-identity test failed on `harnessMs`, the per-game stopwatch, which differs
  between ANY two runs including two serial ones. Response: bit-identity defined over the
  game-defining content via `gameIdentity()` (stopwatch excluded, nothing else), stated in the
  proof record and asserted in the suite. Not a nondeterminism; the game content was identical.
- An early expectimax draft carried a generic recursion that COULD have expanded a simulated
  state's own preview, reading a draw no player can see. Deleted in favour of a last-ply-only
  helper (`bestLastPly`) so the peek is structurally impossible, before any measurement used it.
- _FINDINGS.md was first drafted with an invented depth-3 median while that eval still ran;
  caught immediately and replaced with grep-able placeholders (D3MEDIAN etc.), filled from the
  landed run before commit. Recorded here because inventing a number is exactly the failure the
  evidence discipline exists to stop.

## Any errors
- breed 2's first launch was killed externally after generation 3 -- status: recovered
  What was attempted: the second CEM breed (`breed-h1-features`, 24 x 150 games per
  generation, roughly 20 minutes) as a background task, the same way breed 1 ran to
  completion. What actually happened: the task was reported killed by the harness moments
  after the orchestrating turn ended; generations 0 to 3 were complete in the streamed
  record, the run folder held a manifest and a partial generations.jsonl, and four node
  processes initially suspected as orphans turned out to be unrelated MCP servers (left
  untouched). What it blocks or why it matters: a partial breeding record must never be
  mistaken for a complete one. Recovery: the breed is deterministic under its recorded rng
  seed, so the partial folder was deleted and the identical command relaunched; the rerun
  reproduced generations 0 to 3 bit for bit (fitness lines compared against the first run's
  stream) and continued to completion, and the landed folder is the complete relaunched
  record. The suspected cause (background tasks not surviving the end of an orchestrating
  turn) was worked around by keeping the turn alive through later long runs.

## Map flags
none

## Gaps
gap: `nbs-replay-121496.json` sits uncommitted at the repo root: a format-v2 HUMAN replay
(2026-08-05T12:16Z, score 121,496, 256 blocks, nine minutes of per-move timestamps), verified
through the engine by this job. It is load-bearing for finding F004 (the practised-human
reference) but it is AB's file, outside this job's scope to home or commit; it needs a proper
home (04_publish reference material, or a dedicated human-games folder AB names) before it can
be cited by anything durable. Reason this queues: an uncommitted root file can be lost by any
clean-up, and F004 currently cites it in place.

## Resolutions
none

## Proposals
```
Phase 4's move-grader should be expectimax-d3-v1, and the integration is cheap: the feature
modules and both agent factories are vanilla ESM with no node built-ins, the engine already
serves browser and Node alike, and grading ONE human position is 500 to 900 engine calls,
interactive in a browser. The one open design question is presentation: the grader can show
the per-feature contributions of the chosen versus the played column (the enriched-replay
bars cinema already renders), which turns a grade into a lesson.
```
```
If AB wants the ladder pushed further, price these in order: depth-4 expectimax with beam
pruning at ply 2 (the cost driver is the expectation width, and the d2-versus-d3 gap says
depth still pays); a breed of the eleven weights UNDER depth-2 evaluation (weights tuned for
search rather than for flatness; roughly 30 to 60 minutes a generation at measured pool
rates); and only then RL, because the flat feature set is now good enough that a learned
value function has a real baseline to beat, which is what the CLAUDE.md guardrail was
waiting for. The ceiling of the current champion is NOT measured; only its ladder position is.
```
```
Commission the practised-human set before Phase 4 fixes the composite score. One practised
game moved the human reference by three orders of magnitude; five to ten deliberate games by
a practised player would say whether 121,496 is a ceiling or a floor, and F004's confidence
tier is capped at suggestive until then.
```

## _tmp outputs
- none

## Work order verbatim
```
# Claude Code work order -- orchestrated-training-campaign

From worker bee: nbs-[wor]-1.0-z
Model: fable | Effort: maximum extended thinking | Rationale: this is
the judgement-heavy heart of the experiment; the orchestrator designs,
reads results and decides what to try next across several hours. All
compute happens in scripts; all recon routes to cheaper sub-agents.

## Task
Run the training campaign as an orchestrator: build the parallel
runner, then breed, extend and search your way to the strongest
interpretable agent this game allows, measuring every step honestly,
and close the campaign with findings, a knowledge file, a decision
log and the champion's best game as an enriched replay.

## In scope
- 03_train/ -- all harness extensions, campaigns, runs, weights,
  findings, the decision log.
- 03_train/CONTEXT.md -- update for what the campaign adds (the
  parallel runner, the campaign and decision-log conventions).

## Out of scope
- docs/ -- the game, engine and cinema are frozen for this job. No
  engine edits of any kind; if a missing export blocks you, stop and
  report rather than patching or copying.
- 01_rules/, 02_build/, 04_publish/ -- read-only.
- No RL / neural training. If the ladder's ceiling makes a neural
  baseline look worth pricing, propose it in the findings as next
  work; do not build it.
- No config or difficulty retuning (the 03a gate verdict stands).

## CONTEXT to read
- 03_train/CONTEXT.md -- the lab's conventions, agent interface,
  seed discipline, version register
- 01_rules/output/RULES.md -- the law
- 02_build/output/BUILD.md -- engine interface notes and corrections
- CONTEXT.md (root)

## Constraints (the cage; everything not caged is yours)
- The exam is frozen: eval-v1's 500 seeds are never regenerated,
  extended or filtered. Training and feature selection touch only
  the train pool, which stays disjoint from eval.
- Every agent version is numbered and immutable, pinning its feature
  list and weights. Results are recorded against versions. Headline
  comparisons happen only between named versions on eval-v1.
- A finding enters output/_FINDINGS.md only with its mechanism, its
  evidence (which runs, which numbers) and a confidence tier. Thin
  evidence is flagged as thin, per the estate lens.
- New features are pure modules in the existing registry, usable
  unchanged in Node and browser exactly like the engine, because the
  finished champion must later run inside the game page to grade
  human moves (Phase 4). No feature may read anything outside the
  passed state.
- Determinism discipline: parallel and serial results must be
  bit-identical; any nondeterminism found anywhere is a stop-and-
  report, not a workaround.
- Cost routing: file reading, inventories and mechanical checks go
  to cheaper sub-agents; scripts do all game-playing; you spend
  Fable-grade thinking only on design and interpretation.
- Keep a running DECISION LOG as you work (home it per the stage
  CONTEXT and record the placement): every campaign or feature idea
  you try, why, what it showed, what you did in response, dated.
  Write it as you go, not reconstructed at the end; it is a primary
  deliverable and Phase 4 will quote it.

## Do, part 1: the parallel runner
1. Build the worker-pool fan-out over seeds (scoped in touchdown
   0013: ~40 lines, worker_threads, no engine change). Prove
   parallel output bit-identical to serial on a sample, then state
   the measured games-per-minute (repeated runs, best/median/worst,
   per 0013's caution that single timings on this machine lie).

## Do, part 2: the campaign (your judgement, inside the cage)
2. Baseline the inherited heuristic-v0 numbers, then improve the
   agent by whatever sequence the evidence suggests. Expected moves,
   not mandated: breed weights from v0 (population, noise schedule
   and generations are yours); inspect champion games and losses to
   propose new features or retire dead ones, then re-breed; add
   expectimax lookahead using the live spawn probabilities and the
   one-block preview, and measure depth 1, 2, 3 as an ablation on
   eval-v1; iterate while the exam median moves meaningfully.
3. Watch for and record, with numbers, the strategic questions the
   design planted: how the champion handles strand risk, whether it
   banks triples and quads over cheap pairs, how it plays the spawn
   drift, and whether it deliberately chases floor rises.
4. Stopping rule: when a full iteration of effort no longer moves
   the eval-v1 median meaningfully, stop and say so. If total
   campaign compute passes roughly three hours, checkpoint, record
   state and progress in the decision log, and continue only if the
   curve still justifies it.

## Do, part 3: the close-out
5. The final ladder on eval-v1, every named version from random to
   the champion, median and quartiles, plus the ablation table.
6. The knowledge file: champion weights with feature list, plus the
   generation-by-generation learning curve data.
7. output/_FINDINGS.md: every claim with mechanism, evidence and
   confidence, including the human-playable lessons read out of the
   champion's weights and behaviour.
8. The champion's best eval-v1 game exported as an enriched replay
   (per-move plain-English reasoning plus feature scores) and
   VERIFIED playing in cinema mode on the live site.

## Verify (before you close)
- Parallel bit-identical proof and throughput stated.
- Ladder and ablation tables present, every row a named immutable
  version, all on eval-v1.
- Every _FINDINGS.md claim traceable to a named run on disk.
- The decision log covers every campaign actually run, dated.
- The enriched champion replay verified on the live cinema URL.
- eval-v1 untouched (state the file hash before and after).
```
