---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-inherited-note-strings
job: 0007
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's second review cycle: judge the one counted handed item, gap 613fdc78e8a2,
from disk.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T10:22:52 carrying one
counted item, `613fdc78e8a2`, with `348fc25403cd` riding listed-not-counted. The review fired on
the counted item only.

## What it did
No repository file was changed by the review. Evidence read: `_orchestration/loop/sweep.py`
(lines 139, 1423 to 1429, 1458 to 1466), all seven traces in `_chronicle/traces/`, the source
touchdown `0003_validate-icm-seeding_2026-08-05.md`, `_orchestration/CONTEXT.md`,
`_infrastructure/CHANGELOG.md`, `_orchestration/OPERATIONS_BEE.md`, and the five views.
Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
The gap is real, and the disk evidence sharpens it in one place and corrects it in another.

The claim, restated as its observation core: two note strings in the loop code assert history
this repo does not have. Both are in `sweep.py`. Line 1427 emits `canon file absent
(pre-migration state): %s` for any canon file that is missing, and
`_orchestration/ORCHESTRATOR_PROFILE.md` is in `CANON_FILES` (line 139) while being absent by
design. Line 1466 emits `deadman.last absent (the deadman has not yet run; scheduled at W4)`.

Confirmed against disk. The absence is deliberate, not a migration remnant:
`_orchestration/CONTEXT.md` line 7 states this repo carries no `ORCHESTRATOR_PROFILE.md`, and
`_infrastructure/CHANGELOG.md` line 45 records the seeding as deliberately carrying no
`ORCHESTRATOR_PROFILE.md` (two actors only). So the observation in the note is right and its
parenthetical cause is wrong for this venture. And there is no W4 here: outside the frozen
records and `sweep.py` itself, the only live mention is `_orchestration/OPERATIONS_BEE.md` line
215, which records that the migration-era "from W4" clauses were retired at seeding. That is
corroboration with an edge: the seeding already did this cleanup in the prose canon and did not
reach the loop code, which is exactly why the strings survived.

One correction to the raiser's account, from counting the traces rather than taking the
testimony. The gap says every trace so far carries both strings. Only the first is permanent:
`pre-migration state` appears once in each of all seven traces (09:41 through 10:35) and will
appear in every future trace while the profile stays absent by design. The `W4` string appears
in the first four only (09:41, 09:45, 09:48, 09:49) and stops from 10:17, because
`deadman.last` now exists; it can only return if that stamp is deleted. So line 1427 is a
standing misstatement on the operator's permanent record and line 1466 is a bounded one.

Disposition. There is no `gap-fact:` route (the target is loop code, not a CONTEXT.md) and no
verified-edit route (this repo has no semantic maps, and `map_hashes` is empty). I judged it
not rule-shaped: a norm candidate would need a check plus a demonstrated red case, and the
honest check here is a grep for one venture's leftover tokens, which is a seeding artefact
rather than a standing rule, and the guardrail in CLAUDE.md says hold the line until friction
earns a new mechanism. What remains is a `sweep.py` edit, and CLAUDE.md's work-order self-check
puts loop code behind three couplings (the design-pack companion, the DESIGN.md co-edit, the
CHANGELOG entry); the review proposes and does not self-apply. So the gap is closed here with
its evidence and re-raised as the proposal below, which carries the exact two-line change and
names the couplings, so it stands at the human gate on `suggestions.md` instead of cycling on
the gap queue.
Grade: 4
Prompt quality: yes. LOOP_PROMPT.md's retrieval policy is what produced the correction: reading
the traces as facts rather than accepting the raiser's "every trace" testimony split one item
into a permanent case and a bounded one.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- resolves: 613fdc78e8a2 -- verified real against disk and closed by re-raising at the human
  gate. Facts: `sweep.py` line 1427 emits "canon file absent (pre-migration state)" for
  `ORCHESTRATOR_PROFILE.md`, which `CANON_FILES` (line 139) lists and which is absent by design
  per `_orchestration/CONTEXT.md` line 7 and `_infrastructure/CHANGELOG.md` line 45, so it is in
  all seven traces to date and every future one; `sweep.py` line 1466 emits "scheduled at W4",
  a token with no live referent here beyond `_orchestration/OPERATIONS_BEE.md` line 215 recording
  those clauses retired at seeding, and it appears in the first four traces only, stopping once
  `deadman.last` existed. Route: no gap-fact target (loop code, not a CONTEXT.md), no map to
  carry a verified edit, and not rule-shaped enough for a norm candidate with a real red case;
  a `sweep.py` edit is human-gated under CLAUDE.md's three couplings, so it is raised as the
  proposal in this touchdown's Proposals section.

## Proposals
```
Retire the two inherited note strings in `sweep.py` so this venture's frozen records stop
asserting a history it does not have. Line 1427: replace "canon file absent (pre-migration
state): %s" with a cause-free form, for example "canon file absent: %s", which stays true both
for a genuine pre-migration repo and for a venture that never carried the file. Line 1466:
replace "deadman.last absent (the deadman has not yet run; scheduled at W4)" with
"deadman.last absent (the deadman has not yet run)". Both are operator-visible note strings,
not routing tokens, so no view, schema or verdict changes. Per CLAUDE.md's work-order
self-check a sweep.py change carries three couplings to settle before acting: the design-pack
(icm-final) companion, the DESIGN.md co-edit, and the CHANGELOG.md entry; the stated boundary
applies, so no LOOP_PROMPT.md edit is needed. Worth deciding at the same time whether the
change is made here only or upstream in the design pack so every future seeding inherits the
cause-free wording.
```

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
