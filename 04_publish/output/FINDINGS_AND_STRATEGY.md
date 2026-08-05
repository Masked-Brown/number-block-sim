# FINDINGS_AND_STRATEGY.md -- what optimal play looks like, and how we know

The results document of the number-block-sim experiment: a falling number-block merge game
rebuilt from scratch as a deterministic engine, then played to death by a ladder of AI agents
on a frozen 500-game exam. The game is live at
https://masked-brown.github.io/number-block-sim/ and was played under the locked rules
specification `01_rules/output/RULES.md` v1.1 (5 columns by 6 rows, one honest preview block,
equal tiles merging at 2^(n-1), scores multiplied by chain index, a spawn distribution that
drifts upward as the board grows).

Every empirical claim here cites its finding ID (F001 to F008) in the register
`03_train/output/_FINDINGS.md`, where each finding carries its mechanism, its evidence by
run-id, its confidence tier and its falsifier. Confidence language is deliberate: findings
are supported or suggestive, never proven, at simulation sample sizes. The build story is
`BUILD_RECORD.md` beside this file; how the conversation ran is `TRANSCRIPT.md`.

## The measurement, first

All headline numbers come from one instrument. The exam, `eval-v1`, is 500 seeds generated
once, committed, checksummed and frozen; every agent version sits the identical 500 games,
and training never touches an exam seed. Agents are deterministic, so the sample size is the
seed count. An agent's identity pins its features and weights immutably; any change is a new
named version. Every run folder opens with a manifest recording the agent, weights, seed-set
checksum, engine commit and spawn parameters before the first game is played. Intervals are
percentile bootstrap over seeds (10,000 resamples, seeded, reproducible), and paired
comparisons resample seed indices so both agents are always compared on the same games.

**The experiment played 78,103 recorded simulated games**, verified by summing the run
records in `03_train/output/runs/`. What that comprises: 5,000 headline exam games (ten
named versions times 500 eval-v1 seeds); 57,600 breeding fitness games (two cross-entropy
campaigns: 7 and 9 generations, each generation 24 candidates times 150 paired training
seeds); 2,000 breeding validation games (each campaign's champion and its predecessor, 500
held-out training seeds each); 5,000 stacker-sweep games (both stacking variants from every
column, 500 seeds each); 8,000 throughput-measurement games (repeated timed passes, serial
and worker-pool); 300 behaviour-probe games; 200 parallel bit-identity proof games; and 3
determinism-proof games. Design probes noted in the decision log but not recorded as run
folders are excluded from the count, as are deterministic re-derivations of already-recorded
games.

## The headline: search does not mainly score faster, it mainly dies later

The end-of-game ladder says the champion outscores the inherited flat agent 5.56x. Read at a
fixed horizon, where every agent gets the same number of blocks, most of that multiple
dissolves into survival (F007): over the first 256 blocks the champion's edge is 1.66x, and
one ply of certain lookahead is worth 1.23x rather than 2.10x. The ordering of the ladder is
unchanged at every horizon from 128 to 512 blocks, so the ladder is real; what the
end-of-game gaps mostly measure is how long each agent stays alive.

Median score at N blocks placed, with the share of games still alive (F007; run
`2026-08-05_leak-free-ladder`):

| agent | 128 | 256 | 384 | 512 | end of game | alive at 256 | alive at 512 |
|---|---:|---:|---:|---:|---:|---:|---:|
| expectimax-d3-v2 | 34,030 | 133,302 | 277,228 | 469,246 | 634,826 | 100.0% | 80.8% |
| expectimax-d2-v2 | 31,612 | 119,800 | 251,972 | 376,978 | 428,990 | 99.8% | 55.6% |
| heuristic-v2 | 25,072 | 97,648 | 185,660 | 204,618 | 204,618 | 96.4% | 15.8% |
| heuristic-v1 | 23,488 | 87,222 | 141,098 | 141,424 | 141,424 | 85.2% | 6.6% |
| heuristic-v0 | 23,238 | 80,418 | 114,210 | 114,210 | 114,210 | 76.4% | 2.8% |
| greedy-v1 | 17,910 | 35,386 | 35,386 | 35,386 | 35,386 | 14.6% | 0.0% |

The mechanism is the game's own scoring (F007): score compounds with survival under the
drifting spawn curve, because a longer game climbs to higher tiers whose merges are worth
more. Search's chief product is a later death, and dying later is what the multiples are
made of.

## The human result: the gap is survival, not skill per move

One practised human reference game exists on the record: 121,496 points in 256 blocks,
engine-verified (`03_train/output/reference/nbs-replay-121496.json`). Compared at its own
horizon, that game scores at the searching agents' rate, not the flat agents' (F008): 121,496
sits between the leak-free depth-2 median at 256 blocks (119,800) and depth-3's (133,302),
inside depth 2's own interquartile range for that horizon, and above every flat agent's
256-block median. What the human game did not do is survive: 99.8 per cent of depth-2 games
were still alive at 256 blocks, and that game was over.

This is one game by one player and is weighted accordingly: the register holds it at
suggestive, with the selection caveats stated (F004, F008). What n=1 does firmly retire is
the earlier three-orders-of-magnitude human-versus-AI gap, which rested on an unpractised
228-point first attempt (F004). The strengthening experiment, five to ten deliberate games
with every game retained, is the roadmap's cheapest human item, and the shipped game now
grades every human game against the champion automatically.

## The honest ladder, with intervals

All rows are 500 eval-v1 games; intervals are 95 per cent bootstrap (F001; run
`2026-08-05_leak-free-ladder`).

| agent | what it is | median | 95% CI |
|---|---|---:|---|
| expectimax-d3-v2 | depth-3 search, leak-free, bred weights | 634,826 | 605,090 to 679,924 |
| expectimax-d2-v2 | depth-2 search, leak-free, same weights | 428,990 | 394,044 to 459,144 |
| heuristic-v2 | flat evaluation, eleven bred features | 204,618 | 192,596 to 223,344 |
| heuristic-v1 | flat, nine features, first breeding campaign | 141,424 | 129,891 to 152,192 |
| heuristic-v0 | flat, hand-set weights | 114,210 | 103,556 to 123,000 |
| greedy-v1 | take any merge, else lowest column | 35,386 | 32,620 to 37,732 |
| random-v1 | random legal column | 1,700 | 1,532 to 1,874 |
| stacker-v1 | one column until full, then shortest | 1,626 | 1,532 to 1,796 |

The rungs, paired on shared seeds, every interval excluding zero: depth 2 over the flat
champion 2.10x (1.87 to 2.27, win rate 76.0 to 83.2 per cent); depth 3 over depth 2 1.48x
(1.37 to 1.65); the champion over the inherited flat agent 5.56x (5.11 to 6.28). Against
that, two entire campaigns of weight breeding moved the flat median 1.79x combined. Depth,
not weight tuning, is the experiment's dominant axis (F001). One rung is not a rung: random
and stacker are statistically indistinguishable on this exam (paired difference 20 points,
interval -164 to +256), one floor measured twice.

Two superseded rows stay in the full ladder on purpose: `expectimax-d2-v1` (427,986) and
`expectimax-d3-v1` (643,996), the leaked versions the next section explains.

## The leak, told straight

An adversarial audit of the finished campaign found that the first expectimax versions read
information no player could have: at the deepest search positions, one feature scored the
engine's already-drawn next block, a real value that is unknowable at play time (F001,
dated correction). The campaign's own decision log had recorded that class of peek as
"structurally impossible" after an earlier path was closed; the feature layer was a second
path, and it was live. The claim "any gain at depth is attributable to search alone" was
therefore not honest as stated.

Leak-free versions were cut, with the leaf feature integrated over the exact live spawn
distribution instead, and both sat the full exam. Paired on all 500 shared seeds, the leak
had changed 7.8 per cent of the agent's decisions and no measurable score: depth 2 honest
428,990 against leaked 427,986 (ratio 1.00x, interval 0.89 to 1.09); depth 3 honest 634,826
against leaked 643,996 (0.99x, 0.92 to 1.07). Both difference intervals contain zero and the
direction is not even consistent between depths (F001).

That is the strongest possible outcome for the conclusions and the weakest possible excuse
for the code, and both halves are kept: the superseded rows remain in the record because the
pair IS the measurement of what the leak was worth, and two standing tests now hold the door
shut (perturbing only the engine's hidden randomness must never move a leak-free agent's
choice and must move a leaked one's; a feature that reads the preview must declare it or the
suite fails). Every number quoted anywhere in this document is from the leak-free rows, and
the in-game grader judges against the leak-free champion, because grading a human against a
judge that peeks would mark them down for not knowing the unknowable.

## What separates strong play from weak play

Three mechanisms carry most of the ladder, each measured, each with a falsifier in the
register:

**Fragmentation is what kills flat play (F002).** Losing boards die as a checkerboard of
adjacent tiles two or more tiers apart: surface that can never merge, and since nothing
removes a block except a merge, irreversible debt. The worst boards die two-thirds full of
unmatchable value. Measuring fragmentation (`tier-gap-cost`) and reading the preview
(`next-merge-ready`) was worth more than either breeding campaign's weight tuning, and once
the agent could see fragmentation coming, its panic weights relaxed: it no longer needed to
grab every merge or hug the floor.

**Banking is a search behaviour (F003).** Deliberately declining a cheap pair to build a
triple or quad is produced by lookahead and only by lookahead: every flat version, at every
weight setting ever bred, takes an available merge on 100 per cent of the moves that offer
one, while the leak-free depth-2 agent declines 10.9 per cent of them and banks a bigger
group on 56.8 per cent of those declines. The mechanism is informational: a bank pays only
if the closing tile arrives before the board rises around it, and the preview is exactly
what makes that knowable. Breeding priced the same setup feature negative for a blind agent
and positive under search: the same board fact flips value when the information set changes.

**Burial is the binding constraint (F005).** Refusing to bury a low tile under higher ones
was the harshest ordinary cost in both breeding campaigns and the only one that got harder
as the agent got better. Gravity only settles downward and only merges remove blocks, so a
buried low tile in a six-row board is close to permanent. Every other cost buys something in
exchange; burial buys nothing and compounds.

And one measured null (F006): no agent, flat or searching, ever chased the spawn drift. A
max-tile raise was never once taken over a strictly higher-scoring alternative, because the
raise usually IS the best merge. The winning relationship to the drifting distribution is
defensive: keep the board able to answer what is actually coming.

## How to play well: the human lessons

Read out of the champion's weights and behaviour, in the order they bind:

1. **Never bury a small tile.** The cheapest-looking column is a trap if it seals a low
   number; check what a placement covers before checking how high it stacks (F005).
2. **Keep neighbouring tiles within one tier of each other.** Adjacent tiles two or more
   tiers apart are dead surface; place every block where it can eventually merge, not merely
   where the board stays low (F002).
3. **Bank only what the preview can close.** Decline a cheap pair for a triple or quad only
   when you can see the closing tile coming; an open bank the preview cannot close is a
   liability (F003).
4. **Do not chase the spawn drift.** The distribution rises on its own as you merge; play
   defence against what it currently serves rather than forcing the biggest tile higher
   (F006).
5. **Survival is the skill.** The game pays compound interest on staying alive: at human
   game lengths, a practised player already scores at the searching agents' rate, and the
   whole remaining gap is dying too soon. Protect the late board above all (F007, F008).

## Where this could go next

The costed roadmap is `NEXT_STEPS.md` beside this file: fifteen items, each with value,
rough cost and what it would invalidate, ranked for the project's two goals (a rigorous
shareable experiment, an engaging game). The best value on it: two one-hour ablations that
would turn F002 and F005 from correlational to causal, the retained practised-human set that
would settle F008, and the spawn-tuning study that the fixed-horizon result now motivates.

## Appendix: watch the champion play

Download `champion-best-game.json` from this folder, open cinema mode on the live site
(https://masked-brown.github.io/number-block-sim/cinema.html), and drop the file in.

It is the champion `expectimax-d3-v2`'s best exam game, engine-verified: seed
11610268379355989646 of eval-v1, score 4,062,920, max tile 131,072, 1,040 moves, with the
agent's own reasoning recorded for every move (the named feature scores and a one-line
verdict, the exact arithmetic it acted on, not narration added afterwards). Cinema mode
re-verifies the replay through the engine before playing it; the green badge is that check
passing.
