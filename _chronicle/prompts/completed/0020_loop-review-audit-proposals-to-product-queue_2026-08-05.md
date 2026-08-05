---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-audit-proposals-to-product-queue
job: 0020
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's thirteenth review cycle: consider the ten handed proposals, six of them
the adversarial audit's staged work plan, and move the product ones onto the queue that has a
class for them instead of declining them for want of one.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T15:50:45 carrying ten
proposals under a single trigger, the count threshold, with seven gaps riding
listed-not-counted. No gap was counted this cycle.

## What it did
No repository file was changed by the review. Evidence read: touchdown 0019's Proposals and Gaps
sections in full, `_orchestration/views/suggestions.md` and `gap-queue.md`,
`03_train/output/reference/`, `03_train/output/DECISION_LOG.md`, `git status`, and
`classify_gap_route` run on this touchdown's own gap first line before writing it. Tests/build:
n/a.
Delegation: none

## Deliverables
- none

## How it went
Last cycle's NEEDS YOU is closed by someone else's work, which is worth recording first: the
stray replay is gone from the repo root and now lives at
`03_train/output/reference/nbs-replay-121496.json`, homed and cinema-verified by job 0019. The
gap I rerouted to the human gate got answered before AB had to act on it.

The substance of this cycle was a decision about method rather than about any single item. Six
of the ten handed proposals are the audit's work plan, numbered and staged around publish. Three
cycles running I have had to decline product proposals on remit, because the review is not the
grader of product research and the proposal queue has no route class to put them behind. That is
the structural point I raised as proposal 16420efdfb43, and it is still at the gate. Declining
five good work items a third time to hold a count below five would be letting a queue shape
destroy a curated plan.

So I used the mechanism that does exist. Gaps have route classes; a gap naming a product path
routes product-zone, rides listed-not-counted, stays permanently visible to AB and carries the
deadman's clock. Nothing stops the review raising one. I therefore folded the four purely
forward-looking product proposals into a single product-zone gap that names each by id and
subject, so they leave the undifferentiated proposal list and arrive on the queue that was built
for exactly this. I checked the routing before writing it rather than after: run through
`classify_gap_route`, the gap's first line returns product-zone, which also means the first-line
defect cannot misfile it.

Two of the six closed on their own evidence instead. `1d41864b4141`, cutting leak-free
expectimax versions, is in flight as I write: `03_train/lab/agents/expectimax-d2-v2.js` and
`expectimax-d3-v2.js` are on disk untracked, with `expectimax.js`, `features/context.js` and
both index files modified, which is precisely the change the proposal describes. Folded on that
evidence, recorded honestly as uncommitted work in a job that has not closed. `a4eedd015f83`,
commissioning the practised-human set, is the third appearance of one item: gap 1988a4662809
carries it on AB's product queue already, and I folded `3db6ddf8518c` into that same gap last
cycle for the same reason. Its new detail, the retention protocol that removes F004's selection
ambiguity, is worth more than the duplicate entry, so it is recorded in the resolution.

What I did not do is grade any of them. The gap says what they are and where they came from and
leaves the judgement to AB, which is the honest division: the review can classify and route, and
it cannot price an afternoon of bootstrap scripting against an evening of human play.

`16420efdfb43`, `3db578ec64e5`, `bdd032f8032b` and `fc6495704351` remain standing, unchanged.
Grade: 5
Prompt quality: yes, though this cycle tested it. The work order names two closes for a
proposal, folded or declined, and neither fits a good product item; the way through was the
retrieval policy's own logic, that an item should sit on the queue whose class fits it, and the
reroute machinery already proves the machinery believes that.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
gap: 03_train/ and docs/ carry four work items the adversarial audit raised as proposals, staged
around publish, folded here so they ride the product queue rather than the review's. They are,
by their original proposal ids: 82cd659c3289, add uncertainty to the ladder (bootstrap CIs on
each row's median, paired-difference intervals per rung from the existing per-game
`games.jsonl`, and a fixed-horizon panel scoring after N blocks to show the ordering is not an
artefact of survival compounding; pure analysis, no new runs). 508c6cbfabc4, fix the
falling-tile hover in `docs/css/style.css`, where `.tile`'s transition applies to `.tile.falling`
and the falling tile needs its own transition with `top` removed (presentation only, zero effect
on any result). d470bc09b68d, one eval row each for a strand-risk ablation at v2 weights to make
F005 causal, and for an overflow-lock-considering expectimax variant to price the clutch-rescue
mechanic no current agent can choose. c93923790a14, the post-publish tuning study over slope,
centreGain and floorWeight with converse controls, judged on the human-relevant horizon and the
flat-versus-search gap rather than raw medians, plus the separate two-block-preview rules-v1.2
question. Each is stated in full in touchdown 0019; this gap carries the routing, not a
restatement, and none of them is graded here because pricing them is AB's call.

## Resolutions
- resolves: 1d41864b4141 -- considered and folded: in flight.
  `03_train/lab/agents/expectimax-d2-v2.js` and `expectimax-d3-v2.js` are on disk untracked with
  `expectimax.js`, `features/context.js` and both index files modified, which is the leak-free
  cut the proposal asks for. Recorded honestly: uncommitted work in a job that has not closed,
  so the fold rests on disk state rather than a landed commit, and that job's touchdown is where
  the re-run rows will land.
- resolves: a4eedd015f83 -- considered and folded: third appearance of one item. Gap
  1988a4662809 carries it on the product-zone queue, and 3db6ddf8518c was folded into that same
  gap last cycle. Its new content is worth keeping and is recorded here: five to ten deliberate
  games with every replay retained to `03_train/output/reference/` and the no-cherry-picking
  protocol noted, because retention is what removes F004's selection ambiguity, F004 being the
  only finding resting on n=1.
- resolves: 82cd659c3289 -- considered and folded into this touchdown's product-zone gap, which
  names it by id; not graded, because pricing an afternoon of bootstrap scripting is AB's call.
- resolves: 508c6cbfabc4 -- considered and folded into this touchdown's product-zone gap, which
  names it by id and carries the diagnosis; not graded, and it needs a licensed build job to
  touch `docs/` in any case.
- resolves: d470bc09b68d -- considered and folded into this touchdown's product-zone gap, which
  names it by id; not graded.
- resolves: c93923790a14 -- considered and folded into this touchdown's product-zone gap, which
  names it by id, including the separate rules-v1.2 two-block-preview question, which is a rule
  change and therefore AB's alone under CLAUDE.md's guardrail; not graded.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
