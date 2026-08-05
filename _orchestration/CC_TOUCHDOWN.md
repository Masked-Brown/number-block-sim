# CC_TOUCHDOWN.md -- the touchdown template

Every Claude Code job ends by writing one touchdown itself, as its closing act, to
`_chronicle/prompts/pending/<NNNN>_<slug>_<YYYY-MM-DD>.md`, then running the sweep:
`python _orchestration/loop/sweep.py --apply`. Touchdown, then sweep, is the job's last act
(norm B8); on a non-default branch, write the touchdown only and the sweep runs at merge.

The sweep validates this file against `_orchestration/loop/schema/td_v2.json`, the authority
this template is authored against (the sweep's step 0 checks the two still agree), routes the
facts it carries, and moves it to `completed/`. A touchdown that fails validation moves to
`quarantine/` with a reason file, never dropped and never partly processed: a human looks.

British English, no em-dashes, no exclamation marks.

**Depth rule:** deep on How it went and Any errors; terse everywhere else. The touchdown is a
build record, not a journal.

**Numbering rule:** `NNNN` is a zero-padded global ever-incrementing sequence. The next number
is the highest number among well-formed touchdown filenames in `_chronicle/prompts/pending/` and
`completed/` (names matching td_v2.json's `filename_pattern`), plus one; a file whose name does
not match the touchdown pattern is not counted. A same-number collision between parallel jobs is
a tolerated minor cost; the FULL filename is what must be unique (a full-filename collision with
`completed/` quarantines). A scratch or proof file must NEVER be given a touchdown-pattern name
(`NNNN_slug_YYYY-MM-DD.md`) in `pending/` or `completed/`: proofs use a scratch directory or a
non-matching name. A stray high-numbered file forks the series; this happened in the sibling dwa
venture, where a proof planted 0091/0092 and a later bee took 0093.

**No harvested field.** The file's location is its state: `pending/` means unswept,
`completed/` means swept, `quarantine/` means a human must look. Never write into
`completed/` or edit anything already there.

**The per-job attention flag.** Alongside writing this file and running the sweep, the job
emits one line in its closing output: `attention: green | amber | red -- <one-to-two-sentence
note>`. That is the real-time "should I look" signal; it lives in the job's output, not here.

**Item ids.** The sweep stamps every routable entry (an error, a flag, a gap, a proposal, a
candidate) with a stable id and prints it in the views under `_orchestration/views/`. To close
an item, name its id in a Resolutions fact; matching is by id, never by position or wording.

---

## The template

Frontmatter first, then the thirteen sections in this exact order, closing with Work order
verbatim. Six frontmatter fields are required, matching td_v2.json: `schema:`, `actor:`, `bee:`,
`slug:`, `job:` and `date:` (`model:` and `effort:` are optional); `actor:` is `job` for a Claude
Code job, `review` for the standing window's review, `bee` for a bee-authored record.

````
---
schema: 2
actor: job
bee: nbs-[wor]-1.0-<feature slug>
slug: <job slug>
job: <NNNN>
date: <YYYY-MM-DD>
model: <exact model id the job ran on>
effort: <standard | extended thinking | maximum extended thinking>
---

## Aim
<terse: what the job was for, a line or two>

## What it was told
<terse: the work order in brief>

## What it did
<terse: files changed; tests/build green | red | n/a>
Delegation: <N> subagents (<type>@<model>, ...) | none

## Deliverables
- <repo-relative path> -- <one clause on what it is>

## How it went
<DEEP: what worked, what fought back, what a future job should know; any CONTEXT.md gap hit>
Grade: <1-5>
Prompt quality: <verdict: would the work order, as written, have produced this result unaided>

## Correction passes
<each mid-job correction and what it changed; "none" if none>

## Any errors
- <one-line summary> -- status: open
  <detail lines, indented, the standing record of the error>
- <one-line summary> -- status: recovered
  <detail: what went wrong and how it was recovered>

## Map flags
Map: <a verified-class map in _orchestration/maps/, by name without .md>
Op: replace | append | remove
Old:
<
exact current text, byte-faithful, may span lines
>>>
New:
<
replacement or appended text
>>>
Evidence: <path:line or fact confirming the change is live on disk right now>

## Gaps
gap-fact: <repo-relative path to a CONTEXT.md file>
Old:
<
the line as it stands, byte-faithful
>>>
New:
<
the same line with only individually verifiable substitutions
>>>

gap: <anything else worth queueing for the review, stated with its reason>

## Resolutions
- resolves: <item-id> -- <what closed it, with the evidence>

## Proposals
```
<one proposal per fence: an idea, a template addition, anything judged worth considering>
```

## _tmp outputs
- <path> -- discardable | needs-a-home

## Work order verbatim
```
<the complete work order the job was given, pasted exactly>
```
````

---

## Section rules

### Aim, What it was told, What it did

Terse. What it did carries the files changed and a tests/build verdict (green | red | n/a).
There are no commit or tree fields: the job commits and pushes its own work as a separate
closing act after the touchdown, and the git log is that record.

### Deliverables

One line per artefact the job shipped, repo-relative; `- none` if the job shipped no
artefact. A deliverable path must never point into `_tmp/` (norm B6): the sweep rejects the
touchdown at validation, at the moment the job can still fix it.

### How it went

Deep. Carries the `Grade:` line (1 to 5) and the prompt-quality verdict. Any CONTEXT.md gap
the job hit is recorded here (and, where verifiable, as a `gap-fact:` in Gaps); there is no
separate feedback surface.

### Any errors

Deep, and the standing record. One entry per error: a `- ` summary line whose status marker
` -- status: open` or ` -- status: recovered` sits at the end of the summary, either inline
or alone on the next (indented) line, followed by indented detail. A body of exactly `none`
means no errors. Legibility is part of the contract: every entry states, in plain English, WHAT
was being attempted, WHAT actually happened, and WHAT it blocks or why it matters, never a bare
symptom line. The reason: an error must be legible to someone who was not there and returns to
it cold, because `_orchestration/views/open-errors.md` shows these entries to the operator. The
observation core (message, exit code, path:line) is the fact; the causal reading is testimony,
kept apart. Open entries surface in `_orchestration/views/open-errors.md` until a later
Resolutions fact names their id.

### Map flags

Structured; payloads are fenced between a line containing exactly `<` and a line containing
exactly `>>>`. The sweep never applies a job's flag: it queues in
`_orchestration/views/map-queue.md` for the review, which verifies against disk and writes
the verified edit as a fact the sweep then applies under the lock. A flag naming a
generated-class map (one whose first line is a `<!-- generated: ... -->` stamp) is routed
invalid: generated maps are sweep views, never flag targets. `none` if no flags. Commentary
never rides inside this section or any structured section; explanation belongs in How it went
(a malformed structured entry routes invalid or quarantines the touchdown, and payload-only
blocks are what keep that from happening).

### Gaps

Two declared kinds, never inferred. `gap-fact:` is apply-eligible: its target is a CONTEXT.md
file only, its New is the Old line with substitutions the sweep can verify individually (an
existing path, an existing filename, or a count backed by a `Recount: <glob>=<N>` line); the
sweep applies it exact-anchor-once, all-or-nothing, or queues it with the reason. `gap:` is
everything else and queues for the review in `_orchestration/views/gap-queue.md`. `none` if
neither.

### Resolutions

One `- resolves: <item-id> -- <note>` line per item this job closes: a recovered error, a
considered proposal (folded or declined, with the reason), an obsolete flag or gap. `none` if
none. Resolution is by id, so a resolution can never re-parse as a new raise.

### Proposals

The fenced terminal thinking surface: each fenced block is one proposal, surfaced in
`_orchestration/views/suggestions.md` until a closure fact names it. Facts are served by
default; proposals are read only on explicit query. `none` if none.

### _tmp outputs

One line per file left in `_tmp/`, tagged discardable or needs-a-home. `- none` if none.

### Work order verbatim

The final section of the standard template. It carries the FULL work order the job was given,
verbatim, inside a single fenced code block: its content is a record and is never parsed. A
job that received no written order (rare) writes `none`. The fence and the section scoping are
what keep any routing tokens inside a pasted order (`gap-fact:`, `resolves:`, `Map:`,
`-- status:`) from being routed.

---

## Optional section: Maintenance (any actor)

A standing optional section for housekeeping AB handed the job this cycle: a quarantined file
he has judged safe to clear, a stray file to remove, an ALARMS answer to log. A job handed
none omits the section entirely. Template-only: it rides td_v2.json's `allow_extra`, with no
schema bump.

````
## Maintenance
- <file(s) named by AB> -- <AB's stated reason> -- <action taken, the ALARMS answer line
  included where one was logged>
````

Entries name the file(s), AB's stated reason and the action taken; the section never licenses
the job to judge, only to record (norm B12: a job never inspects quarantine and clears on its
own judgement, and a non-empty quarantine AB has said nothing about is left untouched).

---

## Review-only sections (actor: review)

The review's touchdown may add these two sections; on any other actor they are ignored and
anomaly-flagged.

````
## Verified edits
Verified-edit: <the flag id this edit closes>
Map: <map name>
Op: replace | append | remove
Old:
<
exact anchor, verified against disk
>>>
New:
<
exact replacement
>>>

## Norm candidates
Candidate: <the rule, one line>
Check: <the executable check and where it runs>
Red-case: <the check demonstrated failing on a constructed violation>
````

The sweep applies verified edits under the lock, all-or-nothing per touchdown, so the change
and its licensing record enter the corpus in the same locked run. Candidates surface in
`_orchestration/views/promotions.md` for the human gate; one without its check and red case
is listed incomplete and cannot be promoted.

---

## Closing note

The worker bee writes no touchdown; touchdowns are a CC-job and review artefact. The `bee:`
field ties a feature's jobs together on read; the feature journal (via
`_chronicle/LOG_PROMPT.md`) remains the per-feature narrative.

## Changelog

2026-08-05 -- seeded into number-block-sim from domain-wisdom-agent's copy against the same
td_v2.json (carried byte-identical): the thirteen sections, the six required frontmatter fields,
the optional Maintenance section (norm B12) and the review's two output sections all carried
verbatim; the bee prefix re-stamped to nbs- and the numbering-rule cautionary tale attributed to
the sibling venture where it happened.
