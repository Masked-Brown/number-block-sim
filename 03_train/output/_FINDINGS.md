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
| F004 | A practised human sits level with flat heuristic play; only search pulls clearly ahead | suggestive | feeds-publish |
| F005 | Never burying a low tile is the binding constraint of strong play under these rules | supported | feeds-publish |
| F006 | The spawn drift is survived, not chased; the v1.0 floor-rise question is retired | supported | feeds-publish |

Entry route: these six entered on 2026-08-05 under work order orchestrated-training-campaign,
whose deliverable 7 names this register with the entry discipline stated; the reading of that
order as AB's pre-authorisation is recorded in `DECISION_LOG.md` and the job touchdown. The
smoke-ladder's four candidate findings remain unpromoted drafts in that run's SUMMARY.md.

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

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

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

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

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

**Disposition and dates.** feeds-publish | first logged: 2026-08-05 | last updated: 2026-08-05

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
