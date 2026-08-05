# LOOP_PROMPT.md -- the standing window's operating contract

Paste into the standing Claude Code window: "read `_orchestration/LOOP_PROMPT.md`, run every
~30 minutes". This file is that window's single operational contract: the cycle sequence,
with the review's standing work order folded in whole. It instructs; it does not describe.
What the sweep and the deadman do internally is their code and docstrings
(`_orchestration/loop/sweep.py`, `_orchestration/loop/deadman.py`); point there for
mechanics and expect no prose copy here.

British English, no em-dashes, no exclamation marks. Hand-authored canon: changes are
human-gated, with a CHANGELOG entry in the same change (norm B7).

---

## The cycle (every ~30 minutes)

1. **Run the deadman**: `python _orchestration/loop/deadman.py`. Silent means healthy. Any
   nag line it prints goes on this cycle's desk summary; the standing record is
   `_orchestration/loop/ALARMS.md`, where AB answers a breach with a dated line containing
   `answered <id>`.
2. **Evaluate whether a review is warranted**, from the record, never from memory:
   - the last sweep's verdict and handoff marker in `_orchestration/loop/state.json`;
   - the queues: `_orchestration/views/map-queue.md` and `gap-queue.md`, plus the stamp
     lines of `open-errors.md`, `suggestions.md` and `promotions.md`;
   - a direct ask from AB is always a reason (a sweep run with `--ask "<question>"` records
     one).
   The verdict is a recording, not a firing: nothing has fired until this window acts.
3. **If warranted, run the review now, in this window**, on the handed items only. Build the
   handoff first and work from it:

   ```
   REVIEW HANDOFF <iso-time>
   trigger: <which review-facing verdict lines fired>
   items:
     - <view>: <specific entries, by id>
   scope: only the items above. Do not review anything else.
   read first: _orchestration/LOOP_PROMPT.md
   ```

4. **Post the desk summary**: the one human queue. Nothing else pings AB; the views are
   pulled on demand and STATUS.md is the machine heartbeat. The summary's format is a
   REQUIREMENT: the closing summary is exactly this block, in this order, one line per
   field, each filled from disk:

   ```
   LOOP CYCLE SUMMARY — <YYYY-MM-DD hh:mm>
   NEEDS YOU: <the single most important thing actually waiting on the operator this cycle, in one line, or "nothing">
   Verdict: <clean | review-warranted> — handoff <cleared | N items outstanding>
   Deadman: <silent | "<the one-line nag>" — <benign, cleared | NEEDS ACTION: <what>>>
   Reviewed: <each handed item, one line with its disposition | nothing handed this cycle>
   At the gate: <each ageing promotion candidate: <id>, <days left> | none>
   Open errors: <count | none>
   Counts: touchdowns <N> · pending <N> · quarantine <N>
   Detail: trace <path to this cycle's trace>
   ```

   - `NEEDS YOU` leads, and is the operator's one-glance line: it names the single thing to
     act on (an ageing candidate near breach, a NEEDS-ACTION deadman breach, an unresolved
     error), or "nothing" on a clean day. If several things wait, name the most urgent and
     let the lines below carry the rest.
   - Every field is filled from disk (state.json, the deadman run, the views, the snapshot,
     the trace path), never from memory, consistent with the rest of this contract. The
     At-the-gate candidates come from `_orchestration/views/promotions.md`, including
     approved-unapplied, and stay on the summary until acted on.
   - The order and the field labels are fixed, so every cycle prints an identical shape and
     the operator learns where to look. The review may not add or reorder fields; a field
     with nothing to report prints its stated empty value ("none" / "nothing" / "silent"),
     never omits its line.
   - This fixes only the summary's format. The cycle sequence above (deadman, then review
     when warranted, then summary) and the review's standing work order below are unchanged.

Between cycles AB may run anything by hand at any time; every sweep run is idempotent and a
manual run is always safe. The window commits nothing of its own outside the review's
closing act below.

---

## The review's standing work order

The review is a third party and judges from disk: fresh context, no stake in the work it
grades. It reads the facts off disk and checks them against disk; it never inherits the
worker's account of the work.

- Act only on the review-facing items in the handoff, by id. Never "review everything".
  Quarantine is not yours to clear; it is human-facing.
- Work the retrieval policy: facts before testimony. An error entry's observation core (the
  message, the exit code, the path:line) is the fact; the causal reading is testimony, and
  testimony and proposals are pulled only on explicit query.
- To resolve an open error: check its evidence against disk, then record a resolution fact
  naming the error's id (`resolves: <id>`) in your touchdown.
- To verify a map flag: check the anchor and the claimed fact against disk, then write the
  verified edit as a fact in your touchdown's Verified edits section, naming the flag id it
  closes. The sweep applies it under the lock. You never edit a map, a view, or any other
  file directly.
- To reconcile a queued gap: what you can evidence becomes a `gap-fact:` or a verified
  edit; what is rule-shaped becomes a norm candidate.
- A norm candidate always carries its check AND a demonstrated red case, the check shown
  failing on a constructed violation. Without both it does not reach the human gate.
- To close a proposal: considered-and-folded, or considered-and-declined with the reason,
  as a resolution fact naming the proposal id.
- Run on an Opus-class model, never the cheap one.

---

## The output discipline

The review ends like any job: it writes an ordinary touchdown (frontmatter `actor: review`,
template `_orchestration/CC_TOUCHDOWN.md`) into `_chronicle/prompts/pending/` and runs the
sweep in this window, on the default branch: `python _orchestration/loop/sweep.py --apply`.
Its facts flow back through the sweep like anyone else's, and the sweep that processes them
clears the handoff marker and recomputes the verdict on the new state.

Canon changes stop at the human gate: NORMS.md, CLAUDE.md, the operating contracts, this
file, the touchdown template and the schema files change only by deliberate, human-gated act
with a CHANGELOG entry. The review proposes; it never self-applies to the rulebook.

The sweep adds no judgement, whoever calls it (the standing rule carried from the old loop):
everything interpretive is decided by the actor writing the touchdown, and the sweep applies
exact-anchor ops and refuses everything else. Do not interpret a touchdown around it.

---

## Changelog

2026-08-05 -- seeded into number-block-sim verbatim from domain-wisdom-agent's proven copy (the
operative body byte-identical across the estate; only this changelog is fresh). The dash glyphs
inside the LOOP CYCLE SUMMARY block are part of the fixed format and are preserved verbatim
against the house style.
