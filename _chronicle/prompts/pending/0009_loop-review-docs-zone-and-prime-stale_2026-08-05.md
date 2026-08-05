---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-docs-zone-and-prime-stale
job: 0009
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's third review cycle: judge the two counted handed items, gap 61753e0b24a7
and anomaly b02aa576bce9, from disk.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T11:06:31 carrying two
counted items with four riding listed-not-counted (348fc25403cd human-gated, 49b8a47fb286,
c87be31d365e and db7c19040554 product-zone). The review fired on the two counted items only.

## What it did
No repository file was changed by the review. Evidence read: `_orchestration/loop/sweep.py`
(lines 200, 1016 to 1045, 1235 to 1252, 1382, 2090), `CLAUDE.md` (zone section and line 104),
`_orchestration/CC_OPERATIONS.md` line 55, `_infrastructure/DESIGN.md` line 437,
`_infrastructure/CHANGELOG.md` entry 0004, `docs/`, `_prime/PRIME_bee.md`'s stamp,
`_orchestration/loop/state.json`, the source touchdown 0008 and the traces from 10:35 to 11:06.
`classify_gap_route` was called directly on constructed path tokens to establish the routing
contrast. Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
Both items are real. One needs AB, the other needed only counting.

**61753e0b24a7, docs/ has no zone classification.** Confirmed and sharper than raised. `docs/`
exists and holds the shipped game (index.html, cinema.html, css/, js/, test/, test.html,
package.json). Its arrival is properly recorded: `_infrastructure/DESIGN.md` line 437 and
`_infrastructure/CHANGELOG.md` entry 0004 both state the code's home is `docs/` as a declared
divergence. What is missing is the zone class. `CLAUDE.md`'s "Zones and edit rules" section
names the product zone as `01_rules/` to `04_publish/` plus `_config/` and does not mention
`docs/`; `_orchestration/CC_OPERATIONS.md` line 55 carries the same set; `CLAUDE.md`'s only
mention of `docs/` is line 104, in the guardrail, where it is the deployment surface rather
than a zone. And `sweep.py` line 200 sets `PRODUCT_ZONE_RE = ^(?:0[1-4]_|_config$)`, which does
not match `docs`.

The consequence is mechanical and I measured it rather than reasoned about it. Calling
`classify_gap_route` directly: a reason naming `_config/CONTEXT.md` returns `product-zone`, one
naming `01_rules/CONTEXT.md` returns `product-zone`, one naming `docs/js/config.js` returns
`review-closable`. So every future gap about a file under `docs/` lands on the standing review's
counted queue, which is the loop being handed product work the loop is explicitly not to touch.
The live queue shows the same split today: the sibling gap 49b8a47fb286 about `_config/` sits
listed-not-counted while this one about `docs/` sits counted. The gap is its own first instance.

Disposition: the fix is a canon edit (the zone index in CLAUDE.md and CC_OPERATIONS.md) plus a
loop-code edit (`PRODUCT_ZONE_RE`), which the raiser already called AB's call and which
CLAUDE.md's work-order self-check puts behind three couplings. The review proposes and never
self-applies to the rulebook, so it is closed here with its evidence and re-raised as the
proposal below. I considered the norm-candidate route and rejected it for a specific reason: a
candidate must carry an executable check, and any check here has to assert what class `docs/`
belongs to, which is exactly the question standing at AB's gate. A check written now would
prejudge the decision it is meant to enforce.

**b02aa576bce9, PRIME_bee.md stale.** Real, benign, and already self-cleared. The mechanism is
plain in the code: `check_stamped_file` (sweep.py 1235 to 1252) compares each source hash
recorded in the generated file's stamp against that source's current hash, and `sweep.py` calls
it on the prime bundle at line 1382, in the scan phase, while the bundle is reassembled at line
2090 at run end. Within a single run the check therefore always reads the pre-reassembly stamp,
so any canon edit since the previous sweep is reported by the very run that repairs it.

The record bears that out exactly. It fired at 10:35 when job 0006 moved CLAUDE.md from
513bc367 to d07a39da, was absent at 10:39 (that run reported anomalies=0, verdict clean), and
fired again at 11:06 when job 0008 moved CLAUDE.md to dfaf4fa9. The id is identical both times
because the anomaly string is identical, which is why it appears twice in `trigger_history`. On
disk now, the stamp records `CLAUDE.md@dfaf4fa9` and `state.json`'s `canon_hashes` records
`dfaf4fa9`, so the bundle is current and the anomaly cannot fire again without a fresh canon
edit.

I am closing it without proposing a code change, deliberately. The underlying window is real: a
bee spawned between a canon-editing job and the next sweep would be pasted a stale bundle, and
that is worth reporting. Suppressing the anomaly when the same run regenerates the prime would
silence a true signal to make a trace look tidier. If it becomes noise, and it will fire once
per canon-editing job, the honest change is the wording rather than the check.
Grade: 4
Prompt quality: yes. Calling the sweep's own classifier on constructed tokens is what turned
the docs/ item from a plausible reading into a measured one, and the retrieval policy is what
kept the prime anomaly from being written up as a defect.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- resolves: 61753e0b24a7 -- verified real against disk and closed by re-raising at the human
  gate. Facts: `docs/` exists and holds the shipped game; `_infrastructure/DESIGN.md` line 437
  and `_infrastructure/CHANGELOG.md` entry 0004 record it as the code's home by declared
  divergence; `CLAUDE.md`'s zone section and `_orchestration/CC_OPERATIONS.md` line 55 both name
  the product zone as 01_rules to 04_publish plus _config with no `docs/`; `sweep.py` line 200
  sets `PRODUCT_ZONE_RE = ^(?:0[1-4]_|_config$)`, which does not match `docs`. Measured
  consequence: `classify_gap_route` returns `product-zone` for `_config/CONTEXT.md` and
  `01_rules/CONTEXT.md` and `review-closable` for `docs/js/config.js`, so gaps about `docs/`
  land on the review's counted queue, this item being the first instance. Route: canon plus
  loop code, human-gated under CLAUDE.md's three couplings, raised as the proposal in this
  touchdown; the norm-candidate route was considered and rejected because any check would have
  to assert the class AB has not yet chosen.
- resolves: anomaly:b02aa576bce9 -- benign and already self-cleared, verified against disk.
  `check_stamped_file` (sweep.py 1235 to 1252) is called on the prime bundle at line 1382 in the
  scan phase while the bundle is reassembled at line 2090 at run end, so a canon edit since the
  previous sweep is always reported by the run that repairs it. Record: fired 10:35 (CLAUDE.md
  513bc367 to d07a39da), absent 10:39 (anomalies=0, verdict clean), fired 11:06 (to dfaf4fa9),
  same id both times because the string is identical. On disk now the stamp records
  `CLAUDE.md@dfaf4fa9` and matches `state.json`'s `canon_hashes`, so it cannot fire again
  without a fresh canon edit. No code change proposed: the staleness window it reports is real.

## Proposals
```
Give `docs/` a zone class, then make the loop agree with it. `docs/` is now a live directory
that jobs edit, and it is classified nowhere: `CLAUDE.md`'s "Zones and edit rules" section and
`_orchestration/CC_OPERATIONS.md` line 55 both stop at 01_rules to 04_publish plus `_config`,
and `sweep.py` line 200's `PRODUCT_ZONE_RE = ^(?:0[1-4]_|_config$)` matches the same set. The
natural reading, and the one the raising job proposed, is that `docs/` is product zone: product
jobs edit it, the loop never touches it. If AB agrees, the change is three edits that must move
together, since the prose index and the regex are the same rule stated twice: name `docs/` in
CLAUDE.md's zone section, name it in CC_OPERATIONS.md line 55, and extend PRODUCT_ZONE_RE to
`^(?:0[1-4]_|_config$|docs$)`. Couplings per CLAUDE.md's work-order self-check: this touches
canon and loop code, so it needs the design-pack (icm-final) companion, the DESIGN.md co-edit
and the CHANGELOG.md entry; no LOOP_PROMPT.md edit is required under the stated boundary. Until
it lands, every gap raised about a file under `docs/` routes review-closable and is handed to
the loop, which is the one actor that must not act on product work.
```

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
