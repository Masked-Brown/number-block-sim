# TEST_MODE.md - the diagnostic verbosity flag

An operations reference. It defines what `test mode = true` means when a work order sets it, and what
the job must do in response. It is a convention, not a canon-hashed contract; the binding job contract
is `_orchestration/CC_OPERATIONS.md`, which points here. British English, no em-dashes, no exclamation
marks.

---

## What test mode is

A per-job diagnostic switch. When a work order sets `test mode = true` at the top, the job runs
exactly as it normally would AND writes a rich diagnostic journal to `_chronicle/mode-test/`. It
exists so that during a testing phase (or any future debugging) you can see, in detail, what a job
and the loop actually did, without loading that detail into the permanent record.

Default is **off**. A job with no test-mode line, or `test mode = false`, does nothing extra.

## The one rule that must never break

**Test mode is additive. It never replaces the normal close.** A test-mode job still commits its
deliverables, still writes its touchdown to `_chronicle/prompts/pending/`, and still runs the sweep.
The mode-test journal is an extra artefact on top. If test mode ever skipped the touchdown or the
sweep, the loop would lose the record of the job, which is the one thing the whole system exists to
prevent. So: normal close first, journal second.

## Where the journal goes, and why it is not a record

`_chronicle/mode-test/<YYYY-MM-DDThh-mm>_<slug>_testjournal.md`, one per test-mode job.

`_chronicle/mode-test/` is **gitignored**. Test journals are diagnostic scratch, not estate records:
they carry noise the touchdown deliberately leaves out, they would clutter history and dirty the tree
if committed, and they are read live during testing, not consulted as canonical history later. This
is the "either track it or ignore it, never leave it in limbo" rule: test output is scratch, so it is
ignored. It sits under `_chronicle/` because it reads as a journal, and it is the one gitignored member
of that folder, which is why it is named unmistakably.

The sweep does not scan `_chronicle/mode-test/`; it is a side channel and never interferes with the
loop.

## What the journal must contain (fixed template, so journals are comparable)

```
# TEST JOURNAL - <slug> - <YYYY-MM-DDThh-mm>
test mode = true | work order intent: <one line>

## Actions
<step by step what the job did, in order, each with the actual command run and its real output:
git return codes, file counts, byte sums, anything checked. Not a summary, the actual trace.>

## Close
touchdown: <number and filename written to pending/>
sweep: <the full sweep output at close: exit code, anomalies (each named), verdict, digest line>

## Loop state, before and after
STATUS.md last line before: <...>
STATUS.md last line after:  <...>
views: <counts / any change>
anomalies raised this close: <list, or none>

## Surprises and guesses
<anything the job had to guess because the work order was ambiguous; anything unexpected; anything
that did not match what the job expected. If nothing, say "none".>

## Timing
<rough wall-clock for the job>

## Operator note
<plain English, for AB reading during testing: what happened, and anything you should know or check.>
```

## When to retire it

Test mode is generically useful (future debugging, migrating further projects), so it is built
to stay. It is off by default, so it costs nothing when unused. If a future project never wants it,
the file and the gitignored folder simply go unused; there is nothing to actively retire.

## Enforcement, honestly

No script checks that a test-mode job actually wrote its journal; this is a job-behaviour convention
(an [issued]-class instruction, in NORMS terms). During testing that is fine, because you read the
journals and a missing one is obvious. It is not a guarded mechanism, and it does not pretend to be.
