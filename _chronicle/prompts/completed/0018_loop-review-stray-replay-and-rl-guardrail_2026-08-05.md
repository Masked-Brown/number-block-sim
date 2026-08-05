---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-stray-replay-and-rl-guardrail
job: 0018
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's eleventh review cycle: judge the eight handed items, one gap and seven
proposals, from disk.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T15:04:53 carrying one
counted gap (0b7c9d5d941a) and seven proposals, with five gaps riding listed-not-counted, after
the long-running training job closed as touchdown 0017.

## What it did
No repository file was changed by the review. Evidence read: `nbs-replay-121496.json` (parsed,
metadata block and move list), `CLAUDE.md` line 105, the Gaps and Proposals sections of
touchdown 0017, `_orchestration/views/gap-queue.md` and `suggestions.md`, and
`classify_gap_route` run on the handed gap's stored first line and full text. Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
**0b7c9d5d941a, the stray replay at the repo root: rerouted to human-gated.** Every factual
claim in the gap checks out. `nbs-replay-121496.json` exists at the repo root, untracked, 5,938
bytes; parsed, it is `version: 2` with `meta.player: "human"`, `meta.result.score: 121496`,
`meta.result.blocksPlaced: 256`, `meta.result.maxTile: 4096`, a 256-entry `moves` list and
`durationMs: 536557`, which is the nine minutes the gap describes. So it is what it says it is,
it is load-bearing for finding F004, and it is one clean-up away from being lost.

I rerouted it to human-gated rather than resolving it. Nothing here is checkable-and-closable:
the item is a decision about where AB's own file should live, and norm B12 is explicit that a
stray file is AB's to name before any job may act on it. This overrides both the stored class
and the classifier's own reading, and I am recording that plainly: on its full text
`classify_gap_route` returns product-zone, not review-closable, so this is also the fourth
measured instance of the first-line routing defect, raised after I found it and independent of
me. Human-gated is the stricter and the more accurate gate, so the reroute goes there.

**3db6ddf8518c, commission the practised-human set: folded as a duplicate.** It is the same item
as gap 1988a4662809, which I rerouted to product-zone last cycle and which is already riding
AB's queue. The new evidence sharpens it considerably rather than changing it: one practised game
moved the human reference from 228 to 121,496, three orders of magnitude, which is exactly the
"is this a ceiling or a floor" question the gap was raised to ask. Folding removes a duplicate
surface, not the item; the gap stays live for AB with the sharper evidence recorded here.

**7752895c42d8, the ladder roadmap: declined on remit, with a canon correction.** The roadmap
itself is product research and not the review's to grade. But one clause in it is a claim about
canon, and that is the review's business. It reads: "and only then RL, because the flat feature
set is now good enough that a learned value function has a real baseline to beat, which is what
the CLAUDE.md guardrail was waiting for." `CLAUDE.md` line 105 states the guardrail as "No RL
training stack before a baseline agent exists and its ceiling is measured." That is a
conjunction of two conditions, and the same proposal states, in its own last sentence, "The
ceiling of the current champion is NOT measured; only its ladder position is." So the first
condition is met and the second is not, and the guardrail has not been satisfied. The proposal's
recommended ordering does not actually reach RL, so nothing done is wrong; what would be wrong
is a later job reading that clause as a licence. Recorded as a fact so it cannot be.

**b9cb78e8a0f8, expectimax-d3-v1 as Phase 4's move-grader: declined on remit.** A product design
decision for the publishing stage, with an integration argument the review cannot grade against
disk. Preserved verbatim in 0017's immutable record.

That is now the third and fourth product proposal I have had to decline on remit rather than on
merit across three cycles, which is the same structural point I raised as proposal 16420efdfb43:
gaps have route classes and proposals do not, so product research and loop-code fixes land in one
undifferentiated list and both fire the count threshold. Every one of those declines was forced
by the queue's shape rather than chosen on the item.

`16420efdfb43`, `3db578ec64e5`, `bdd032f8032b` and `fc6495704351` remain standing: this review's
own escalations, awaiting AB.
Grade: 4
Prompt quality: yes. The instruction to work facts before testimony is what turned the roadmap
proposal from something to wave through into a canon check: the observation core was a quotable
claim about a guardrail, and the guardrail's own text settled it in one line.

## Correction passes
My closing summaries for cycles nine and ten referred to the routing proposal as "5a01". No such
id exists; the proposal's real id is `16420efdfb43`, as stamped in
`_orchestration/views/suggestions.md`. The id was written from memory instead of read off the
view, which is precisely the failure this contract's "never from memory" rule exists to prevent,
and it would have sent the operator looking for an item that does not exist. The proposal itself,
its content and its standing are unaffected.

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- reroutes: 0b7c9d5d941a -> human-gated -- the item is a decision about where AB's own file should live, not a fact the review can check and close: norm B12 puts a stray file behind AB naming it before any job may act, so it belongs at the human gate; recorded openly, this overrides both the stored review-closable class and `classify_gap_route`'s own full-text reading of product-zone, which is itself the fourth measured instance of the first-line routing defect that proposal 16420efdfb43 addresses.
- resolves: 3db6ddf8518c -- considered and folded: duplicate of gap 1988a4662809, already riding
  product-zone on AB's queue after last cycle's reroute. The new evidence sharpens that gap
  rather than adding an item: one practised game moved the human reference from 228 to 121,496,
  three orders of magnitude, which is the ceiling-or-floor question the gap exists to ask.
  Verified against the replay itself: `nbs-replay-121496.json` parses as version 2,
  `meta.player: "human"`, `meta.result.score: 121496`, 256 moves, `durationMs: 536557`.
- resolves: 7752895c42d8 -- considered and declined on remit, with a canon correction recorded.
  The roadmap is product research the review cannot grade against disk. Its clause "which is
  what the CLAUDE.md guardrail was waiting for" is not correct: `CLAUDE.md` line 105 reads "No
  RL training stack before a baseline agent exists and its ceiling is measured", a conjunction,
  and the same proposal states "The ceiling of the current champion is NOT measured; only its
  ladder position is". The baseline condition is met, the ceiling condition is not, so the
  guardrail still bars an RL training stack. The proposal's own ordering does not reach RL, so
  no action taken was wrong; this is recorded so no later job reads that clause as a licence.
- resolves: b9cb78e8a0f8 -- considered and declined on remit, not on merit: a product design
  decision for the publishing stage whose integration argument the review cannot check against
  disk. Preserved verbatim in 0017's immutable record, where the job that owns Phase 4 will
  find it.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
