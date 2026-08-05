---
schema: 2
actor: job
bee: nbs-wor-1.0-z
slug: drain-invalid-flag-item
job: 0002
date: 2026-08-05
model: claude-fable-5
effort: standard
---

## Aim
Drain the invalid-marked map-queue item 74a1adb95347, an authoring artefact of touchdown 0001,
so the seeded repo's queues stand empty and the deadman's map-queue clock has nothing to age.

## What it was told
No separate written order; this is the seeding job's own close discipline (bee nbs-wor-1.0-z,
same session as 0001): leave the queues clean where the evidence to close an item is already on
the record.

## What it did
No repo files changed beyond this touchdown. One Resolutions fact closes the queued item;
tests/build n/a.
Delegation: none

## Deliverables
- none

## How it went
Touchdown 0001's Map flags section carried closing prose ("No flag is warranted...") instead of
the parser's literal none-form, so the sweep conserved it as an invalid-marked map-queue entry
(norm B2: nothing silently dropped) rather than reading it as empty. The entry is not a flag:
it names no map, carries no Op/Old/New payload, and this repo has no maps at all. Resolution by
id is the licensed closure path for an invalid-marked flag ("minus those a later fact records
applied or rejected by id"). Lesson for future jobs, recorded here rather than proposed as a
norm: in structured sections the empty form is the literal word "none", optionally with a
trailing clause after a non-word character; prose that starts any other way is conserved as an
entry.
Grade: 5
Prompt quality: n/a -- no written order; the disposition and its evidence were fully determined
by the record.

## Correction passes
none

## Any errors
none

## Map flags
none -- no maps exist in this repo, and no map content changed.

## Gaps
none

## Resolutions
- resolves: 74a1adb95347 -- rejected, not a flag: the queued entry was touchdown 0001's Map
  flags closing prose, which named no map and carried no Op/Old/New payload; this repo carries
  no maps (`_orchestration/maps/` holds only its .gitkeep, as the generated snapshot records)
  and no map content changed in the seeding.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
none
