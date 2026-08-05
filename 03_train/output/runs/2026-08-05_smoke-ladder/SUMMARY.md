# 2026-08-05_smoke-ladder -- the first measured ladder

The lab's opening run: four agents, 500 games each, on the frozen eval-v1 seed set, plus the
supplementary stacker sweep, the determinism proof and two sample replays. Job:
train-lab-and-baselines. Rules v1.1, engine and config as pinned in `manifest.json`.

Machine-written tables are in `ladder.md` and `ladder.json`; per-game lines are in each agent's
`games.jsonl`; this file is the reading of them.

British English, no em-dashes, no exclamation marks.

## The ladder

Game score over 500 games of eval-v1. All four agents played the identical 500 seeds.

| agent | median | q1 | q3 | mean | max | min |
|---|---:|---:|---:|---:|---:|---:|
| heuristic-v0 | 114,210 | 66,050 | 175,361 | 138,827 | 1,034,848 | 11,856 |
| greedy-v1 | 35,386 | 21,319 | 52,026 | 43,387 | 266,452 | 4,324 |
| random-v1 | 1,700 | 939 | 2,789 | 2,170 | 12,264 | 104 |
| stacker-v1 | 1,626 | 987 | 2,762 | 2,161 | 17,328 | 100 |

Head to head on identical seeds, which is the comparison a frozen exam exists to allow:

- heuristic-v0 beats greedy-v1 on 436 of 500 seeds, and random on 500 of 500.
- greedy-v1 beats random-v1 on 500 of 500. Merely looking one move ahead is worth about 20x.
- stacker-v1 and random-v1 are a coin flip: stacker wins 247, random wins 253.

Max tile reached, share of games:

| agent | 128 | 256 | 512 | 1,024 | 2,048 | 4,096 | 8,192 | 16,384 | 32,768 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| random-v1 | 43.2% | 28.8% | 6.0% | 0.4% | 0.2% | . | . | . | . |
| stacker-v1 | 44.4% | 30.4% | 4.8% | 0.6% | . | . | . | . | . |
| greedy-v1 | . | 1.4% | 16.4% | 39.8% | 32.4% | 9.0% | 1.0% | . | . |
| heuristic-v0 | . | . | 1.4% | 10.8% | 28.4% | 36.6% | 19.0% | 3.4% | 0.4% |

Blocks placed per game (median): random 61.5, stacker 62, greedy 195, heuristic 313. Longest
chain (median / max): random 4 / 8, stacker 4 / 9, greedy 5 / 8, heuristic 5 / 10.

One counter-intuitive detail worth keeping. Merges of five and six blocks happen only for the
WEAK agents: random recorded 8 quintuples and one sextuple, stacker 7 quintuples, while greedy
and heuristic recorded none at all across 500 games each. The reason is not luck. Both scoring
agents take a pair as soon as one exists, so equal blocks never accumulate into a group of five;
the weak agents leave them lying around long enough to pile up. A big group is evidence of
neglect, not of skill, under these policies.

## The stacking question, answered with numbers

BUILD.md records an observation from v1.1 verification: an unattended game, blocks dropping into
one column with no steering, reached roughly 5,300 points through self-fed vertical merges, which
"suggests repeated same-column stacking is generously rewarded under the launch parameters".
This run was built partly to test that, and it does not hold up.

The measurement needs two variants, because the phrase "stacking" hides a real decision:

- **strict** never steers at all, including into a full column. Under RULES.md 2 a new block
  enters where the previous one locked, so this is literally what happens when nobody touches
  the keyboard.
- **spill** is the registered `stacker-v1`: the home column while it has room, else the shortest
  column. The fallback is a decision, and no unattended player makes it.

| variant | median | mean | p95 | max over 500 games | median blocks placed |
|---|---:|---:|---:|---:|---:|
| strict (never steers) | 24 | 57.7 | 225 | 516 | 9 |
| spill (`stacker-v1`) | 1,626 | 2,161 | 5,641 | 17,328 | 62 |

**Verdict: same-column stacking is not degenerate-dominant. It is the weakest thing measured.**

1. Strict stacking is catastrophic, not generous. Median 24 points and 9 blocks placed before
   game over, against random's median of 1,700. It is roughly one seventieth of the blind
   baseline. No game in 500 came within a factor of ten of 5,300; the best was 516.
2. Even the generous spill reading is not dominant. Its median of 1,626 sits level with random's
   1,700, and random wins the head-to-head 253 to 247. Stacking is the bottom of the ladder,
   tied with choosing at random.
3. **Stacking is exactly column-invariant.** Across all five home columns the strict variant
   produced identical scores, identical max tiles and identical block counts on every seed
   (median 24, mean 57.7, max 516, five times over; asserted as a test in `lab/test/`). There is
   nothing special about the centre. The mechanism is plain once stated: in a one-column game
   every merge is vertical, and the spawn distribution depends only on the board's largest tile
   (RULES.md 3), so the column index cannot enter the computation anywhere.
4. **The 5,300 observation does not reproduce as unattended play.** It is, however, an ordinary
   result for the spill variant: 5,300 sits at roughly the 94th percentile of that distribution
   (29 of 500 games reached 5,300 or better, p95 is 5,641). The most likely reading is that the
   observed game was steered at least to the extent of leaving a full column, which makes it a
   spill game and not an unattended one.

This is a measurement, not a repair. Nothing in the tuning was touched, and the question of
whether the launch curve is too generous is unaffected by this result: the generosity that
matters shows up in the next section, and it has nothing to do with stacking.

## What the numbers say about the tuning, unasked

BUILD.md's live human playthrough of v1.1 scored 228. heuristic-v0's median on the same rules and
the same tuning is 114,210, its worst game in 500 was 11,856, and it reached tile 32,768. That is
a gap of about three orders of magnitude between an unpractised human and a nine-feature
one-move-lookahead heuristic with no search, no tuning and no training.

The mechanism is the scoring equation compounding with the drifting spawn curve. Score is the
merged value times the chain index (RULES.md 5), and the spawn centre drifts up with the board's
largest tile (RULES.md 3), so a player who survives into the high tiers is paid in a currency
that keeps inflating. Survival, not cleverness, is most of the score, and an agent that never
strands a tile survives a very long time.

Two consequences worth AB's attention, both out of scope for this job:

- Raw game score is a poor axis for comparing strong agents. It has a heavy right tail (the
  heuristic's max is 9x its median) and it rewards the same skill twice. Later comparisons should
  probably lead with median plus a max-tile distribution, which is what the ladder tables above
  do, rather than with mean score.
- The Phase 4 human composite score is going to have to reckon with the fact that the AI is not
  a little better than a human at this game; on the launch parameters it is in a different
  regime entirely.

## Throughput

Single process, single thread, on a 13th Gen Intel i7-1355U, 12 logical cores, node v20.20.2.
200 games per agent, five repeats, best and median reported (`throughput.json`). This machine
varies by tens of per cent between identical passes, so a single timed run is not a measurement
and is not quoted here as one.

| agent | best games/min | median games/min | moves per game |
|---|---:|---:|---:|
| random-v1 | 53,333 | 48,000 | 63.9 |
| stacker-v1 | 25,532 | 24,641 | 62.9 |
| greedy-v1 | 3,936 | 3,159 | 203.6 |
| heuristic-v0 | 820 | 724 | 323.9 |

**heuristic-v0 is below the roughly 1,000 games per minute bar, at about 820 at best.** Stating
that plainly, as asked. The three baselines are far above it; the whole 4 x 500 campaign,
supplementary sweep and all, completes in 58 seconds.

Two things are worth separating. The heuristic plays 324 moves per game where random plays 64,
so per MOVE it is not slow, and its games-per-minute figure is partly a report of how long it
survives. At the move level it runs at roughly 4,300 moves per second including five candidate
evaluations each.

The cheapest fixes, in the order they should be reached for:

1. **Already applied, and free.** Two behaviour-neutral changes during this job: the candidate
   context now computes its spawn distributions lazily (five of the ten per move were being
   computed and never read), and `chain-potential` uses a flat typed-array memo instead of a Map
   keyed by strings. Both were verified bit-identical over all 500 heuristic games: same moves,
   same score, same final hash. They cut measured work by about a third, though this machine's
   noise is too large to show that end to end honestly.
2. **Fan out over seeds with `worker_threads`, when 03b actually needs it.** Games are completely
   independent and the runner is already a pure function of (agent version, seed), so this is
   roughly forty lines, no engine change and no new dependency, for close to linear scaling on
   twelve cores. That would put the heuristic near 8,000 games per minute. Not built here,
   deliberately: it is speculative until a campaign is actually waiting on it.
3. **Do not chase the rest single-threaded.** About 40 per cent of the heuristic's runtime is
   inside `engine.play()`, which the harness must not touch and which it calls five times per
   move by design. Beyond the fixes above there is no large single-thread win available without
   changing what the agent evaluates, which would change the agent.

## Determinism

One seed (eval-v1 seed 0, 13923918990608195634), one agent (heuristic-v0), four environments,
one answer. Full record in `determinism.json`.

| environment | score | final hash | moves |
|---|---:|---|---:|
| Node, in process, fresh instance | 47,856 | `1452c7f7` | 236 |
| Node, in process, second instance | 47,856 | `1452c7f7` | 236 |
| Node, separate process | 47,856 | `1452c7f7` | 236 |
| Browser, cinema mode, live site | 47,856 | `1452c7f7` | 236 |

The move lists from the two in-process runs are identical element for element, not merely equal
in outcome. The browser leg is `03_train/output/samples/determinism-proof.replay.json` loaded
into cinema mode at the live URL: cinema showed the green "verified: engine re-run matches the
recorded result" badge, which is its `verifyReplay` verdict comparing both the recorded score and
the recorded final hash against a fresh re-run through the browser's own copy of the engine, and
stepping to move 236 of 236 displayed a running score of 47,856.

## Sample replays

Both saved to `03_train/output/samples/` and both watched in cinema mode on the live URL.

- `heuristic-v0-best-eval-v1.replay.json` -- seed 15784950089324173270, score 1,034,848, 680
  moves, max tile 32,768. Carries `reasoning[]`: a plain-English line and all nine weighted
  feature scores per move, which cinema renders as labelled bars.
- `stacker-v1-best-eval-v1.replay.json` -- seed 2436944997737444274, score 17,328, 126 moves.
  This is what the stacker's luckiest game in 500 looks like, and its commentary says plainly
  when the home column fills and the agent starts spilling.

A detail from the last move of the determinism replay, which is a good check that the design
works: every column ended the game, `game-over-risk` showed -1000.00, and the agent still chose,
because that feature is a weight and not a hard filter.

## Findings for the register

Drafted in the six-field format, IDs blank. Promotion is AB's gate, not this job's.

---

**Claim.** Same-column stacking is the weakest playable policy under rules v1.1 launch tuning,
not a degenerate winning one, and it is exactly column-invariant.

**Mechanism.** In a one-column game every merge is vertical, and the spawn distribution is a
function of the board's largest tile alone (RULES.md 3), so the column index cannot affect
anything. Stacking buries low tiles under high ones with no sideways escape, so the column fills
in roughly nine blocks and the game ends before the spawn centre has drifted anywhere useful.

**Confidence and falsifier.** Strong. Killed by any stacking variant reaching a median within a
factor of two of random's 1,700 on eval-v1, or by any seed on which two home columns give
different strict-variant scores.

**Evidence.** Run 2026-08-05_smoke-ladder: `supplementary/stacker-sweep.json` (all five columns,
both variants, 500 games each), `stacker-v1/summary.json`. Strict median 24, mean 57.7, max 516;
spill median 1,626 against random's 1,700, losing the head-to-head 247 to 253. Column invariance
also asserted as a test in `03_train/lab/test/lab.test.js`.

**Action.** Retire the assumption in BUILD.md's tuning note that same-column stacking is
generously rewarded; if AB retunes the spawn curve, stacking is not the reason to. The observed
5,300 game sits at the 94th percentile of the SPILL variant, so it was a steered game.

**Disposition and dates.** rules-question | first logged: 2026-08-05 | last updated: 2026-08-05

---

**Claim.** A nine-feature one-move-lookahead heuristic with hand-set weights scores about three
orders of magnitude above unpractised human play on the same rules and tuning, and about 3.2x
above a greedy merge-taker.

**Mechanism.** Score is merged value times chain index while the spawn centre drifts up with the
board's largest tile, so score compounds with survival. Avoiding stranded tiles and keeping
columns open extends the game into tiers where every merge pays far more, and the heuristic's
cost features do exactly that.

**Confidence and falsifier.** Supported. Killed by a tuned or trained agent failing to beat
heuristic-v0's 114,210 median on eval-v1, which would suggest the heuristic is already near a
ceiling rather than at a starting position, or by evidence that the human 228 figure is not
representative of practised human play.

**Evidence.** Run 2026-08-05_smoke-ladder ladder table: heuristic-v0 median 114,210 (q1 66,050,
q3 175,361, min 11,856, max 1,034,848) against greedy-v1's 35,386 and random-v1's 1,700, all on
the same 500 eval-v1 seeds; beats greedy on 436 of 500 seeds. Human reference is BUILD.md's
recorded live v1.1 playthrough, score 228, which is one game by an unpractised player and is the
weakest link in this finding.

**Action.** Treat 114,210 as the number 03b must beat, on eval-v1 and on no other seed set. Get
a better human reference before the Phase 4 composite score is designed; one playthrough of 228
cannot carry that weight.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

---

**Claim.** Raw game score is a poor headline axis for comparing strong agents on these rules.

**Mechanism.** The score's right tail is heavy because chain index multiplies an already
inflating tile value, so a single lucky late cascade moves the mean far more than it reflects
skill. The heuristic's max is nine times its median; its mean sits well above its median.

**Confidence and falsifier.** Suggestive. Killed by a comparison where mean score and max-tile
distribution rank a set of agents identically across several hundred games.

**Evidence.** Run 2026-08-05_smoke-ladder: every agent's mean sits above its median (heuristic
138,827 against 114,210; greedy 43,387 against 35,386), and the max-tile histogram separates the
agents far more cleanly than the score spread does.

**Action.** Lead future comparisons with median plus quartiles plus the max-tile distribution,
as the ladder tables here do. Keep mean in the record, never in the headline.

**Disposition and dates.** parked | first logged: 2026-08-05 | last updated: 2026-08-05

---

**Claim.** Merges of five or more blocks are evidence of weak play, not strong play, under every
policy measured so far.

**Mechanism.** Any agent that takes a pair when one is available prevents equal blocks from
accumulating into a larger group. Big groups therefore only survive on boards nobody is tidying.

**Confidence and falsifier.** Suggestive. Killed by any agent that scores above heuristic-v0
while recording quintuple merges, which is exactly what a chain-building agent with real
lookahead might do, since a quad is four times a pair of the same value.

**Evidence.** Run 2026-08-05_smoke-ladder merge counts over 500 games each: random-v1 8
quintuples and 1 sextuple, stacker-v1 7 quintuples, greedy-v1 and heuristic-v0 zero of either.

**Action.** Worth a deliberate probe in 03b: an agent weighted to bank quads and quints rather
than take pairs. If it wins, the current feature set is missing the game's best line.

**Disposition and dates.** parked | first logged: 2026-08-05 | last updated: 2026-08-05
