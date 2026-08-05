# NORMS.md - the enforced rules, and only those

A rule lives here only with its check [D28]. If it cannot be checked it is a comment, and
comments go in DESIGN.md [brief §4; D33]. This file is grown by promotion from the record
(trap hit, flagged, review proposes rule plus check, human approves [D28]); it is never
authored from outside. Every entry names: the rule, the check that enforces it, where the
check runs, and the origin of the entry.

Check classes, strongest first. A rule's check must say which class it is:

- **[hard]** the check blocks or corrects the violation mechanically.
- **[loud]** the check cannot block, but every violation is detected and reported.
- **[issued]** the check verifies the instruction is present in the contract that binds the
  agent; compliance itself is verified only by the adversarial audit. The weakest class,
  licensed only for rules about job behaviour that no script can observe.

---

## Base layer (shared; copied verbatim to every project at tier 1 and above)

### B1. A touchdown must validate against its declared schema
Rule: every file entering `_chronicle/prompts/pending/` conforms to the schema version its
frontmatter declares. The no-declaration fallback is dated [D54]: a touchdown dated before the
schema field's introduction validates against the lowest version that had no such requirement; a
touchdown dated on or after that cutoff with no `schema:` field quarantines (reason
`schema-missing`) rather than dropping to the laxest old schema. A `.md` file in `pending/` whose
name fails the touchdown pattern quarantines (reason `bad-filename`), never a silent standoff [D54].
Check: **[hard]** sweep step 2 validates every snapshot file; failure moves the file to
`quarantine/` with a reason file and raises an anomaly. Nothing malformed is processed or dropped.
Origin: D5, D6; dated fallback and filename quarantine D54 [adv B9, adv B11].

### B2. Nothing is silently dropped
Rule: every parsed section either routes, applies, or is skipped with a written reason;
counts must reconcile. (This is norm B2, the never-drop rule. It is not the retired stale-work
question, register B2 in OPEN_QUESTIONS.md, which was dropped by D39; always qualify "norm B2"
where the two could be confused.)
Check: **[hard]** the sweep's conservation check (sections in = routed + skipped-with-reason);
a mismatch raises an anomaly, which is a review-facing trigger and marks the run review-warranted
[D48].
Origin: D9.

### B3. Records are immutable
Rule: no file under `_chronicle/prompts/completed/`, `_chronicle/traces/` or
`_chronicle/sessions/` is ever edited after it lands.
Check: **[loud]** git projects: sweep step 0 inspects `git status` for modifications under
those paths before staging; any hit is an anomaly. No-git projects: any file there with an
mtime newer than the newest trace is an anomaly.
Origin: brief §1, §3; D27.

### B4. Generated files are never hand-edited
Rule: the generated bundle in `_prime/` (`PRIME_bee.md`, not `_prime/src/`, which is code [D59])
and files in `_orchestration/views/`, the INFRASTRUCTURE.md snapshot block, and generated-class
maps [D53] are written only by their generator, temp-file-then-rename [D54].
Check: **[loud, then hard]** every generated file carries a stamp with its own body hash
(FOLDER_TREE.md §4); a mismatch raises an anomaly, and the next regeneration overwrites the
edit wholesale.
Origin: D29; D24 open sub-point (the stamp); generated maps D53; atomic write D54 [adv C1]; prime
folder re-scope D59.

### B5. Semantic maps change only by flag-then-verify-then-sweep-apply
Rule: no job or review edits a semantic (verified-class) map directly. A job flags (current text,
replacement, path:line evidence); the review verifies against disk and writes the verified edit as
a fact; the sweep applies it under the lock [D45, supersedes D31's direct-edit letter]. Generated-
class maps are not flag targets at all: they are sweep-regenerated views, and a flag naming one is
routed `invalid: generated-map` [D53].
Check: **[loud]** the sweep's map-hash provenance check compares each semantic map's hash to the
owned state file [D43]; a change with no intervening review verified-edit record raises
`map-edited-outside-review`. Reading the baseline from owned state, not a trace, closes the false
alarm the trace baseline produced [adv A3, adv A4].
Origin: D31; application moved to the sweep D45; generated maps D53; state baseline D43.

### B6. A deliverable never lives in `_tmp/`
Rule: the paths a touchdown lists as deliverables must not point into `_tmp/`.
Check: **[hard]** schema validation (B1) rejects the touchdown; the job is told at the moment
it can still fix it.
Origin: brief §2.

### B7. Canon changes are visible events
Rule: NORMS.md, CLAUDE.md, CC_OPERATIONS.md, OPERATIONS_BEE.md, CC_TOUCHDOWN.md,
LOOP_PROMPT.md, the operating docs `_orchestration/ORCHESTRATOR_PROFILE.md` (project-authored
divergent content; a project that carries none simply has no such file to guard, and the sweep
notes an absent canon file rather than failing [D85]) and `_orchestration/TEST_MODE.md`, the
schema files, and the two record-shaping templates
`_chronicle/HANDOVER_PROMPT.md` and `_chronicle/LOG_PROMPT.md` [D62] change only by
deliberate, human-gated act, with a CHANGELOG.md entry in the same change. (REVIEW.md is folded into LOOP_PROMPT.md [D60];
PRIME_SOURCE.md is eliminated, its verbatim lines now constants in the code file prime.py [D59].)
Check: **[loud]** the generated snapshot records each canon file's hash; the next sweep
reports any change in its digest line as `canon-changed: <files>`. A canon change with no
matching CHANGELOG entry is an anomaly. (The gate itself is the human; the check makes an
ungated change impossible to miss, which is what "cannot drift silently" requires.)
Origin: D4, D28, D15 (slow speed).

### B8. The job's last act is: touchdown, then sweep
Rule: every Claude Code work order ends by writing the touchdown and running the sweep.
Check: **[issued + loud]** the closing contract line's presence in CC_OPERATIONS.md is
verified by sweep step 0 (template check); an unswept touchdown older than 60 minutes is
caught by the deadman.
Origin: D7, D10.

### B9. Grep the open-errors view before diagnosing
Rule: a job facing an error greps `_orchestration/views/open-errors.md` before starting its
own diagnosis.
Check: **[issued]** the standing line's presence in CC_OPERATIONS.md is verified by sweep
step 0. Compliance is an adversarial-audit item.
Origin: D13.

### B10. Git discipline (git-tier projects only)
Rule: explicit-path staging only; never `git add -A` or `git add .`; every git return code
checked; never `git mv` where the source may be untracked.
Check: **[issued]** for jobs (the firing-trap line in CC_OPERATIONS.md, presence-checked);
**[hard]** for the sweep itself, whose own code follows this rule and whose git failures
abort loudly (LOOP_SPEC 1.6).
Origin: D18 job 1 (bleed-stop); evidence: the erased touchdown and the mid-run crash
[ev: harness_diff §11].

### B11. A canon or operations edit co-updates DESIGN.md and CHANGELOG.md
Rule: any work order that edits a canon or operations file must, in the same act, update DESIGN.md
to match and add a CHANGELOG.md entry [D34]. The CHANGELOG entry is the enforced half; the DESIGN.md
update is discipline, and its failure is cheap (a stale explanation, not a lie), which is why the
old several-authoritative-copies protocol was unsafe and this one-non-authoritative-copy version is
not [D34, D35].
Check: **[loud]** the CHANGELOG half rides norm B7: a canon change with no matching CHANGELOG entry
is already an anomaly. **[issued]** the co-edit line's presence in CC_OPERATIONS.md / OPERATIONS_BEE.md
is verified by sweep step 0; the DESIGN.md update itself is not machine-checked (D35: DESIGN.md
currency is deliberately not a loop duty), only hunted by the deliberately-fired adversarial audit.
Origin: D34; the co-edit line lives in the CC_OPERATIONS.md / OPERATIONS_BEE.md contract text
(carried-over files, edited at migration), stated here as the norm the contract line satisfies.

### B12. Handed maintenance: AB decides, the job executes and records
Rule: when AB states he has judged a named quarantined file safe to clear (or hands over a
similar small chore: a stray-file removal, an ALARMS answer), the next job executes the
clearing for the named file(s) only, appends the standard answer line to ALARMS.md, and
records it in its touchdown's Maintenance section; AB never performs the file operations or
edits ALARMS.md by hand. The hard boundary: a job never inspects quarantine and clears on its
own judgement; a job acts only on a file AB has explicitly named AND given a reason for; a
non-empty quarantine AB has said nothing about is left untouched, and the deadman nags as
normal. The human checkpoint is the point of quarantine and is not weakened. The ALARMS
answer takes one form, its fields named so no job improvises the wording:
`answered <alarm-type> <YYYY-MM-DD> AB: <file-or-id> cleared, <reason>, <disposition>`
(example: `answered quarantine-nonempty 2026-07-21 AB: 0026 cleared, pre-migration record
with no frontmatter, content preserved in git history`).
Check: **[issued]** the awareness line's presence in OPERATIONS_BEE.md and the Maintenance
section's presence in CC_TOUCHDOWN.md are the verifiable surfaces; compliance itself (a job
clearing only named files) is an adversarial-audit item, which is exactly what [issued] is
licensed for.
Origin: AB decision 2026-07-21, first applied in domain-wisdom-agent (M1 landing); pack ledger D89.

---

## Grown layer (project-specific; starts empty in a new project)

Rules land here only by promotion [D28]: a trap is hit and recorded, jobs flag it, the review
proposes the rule with its check, the human approves it via a CHANGELOG decision entry. Keep
this layer short; a long grown layer is a sign checks belong upstream in code.

### G1. A stated touchdown count is a count of filenames
Rule: A stated count of touchdowns is a count of filenames in `_chronicle/prompts/`, never the highest sequence number and never the count of distinct numbers; a work order or pre-flight that states one states it as a filename count.
(That sentence is held unwrapped on one line deliberately: the promotions view closes a candidate by
exact-substring presence of its rule text in this file, so rewrapping it could reopen a candidate
that carries it.)
The three readings genuinely differ, which is why the rule is worth stating: duplicate numbers are
legal for parallel jobs and a preserved gap is legal (a quarantined file keeps its number out of
`completed/`), so filenames, distinct numbers and highest number are three different figures. This
corpus starts empty; the distinction binds from the first parallel pair. The numbering rule in
`_chronicle/prompts/CONTEXT.md`, which states how a number is allocated, does not settle how a count
is taken; G1 is the counting half. The authoritative figure is machine-written: the
`touchdowns: pending N | completed N | quarantine N` line of the generated snapshot block in
`_infrastructure/INFRASTRUCTURE.md`, regenerated by every sweep from a filename count and
hand-edit-protected by norm B4.
Check: **[issued]** sweep step 0 verifies the counting line's presence in
`_orchestration/CC_OPERATIONS.md`, the contract that binds the job, alongside the B8-B11 contract
lines; compliance itself is verified only by the adversarial audit. It cannot be [hard] or [loud],
and the weakest class is the honest one here: the trap fires in work orders authored outside the
repo, which the sweep never sees, and no touchdown states a count in a machine-readable field, so
there is nothing on disk for a stronger check to compare a claim against.
Origin: inherited at seeding (2026-08-05) from the estate's promotion in domain-wisdom-agent
(promoted there 2026-07-21 from the review in its touchdown 0021, on AB's approval; trap: a work
order's pre-flight stated 19 when 20 touchdown filenames existed, 19 being the highest sequence
number and 18 the count of distinct numbers, so the stated figure was not a count at all). The
loop code copied at seeding already carries the sweep's G1 contract-line check and
CC_OPERATIONS.md already carries the line, so the norm and its check land together; this entry is
the NORMS half of that pair, seeded in the same act per the youtube-pov G1 precedent. The layer
grows further only by this repo's own trap-hit promotions.

### G2. The norm-B7 canon-changed fallback recognises the live CHANGELOG's entry-header format
Rule: the norm-B7 canon-changed fallback must recognise the live CHANGELOG's own entry-header format, so a compliant change is never raised as an anomaly when the append-only baseline is unusable.
(That sentence is held unwrapped on one line deliberately, the same reason G1's is: the
promotions view closes a candidate by exact-substring presence of its rule text in this file, so
rewrapping it could reopen a candidate that carries it.)
Check: **[loud]** sweep step 0's norm-B7 canon-changed check calls `changelog_names_currently`,
whose entry-header match uses `CHANGELOG_ENTRY_RE`, widened to recognise both the historical
dashed dated line and `_infrastructure/CHANGELOG.md`'s own numbered `## NNNN - YYYY-MM-DD -`
header (the date captured as group 1 in both); a canon file changed alongside a current-dated
CHANGELOG entry in either format is recognised, so the false canon-changed anomaly does not
raise. Runs at the same site as norm B7's own check, sweep step 0, on every run.
Origin: inherited at seeding (2026-08-05) from the estate's promotion in youtube-pov (promoted
there 2026-07-23 as its G2, candidate 5e13cba801d7, raised in its review touchdown 0077 of
2026-07-21, on AB's approval; trap: the fallback recognised only the historical dashed dated-line
format, so it could never match the numbered entries once the recorded prefix baseline went
unusable, raising a false canon-changed anomaly against a compliant change, observed live there
2026-07-21). The widened regex is the design pack's D91, first applied in youtube-pov and
inherited into domain-wisdom-agent's loop code, which is the build this repo copies; the check
arrived with that code at seeding, so the norm and its check land together, and this entry is the
NORMS half of that pair.
