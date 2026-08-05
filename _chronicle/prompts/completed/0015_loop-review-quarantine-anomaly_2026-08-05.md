---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-quarantine-anomaly
job: 0015
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's seventh review cycle: judge the one counted handed item, anomaly
2abb4dbf9f21, from disk, and verify the fix that was shipped for its cause.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T12:41:54 carrying one
counted item with five gaps riding listed-not-counted. The review fired on the counted item only.

## What it did
No repository file was changed by the review, and this touchdown is itself the test described
below. Evidence read: the traces from 12:09 to 13:04, `_orchestration/loop/commit_safe.py`
(lines 23, 291 to 326, 452 to 468), `_chronicle/prompts/quarantine/`,
`_chronicle/prompts/CONTEXT.md` lines 21 to 24, touchdown 0013's error entry and proposal, the
git log from fbc0d62 to 8d8e2ab, and `state.json`. Tests/build: n/a for the review; the fix
verification is described below.
Delegation: none

## Deliverables
- none

## How it went
The item is `quarantined: 0013_train-lab-and-baselines_2026-08-05.md (invalid vs td_v2)`, raised
by the 12:41 run. Confirmed as the handed item by recomputing the id: the sha1 of that exact
string, first twelve hex, is 2abb4dbf9f21, matching the handoff entry.

Everything about it is now closed on disk, and each step is licensed. The cause is recorded in
0013's own error entry: `CC_TOUCHDOWN.md`'s `NNNN` placeholder lives in two places, the filename
and the `job:` frontmatter field, and `--pick-number` used to fill only the filename, so the
sweep rejected the file with `frontmatter field job='NNNN' fails pattern ^\d{4}$`. The recovery
was permitted rather than improvised: AB's ruling at `_chronicle/prompts/CONTEXT.md` lines 21 to
24 lets a job recover its own touchdown from quarantine during its own close with the round-trip
recorded, which 0013 does at length, and it names that it touched no other quarantined file
(norm B12's hard boundary). `_chronicle/prompts/quarantine/` now holds only `.gitkeep`,
`quarantine_count` is 0, and 0013 sits in `completed/`, so the 12:43 run swept it clean.

The part worth the review's attention is that this was the second occurrence in one day, not the
first: 0013's entry names commit becac94 on touchdown 0011 as the same trap. A defect that
catches every job following the template literally is a standing trap, not an incident, and the
right question for a third party is not whether it was tidied up but whether it can still
happen.

It cannot, and I checked that by using the fix rather than by reading it. Job 0014 (commit
7aaa758) implemented option (a) from 0013's own proposal: `commit_safe.py` now computes the
synced text before any disk mutation (lines 294 to 326), refuses cleanly if the frontmatter is
malformed or has no `job:` field rather than half-renaming, replaces only the single `job:` line
inside the frontmatter block, and writes it under the lock immediately after the rename (lines
461 to 464), reporting `frontmatter job: field synced` in its output. Reading that is not proof.
So this touchdown was written with the literal `NNNN` left in BOTH the filename and the `job:`
frontmatter field, exactly as `CC_TOUCHDOWN.md` instructs and exactly as 0011 and 0013 did when
they were trapped. It is a live red case, and the record proves itself: if the `job:` field in
the committed copy of this file reads a four-digit number matching its filename, and this
touchdown reached `completed/` rather than `quarantine/`, then the trap is shut. My own previous
four closes dodged it by pre-computing the number by hand, which is precisely the workaround that
kept the defect invisible to me.
Grade: 5
Prompt quality: yes. "Check its evidence against disk" is what turned a tidied-up incident into
a question about whether the trap could still spring, and the answer was cheap to get by
following the template literally instead of working around it.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- resolves: anomaly:2abb4dbf9f21 -- closed on verified evidence. Identity: the sha1 of
  `quarantined: 0013_train-lab-and-baselines_2026-08-05.md (invalid vs td_v2)`, first twelve
  hex, is 2abb4dbf9f21. Cause: the `NNNN` placeholder sits in both the filename and the `job:`
  frontmatter field and `--pick-number` filled only the filename, so the sweep rejected it with
  `frontmatter field job='NNNN' fails pattern ^\d{4}$`; the same trap caught touchdown 0011
  earlier the same day (commit becac94). Recovery: licensed by AB's ruling at
  `_chronicle/prompts/CONTEXT.md` lines 21 to 24, round-trip recorded in 0013's error entry, no
  other quarantined file touched (norm B12); `_chronicle/prompts/quarantine/` now holds only
  `.gitkeep`, `quarantine_count` is 0, and 0013 is in `completed/`. Root cause: closed by job
  0014 (commit 7aaa758), `commit_safe.py` lines 294 to 326 and 461 to 464, which syncs the
  frontmatter `job:` field to the picked number under the lock, computing the text before any
  mutation and refusing cleanly on malformed frontmatter. Verified live rather than by reading:
  this touchdown was written with the literal `NNNN` in both places as a red case.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
