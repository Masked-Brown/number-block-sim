---
schema: 2
actor: review
bee: nbs-rev-1.0-loop-cycle
slug: loop-review-gap-routing-defect
job: 0016
date: 2026-08-05
model: claude-opus-5[1m]
effort: standard
---

## Aim
The standing window's eighth review cycle: judge the eight handed items, one gap and seven
proposals, and record the routing defect the gap exposed.

## What it was told
Read `_orchestration/LOOP_PROMPT.md` and follow it. The cycle found the deadman silent,
`last_verdict: review-warranted`, and the handoff recorded at 2026-08-05T13:09:40 carrying one
counted gap (1988a4662809) and seven proposals, with four gaps riding listed-not-counted.

## What it did
No repository file was changed by the review. Evidence read: `_orchestration/loop/sweep.py`
(lines 483 to 521, 826 to 844, 1016 to 1045, 1079, 1137), the Gaps section of every touchdown in
`completed/`, `03_train/lab/parallel.js` and its six call sites,
`03_train/lab/cli/throughput.js`, `03_train/lab/agents/`, `git status`, and, read-only,
`/c/Users/alexa/github_repos/domain-wisdom-agent/_orchestration/loop/commit_safe.py`.
`classify_gap_route` was run over every gap in the corpus, twice each, on the first line and on
the full text. Tests/build: n/a.
Delegation: none

## Deliverables
- none

## How it went
The handed gap turned out to be a symptom, and finding its cause was this cycle's real work.

**The routing defect.** `parse_gap_chunk` (sweep.py line 519 to 521) returns a `gap:` item as
`{"kind": "gap", "text": <the first line only>, "detail": <every following line>}`, and the gap
is then constructed at line 843 as `"reason": item["text"]`, so `detail` is parsed and dropped.
`classify_gap_route` is called at line 1079 on that reason, which means routing has only ever
seen the gap's first line. Any path token on a continuation line is invisible to it.

I measured this rather than argued it, by running the sweep's own classifier over all nine gaps
in the corpus, once on the stored first line and once on the full chunk. Three disagree, and
every one of the three is the same shape: `613fdc78e8a2` (first line review-closable, full text
human-gated), `61753e0b24a7` (review-closable, human-gated), `1988a4662809`, this cycle's item
(review-closable, product-zone). None disagrees in the other direction. That asymmetry is why
the defect has been invisible: it never lets an item escape the review, it only ever hands the
review work that belonged to a human or product gate. It is also the root cause of three cycles
of my own hand-corrections, including the reroute I wrote last cycle believing the bare-filename
wording was the whole story. It was half of it.

The fix is small and is proposed below rather than applied: `detail` is already parsed and only
needs carrying into the gap so routing sees the whole chunk. The views need no change, because
line 1137 already truncates the display to the first line independently.

**1988a4662809, the single human reference score.** Rerouted, not resolved. Its substance is a
research-design decision, commissioning deliberate human playthroughs before `04_publish` quotes
an AI-versus-human gap that currently rests on one game of 228 by an unpractised player. Its
full text routes product-zone on the sweep's own classifier; only the first-line truncation put
it on the counted queue. The reroute below therefore applies the classification the machinery
would have reached with the whole chunk, which is the honest use of the override.

**The proposals.** Four closed on evidence, one declined on remit, three left standing.

`3272f979a85e`, the worker_threads fan-out, is folded because it is built. `03_train/lab/
parallel.js` is a worker-pool fan-out over seeds, wired into six call sites including
`test/lab.test.js` and `train/cem.js`, and its header states the bit-identical-to-serial
property is asserted by the suite rather than assumed. Recorded honestly: this is uncommitted
in-flight work in a job that has not closed, so the fold rests on what is on disk now.

`bc4486a5bbdc`, timing claims need repeats, is folded because it is implemented:
`03_train/lab/cli/throughput.js` repeats each measurement and reports best, median and worst
(lines 65 to 79) with the reasoning in its own header. Its residue is an advisory that any job
quoting a performance number should do the same. I considered promoting that to a norm
candidate and rejected it: a candidate needs an executable check with a demonstrated red case,
and there is no mechanical way to detect a performance figure quoted without repeats, so it
would reach the gate incomplete and could not be promoted.

`df760cec0257`, porting the pick-number fix to domain-wisdom-agent, is declined for this queue
with its claim confirmed. Read-only, that repo's `commit_safe.py` has no `job_field_synced_text`
and its rename block at lines 419 to 422 prints the unpatched `picked touchdown number %04d
(%s)` with no frontmatter sync, exactly this repo's pre-fix code. So the latent trap is real and
verified. It is declined here only because it names an action in another repository that this
venture's machinery cannot perform, verify on an ongoing basis, or track to completion; the
confirmation is recorded here and in 0014 so AB can act with evidence, and the design pack is
the natural home the raiser already named.

`cbe86c22594f`, probing an agent weighted to bank quads, is declined on remit rather than on
merit. Its argument is sound on its own recorded evidence (a group of n merges to value times
2^(n-1), so a quad is four times a pair, and only the weak agents ever recorded merges of five
or more). But the review judges facts against disk and is not the grader of product research,
and a job is working that exact line right now: `agents/weighted.js`, `cli/breed.js`,
`train/cem.js` and `output/DECISION_LOG.md` are all on disk untracked. Its proper closer is that
job's touchdown, not this window's. The hypothesis is preserved verbatim in 0013's immutable
record and repeated here so declining it costs nothing.

That leaves the structural point, which I have folded into the proposal rather than raising
separately. Gaps have route classes and proposals do not, so a product-research idea and a
loop-code fix land in the same undifferentiated list and both fire the review's count threshold.
Three of the five proposals I have had to dispose of across two cycles were product-zone in
substance, and every disposition was forced by a queue shape rather than chosen.

`3db578ec64e5`, `bdd032f8032b` and `fc6495704351` remain standing: they are this review's own
escalations awaiting AB, unchanged from cycle four's reasoning.
Grade: 5
Prompt quality: yes. "Judge from disk, never from memory" is what produced the finding. I had
already written a reroute for this symptom once and believed I understood it; running the
classifier over the whole corpus is what showed the wording was only half the cause.

## Correction passes
Last cycle's reroute of fadcdf4fcb7a attributed the misrouting solely to the raiser naming
"BUILD.md" without a directory. That was incomplete, not wrong: the bare filename mattered, but
the first-line truncation recorded here is the underlying cause and would have misrouted a gap
whose continuation lines carried a full path. The reroute itself stands.

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- reroutes: 1988a4662809 -> product-zone -- the item is a research-design decision for AB (commissioning deliberate human playthroughs before 04_publish quotes an AI-versus-human gap resting on one unpractised game of 228), not a fact checkable against disk; `classify_gap_route` returns product-zone for its full text and review-closable for its stored first line, so this reroute applies the class the machinery would itself have reached had routing seen the whole chunk.
- resolves: 3272f979a85e -- considered and folded: built. `03_train/lab/parallel.js` implements
  the proposed worker_threads pool over seeds, wired into six call sites including
  `test/lab.test.js` and `train/cem.js`, with the bit-identical-to-serial property asserted by
  the suite. Recorded honestly: the files are uncommitted in-flight work at the time of this
  review, so the fold rests on disk state, not on a landed commit.
- resolves: bc4486a5bbdc -- considered and folded: implemented.
  `03_train/lab/cli/throughput.js` repeats each measurement and reports best, median and worst
  (lines 65 to 79). Its advisory residue was considered for promotion to a norm candidate and
  rejected: no executable check can detect a performance figure quoted without repeats, so a
  candidate would reach the human gate incomplete and could not be promoted.
- resolves: df760cec0257 -- considered and declined for this queue, claim confirmed. Read-only
  verification: `domain-wisdom-agent/_orchestration/loop/commit_safe.py` has no
  `job_field_synced_text` and its rename block at lines 419 to 422 prints the unpatched
  `picked touchdown number %04d (%s)` with no frontmatter sync, so the latent trap is real
  there. Declined only because it names an action in another repository that this venture's
  machinery cannot perform, verify continuously or track; the evidence is recorded for AB and
  the design pack is the home the raiser named.
- resolves: cbe86c22594f -- considered and declined on remit, not on merit. The argument is
  sound on its own evidence, but the review judges facts against disk and is not the grader of
  product research, and a job is on that line now (`03_train/lab/agents/weighted.js`,
  `cli/breed.js`, `train/cem.js`, `output/DECISION_LOG.md`, all on disk untracked). Its proper
  closer is that job's touchdown; the hypothesis stands verbatim in 0013's immutable record.

## Proposals
```
Route gaps on the whole chunk, not the first line, and give proposals route classes too.

The defect: `parse_gap_chunk` (sweep.py 519 to 521) returns a gap as `text` (the first line)
plus `detail` (every following line), the gap is built at line 843 as `"reason": item["text"]`,
and `detail` is dropped, so `classify_gap_route` at line 1079 has only ever seen the first line.
Measured over all nine gaps in the corpus, running the classifier on the stored first line and
on the full chunk, three disagree: 613fdc78e8a2 and 61753e0b24a7 (both review-closable stored,
human-gated on full text) and 1988a4662809 (review-closable stored, product-zone on full text).
None disagrees the other way, so the defect only ever hands the review work belonging to a human
or product gate, which is why it stayed invisible. The fix: carry `detail` into the gap and pass
`text` plus `detail` to `classify_gap_route`. The views need no change, because line 1137 already
truncates the display to the first line independently. This also removes the standing need for
the review to hand-reroute correctly-written gaps, which it has now done twice.

The second half, separable if AB prefers: proposals have no route classes at all, so a
product-zone research idea and a loop-code fix sit in the same undifferentiated list and both
count toward `PROPOSAL_COUNT_TRIGGER`. Gaps solved this with human-gated and product-zone riding
listed-not-counted; proposals could take the same treatment and the same reroute override.
Without it the review must either grade product research it is not competent to judge or leave
the queue over threshold, and three of the five proposals disposed of over the last two cycles
were product-zone in substance.

Couplings per CLAUDE.md's work-order self-check: loop code, so the design-pack (icm-final)
companion, the DESIGN.md co-edit and the CHANGELOG.md entry; no LOOP_PROMPT.md edit under the
stated boundary.
```

## _tmp outputs
- none

## Work order verbatim
```
Read _orchestration/LOOP_PROMPT.md and follow it
```
