# 2026-08-05_campaign-ladder -- the training campaign's final ladder

The close of the orchestrated training campaign (work order orchestrated-training-campaign,
bee nbs-[wor]-1.0-z): every named version from random to the champion on the frozen exam, the
depth ablation at mechanically shared weights, and the reading of both. The campaign's
decisions as they were made are in `output/DECISION_LOG.md`; the distilled beliefs are
`output/_FINDINGS.md` F001 to F006; the champion knowledge file is `output/knowledge.json`.
Machine-written tables in `ladder.md` / `ladder.json` (built by `lab/cli/ladder-tables.js`
from the named runs' summaries, never typed).

British English, no em-dashes, no exclamation marks.

## The ladder, eval-v1, 500 games per row

| agent | median | q1 | q3 | max | vs previous rung |
|---|---:|---:|---:|---:|---|
| expectimax-d3-v1 | 643,996 | 421,189 | 961,014 | 2,710,108 | 1.50x over depth 2 |
| expectimax-d2-v1 | 427,986 | 285,524 | 683,593 | 2,576,032 | 2.09x over flat v2 |
| heuristic-v2 | 204,618 | 123,872 | 314,772 | 1,298,584 | 1.45x over v1 |
| heuristic-v1 | 141,424 | 87,337 | 225,563 | 730,536 | 1.24x over v0 |
| heuristic-v0 | 114,210 | 66,050 | 175,361 | 1,034,848 | 3.23x over greedy |
| greedy-v1 | 35,386 | 21,319 | 52,026 | 266,452 | 20.8x over random |
| random-v1 | 1,700 | 939 | 2,789 | 12,264 | level with stacker |
| stacker-v1 | 1,626 | 987 | 2,762 | 17,328 | the floor |

The human reference: one practised game at 121,496 (engine-verified; see F004), sitting
between v0 and v1. The unpractised 228 the smoke ladder leaned on is retired as a reference.

## The depth ablation, weights fixed at heuristic-v2's

The three rows share one evaluation, mechanically (the expectimax modules import the
immutable heuristic-v2 module); the only variable is depth. Depth 1 IS heuristic-v2, asserted
move-for-move in the lab suite.

| depth | information used | median | uplift |
|---|---|---:|---:|
| 1 | current block only | 204,618 | baseline |
| 2 | + the honest preview | 427,986 | 2.09x |
| 3 | + expectation over the third block (coverage 0.9) | 643,996 | 3.15x |

Two breeding campaigns (eleven features, CEM, held-out validation) bought 1.79x altogether;
one ply of certain lookahead bought 2.09x on its own, and the expected third block bought another 1.50x on top of it (3.15x total, head-to-head 325 of 500 over depth 2).
Search over the honest information set is the experiment's dominant axis (F001).

## What moved the flat agent: the campaign in one paragraph

Breed 1 repriced v0's hand-set judgements (survival costs 2-3.5x harder, setup-adjacency
FLIPPING NEGATIVE) for 1.24x. The death boards then showed what no feature measured: boards
die of tier fragmentation, checkerboards of unmatchable neighbours, while only two-thirds
full. Two features entered (tier-gap-cost, the death mode; next-merge-ready, the unread
preview), and breed 2's generation 0 with those features at guessed weights already beat
breed 1's entire ceiling. Bred properly they bought 1.45x more, and the whole vector relaxed
around them: less panic-merging, less floor-hugging, burial harder-priced than ever
(strand-risk -4.93). The interpretable story of strong flat play: never bury, never
fragment, answer the preview, and the rest is detail (F002, F005).

## The strategic questions, answered with numbers

- **Strand risk**: the binding constraint. The only cost bred HARDER as the agent got better
  (-1.0 hand-set, -3.44, -4.93); behaviourally, above-minimum burial accepted on under a
  quarter of moves with mean excess about 0.02 of the feature range (F005).
- **Banking**: a search behaviour. Every flat version takes an available merge on 100 per
  cent of offering moves; depth-2 declines 10.4 per cent and banks a triple-or-better on 54
  per cent of declines; triples per game double. setup-adjacency bred NEGATIVE without the
  preview, barely positive with it (F003).
- **Spawn drift**: survived, not chased. No agent ever took a max-tile raise over a strictly
  higher-scoring move (0 cases across every probe); the drift advances because the raise
  usually IS the best merge, and the defensive lever (spawn-pressure -4.37) is the bred one
  (F006).
- **Floor rises**: the question is retired; the v1.0 mechanic it referred to was replaced by
  the drifting distribution in rules v1.1 (F006).

## Instrument notes a future campaign should keep

The pool is bit-identical to the serial runner (proof and standing tests; `gameIdentity`
excludes only the stopwatch). This machine's honest parallel figure is 6 workers at best
3,442 / median 2,204 games/min for depth-1 agents, and single timings lie (spread 919 to
1,152 serial on identical code). Depth-3 eval cost is dominated by survival: better agents
play longer games on wider boards, so the probe-priced 30 minutes became roughly 37 minutes in
truth. The breeds are deterministic under their recorded rng seeds; breed 2's first launch
was killed externally at generation 3 and the relaunch reproduced it bit for bit.

## Findings for the register

The campaign's findings were entered directly as F001 to F006 under the work order's
deliverable-7 authorisation (the reading is recorded in DECISION_LOG.md and the job
touchdown); no separate candidate drafts are repeated here.
