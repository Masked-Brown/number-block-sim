---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-reroute-tuning-gap
job: 0012
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's fifth review cycle: judge the two counted handed items, gap fadcdf4fcb7a
and the re-fired anomaly b02aa576bce9, from disk.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T11:48:04 carrying two
counted items with four gaps riding listed-not-counted. The review fired on the two counted
items only.

## What it did
No repository file was changed by the review. Evidence read: `_orchestration/loop/sweep.py`
(lines 190 to 196, 547 to 579, 848 to 856, 1016 to 1045, 1056 to 1062, 1235 to 1252, 1378 to
1386, 1841 to 1843, 2090), `_infrastructure/DESIGN.md` line 157, the source touchdown 0011,
`02_build/output/BUILD.md`'s location, `_prime/PRIME_bee.md`'s stamp, `state.json` and the
11:48 trace. Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
One item was misrouted rather than mine to close, and one is the same anomaly I closed last
cycle, which is itself the finding.

**fadcdf4fcb7a, the unattended-play tuning observation: rerouted, not resolved.** The substance
is a product question. Job 0011 recorded that centre-column stacking with no steering
self-scores into the thousands under the launch spawn parameters, stated explicitly that it is
not a defect against RULES.md v1.1 and not that job's call to retune, and queued it for AB's
fine-tuning pass. Nothing in it is review-closable: there is no fact to check against disk that
would close it, only a tuning decision that belongs to AB with the config tunables built for it.

Why it landed on the counted queue is mechanical and worth recording, because it will recur. The
gap names its evidence as "BUILD.md" with no directory. `classify_gap_route` (sweep.py 1019 to
1045) derives path tokens from the reason text and matches the first path segment against
`PRODUCT_ZONE_RE`; a bare filename has no directory segment to match, so it falls through to
`review-closable`, the safe default. The file is actually `02_build/output/BUILD.md`, squarely
product zone, and the tunables the observation points at are in `docs/js/config.js`. Had either
path been written in full the router would have classified it correctly, or would have if
`docs/` were classified at all, which is proposal 3db578ec64e5 still at the gate.

So the right instrument is the reroute, not a resolution: sweep.py lines 190 to 196 and
DESIGN.md line 157 give the review exactly this override, a `reroutes:` fact whose reasoning is
required (an unreasoned one is not honoured, sweep.py line 570) and is rendered in the queue
entry, never silent. Rerouted to product-zone below. It then rides listed-not-counted for AB's
tuning pass, with the deadman's gap-queue clock running on it, which is the correct home for a
backlog only AB can drain.

**b02aa576bce9, PRIME_bee.md stale: re-fired, and I am changing the disposition.** Last cycle I
closed this as benign and self-clearing and wrote, deliberately, that if it became noise the
honest change would be the wording rather than the check. It became noise within one cycle: job
0011 moved CLAUDE.md from dfaf4fa9 to d1e49d3b and the 11:48 run raised the identical anomaly
with the identical id. My prediction was tested and confirmed, so acting on my own stated
criterion is what this cycle owes.

The mechanical reason the closure did not hold is precise and worth having on the record. Line
1841 to 1843 builds the handoff's anomaly items as `anomaly:<sha1 of the anomaly string>`
straight from the run's freshly computed anomaly list, with no `resolved_ids` filtering; unlike
errors, gaps, proposals, flags and candidates, anomalies are recomputed every run and are never
filtered by a resolution. So a resolution fact naming an anomaly id records the judgement in the
corpus and cannot suppress the next occurrence. Closing it again identically would be the loop
grinding rather than converging.

The change I am proposing is narrow on purpose. `check_stamped_file` (1235 to 1252) raises three
distinct things: `unstamped-generated-file`, `hand-edit-detected`, and `stale-generated-file` in
two forms, a missing source and a changed source. Only the changed-source form on the prime
bundle is structurally unactionable, because the sweep reassembles the bundle at line 2090 at
the end of the same run that reported it. It is also effectively prime-only in practice: the
views are stamped with `corpus:` and `self:` and carry no `sources:` list, so the sources branch
has nothing to compare for them. And it does not need a safety net invented for it, because a
failed reassembly already raises `prime-regeneration-failed` at line 2093. So the honest change
is to demote that one form on that one file to a note, leaving every other form an anomaly.
Raised as a proposal, not applied: it is loop code, human-gated under CLAUDE.md's three
couplings.
Grade: 4
Prompt quality: yes. The instruction to judge from disk rather than from memory is what caught
this: I had a closed item in my own record and the disk said it had re-fired.

## Correction passes
Changed the disposition of anomaly b02aa576bce9 from last cycle's close-without-proposal to a
close-with-proposal, on the evidence of its recurrence at 11:48. The earlier judgement is not
withdrawn: it was correct on the evidence then available, and it named the condition under which
it would need revisiting.

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- reroutes: fadcdf4fcb7a -> product-zone -- the observation is a tuning decision for AB, not a fact checkable against disk: its evidence is `02_build/output/BUILD.md` and the tunables in `docs/js/config.js`, both product zone, and the raising job stated it is not a defect against RULES.md v1.1 and not its call to retune; it routed review-closable only because the reason names "BUILD.md" bare, giving `classify_gap_route` no directory segment to match against PRODUCT_ZONE_RE.
- resolves: anomaly:b02aa576bce9 -- re-fired at 11:48 after job 0011 moved CLAUDE.md from
  dfaf4fa9 to d1e49d3b, confirming last cycle's prediction that it fires once per canon-editing
  job. Verified mechanically: sweep.py lines 1841 to 1843 build the handoff's anomaly items from
  the run's freshly computed anomaly list with no `resolved_ids` filtering, so anomalies, unlike
  every other routed item, are recomputed each run and a resolution by id cannot suppress the
  next occurrence. The underlying condition remains benign and self-clearing; the disposition
  changes only in that the wording fix is now proposed rather than deferred.

## Proposals
```
Demote one anomaly form to a note: `stale-generated-file: PRIME_bee.md was assembled before
<source> changed` (sweep.py line 1252, reached from the check at line 1382). It is
structurally unactionable, because the sweep reassembles the bundle at line 2090 at the end of
the very run that reports it, so the condition is always already repaired by the time anyone
reads the trace; and it fires once per canon-editing job, which makes it a standing false
alarm on the review's counted queue rather than a signal. Keep everything else in
`check_stamped_file` as an anomaly: `unstamped-generated-file`, `hand-edit-detected`, and the
missing-source form of `stale-generated-file`, which are all real and none of them
self-repairing. No safety net needs inventing, because a failed reassembly already raises
`prime-regeneration-failed` at line 2093. Scope is narrow in practice as well as in intent:
the views are stamped with `corpus:` and `self:` and carry no `sources:` list, so the
changed-source branch has nothing to compare for them and the prime bundle is the only file
this affects. The staleness window itself is real and stays worth reporting, which is why this
is a demotion to a note rather than a deletion of the check. Couplings per CLAUDE.md's
work-order self-check: loop code, so the design-pack (icm-final) companion, the DESIGN.md
co-edit and the CHANGELOG.md entry; no LOOP_PROMPT.md edit under the stated boundary.
```

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
