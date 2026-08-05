# _FINDINGS.md -- the verdict register

The distilled current belief about optimal play: one finding per durable belief the experiment
currently holds. This is the one analysis-layer file `04_publish/` reads; raw evidence stays in
`runs/`. The pattern is youtube-pov's analysis-funnel register, carried at seeding.

## How this works

**This is a current-state register, not a log.** When a later run sharpens or kills a belief,
edit the entry in place; never append a duplicate entry for the same belief. Findings enter only
by AB-gated promotion from a run's "Findings for the register" draft section (the funnel rules
live in `03_train/CONTEXT.md`); a CC job never writes here from a run job. IDs are `F001`
onward, assigned at promotion, never reused. Confidence ladder: suggestive, supported, strong,
refuted; never "proven" at simulation sample sizes. Disposition values: feeds-publish (the
write-up uses it), rules-question (it exposes a gap or ambiguity for `01_rules/`), parked,
refuted.

Each finding carries six fields: **Claim** (one sentence), **Mechanism** (why it works, best
current explanation), **Confidence and falsifier** (the ladder value, and what result would
kill it), **Evidence** (the run-ids and summary docs behind it; enrichment paragraphs appended
inside the field on later waves), **Action** (concrete enough to go straight into the write-up
or the next run design), **Disposition and dates**
(`<disposition> | first logged: <date> | last updated: <date>`).

## Summary

| ID | Claim | Confidence | Disposition |
|---|---|---|---|
| F001 | Lookahead over the honest preview beats any weight tuning; depth is the experiment's dominant axis | strong | feeds-publish |
| F002 | Flat heuristic play dies of tier fragmentation, and pricing it relaxes every panic weight | supported | feeds-publish |
| F003 | Banking triples and quads is a search behaviour; no flat weight setting produces it | supported | feeds-publish |
| F004 | A practised human plays in the same regime as measured agent play, not orders below it; the remaining gap is survival, not scoring rate | suggestive | feeds-publish |
| F005 | Never burying a low tile is the binding constraint of strong play under these rules | supported | feeds-publish |
| F006 | The spawn drift is survived, not chased; the v1.0 floor-rise question is retired | supported | feeds-publish |

Entry route: these six entered on 2026-08-05 under work order orchestrated-training-campaign,
whose deliverable 7 names this register with the entry discipline stated; the reading of that
order as AB's pre-authorisation is recorded in `DECISION_LOG.md` and the job touchdown. The
smoke-ladder's four candidate findings remain unpromoted drafts in that run's SUMMARY.md.

Correction pass, 2026-08-05, work order remediate-and-game-v1.2, which names these amendments
explicitly (its item 3: append dated corrections, never rewrite). F001, F003 and F004 each carry
a **Correction** block after their Action, added after audit 0019 found the expectimax leaf
preview leak. The original wording of every field stands above its correction, unedited, so a
reader can see what was believed and what replaced it. The summary line for F004 above is the
one thing restated in place, because an index that contradicts its own entry is worse than
either version. No new findings were promoted; two candidates are drafted in
`runs/2026-08-05_leak-free-ladder/SUMMARY.md` for a later AB-gated pass.

## Findings

### F001 -- lookahead is the dominant axis

**Claim.** Search over the one-block preview and the live spawn distribution is worth far more
than any weight change: at identical weights, depth 2 roughly doubles the flat champion's
eval-v1 median and depth 3 raises it further still, while two full breeding campaigns over
eleven features moved the flat median by well under one doubling.

**Mechanism.** The game's value is concentrated in placements whose payoff arrives one to two
blocks later: a merge the previewed block completes, a cascade the third block triggers. A flat
evaluation can only proxy that future with board-shape features; expectimax computes it against
the same engine and the same probabilities the game itself uses (RULES.md 3, 7), so every
feature blind spot the proxy has, search fills with truth.

**Confidence and falsifier.** Strong. All rows are 500 paired eval-v1 seeds between named
immutable versions at mechanically shared weights. Killed by a flat evaluation reaching
depth-2's median without search, which would say the features were merely mis-bred, or by the
depth gains failing to reproduce under a re-run of the same runs.

**Evidence.** Runs 2026-08-05_eval-heuristic-v2 (flat, median 204,618), _eval-expectimax-d2-v1
(median 427,986, 2.09x flat at identical weights), _eval-expectimax-d3-v1 (median 643,996,
1.50x depth 2, 3.15x flat, head-to-head over depth 2 on 325 of 500, coverage 0.9). Breeding:
v0 114,210 to v1 141,424 (breed 2026-08-05_breed-h0) to v2 204,618 (breed _breed-h1-features),
1.79x across two campaigns of weight learning against 3.15x from search at fixed weights.

**Action.** Phase 4's move-grading champion is `expectimax-d3-v1` (browser cost per single
position is five to nine hundred engine calls, fine interactively). Any future strength push
prices depth 4 or beam variants before another breed; the write-up leads with depth, not
weights.

**Correction, 2026-08-05 (job remediate-and-game-v1.2, after audit 0019).** Appended, not
rewritten: everything above stands as first logged and the corrections are here.

1. *The mechanism sentence was false as stated, and the magnitude survives.* Audit 0019 found
   that `expectimax-d2-v1` and `expectimax-d3-v1` read the engine's real but unknowable next
   block at their search leaves, through `next-merge-ready` scoring `ctx.next` on a simulated
   state. So "any gain at depth 2 or 3 is attributable to search alone" was not true of those
   two versions: part of the information they used was a peek. Leak-free versions
   `expectimax-d2-v2` and `expectimax-d3-v2` were cut (the leaf feature is integrated over the
   exact live distribution instead) and both sat all 500 eval-v1 seeds.
2. *The leak was worth nothing measurable.* Paired on shared seeds: depth 2, honest median
   428,990 against leaked 427,986, ratio 1.00x with a 95 per cent interval of 0.89 to 1.09 and
   a win rate interval of 44.0 to 52.8 per cent; depth 3, honest 634,826 against leaked
   643,996, ratio 0.99x, interval 0.92 to 1.07, win rate interval 46.6 to 55.4 per cent. Both
   difference intervals contain zero and the direction is not even consistent between depths.
   It flipped 7.8 per cent of depth-2 decisions (audit 0019) and changed no result.
3. *The honest rungs, with intervals.* Depth 2 over flat: 2.10x, interval 1.87 to 2.29, win
   rate 76.0 to 83.2 per cent. Depth 3 over depth 2: 1.48x, interval 1.37 to 1.65, win rate
   64.6 to 72.8 per cent. Champion over the inherited flat agent: 5.56x, interval 5.11 to 6.28.
   Against 1.79x for two whole breeding campaigns. The claim is unchanged and now bounded.
4. *A real qualification to the mechanism, from the new fixed-horizon panel.* Most of the
   ladder's spread is survival, not scoring rate. Read at 256 blocks placed rather than at
   game over, depth 2 over flat is 1.23x (not 2.10x) and the champion over heuristic-v0 is
   1.66x (not 5.56x). The ORDERING holds at every horizon from 128 to 512 blocks, so the ladder
   is not an artefact of survival compounding, but the SIZE of every gap mostly says that search
   dies later rather than that it scores faster while alive. The write-up should say this
   plainly; it is the more interesting reading and it is what the numbers support.
5. *The Action above is superseded.* The move-grading champion is now the leak-free
   `expectimax-d2-v2`, which is what game v1.2 grades human moves against in the browser, with
   `expectimax-d3-v2` the strongest honest agent and the source of the game's score-index cap.
   Grading against a judge that peeks would mark a player down for not knowing the unknowable.
   Evidence for all of the above: runs `2026-08-05_eval-expectimax-d2-v2`,
   `2026-08-05_eval-expectimax-d3-v2` and `2026-08-05_leak-free-ladder` (its `SUMMARY.md`
   carries the reading, `UNCERTAINTY.md` the intervals and the panel).

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05
(leak-fix correction appended the same day)

### F002 -- fragmentation is what kills flat play

**Claim.** Flat heuristic games die of tier fragmentation, a checkerboard of adjacent tiles two
or more tiers apart, not of height; measuring it (`tier-gap-cost`) plus reading the preview
(`next-merge-ready`) was worth more than either breeding campaign's tuning, and pricing them
let every panic weight relax.

**Mechanism.** Merging needs equal neighbours and a doubling ladder needs a gap of exactly one
tier, so any adjacency at gap two or more is board surface that can never produce value; since
nothing removes a block except a merge (RULES.md 9), fragmentation is irreversible debt. The
worst boards die two-thirds full of unmatchable value. Once the agent can see fragmentation
coming it no longer needs to panic-merge (immediate-merge-value bred back from 3.64 to 1.62) or
hug the floor (height-cost -4.42 back to -2.31).

**Confidence and falsifier.** Supported. Killed by a re-breed WITHOUT the two features matching
v2's eval median, which would mean the gain was breeding luck rather than the features, or by
death-board audits of v2 losses showing the same fragmentation shares as v0's.

**Evidence.** Death boards of the worst eval games of v0 (11,856, seed 11887799896954937506)
and v1 (9,208, seed 16750382879045792593), both checkerboards, read in DECISION_LOG.md.
Breed 2 (2026-08-05_breed-h1-features): generation 0 with the two features at guessed init
weights already beat breed 1's entire ceiling (188,338 against 159,208); bred weights
tier-gap-cost -1.70, next-merge-ready +1.12; validation uplift 1.45x over v1 on held-out train
seeds; eval median 204,618 against v1's 141,424.

**Action.** The write-up's human-playable lesson number one: keep neighbouring tiles within one
tier of each other, and place every block where it can eventually merge, not merely where the
board stays low. tier-gap-cost is the single most human-teachable feature the campaign found.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

### F003 -- banking is a search behaviour

**Claim.** Deliberately declining a cheap pair to bank a triple or quad is produced by search
and only by search: every flat version, whatever its weights, takes an available merge on 100
per cent of moves, while depth-2 search declines 10.4 per cent of them and banks a bigger group
on over half of those declines.

**Mechanism.** A bank pays only if the closing tile arrives before the board rises around it.
A flat agent cannot condition on what arrives next, so across a whole game the banks it opens
are closed by luck, and breeding accordingly priced setup-adjacency NEGATIVE at depth 1
(v1: -0.47). Search sees the previewed block, so it opens exactly the banks the preview will
close: same feature, opposite value, because the information set changed.

**Confidence and falsifier.** Supported. Killed by a flat weight vector found declining pairs
at a material rate while beating v2 on eval-v1, or by the decline rate failing to reproduce on
a second probe block.

**Evidence.** Run 2026-08-05_behaviour-probes: takenWhenAvailable 1.0 for heuristic-v0, v1 and
v2 (100 train games each); expectimax-d2-v1 declinedWhenAvailable 0.104,
declinedAndBankedInstead 0.537 (50 games). Merge profiles at eval scale: triples per game
roughly double from v2 (17.6) to d2 (33.0); quads 273 against 355 in 500 games. Breed
evidence: setup-adjacency bred to -0.47 at depth 1 (run _breed-h0), recovering to +0.20 only
once next-merge-ready existed (run _breed-h1-features). Refines the smoke-ladder's parked
candidate (big groups as neglect): groups of three and four return under search as deliberate
play; quintuples remain a neglect signal in every strong agent measured.

**Action.** Human-playable lesson: bank only what the preview can close. The write-up should
pair this with F001, since it is the cleanest concrete example of what depth buys.

**Correction, 2026-08-05 (job remediate-and-game-v1.2, after audit 0019).** Appended, not
rewritten. The rates quoted in Evidence above were measured on `expectimax-d2-v1`, whose search
leaves read a block no player could see, so the audit rightly asked whether the banking those
rates describe was partly leak-informed. The probe was re-run on the leak-free
`expectimax-d2-v2` with the identical instrument and the identical seeds (train-v1 at offset
500, 50 games, run `2026-08-05_behaviour-probe-d2-v2`), so the two are paired.

**Banking is not a leak artefact, and the honest rates are slightly stronger.** Leak-free
depth-2 declines 10.9 per cent of available merges (leaked: 10.4) and banks a triple or better
on 56.8 per cent of those declines (leaked: 53.7). Every flat version still takes an available
merge on 100 per cent of offering moves. Merge profile over the 50 probe games: 22,218 pairs,
1,667 triples, 42 quads and one quintuple, against 23,267 / 1,684 / 35 / 0 leaked, so the
honest agent closes slightly more of the biggest groups. At eval scale the same holds: 430 quads
and one quintuple in 500 games against the leaked row's 355 and none.

The claim and its mechanism stand exactly as written; the numbers to quote are the leak-free
ones. The parked quintuple-neglect signal is now marginally weaker, since a leak-free depth-2
agent did close one, and one is still a neglect signal rather than a strategy.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05
(leak-free probe correction appended the same day)

### F004 -- the human gap was an artefact of an unpractised reference

**Claim.** A practised human game scores level with flat heuristic play on the launch tuning
(121,496 against flat medians of 114,210 to 204,618), so the smoke ladder's three-orders-of-
magnitude human gap was an artefact of its 228-point unpractised reference; the regime gap that
remains belongs to search (depth 3 median 643,996).

**Mechanism.** Score compounds with survival (RULES.md 5 with the drifting curve of RULES.md
3), and survival is a learnable skill: one practised session moved the human reference by three
orders of magnitude. What a human cannot do at play speed is expectimax's arithmetic over
twenty-five to nine hundred continuations per move, which is where the remaining multiple
lives.

**Confidence and falsifier.** Suggestive, and flagged thin: the practised reference is ONE
game by one player. Killed or reshaped by a small set of deliberate human playthroughs, which
the smoke ladder already asked for; strengthened if several practised games cluster near the
flat medians.

**Evidence.** `nbs-replay-121496.json` (repo root, uncommitted at campaign close): format v2,
player "human", 2026-08-05T12:16Z, 256 blocks, max tile 4,096, per-move timestamps spanning
roughly nine minutes; verified through the engine by this campaign (verifyReplay ok, score
121,496, hash a613b2d4). Flat and search medians: runs _eval-heuristic-v1, _eval-heuristic-v2,
_eval-expectimax-d2-v1, _eval-expectimax-d3-v1. Supersedes the smoke-ladder candidate finding
that leaned on BUILD.md's 228.

**Action.** Home the replay properly (it is AB's file; raised in the job touchdown), commission
the practised-human set before Phase 4 fixes its composite score, and stop quoting 228.

**Correction, 2026-08-05 (job remediate-and-game-v1.2, after audit 0019).** Appended, not
rewritten. Three things change: where the evidence lives, what one game can support, and a
better comparison that this job's analysis made available.

1. *The replay is homed.* `03_train/output/reference/nbs-replay-121496.json`, committed, not the
   repo root. Engine-verified (score 121,496, hash a613b2d4) and verified in live cinema mode
   with the green badge by audit 0019.
2. *The Claim is softened to exactly what n=1 supports.* One practised game by one player
   supports one claim: **a practised human plays in the same REGIME as measured agent play
   rather than three orders of magnitude below it, and the 228-based gap reading is dead.** It
   cannot support "sits level with flat heuristic play": it cannot order the human against
   `heuristic-v1` or `heuristic-v2`, whose own q1-to-q3 spans cover two to three times, and it
   carries selection ambiguity, because a downloaded replay is plausibly the best of a session
   and the file's score-stamped name comes from the download path. No additional human replays
   existed in `03_train/output/reference/` when this job ran, so nothing could be added; audit
   0019 proposal 2 (five to ten retained games, no cherry-picking) remains the fix and is item 9
   of `04_publish/output/NEXT_STEPS.md`.
3. *A better comparison, and it moves the reading.* The end-of-game medians this finding was
   written against compare a 256-block human game with agent games that ran two to five times
   longer, which flatters neither side honestly. The new fixed-horizon panel
   (`2026-08-05_leak-free-ladder/UNCERTAINTY.md`) gives the matched comparison: median score at
   256 blocks placed is 80,418 for `heuristic-v0`, 87,222 for `heuristic-v1`, 97,648 for
   `heuristic-v2`, 119,800 for the leak-free `expectimax-d2-v2` and 133,302 for
   `expectimax-d3-v2`. **The human's 121,496 in 256 blocks sits between the two searching
   agents, inside depth 2's own interquartile range for that horizon (99,708 to 150,916).** So
   over the blocks they actually played, a practised human scored at the SEARCHING agents' rate,
   not the flat agents'. What they did not do is survive: 99.8 per cent of depth-2 games were
   still alive at 256 blocks and that game was over.
4. *So the finding's shape changes.* The remaining gap is not a scoring-rate gap at all, it is a
   survival gap, which is the same conclusion F001's own correction reached from the other
   direction. The Mechanism's second sentence ("what a human cannot do at play speed is
   expectimax's arithmetic") is still the best available explanation of the survival difference,
   but it is now explanation rather than measurement, because the arithmetic evidently is not
   what produces the score difference over a fixed number of blocks.
5. *Confidence stays suggestive*, and the falsifier is unchanged: a small set of retained
   practised games. Game v1.2 makes that set considerably more valuable than it was, since every
   human game now arrives with a per-move accuracy grade against the leak-free champion. For the
   record, the homed replay grades at 46.5 per cent agreement, median 1.85 seconds a move, and
   two locks into a full column, which is one measurement of one game and is offered as an
   example of what the human set would produce, not as a finding.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05
(n=1 softening and the fixed-horizon comparison appended the same day)

### F005 -- never bury a low tile

**Claim.** Refusing to bury low tiles under higher ones is the binding constraint of strong
play: both breeding campaigns made strand-risk the harshest ordinary cost on the board, and it
is the only cost that got HARDER as the agent got better.

**Mechanism.** Gravity only settles downward and nothing removes a block except a merge, so a
low tile under a higher one can only be freed sideways before its column fills: burial is
near-irreversible in a six-row board. Every other cost (height, unevenness, even fragmentation)
buys something in exchange; burial buys nothing and compounds, because the buried tile also
fragments its column.

**Confidence and falsifier.** Supported. Killed by a bred or searched version that accepts
materially more burial while beating v2 on eval-v1.

**Evidence.** Weight trajectories: strand-risk -1.0 hand-set, -3.44 after breed 1, -4.93 after
breed 2, while height-cost and immediate-merge-value both relaxed in breed 2 (runs _breed-h0,
_breed-h1-features). Behaviour: every strong agent accepts above-minimum burial on under a
quarter of moves with mean excess margin about 0.02 of the feature's range (run
_behaviour-probes).

**Action.** Human-playable lesson two: the cheapest-looking column is a trap if it seals a
small tile; check what a placement covers before checking how high it stacks.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

### F006 -- the drift is survived, not chased

**Claim.** No measured agent, flat or searching, deliberately pushes its max tile to drag the
spawn centre upward: across every behaviour probe, a max-tile raise was never once taken over
a strictly higher-scoring alternative. The design's floor-rise question is retired with rules
v1.0; its v1.1 successor, drift chasing, gets a null answer.

**Mechanism.** Raising the max tile IS usually the board's best merge, so the drift advances
as a side effect of taking value; there is no separate lever to pull. The spawn centre follows
the max tile (RULES.md 3), so the winning relationship to the drift is defensive: keep the
board able to answer what the current centre serves (spawn-pressure bred to -4.37, the
second-harshest cost), and the centre takes care of itself.

**Confidence and falsifier.** Supported for the agents measured; the general claim that
chasing cannot pay is untested. Killed by an agent with an explicit centre-advancing feature
beating v2, which would show the null is about these features, not the game.

**Evidence.** Run _behaviour-probes: raisedOverHigherGain 0 in every probe (v0, v1, v2 at 100
games, d2 at 50); raises taken when available 0.90 to 1.00 because the raise is the merge.
Floor-rise retirement: RULES.md v1.1 change note (the four-tier window with floor rise was
replaced by the drifting distribution), so the planted question has no v1.1 mechanic to attach
to.

**Action.** The write-up answers the planted drift question with the defensive framing; if AB
wants the offensive variant tested, it is one feature module and one breed away.

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05
