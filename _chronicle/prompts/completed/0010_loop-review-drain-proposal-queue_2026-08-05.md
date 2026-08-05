---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-drain-proposal-queue
job: 0010
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's fourth review cycle: consider the five handed proposals, closing the three
that predate this window and leaving the review's own two standing at the human gate.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T11:12:06 carrying five
counted proposals (21c4a6c15e12, 3db578ec64e5, 84c1f269d82a, bdd032f8032b, c74b9bae73f8) with
four gaps riding listed-not-counted. The trigger was the proposal count crossing
`PROPOSAL_COUNT_TRIGGER` (sweep.py line 176, threshold 5).

## What it did
No repository file was changed by the review. Evidence read: the three source touchdowns 0001,
0003 and 0006, `_chronicle/prompts/CONTEXT.md` lines 14 to 24, `_infrastructure/NORMS.md` B12,
`_orchestration/loop/commit_safe.py` lines 25 and 444 to 448, `_orchestration/loop/sweep.py`
lines 176 to 177, 1850 to 1851 and 2138 to 2144, `commit_safe.py --help`,
`_orchestration/views/open-errors.md`, `_orchestration/CONTEXT.md` line 7 and the gap queue.
Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
Three closed on evidence, two left standing on principle.

**21c4a6c15e12, a `--no-push` flag: folded.** The factual base checks out independently.
`commit_safe.py` lines 444 to 448 skip the push only when `git remote` returns empty;
`sweep.py` lines 2139 to 2144 do the same inside the held lock; `commit_safe.py --help` shows no
push-related flag. So the proposal describes a real hole. It is folded rather than left standing
because it is the same item as open error da857d5416c4, which is live in
`_orchestration/views/open-errors.md` and whose body already carries this exact fix in its own
words ("A `--no-push` flag on both, recorded in the trace as a deliberate choice rather than as
a false 'no remote' note, would close this without weakening the race guarantee"). Nothing is
lost by closing the proposal, and the operator stops seeing one problem on two queues. The error
stays open and stays this cycle's NEEDS YOU line.

**84c1f269d82a, settle the quarantine self-clearance question: folded, superseded.** The
proposal asked AB to rule on whether a job may return its own just-quarantined touchdown to
`pending/`. AB has since ruled, and the ruling is on disk verbatim at
`_chronicle/prompts/CONTEXT.md` lines 21 to 24: a job may recover its own touchdown from
quarantine during its own close, before the job ends, with the round-trip recorded in the
touchdown; anything still in quarantine when a job ends is human-gated, no exceptions; and it
resolves the B6/B12 tension in favour of the recovery the seeding job made. Touchdown 0006
applied it and `_infrastructure/CHANGELOG.md` entry 0003 records it. The proposal asked for
exactly this and got it, so it closes as answered.

**c74b9bae73f8, port a sibling's ORCHESTRATOR_PROFILE.md: declined.** Declined on the guardrail,
not on the merit of the idea. Nothing on disk is blocked by the file's absence today: norm B7
and D85 tolerate the absent canon file, `_orchestration/CONTEXT.md` line 7 states plainly that
this repo carries none, and the sweep records it as a note rather than an anomaly. The one live
friction the proposal touches is `_chronicle/LOG_PROMPT.md` instructing a bee to record evidence
for a file with no home, and that is separately queued as gap 348fc25403cd, human-gated, where
it will stay until AB rules on it. So the port is a want rather than a fix, and CLAUDE.md's
guardrail says hold the line until real friction earns it. Declining does not bar AB from
ordering the port; the idea and this reasoning are preserved in this immutable record, and if
the LOG_PROMPT gap is settled by porting the file then the port arrives through that decision
rather than through an untethered proposal.

**3db578ec64e5 and bdd032f8032b: left standing, deliberately.** Both are this review's own
escalations from the last two cycles: retire the inherited note strings in sweep.py, and give
`docs/` a zone class. Each was raised precisely because its fix is canon or loop code and the
review never self-applies to the rulebook. Closing my own proposal would be the review grading
its own homework, and declining one would destroy work I judged necessary a cycle earlier. So
they stay on `suggestions.md` awaiting AB. This is a decision, not an oversight, and it is
recorded here so a later reader does not read the queue's two survivors as a drain that stalled.
The arithmetic is deliberate too: three closures take the count from five to two, below
`PROPOSAL_COUNT_TRIGGER`, so the queue quiets now, and `PROPOSAL_AGE_TRIGGER_DAYS` (sweep.py
line 177, seven days) will re-fire them if AB has not acted by 2026-08-12. That is the right
nag interval for two items sitting at a human gate.
Grade: 4
Prompt quality: yes. The work order's two closes, folded or declined with the reason, are what
forced the distinction between an idea that is answered (84c1f269d82a), one that is duplicated
on a louder queue (21c4a6c15e12) and one that has no live blocker (c74b9bae73f8). A single
"close" verb would have flattened all three into the same shrug.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- resolves: 21c4a6c15e12 -- considered and folded into open error da857d5416c4, which remains
  open and carries the same fix in its own body. Verified independently: `commit_safe.py` lines
  444 to 448 skip the push only on an empty `git remote`, `sweep.py` lines 2139 to 2144 do the
  same inside the lock, and `commit_safe.py --help` exposes no push-related flag, so the hole is
  real. Closing the proposal removes the duplicate surface, not the item.
- resolves: 84c1f269d82a -- considered and folded: superseded by AB's ruling of 2026-08-05,
  recorded verbatim at `_chronicle/prompts/CONTEXT.md` lines 21 to 24 (a job may recover its own
  touchdown from quarantine during its own close, with the round-trip recorded; anything still
  in quarantine when a job ends is human-gated, no exceptions; the B6/B12 tension resolved in
  favour of the seeding job's recovery), applied by touchdown 0006 and recorded in
  `_infrastructure/CHANGELOG.md` entry 0003. The proposal asked for a ruling and the ruling
  exists.
- resolves: c74b9bae73f8 -- considered and declined on CLAUDE.md's guardrail. Nothing on disk is
  blocked by the absence of `_orchestration/ORCHESTRATOR_PROFILE.md`: norm B7 and D85 tolerate
  the absent canon file, `_orchestration/CONTEXT.md` line 7 states this repo carries none, and
  the sweep records it as a note, not an anomaly. The one live friction it touches,
  `_chronicle/LOG_PROMPT.md` depending on the file, is separately queued as gap 348fc25403cd,
  human-gated. The port is a want rather than a fix; declining it does not bar AB from ordering
  one, and the reasoning is preserved here.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
