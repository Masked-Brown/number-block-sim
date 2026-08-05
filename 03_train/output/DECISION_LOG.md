# DECISION_LOG.md -- the training campaign's decision record

Written as the campaign runs, never reconstructed afterwards. One entry per campaign or feature
idea tried: why it was tried, what it showed, what was done in response, dated. Entries are
append-only; a wrong decision is corrected by a later entry, not by editing the earlier one.
Job: orchestrated-training-campaign (work order from bee nbs-[wor]-1.0-z). Phase 4 will quote
this file.

Home decided 2026-08-05: `03_train/output/DECISION_LOG.md`, beside `_FINDINGS.md`, because the
log spans multiple run folders and is a campaign-level record, not a per-run artefact. The
placement is recorded in `03_train/CONTEXT.md` per the work order.

British English, no em-dashes, no exclamation marks.

---

## 2026-08-05 -- campaign opening: state of play and the plan

Inherited position (run `2026-08-05_smoke-ladder`, job train-lab-and-baselines): heuristic-v0
median 114,210 on eval-v1 (q1 66,050, q3 175,361), beating greedy-v1 (35,386) on 436 of 500
seeds. Serial throughput best-of-five 820 games/min for heuristic-v0; this machine's run-to-run
noise spans 548 to 812 on identical code, so all timing claims in this campaign use repeats
with best/median/worst. eval-v1 file sha256 before any campaign work:
`cb22c4933ca5600f673c25dc5e9a98028630f367daf74070df0a76f00d5df7d3`.

Planned sequence, evidence permitting: (1) the worker_threads parallel runner with a
bit-identity proof, because every later step is gated on cheap honest games; (2) CEM weight
breeding from v0 over the nine existing features, on train-v1 subsets only; (3) inspect the
bred champion's games and losses, add or retire features, re-breed; (4) expectimax over the
one-block preview and the live spawn distribution, depths 1 to 3 as an ablation at fixed
weights; (5) close with the ladder, knowledge file, findings, and the champion's enriched
replay verified in cinema.

Decision, recorded before any result: candidate fitness during breeding is measured on
train-v1 seed blocks only, the bred champion is validated on a held-out train-v1 slice before
being named a version, and eval-v1 is touched only by named immutable versions producing
headline rows. Training never reads an eval seed.

## 2026-08-05 -- the parallel runner: built, proved, and slower than hoped

Tried: the worker_threads fan-out scoped in touchdown 0013 (`lab/parallel.js`, pool plus
worker half in one file; agents cross the thread boundary as specs, resolved against the
worker's own registry, so the code that plays parallel is the code that plays serial).

Showed: bit-identical to the serial runner, 100 of 100 eval-v1 games, plus three standing lab
tests including an ephemeral weighted candidate through the pool. One definition had to be
made explicit: `harnessMs` (per-game wall clock) differs between any two runs including two
serial ones, so bit-identity is defined over the game-defining content via `gameIdentity()`,
stopwatch excluded. Not a nondeterminism: the game content is exactly identical.

Throughput: touchdown 0013 hoped for near-linear scaling to about 8,000 games/min on twelve
cores. Measured: about 3x, not 10x. Worker sweep (heuristic-v0, 200 games, repeated): 6
workers best 3,442 / median 2,204 g/min against serial best 1,152; 10 workers WORSE (best
1,757). Mechanism: 15 W part, 2 P-cores plus 8 E-cores, boost collapses under all-core load;
oversubscribing the E-cores throttles everything. Full record:
`output/runs/2026-08-05_parallel-proof/`.

Response: campaign default 6 workers on this machine. Compute budget arithmetic for every
later decision uses about 2,200 games/min sustained for depth-1 heuristic agents, not 8,000.

## 2026-08-05 -- breed 1 design: CEM over the nine v0 features

Tried: cross-entropy breeding from heuristic-v0's hand-set weights (`lab/train/cem.js`,
`lab/cli/breed.js`, run `2026-08-05_breed-h0`). Config: population 24, elites 6, up to 14
generations with early stop (window 3, minimum gain 2 per cent), fitness = median score over
train-v1 seeds 0 to 149 fixed across all generations (common random numbers, so seed luck
cancels in every comparison), validation on held-out train-v1 seeds 1000 to 1499, mulberry32
rng seed 20260805 recorded for exact reproducibility.

Why these choices: median not mean because the score tail is heavy (smoke-ladder); paired
seeds because ranking candidates on different seeds at 150 games would be mostly noise;
`game-over-risk` held FIXED at -1000 and excluded from the search because the weighted sum's
argmax is invariant to positive scaling, so fixing one weight pins the scale and makes every
other bred weight readable against v0's, and because dying is not a judgement the breed needs
to reprice. The other eight weights are fully free, signs included: whether the hand-set signs
survive evidence is part of the question.

Candidate 0 of generation 0 is the unperturbed v0 vector, so the incumbent's fitness on the
block is always in the record.

## 2026-08-05 -- expectimax design: the information set, the value split, and a first shock

Tried: the lookahead agent (`lab/agents/expectimax.js`), built while breed 1 ran. Three design
decisions worth their ink:

1. The information set is stated and enforced. Depth 2 is an exact max-max over the two KNOWN
blocks (current plus the honest preview). Depth 3 adds one expectation layer over the third
block, whose distribution is `distributionFor(board after move 1's resolution)`, exactly the
distribution the engine drew it from (BUILD.md decision 4). The engine has of course already
drawn the real third block (determinism), but a player cannot see it, so the agent never reads
`nextValue` from any simulated state. Hypothetical blocks are placed by cloning the engine
state and setting `current`; the game logic stays the engine's. An earlier draft carried a
generic recursion that COULD have expanded a simulated preview (reading an unknowable draw);
it was deleted rather than documented around, so the peek is now structurally impossible.

2. The value of a branch splits the weight vector into its two natural halves: move features
(immediate-merge-value, game-over-risk) summed along the path, positional features (the other
seven) at the leaf board only. At depth 1 this is arithmetically the flat weighted agent, and
the lab suite asserts move-for-move equality, so the depth ablation isolates search and
nothing else.

3. First probe, two train seeds (501 and 502 by index, outside every breeding block), v0
weights: flat 29,432 on the first; depth 2 scored 246,396 on it; depth 3 (full expectation)
297,508 and 260,916. Search may be worth more than any weight change. Thin evidence, two
seeds; the eval-v1 ablation will say properly.

Cost, measured: depth 2 about 280 moves/s serial; depth 3 full about 10 moves/s, which prices
a 500-game eval run at roughly 3 to 5 hours serial. Response: a `coverage` option truncates
the expectation to the most probable tiers reaching the stated mass, renormalised,
deterministic tie-break, pinned in the version and the manifest. Coverage 0.9 measured about
1.8x faster and scored HIGHER on both probe seeds (386,288 vs 297,508; 520,960 vs 260,916),
so truncation is not visibly costing decision quality at these sample sizes (thin, two
seeds, and the tail is heavy; flagged as such). Decision: the named depth-3 version runs
coverage 0.9; the full-expectation figure stays recorded here as the design comparison.

## 2026-08-05 -- breed 1 result: heuristic-v1 named, and what the weights say

Result of `2026-08-05_breed-h0`: early stop at generation 6, champion from generation 3,
fitness 159,208 on the fitness block. Validation on 500 HELD-OUT train seeds: champion median
144,168 against v0's 108,700 (uplift 1.326x, head-to-head 293 of 500), so the gain
generalises and the champion was named `heuristic-v1` (registered, immutable). On eval-v1,
all 500 seeds: **median 141,424** (q1 87,337, q3 225,563, max 730,536) against v0's 114,210,
head-to-head 298 of 500. Run `2026-08-05_eval-heuristic-v1`.

What the breed decided, and the reading of it: every survival cost got repriced far harder
(height-cost 2.2x to -4.42, strand-risk 3.4x to -3.44, spawn-pressure 2.7x to -4.08),
immediate-merge-value went 3.6x to 3.64, chain-potential rose modestly, column-flexibility
did not move, unevenness-cost fell to near zero, and **setup-adjacency FLIPPED SIGN to
-0.47** (the final elite mean says the same, -0.84, so it is a population verdict, not one
lucky candidate). Reading: at one move of lookahead, deliberately banking triples and quads
is a liability, because a bank pays only if exactly the right tile arrives before the board
rises, and a flat agent cannot make that happen. The banking question the design planted now
has a measured answer at depth 1; whether SEARCH redeems banking is exactly what the
expectimax ablation will show in its merge-size counts.

Behaviour probe (100 train games, `probe-behaviour.js`): v1 takes an available merge on 100
per cent of the moves that offer one, identical to v0; burial acceptance 14.2 per cent of
moves against v0's 13.3. The bred agent is v0's policy sharpened, not a different policy.

## 2026-08-05 -- the death boards say fragmentation, so two features enter

Tried: inspecting how v0 and v1 actually LOSE. Worst eval games for both (v0: 11,856 on seed
11887799896954937506; v1: 9,208 on seed 16750382879045792593) die the same way: a
checkerboard of mismatched tiers, a 2 beside a 256, an 8 under a 512, nearly no adjacent
pair sharing a value. The board dies of fragmentation while only two-thirds full of value.
Re-weighting did not touch this failure mode because NO feature measures it: strand-risk
sees low-under-high within a column only, unevenness sees heights only.

Response, two new features (pure modules, registry pattern, browser-safe like the nine):

- `tier-gap-cost` v1: summed tier gap beyond one across orthogonally adjacent occupied
  pairs, normalised. Gap 0 is a merge waiting, gap 1 is ladder-adjacent, gap 2+ is dead
  surface. Direct measurement of the observed death mode.
- `next-merge-ready` v1: landing cells where the PREVIEWED block could merge on arrival, as
  a share of columns. The behaviour probe showed the flat agent never reads the preview at
  all; the preview is honest information sitting unused. This is the cheap fraction of
  depth-2 search.

Breed 2 launched from v1's weights plus these two (init -0.5 and +0.5, rng seed 2, same
fitness protocol and blocks, run `2026-08-05_breed-h1-features`). If tier-gap-cost earns a
material negative weight and the fitness curve moves, the fragmentation reading is
confirmed; if it breeds to zero, the feature is wrong and will be retired, and that is worth
knowing too.

## 2026-08-05 -- found mid-campaign: a practised human game at 121,496

Noticed while inventorying the working tree: `nbs-replay-121496.json`, uncommitted at the
repo root, a format-v2 replay with `player: "human"`, dated 2026-08-05T12:16Z, 256 blocks
over roughly nine minutes with per-move timestamps. Verified through the engine
(`verifyReplay`): genuine, score 121,496, max tile 4,096, final hash `a613b2d4` reproduced.

This changes a standing belief. The only human reference until now was BUILD.md's unpractised
playthrough of 228, and the smoke ladder's candidate finding read the AI-human gap as three
orders of magnitude. A practised human scores 121,496: ABOVE heuristic-v0's eval median
(114,210) and within 15 per cent of heuristic-v1's (141,424). The gap finding as drafted is
dead; the honest statement is that flat heuristic play is roughly practised-human level, and
only SEARCH pulls clearly ahead. The campaign's findings will say exactly that, citing this
file; one human game is still one game, and is flagged as thin. The file is not this job's to
home or commit (it sits outside the stage, likely AB's manual save); raised in the touchdown
for AB to place properly.

## 2026-08-05 -- breed 2 result: the features confirmed, heuristic-v2 named

Result of `2026-08-05_breed-h1-features` (one operational note: the first launch of this
breed was killed externally after generation 3; the breed is deterministic under its recorded
rng seed, so the relaunch reproduced generations 0 to 3 bit for bit, confirmed against the
first run's streamed lines, and continued. The run folder holds the complete relaunched
record). Early stop after generation 8, champion from generation 5, fitness 228,442.
Validation on the held-out block: 209,102 against v1's 144,168 (uplift 1.45x, head-to-head
322 of 500). Named `heuristic-v2`. On eval-v1: **median 204,618** (q1 123,872, q3 314,772,
max 1,298,584), against v1's 141,424 and v0's 114,210. Run `2026-08-05_eval-heuristic-v2`.

Generation 0 already beat breed 1's whole ceiling (188,338 against 159,208 with the two new
features at their guessed init weights), so the features carried value before any tuning:
the fragmentation reading from the death boards is confirmed. tier-gap-cost bred to -1.70,
next-merge-ready to +1.12; and with those two in place the rest of the vector RELAXED:
immediate-merge-value fell from v1's 3.64 back to 1.62, height-cost from -4.42 to -2.31,
setup-adjacency returned from negative to just positive (0.20). Reading: v1's aggression was
compensation for blindness; able to see fragmentation and the preview, the agent no longer
needs to panic-merge or hug the floor. What stays non-negotiable is burial (strand-risk bred
HARDER, to -4.93, the harshest ordinary weight of the campaign) and answering the incoming
distribution (spawn-pressure -4.37).

## 2026-08-05 -- the depth ablation at fixed v2 weights, and what search changes

Design: `expectimax-d2-v1` and `expectimax-d3-v1` pin heuristic-v2's weights BY IMPORTING its
immutable module, so the ablation's "same evaluation, only deeper" claim is mechanical. The
depth-1 row IS heuristic-v2. d3 runs coverage 0.9 per the earlier decision.

Probe first (10 train seeds, then eval): at v2 weights, d2 median 345,064 against flat
273,816; d3 530,168. d3's cost at v2 weights measured 51 moves/s serial against 10 at v0
weights, five times faster; v2 keeps boards lower and tidier, so the search tree is smaller.
That repriced the full d3 eval from unaffordable to about half an hour, and the ablation runs
in full. Eval so far: **expectimax-d2-v1 median 427,986 on eval-v1** (q1 285,524, q3 683,593,
max 2,576,032), 2.1x flat v2; d3 eval running.

Behaviour probes (run `2026-08-05_behaviour-probes`): every flat agent, v0, v1 and v2 alike,
takes an available merge on 100 per cent of moves; `expectimax-d2-v1` DECLINES 10.4 per cent
of available merges, and 54 per cent of those declines bank a triple or better. Search
roughly doubles triples per game (33.7 against v2's 17.2). Banking is real once the agent can
see when the bank pays; no flat weight setting produced it. Drift chasing: no agent, flat or
searching, ever took a max-tile raise over a strictly higher-scoring alternative (0 cases in
every probe); raises are taken because they ARE the best merge. The spawn drift is played by
surviving it, not chased.

## 2026-08-05, 14:20 -- the three-hour checkpoint, taken mid-d3-eval

State: campaign compute spent so far is roughly 100 minutes (two breeds, two flat evals, the
d2 eval, proofs and probes); the d3 eval on eval-v1 is running and its true pace is about 5
games a minute, not the 15 to 20 the train-seed probe priced (d3 survives longer than d2, and
late boards carry more live tiers, so the expectation tree widens exactly when games get
long). Finishing d3 takes total compute to roughly three and a half hours, past the work
order's rough three-hour line.

Decision: continue. The stopping rule licenses continuing when the curve justifies it, and
this is the ablation's top row, not an extra iteration: the probe showed d3 at +94 per cent
over the flat champion, the largest single step the campaign has seen, and the work order
names the depth-3 ablation an expected move. Everything after d3 is writing, not compute. If
d3 had probed marginal over d2, this checkpoint would have cut it; recorded so Phase 4 can
see the rule was applied, not skipped.

## 2026-08-05, 15:05 -- campaign close: the ladder is final and the champion is verified

The d3 eval landed: **expectimax-d3-v1 median 643,996 on eval-v1** (q1 421,189, q3 961,014,
max 2,710,108), 1.50x depth 2 (head-to-head 325 of 500), 3.15x the flat champion, 5.6x the
inherited heuristic-v0. Wall cost 37 minutes at 6 workers, the campaign's single largest
compute item, taken knowingly at the 14:20 checkpoint. Its best game (seed
13616125016900865182, 1,094 moves, max tile 65,536) is exported with all 1,094 reasoning
entries, engine-verified at write time, and watched in cinema on the live site: green
verified badge, played to move 1,094 of 1,094, running score 2,710,108 equal to the recorded
final score. The stopping rule closes the campaign here: the last full iteration (depth 3)
moved the exam median 1.50x, clearly meaningful, but the next rung (depth 4, or a breed
under search) is priced in the touchdown proposals rather than run, because the remaining
budget is writing, not compute. eval-v1's file hash is unchanged from the campaign's opening
record (cb22c493...5df7d3, stated in full at the top of this log).

Final ladder and the campaign reading: run `2026-08-05_campaign-ladder`. Knowledge file:
`output/knowledge.json` (machine-assembled). Findings: F001 to F006 in `output/_FINDINGS.md`.

## 2026-08-05 -- register authorisation reading

Decision on `_FINDINGS.md`: the stage CONTEXT gates the register behind AB's promotion pass,
and this work order explicitly names `output/_FINDINGS.md` as deliverable 7 with the entry
discipline stated (mechanism, evidence, confidence, thin flagged as thin). Reading: the work
order, issued by AB, pre-authorises this campaign's entries; the tension is recorded here and
in the touchdown rather than silently resolved. The smoke-ladder's four candidate findings
remain unpromoted; this campaign writes only its own findings.
