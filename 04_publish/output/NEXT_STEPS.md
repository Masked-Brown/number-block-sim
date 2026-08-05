# NEXT_STEPS.md -- where number-block-sim could go next

Written 2026-08-05, job remediate-and-game-v1.2, from the state of the experiment at game
v1.2: rules locked at v1.1, the ladder measured on the frozen eval-v1 exam, six findings in
`03_train/output/_FINDINGS.md` (F001 to F006, two of them amended this day for honesty), and a
playable game deployed at `docs/` with a post-game performance grade.

British English, no em-dashes, no exclamation marks.

## How to read this file

This is a roadmap, not a finding. Every claim about what the experiment currently KNOWS carries
its register ID and nothing else does; every cost and every judgement of value is engineering
opinion, offered so AB can choose, and is marked as such by living in this file rather than in
the register. Nothing here is authorised by being written down.

Two tags, one per item, as the work order asks:

- **BEFORE-V2-RESULTS.** Experiment work. It changes, gates or deepens what the next round of
  results can honestly claim, so it belongs before those results are published. Some of these
  invalidate existing numbers; each says so.
- **PRODUCT-ONLY.** Game and site work. It cannot change a measured result, because the engine
  and the rules it implements are untouched. Ship whenever.

One line binds the whole file, from CLAUDE.md's guardrail: adding any of this is a deliberate
decision, not a friction patch, and the rules in `01_rules/output/RULES.md` are AB's to change
and no job's to invent. Where an item below would need a rule change, it says so in the first
sentence and names the version it would become.

A note on what "invalidates" means here. A **spawn parameter change invalidates every absolute
score in the repo**: the ladder, the findings' magnitudes, the champion's median, the game's
score-index cap, the personal bests in every player's browser. It does not invalidate the
ORDERING of agents, and it does not invalidate the machinery. That distinction is the difference
between a re-run and a rewrite, and it decides how the items below are batched.

---

## 1. The spawn-tuning study

**BEFORE-V2-RESULTS.** No rule change: the eight spawn parameters are RULES.md section 8
tunables and live in `docs/js/config.js`. This is the largest single item on the list and the
audit ranked it first among the game-deepening changes.

**The case, in full, as audit 0019 made it.** The game's stated soul is the engineered cascade,
and the AI plays it that way: in a 50-game decomposition of champion play, chain indices 3 to 5
carry 58 per cent of all points and chain 1 only 8.3 per cent. The one practised human game on
record plays a different game entirely: 193 pairs, 23 triples, one chain of five that alone was
36 per cent of the score. So the mechanic the game is built around is largely inaccessible at
human speed, and the reason is the spawn curve. Its drift keeps the live tier window wide (nine
tiers by the late game), which is fine for an agent evaluating twenty-five to nine hundred
continuations a move and hostile to a person who has about a second and a half to decide.

The concrete parameter tests, with the direction and the reason:

| parameter | now | test | what it should do |
|---|---:|---:|---|
| `slope` | 300 | 450 | A sharper peak: fewer tiers realistically live at once, so a human can hold the distribution in their head and plan a bank. |
| `centreGain` | 400 | 600 | Faster drift: shorter survival tails, less score compounding, more pressure per block. |
| `floorWeight` | 40 | 20 | Less late-game low-tier litter, which is the main source of fragmentation debt (F002); also weakens the fragmentation pressure that F002 says kills flat play, so this one cuts both ways. |

Run the converse directions too (slope 200, centreGain 250, floorWeight 60) as controls: a
study that only tests the direction it hopes for is not a study.

**Judge it on the right thing.** Not raw medians, which a harder curve lowers mechanically. The
two measures that answer the actual question are (a) the median score at a human-relevant
horizon, 256 blocks, which `lab/cli/ladder-uncertainty.js` now computes for any run, and (b) the
gap between flat and searching play, which is the experiment's headline (F001): a curve is more
interesting if depth is worth MORE on it, because that means the game rewards thinking, and
duller if depth is worth less.

Those two measures have just been computed for the CURRENT curve, and the result sharpens this
whole item. At 256 blocks placed, depth 2 is worth 1.23x over flat play rather than the 2.10x its
end-of-game median shows, and the champion is worth 1.66x over `heuristic-v0` rather than 5.56x
(F001's dated correction; panel in `03_train/output/runs/2026-08-05_leak-free-ladder`). So under
the launch tuning, **most of what depth buys is a longer life, not a faster score.** That is a
respectable finding and it is also a diagnosis: at human game lengths, thinking harder is worth
about a quarter more points, which is not much of a reward for the hardest skill the game has. A
curve that raised the 256-block figure would be a curve that pays a human for playing well
within the time they actually play.

**Cost.** Each parameter setting needs at least the four-row ladder (heuristic-v0, heuristic-v2,
the leak-free d2, the leak-free d3) on eval-v1 to be comparable, and d3 is the expensive row at
roughly three quarters of an hour per setting at six workers. Six settings plus the current one
is therefore about six hours of compute, plus scripting a sweep runner and half a day of
reading. Batch them into one job: the invalidation is identical for all of them, so paying it
once is much cheaper than paying it six times.

**What it invalidates.** Every absolute score, as above. Also `CONFIG.performance.scoreIndexCap`,
which is the champion's eval median and would have to be reset from the winning curve's
champion run. Existing replays keep verifying, because a replay embeds the spawn parameters it
was played under (a v1.1 design decision that pays off exactly here). The findings' ORDERINGS
should survive; if one does not, that is itself the most interesting result the study could
produce.

## 2. The two-block preview (rules v1.2)

**BEFORE-V2-RESULTS.** This IS a rule change, to RULES.md section 3, and so AB's decision alone.
The audit named it the single change most likely to deepen human play.

**The case.** F003 says banking a triple or a quad is a search behaviour and only a search
behaviour: flat play takes an available merge on 100 per cent of offering moves at every weight
setting ever bred, while depth-2 search declines about a tenth of them and banks something
bigger on over half of those declines. The mechanism F003 gives is informational, not
computational: a bank pays only if the closing tile arrives before the board rises around it, and
one honest preview is exactly what makes that knowable. A second preview block extends that
knowledge by one ply for a human at no cognitive cost worth the name, which puts the game's
cleanest depth skill inside human reach for the first time.

**Cost.** Large, and it is mostly not the engine. The engine change is small (draw two ahead,
expose both, one more field in the state and the hash). Everything downstream is not: the UI, the
replay format (v3, since a v2 replay does not carry the second preview and its games are not
the same game), the whole agent ladder re-measured, expectimax's depth semantics rewritten
(depth 3 becomes exact rather than an expectation, which changes what the depth ablation MEANS),
and every finding restated. Call it a week of work and a full re-run.

**What it invalidates.** Everything: every score, every finding's magnitude, the replay format,
the human reference, the grader, the composite. It is a version-two game, not a tuning pass.
Publish v1 first. The audit's own call was after publish, and nothing since has changed it.

## 3. Price the clutch rescue

**BEFORE-V2-RESULTS.** No rule change. Cheap, and it closes a hole the audit found in the
measuring instrument rather than in the game.

**The case.** RULES.md 6 deliberately allows a block into a full column: it locks above legal
height, resolution runs, and if it merges its way back down that is a clutch rescue and play
continues. No agent in this repo has ever chosen one, and not because the evidence says it is
bad: `candidatesOf` prunes to open columns for every single agent, so the move is unreachable by
construction. A named mechanic that the strongest player cannot express is a gap in the
instrument, and it is a genuinely publishable curiosity: is the game's most dramatic mechanic
ever correct?

The browser grader inherits the same blind spot, which is why the v1.2 breakdown counts a
player's clutch locks separately instead of quietly marking them wrong.

**Cost.** One agent version (an expectimax whose candidate set includes full columns when a
merge would resolve them) and one eval row: minutes at depth 2, three quarters of an hour at
depth 3. Plus a probe counting how often it takes the option and what it gains.

**What it invalidates.** Nothing. It adds a row and, if the row is any good, one finding.

## 4. Strand-risk ablation: make F005 causal

**BEFORE-V2-RESULTS.** No rule change. One eval row, and the cheapest confidence upgrade
available.

**The case.** F005 (never bury a low tile) rests on breeding correlations: strand-risk was the
harshest ordinary cost in both campaigns and the only one that got harder as the agent got
better. That is suggestive of a binding constraint and it is not a demonstration. Run
heuristic-v2's weights with strand-risk set to zero, on eval-v1, and the claim becomes causal
for one row's cost: if the median collapses, burial was load-bearing; if it does not, the
weight was breeding noise and one of the two human-playable lessons in the write-up is wrong.

Do the same for `tier-gap-cost` while the harness is warm, since F002 makes a comparable
correlational claim about fragmentation and the audit noted its features were selected by
inspecting EVAL death boards (CONCERN B), which is the one hygiene blemish on the campaign.

**Cost.** Two agent versions, two flat eval rows, about a minute of compute each plus the
writing. This is the best value on the list.

**What it invalidates.** Nothing. It sharpens or kills two findings.

## 5. Re-derive the two campaign features from train losses

**BEFORE-V2-RESULTS.** No rule change. Hygiene, not discovery.

**The case.** Audit 0019's CONCERN B: `tier-gap-cost` and `next-merge-ready` were designed by
reading the worst EVAL games of heuristic-v0 and heuristic-v1. Breeding never touched eval-v1
and the held-out train validation reproduced the uplift exactly (1.45x both sides), so the
result is almost certainly clean. But "almost certainly clean" is a weaker sentence than a
publish-grade experiment should have to write, and the fix is to repeat the death-board
inspection on train losses and confirm the same two features fall out.

**Cost.** An afternoon, no new eval rows. Mostly reading boards.

**What it invalidates.** Nothing. It either removes a caveat from F002 or discovers that the
features were exam-shaped after all, which would be a serious finding.

## 6. Depth 4, a beam, or a breed under search

**BEFORE-V2-RESULTS.** No rule change. The strength push, and the most expensive item that is
not the spawn study.

**The case.** F001 says depth is the dominant axis, and the honest ladder now measures three
rungs of it. Nobody has measured the fourth. Two cheaper variants are worth pricing first: a
beam at depth 3 (keep the k best second-ply branches instead of all five, spend the savings on a
fourth ply), and a breed UNDER search, meaning weights bred for a depth-2 agent rather than
inherited from the flat champion. The second is arguably the more interesting: every weight in
the ladder was bred flat, and F003's story (setup-adjacency worth +0.20 under search and -0.47
without it) says explicitly that the right weights depend on the information set. The whole
ladder may be running search on weights tuned for a blinder agent.

**Cost.** Depth 4 at full expectation is likely five to ten times depth 3's three quarters of an
hour per row, which is the wrong side of affordable without the beam. A CEM breed under depth-2
search costs the breed's generations times the d2 game cost: call it two to four hours, and it
needs its own held-out validation block.

**What it invalidates.** Nothing directly. It may reprice F001's Action (the write-up's advice on
where strength comes from) and would supersede the champion.

## 7. The RL baseline question

**BEFORE-V2-RESULTS.** No rule change, and explicitly gated: CLAUDE.md's guardrail holds the RL
stack until a baseline agent's CEILING is measured, not merely until a baseline exists.

**Where that gate actually stands.** heuristic-v0 exists and is measured. Its ceiling is not: the
flat family has been bred twice, the second breed beat the first breed's entire ceiling from its
generation zero, and nobody knows whether a third breed with new features would do the same
again. Items 4, 5 and 6 above are, between them, the ceiling measurement the guardrail asks for.
So the honest answer to "should we do RL" today is that the question is not yet in order.

**When it would be in order, and what it would need.** If a third breed and a breed-under-search
both plateau, and depth beyond 3 is priced out, then the ladder has run out of hand-designed
ideas and a learned evaluation becomes the obvious next axis. What it would need: a state
encoding (the board is 5 by 6 with values that span fourteen tiers, so tier-one-hot planes are
the natural choice), a training loop that never touches eval-v1, and a discipline for reporting
sample efficiency honestly, since an RL agent that sees ten million games and beats an agent
that saw none is not obviously the better answer to "how should a person play this".

**Cost.** Weeks, and a dependency: this is the first item on the list that would need something
outside the current no-dependency, no-build-step constraint. That constraint has been worth a
great deal (the engine runs unchanged in a browser and in Node, which is why the grader in item
"game v1.2" exists at all), and giving it up for RL is a real trade to make consciously.

**What it invalidates.** Nothing measured. It would add a row and, most likely, one finding about
whether learned evaluation beats designed evaluation at fixed search depth, which is a more
interesting question than raw strength.

## 8. A second exam: eval-v2

**BEFORE-V2-RESULTS.** No rule change. Small, and it protects everything else on this list.

**The case.** eval-v1 is frozen, checksummed and has been sat by ten named versions. That is
exactly what it was for, and it is also the thing that slowly stops being a fair test: every
feature designed after 2026-08-05 is designed by people who have read eval-v1 results. The
bootstrap intervals added this day quantify seed-sampling noise but they cannot detect exam
familiarity. A second 500-seed set, generated the same way, committed frozen and NOT looked at
until a version is finished, is the standard answer.

**Cost.** Minutes to generate (`make-seeds.js` already does it, deterministically, and refuses to
overwrite). The discipline is the expensive part, not the compute.

**What it invalidates.** Nothing. It gives future rows a second column.

## 9. The practised-human set

**BEFORE-V2-RESULTS.** No rule change. Audit 0019 proposal 2, and the one item on this list that
a machine cannot do.

**The case.** F004 is the only finding resting on n=1, and this job could only soften its wording,
not fix it: one practised game by one player supports exactly one claim, that a practised human
plays in the same REGIME as measured agent play rather than three orders below it. It cannot
order a human against heuristic-v1 or heuristic-v2, because those agents' own quartile spans
cover two to three times, and it carries selection ambiguity, because a downloaded replay is
plausibly the best of a session.

The fixed-horizon panel made the case stronger, not weaker, and more urgent. Compared at a
matched 256 blocks rather than at game over, AB's 121,496 sits between the leak-free depth-2
champion's median for that horizon (119,800) and depth 3's (133,302), inside depth 2's own
interquartile range. If that holds up over five to ten retained games, the finding stops being
"a human is somewhere in the agent range" and becomes something much more interesting: **a
practised human scores at the searching agents' rate and dies at the flat agents' rate.** One
game cannot establish that. Ten probably can.

What removes both problems: five to ten deliberate games by AB, and ideally by at least one
other person, played to completion with EVERY game retained, saved to
`03_train/output/reference/`. Retention is the whole protocol. Cherry-picking is what the current
n=1 cannot rule out.

The v1.2 game now makes this considerably more valuable than it was: every one of those games
comes with an accuracy grade against the leak-free champion, so a human set would give the first
measurement of how often a person plays the strong move, and how that changes with practice.

**Cost.** An evening of play, plus an hour to analyse. F004 moves from suggestive to supported,
or gets replaced by something more precise.

**What it invalidates.** Nothing. It may reshape F004 substantially, which is the point.

## 10. Richer human study: several players, skill curves

**BEFORE-V2-RESULTS.** No rule change. The grown-up version of item 9, and a genuinely different
experiment.

**The case.** Once accuracy grading exists in the browser (it does, as of v1.2), a human study
stops being "what score did they get" and becomes "what does learning this game look like". The
measurable questions: does accuracy rise with games played, and how fast; do people converge on
the champion's actual policy or on a different competent one; which of the two human-playable
lessons (never bury, never fragment) do people learn first; does accuracy or pace explain more of
score variance. That last one is answerable from the composite's own components across a set of
graded games.

**Cost.** Days, and it is recruitment and analysis rather than compute. It also needs a way to
collect replays, which today means people emailing files. Item 12 is the version of this with
infrastructure.

**What it invalidates.** Nothing. It would probably generate more findings than any other item on
this list.

## 11. Grade at depth 3, offline

**BEFORE-V2-RESULTS.** No rule change. Small, and it prices the grader's one known compromise.

**The case.** The in-browser grade uses the leak-free DEPTH-2 champion, for cost: depth 3 is
roughly twenty times slower per position and would turn a one-second grade into half a minute.
Depth 3 is the stronger judge (F001), so accuracy against depth 2 is a slightly generous grade,
and nobody has measured by how much. Grading the same human replays at both depths in the lab,
where a minute of compute is free, answers it once, and the answer becomes a sentence in the
write-up rather than an open question a reader can raise.

**Cost.** An hour, mostly writing a small CLI that grades a replay file against a named agent.
That CLI is worth having anyway.

**What it invalidates.** Nothing. It may argue for showing two accuracy figures in the game.

## 12. A Neon-backed leaderboard and a daily competition

**PRODUCT-ONLY.** No rule change, no effect on any measured result, and a firm CLAUDE.md
guardrail in front of it: no database, and GitHub Pages is the only deployment surface until AB
names another. Adding a backend is a deliberate decision, not a friction patch.

**The case.** v1.2 ships the trivial half already: a daily board, derived from the UTC date with
no server, so two people can compare scores on the same seed by agreeing to play the daily. What
that cannot do is rank, persist, or resist a liar. A leaderboard would.

**What it would actually take**, stated honestly because this item is usually underestimated:

- A database (Neon Postgres is already available in this environment) and therefore a server-side
  surface, which is the guardrail item.
- Score verification. This game is fully deterministic and every score is reproducible from
  (seed, spawn, moves), so the server can REPLAY a submitted game and refuse anything that does
  not verify. That is an unusually strong anti-cheat position and it is the best argument for
  building this at all: the leaderboard would be verified, not trusted.
- A submission path from the browser, rate limiting, and some notion of identity that is not an
  account system.
- A policy on the daily: one attempt or many, and if one, some way to enforce it, which
  determinism does not help with.

**Cost.** Days, not hours, and it is the only item here that adds an ongoing operational burden
(a database that must not fall over, and moderation of whatever people type into a name field).

**What it invalidates.** Nothing measured. It would raise the stakes on item 1: retuning the
spawn curve after a leaderboard exists resets everybody's scores, so if both are wanted, tune
first and launch second.

## 13. Mobile controls

**PRODUCT-ONLY.** No rule change.

**The case.** The game is keyboard-only: arrows steer, space drops (RULES.md 2). On a phone there
is no keyboard, so the game is currently unplayable on the device most people would try it on.
The layout already responds below 900px, so the board fits; only the input is missing.

**What it needs.** Tap a column to steer to it and tap again to drop is the smallest scheme that
matches the rules exactly, needs no new mechanic, and does not touch the engine. Swipe-left and
swipe-right plus tap-to-drop is the alternative. Both are presentation: the engine takes a column
per move and cannot tell how the column was chosen. Two things to get right: the fall speed
(1 cell per second) is tuned for a keyboard player and may want to be a tunable per input mode,
and the 76px tile geometry needs to scale rather than overflow.

**Cost.** Half a day, plus real device testing, which is the part that always takes longer than
the code.

**What it invalidates.** Nothing. It changes who can play, which is the largest available
increase in the number of human games available to item 10.

## 14. Smaller product items the record suggests

**PRODUCT-ONLY** unless marked. Each is under a day.

- **Show the player their worst moves.** The grader already computes the champion's column for
  every move; the game currently reports only how often they agreed. Highlighting the three
  positions where the player's move cost the most, replayable in cinema mode, turns the accuracy
  number into a lesson. This is the highest-value small item on the list.
- **Accuracy over time within a game.** A sparkline of agreement per twenty-move block would show
  whether a player degrades under pressure, which is the kind of thing a write-up can use.
- **Cinema mode for human replays with grading.** Cinema plays agent replays with reasoning; a
  human replay could be played with the champion's alternative shown alongside each move.
- **Share the daily.** A score card that names the daily date and encodes the seed, so a screenshot
  is a challenge rather than a boast.
- **Reduced-motion and colour-blind passes.** The effects are already gated behind
  `prefers-reduced-motion`; the tile ramp has not been checked for colour-blind legibility, and
  the tile VALUE is always printed, so the risk is low but unmeasured.
- **A rules page on the site.** Today the rules link goes to GitHub. A rendered page would be
  friendlier and is the sort of thing that makes an experiment shareable.
- **Structured search block in every manifest** (BEFORE-V2-RESULTS, done in part this day):
  `manifest.js` now records the agent's `search` block, so depth, coverage and the leaf-preview
  mode are pinned as fields rather than only in prose. Any future agent parameter should follow
  the same rule.

## 15. What NOT to do

Recorded so a future job does not spend a day rediscovering it.

- **Do not chase the spawn drift.** F006 is a measured null: no agent, flat or searching, ever
  took a max-tile raise over a strictly higher-scoring alternative, across every probe. The raise
  IS usually the best merge, so there is no separate lever. An explicit centre-advancing feature
  is one module and one breed away if AB wants the offensive variant tested, and the prior is
  that it does nothing.
- **Do not re-run the leaked expectimax rows.** expectimax-d2-v1 and expectimax-d3-v1 stay
  registered and unchanged on purpose: their 500 recorded games each are the measurement of what
  the leaf leak was worth. Deleting them would destroy evidence; quoting them as depth results
  would repeat the error. The ladder marks them superseded and the standing tests hold both the
  leak and its fix in place.
- **Do not add a third actor or a map.** CLAUDE.md's guardrail, unchanged: the tree is small
  enough to navigate bare and two actors plus the loop is the whole operating model.
- **Do not quote 228 as a human reference.** It was an unpractised first attempt and F004 retired
  it. The current reference is 121,496, and its limits are stated in F004's own amendment.
- **Do not compare a human game to an agent's end-of-game median again.** The human game on
  record is 256 blocks and the agents' games run two to five times longer, so that comparison is
  mostly a statement about survival dressed up as one about skill. The fixed-horizon panel exists
  now; use the matching column.
- **Do not treat `random-v1` and `stacker-v1` as different rungs.** Their paired interval spans
  50 per cent and their median difference is 20 points with an interval of -164 to +256. They are
  one floor, measured twice.

## Ranked, for AB's two goals

A rigorous shareable experiment, and an engaging game. Value per unit cost, best first.

| # | Item | Tag | Rough cost | Why this rank |
|---:|---|---|---|---|
| 4 | Strand-risk and tier-gap ablations | BEFORE-V2-RESULTS | ~1 hour | Turns two of the six findings from correlational to causal for almost nothing. |
| 9 | The practised-human set | BEFORE-V2-RESULTS | An evening | The only finding resting on n=1, and only a person can fix it. |
| 3 | Price the clutch rescue | BEFORE-V2-RESULTS | ~1 hour | Closes an instrument hole and is a publishable curiosity in its own right. |
| 14 | Show the player their worst moves | PRODUCT-ONLY | ~half a day | Largest jump in how much a player learns per game, from data already computed. |
| 11 | Grade at depth 3 offline | BEFORE-V2-RESULTS | ~1 hour | Prices the grader's one known compromise, so the write-up can state it. |
| 5 | Re-derive features from train losses | BEFORE-V2-RESULTS | An afternoon | Removes the campaign's one hygiene caveat. |
| 13 | Mobile controls | PRODUCT-ONLY | ~half a day | Unlocks most potential players, which feeds item 10. |
| 8 | eval-v2 | BEFORE-V2-RESULTS | Minutes plus discipline | Cheap insurance against exam familiarity. |
| 1 | The spawn-tuning study | BEFORE-V2-RESULTS | ~6 hours plus reading | The biggest available improvement to the GAME, at the price of every absolute score. |
| 6 | Depth 4, beam, or breed under search | BEFORE-V2-RESULTS | 2 to 4 hours | Strength, and the breed-under-search variant may reprice F001's advice. |
| 10 | Richer human study | BEFORE-V2-RESULTS | Days | The most findings per item, and the slowest. |
| 12 | Leaderboard and daily competition | PRODUCT-ONLY | Days, plus upkeep | Needs the database guardrail lifted; verified-by-replay is its real appeal. |
| 7 | The RL baseline | BEFORE-V2-RESULTS | Weeks | Gated on items 4 to 6 measuring the flat ceiling first. |
| 2 | The two-block preview | BEFORE-V2-RESULTS | A week, plus a full re-run | Deepest change to human play available, and it invalidates everything. After v1. |
