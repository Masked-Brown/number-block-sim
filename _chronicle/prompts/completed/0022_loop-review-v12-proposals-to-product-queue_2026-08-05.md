---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-v12-proposals-to-product-queue
job: 0022
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's eighteenth review cycle: consider the eight handed proposals, four of them
new from the remediation job, and test the one that is rule-shaped against the norm-candidate bar.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T18:05:40 carrying eight
proposals under the count threshold alone, with seven gaps riding listed-not-counted and none
counted.

## What it did
No repository file was changed by the review. Evidence read: touchdown 0021's Proposals section
and its Resolutions line for 8574e31e5271, `_orchestration/views/suggestions.md` and
`gap-queue.md`, `03_train/lab/manifest.js`, `docs/js/grader.js`, `03_train/lab/test/lab.test.js`,
and `classify_gap_route` on this touchdown's gap first line before writing it. Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
The method I adopted last cycle was tested by events and held, which is worth recording before
anything else. Gap 8574e31e5271, the product-zone gap I raised to carry four audit work items by
id, was picked up and resolved by job 0021 within two hours, naming the id in its own Resolutions
(line 236). Two of the four items it carried were done in that job. So routing product items onto
the queue that has a class for them, rather than declining them for want of one, put them in
front of the actor who could act and they were acted on. The same treatment applies here.

Of the four new proposals, three are straightforwardly product work and go the same way.
`baec358c7f95` asks `buildManifest` to record which paths were dirty rather than a bare
`workingTreeDirty` boolean; the function lives in `03_train/lab/manifest.js`, used by `runner.js`
and `parallel.js`, and the point is a real provenance weakness, a reader of a headline row cannot
tell a spawn-parameter change from a comment. `37c7ab70822c` asks for a `lab/cli/grade-replay.js`,
and its supporting claim checks out: `docs/js/grader.js` exists as the browser grader and nothing
in the lab can grade a human replay at all. `88ac005c1217` asks for an AB promotion pass on two
candidate findings, which is AB's call by definition. None of the three is graded here; pricing
an hour of tooling against a promotion pass is not the review's judgement to make.

`e010125e5e29` is the one that needed a real test, because it is rule-shaped and the work order
says rule-shaped becomes a norm candidate. It proposes a standing convention that any
browser-side mirror of a lab agent must be named in the lab suite. The situation it describes is
real: `docs/js/grader.js` is a browser-side mirror, and it is safe only because
`03_train/lab/test/lab.test.js` imports it and fails on a disagreed column.

It does not clear the candidate bar, and the reason is worth stating precisely rather than
waving at. A candidate must carry an executable check and a demonstrated red case, the check
shown failing on a constructed violation. The check here would have to recognise that some new
file is a mirror of a lab agent, and that is a semantic judgement, not a mechanical one: nothing
in a hypothetical `docs/js/hint.js` marks it as mirroring an agent rather than merely using the
engine. A check narrow enough to be mechanical, say that `docs/js/grader.js` must be imported by
a lab test, protects only the mirror that already exists, which is the one case the convention is
not needed for. So there is no check that can be shown failing on a constructed violation, and a
candidate would reach the human gate incomplete and could not be promoted. The proposal's own
preferred form, a one-line rule in `03_train/CONTEXT.md`, is a product-zone documentation edit,
so it folds with the other three.

That is the second time the candidate bar has correctly turned something away for the same
reason, after `bc4486a5bbdc`. The pattern is worth naming: the advisory items this venture throws
up are about judgement rather than mechanism, and the check-plus-red-case requirement is doing
exactly its job by keeping them out of NORMS.md and leaving them as prose where they belong.

`16420efdfb43`, `3db578ec64e5`, `bdd032f8032b` and `fc6495704351` remain standing, unchanged, and
are now the only things on any queue that the review cannot move.
Grade: 4
Prompt quality: yes. The norm-candidate clause, check AND demonstrated red case, is what made
e010125e5e29 a decidable question instead of a matter of taste.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
gap: 03_train/ and docs/ carry four work items the remediation job raised as proposals, folded
here so they ride the product queue rather than the review's. By their original proposal ids:
baec358c7f95, make `buildManifest` in `03_train/lab/manifest.js` record which paths were dirty
rather than a bare `workingTreeDirty` boolean, since it already computes the porcelain listing
and a bare flag cannot distinguish a spawn-parameter change from a comment. 37c7ab70822c, add a
`lab/cli/grade-replay.js` that grades any replay against any named agent, which would price the
browser grader's depth-2 compromise against depth 3, give the human study its analysis tool and
provide a third independent check on `docs/js/grader.js`; nothing in the lab can grade a human
game today. 88ac005c1217, an AB promotion pass on the two candidate findings drafted in
`03_train/output/runs/2026-08-05_leak-free-ladder/SUMMARY.md`, that most of the depth ladder's
spread is survival rather than scoring rate, and that a plausible information leak changed 7.8
per cent of decisions with no measurable score. e010125e5e29, a standing convention that any
browser-side mirror of a lab agent must be named in the lab suite, in its own proposed form of a
one-line rule in `03_train/CONTEXT.md`; the norm-candidate route was tested and rejected, see this
touchdown's Resolutions. Each is stated in full in touchdown 0021; this gap carries the routing,
not a restatement, and none is graded here because pricing them is AB's call.

## Resolutions
- resolves: baec358c7f95 -- considered and folded into this touchdown's product-zone gap, which
  names it by id. Verified: `buildManifest` lives in `03_train/lab/manifest.js` and is used by
  `runner.js` and `parallel.js`, so the target is real and in the product zone. Not graded.
- resolves: 37c7ab70822c -- considered and folded into this touchdown's product-zone gap, which
  names it by id. Verified: `docs/js/grader.js` exists as the browser-side grader and no lab CLI
  grades a replay, so the stated absence is real. Not graded.
- resolves: 88ac005c1217 -- considered and folded into this touchdown's product-zone gap, which
  names it by id. It asks for an AB promotion pass on two candidate findings, which is AB's call
  by definition and not a fact the review can check closed.
- resolves: e010125e5e29 -- considered, tested against the norm-candidate bar, rejected as a
  candidate, and folded into this touchdown's product-zone gap. The situation is real:
  `docs/js/grader.js` is a browser-side mirror and is safe only because
  `03_train/lab/test/lab.test.js` imports it. But a candidate needs an executable check with a
  demonstrated red case, and recognising that a new file mirrors a lab agent is semantic, not
  mechanical; the only mechanical form, requiring `docs/js/grader.js` to be imported by a lab
  test, protects solely the mirror that already exists, which is the case the convention is not
  needed for. No check can be shown failing on a constructed violation, so it could not be
  promoted. Its own preferred form, a one-line rule in `03_train/CONTEXT.md`, is a product-zone
  edit.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
