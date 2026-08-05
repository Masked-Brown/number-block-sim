# _FINDINGS.md -- the verdict register

The distilled current belief about optimal play: one finding per durable belief the experiment
currently holds. This is the one analysis-layer file `04_publish/` reads; raw evidence stays in
`runs/`. The pattern is youtube-pov's analysis-funnel register, carried at seeding.

## How this works

**This is a current-state register, not a log.** When a later run sharpens or kills a belief,
edit the entry in place; never append a duplicate entry for the same belief. Findings enter only
by AB-gated promotion from a run's "Findings for the register" draft section (the funnel rules
live in `03_train/CONTEXT.md`); a CC job never writes here from a run job. IDs are `F001`
onward, assigned at promotion, never reused. Confidence ladder: suggestive, supported, strong,
refuted; never "proven" at simulation sample sizes. Disposition values: feeds-publish (the
write-up uses it), rules-question (it exposes a gap or ambiguity for `01_rules/`), parked,
refuted.

Each finding carries six fields: **Claim** (one sentence), **Mechanism** (why it works, best
current explanation), **Confidence and falsifier** (the ladder value, and what result would
kill it), **Evidence** (the run-ids and summary docs behind it; enrichment paragraphs appended
inside the field on later waves), **Action** (concrete enough to go straight into the write-up
or the next run design), **Disposition and dates**
(`<disposition> | first logged: <date> | last updated: <date>`).

## Summary

| ID | Claim | Confidence | Disposition |
|---|---|---|---|
| - | none yet | - | - |

## Findings

No findings yet. The register starts empty at seeding and grows only by promotion; the first
entry lands when AB accepts a finding from the first real simulation runs.
