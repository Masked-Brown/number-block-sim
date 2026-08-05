---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: publish-pack-assembly
job: 0023
date: 2026-08-05
model: claude-fable-5
effort: extended thinking
---

## Aim

Assemble the publish pack in 04_publish/output/ from the repo record and AB's account export,
promote the two fixed-horizon findings, amend the 02_build contract line, and close Phase 3
with its journal.

## What it was told

Pre-flight the remediate-and-game-v1.2 close, then eight items: promote (a) the
survival-not-scoring-rate finding and (b) the equal-blocks human comparison into
_FINDINGS.md with evidence and intervals, restating F004 consistently; amend
02_build/CONTEXT.md's "no agent logic" line to permit exactly the pinned grader copy and
close the gap that raised it; BUILD_RECORD.md for a technical outsider; TRANSCRIPT.md from
the one in-scope conversation in _tmp/conversations.json, condensed, redacted, every other
conversation untouchable; FINDINGS_AND_STRATEGY.md with the honest ladder, the leak story,
the survival lead, the human comparison and the exact verified simulation count;
champion-best-game.json engine-verified with a cinema instruction; POST_NOTES.md with exact
replacements for three stale post claims; the Phase 3 journal per LOG_PROMPT.md.

## What it did

Pre-flight: touchdown 0021 in completed/, pending/ empty (.gitkeep only), working tree clean,
nothing in quarantine. Files changed: 03_train/output/_FINDINGS.md (F007 and F008 entered,
summary table extended, F004 summary line restated, dated promotion-pass note and F004
cross-reference appended), 02_build/CONTEXT.md (the one Do-not line). New:
04_publish/output/BUILD_RECORD.md, TRANSCRIPT.md, FINDINGS_AND_STRATEGY.md, POST_NOTES.md,
champion-best-game.json, _chronicle/sessions/2026-08-05_phase-3-training.md.
Tests: n/a (no code changed); the published replay verifies through the engine (independent
re-verification from disk: ok, 1,040 moves, 1,040 reasoning entries, score 4,062,920) and
the 04_publish/output/ tree scans clean of secret patterns.
Delegation: none.

## Deliverables

- 04_publish/output/BUILD_RECORD.md -- the build story for a technical outsider: what was
  built, in what order, what broke, what caught it.
- 04_publish/output/TRANSCRIPT.md -- the nbs-wor-1.0-z conversation as condensed AB:/Claude:
  turns with phase headers; redactions marked [redacted].
- 04_publish/output/FINDINGS_AND_STRATEGY.md -- the results document: survival lead (F007),
  human comparison (F008), honest ladder with intervals, the leak told straight, 78,103
  verified games with components, five strategy lessons, NEXT_STEPS pointer, cinema appendix.
- 04_publish/output/champion-best-game.json -- expectimax-d3-v2's best eval-v1 game, enriched
  with per-move reasoning, engine-verified (seed 11610268379355989646, score 4,062,920, max
  tile 131,072, 1,040 moves).
- 04_publish/output/POST_NOTES.md -- the three replacement sentences and first-comment
  numbers, kept to the ordered length.
- 03_train/output/_FINDINGS.md -- F007 and F008 promoted with evidence and intervals; F004
  restated consistently, append-only.
- 02_build/CONTEXT.md -- the no-agent-logic line now states the pinned, test-locked grader
  exception per BUILD.md decision 9.
- _chronicle/sessions/2026-08-05_phase-3-training.md -- the Phase 3 close-out journal, with
  Part 2 profile evidence and Part 3 feedback capture from the feature's conversation.

## How it went

**The export was handled to the letter of its fence, mechanically.** The extraction script
loaded _tmp/conversations.json, printed only the total conversation count (6) and the match
count for the exact title (1), and wrote the single matching conversation to session-local
scratch; no other conversation's content or title ever entered context or any output.
Common secret shapes (ntn_, sk-, ghp_, xox, PEM blocks, JWTs, bearer tokens and more) were
redacted mechanically at extraction, before the text landed anywhere: exactly one hit, the
Notion bearer token in the pasted desktop config. The GitHub one-time device code in the auth
paste was redacted editorially as a code pattern. TRANSCRIPT.md is fresh prose rather than
quoted text, and a final pattern scan over the whole of 04_publish/output/ found nothing. The
scratch extract was deleted before close; _tmp/conversations.json itself is AB's to delete
and is flagged below.

**The simulation count is 78,103, and it is smaller than the chat believed.** Summed from the
run records, each component traceable: 5,000 headline eval games (ten versions times 500),
57,600 breeding fitness games (16 generations times 24 candidates times 150 seeds, from the
per-generation `games` fields), 2,000 breeding validation games (champion plus init times 500
held-out seeds times two breeds; breed.js plays both sides), 5,000 stacker-sweep games (10
column-variant rows times 500), 4,000 serial throughput games (4 agents times 200 times 5
reps), 4,000 parallel throughput games (two records, each with five serial and five parallel
passes of 200; the two records carry distinct serial pass timings, so neither baseline is a
copy of the other), 300 behaviour-probe games, 200 bit-identity games (100 seeds, serial and
pooled legs) and 3 determinism legs. Excluded by definition: design probes noted only in the
decision log, and deterministic re-derivations of recorded games. The conversation had
estimated "on the order of a million" from the pre-campaign design (10,000-game generations);
the actual campaign ran 3,600-game generations, and the post's title claim shrinks
accordingly. This is exactly why the order demanded the number from the manifests.

**One real judgement call: the champion's enriched best-game replay did not exist, so it was
re-derived rather than copied.** The order says "copy the champion's enriched best-game
replay here", but the only enriched best-game replay on disk
(samples/expectimax-d3-v1-best-eval-v1.replay.json) belongs to the SUPERSEDED leaked
champion; publishing it as champion-best-game.json would have put leak-informed reasoning
under the honest champion's name and contradicted the pack's own leak story, failing the
order's coherence gate. The honest champion's best game exists as a recorded games.jsonl
line (run 2026-08-05_eval-expectimax-d3-v2, seed 11610268379355989646) but was never
exported enriched. Resolution: deterministic re-derivation, the same operation the
remediation job used to re-verify the v1 rows. The registered expectimax-d3-v2 module
replayed the seed with explain enabled (77.7 seconds); all 1,040 moves, the score and the
final hash were asserted identical to the recorded line before anything was written; the
export went through lab/replay.js, which verifies through the engine before writing; and the
on-disk file was independently re-verified. No new run folder, no new measurement, no
mechanic touched. Judged inside the spirit of "no new runs, no new games"; flagged amber
below for AB's confirmation rather than silently absorbed.

**The promotions were straightforward, with one scoping note.** The order's item (b), the
equal-blocks human comparison, is not the same as the leak-free ladder SUMMARY's drafted
candidate 2 (the leak-worth methodological finding); the order governs, F007 and F008
entered as named, and the register's promotion-pass paragraph records that the leak
candidate stays unpromoted with its substance already living in F001's correction. F004's
summary line was restated in place (the precedent is the correction pass's own F004
restatement) and its entry gained only a dated cross-reference.

**The five artefacts were cross-checked side by side before close.** Every number in each
traces to the register, a run record or a touchdown; the transcript's campaign-moment
numbers (643,996, 2.7 million, 65,536) are the conversation's own chronology and are
superseded within the same document by the leak-free turns, which is the nature of a
faithful record rather than a contradiction. POST_NOTES' title copy rounds 78,103 to
"78,000" with the exact figure in the first-comment numbers.

Grade: 4
Prompt quality: yes, unaided, with two nicks. Item 6's "copy" assumed an artefact that did
not exist for the current champion, which cost the judgement call above; an order written
after checking samples/ would have said "export from the recorded game, prove identity".
And the "three stale claims" resolve to two replacement sentences (the title, and one Phase 3
bullet carrying both remaining claims), which POST_NOTES states rather than padding to three.

## Correction passes

none

## Any errors

none

## Map flags

none

## Gaps

gap: F002 and F006 in `03_train/output/_FINDINGS.md` cite behaviour-probe evidence for
heuristic-v0 at 100 train games ("takenWhenAvailable 1.0 for heuristic-v0, v1 and v2 (100
train games each)"; "raisedOverHigherGain 0 in every probe (v0, v1, v2 at 100 games, d2 at
50)"), but run `2026-08-05_behaviour-probes` holds probe records for heuristic-v1 (100
games), heuristic-v2 (100) and expectimax-d2-v1 (50) only, its manifest lists exactly those
three files, and no heuristic-v0 probe record exists anywhere under `output/runs/`. Either
the v0 probe ran and its record was not kept, or the register's evidence lines overstate the
instrument. The publish pack's verified game count (78,103) counts recorded games only, so it
is unaffected either way, and no published claim rests on the v0 probe rates specifically. A
100-game v0 re-probe is minutes of compute if AB wants the evidence lines to stand as
written; until then a quoter of F006's evidence field should know the v0 leg is unrecorded.

## Resolutions

- resolves: 7e5f6f22b457 -- `02_build/CONTEXT.md`'s "Do not" now reads "No agent logic here,
  with exactly one pinned exception" and names `docs/js/grader.js`, the single pinned version
  `expectimax-d2-v2`, the lab test that fails on a single disagreed column, and BUILD.md
  decision 9 for the reasoning. AB's authorisation is work order publish-pack-assembly item
  2, quoted verbatim in this touchdown's final section. Evidence: the amended line on disk in
  `02_build/CONTEXT.md`.

## Proposals

```
The lab should own an export-replay CLI: given a run-id and a seed, re-derive that recorded
game from the registered agent with identity assertions (moves, score, final hash against
the games.jsonl line) and write the optionally-enriched replay through lab/replay.js. This
job hand-rolled exactly that in session scratch to produce champion-best-game.json, because
the honest champion's best game had never been exported enriched; the need recurs every time
a champion changes (the samples/ folder still holds only the superseded d3-v1 champion's
enriched replay, which a future reader could mistake for the current champion's). An hour of
work, and it pairs naturally with the grade-replay CLI already proposed by touchdown 0021.
```

## _tmp outputs

- _tmp/conversations.json -- discardable. AB's full account export, sensitive: flagged for
  immediate deletion per the work order, and the export email copy should be deleted with it.
  Not deleted by this job; it is AB's file.

## Work order verbatim

```
# Claude Code work order -- publish-pack-assembly

From worker bee: nbs-[wor]-1.0-z
Model: opus | Effort: extended thinking | Rationale: synthesis and
faithful summarisation of a long record; no new computation.

## Task
Assemble the publish pack in 04_publish/output/ from the repo record
and AB's account export, promote two findings, amend one stage
contract line, and close Phase 3 with its journal.

## Pre-flight
- Verify the remediate-and-game-v1.2 job closed: its touchdown in
  completed/, working tree clean, nothing stale in pending/. An
  unswept touchdown alone: run the sweep and note it. Anything else
  irregular: stop and report.

## In scope
- 04_publish/output/ -- the five artefacts
- 03_train/output/_FINDINGS.md -- two promotions (below)
- 02_build/CONTEXT.md -- one line amendment (below)
- _chronicle/sessions/ -- the Phase 3 journal via LOG_PROMPT.md
- _tmp/conversations.json -- read per item 4 only; flag discardable
  at close

## Out of scope
- docs/, 01_rules/, engine, game: untouched. No new runs, no new
  games, no retraining.
- Every conversation in the export other than the one named in
  item 4: do not read, quote, summarise or reference them, in any
  output or in the touchdown.

## CONTEXT to read
- 04_publish/CONTEXT.md, 03_train/CONTEXT.md, CONTEXT.md (root)
- _chronicle/prompts/CONTEXT.md

## Do
1. Promotions, AB-approved 2026-08-05: enter the two candidate
   findings from the fixed-horizon panel into _FINDINGS.md as full
   findings with their evidence and intervals: (a) most of the
   ladder's advantage is survival, not scoring rate (5.6x at game
   end, 1.66x at equal blocks); (b) at equal blocks AB's reference
   game sits between the two searching agents. Restate F004's
   wording consistently with (b), append-only.
2. Amend 02_build/CONTEXT.md's "no agent logic" line to permit
   exactly what exists: a pinned, test-locked grader copy in
   docs/js/grader.js for zero-network grading, per BUILD.md decision
   9. Close the open gap that raised it.
3. BUILD_RECORD.md: the project's build story distilled from
   BUILD.md, the touchdowns and CHANGELOG: what was built, in what
   order, what broke, what caught it. Written for a technical
   outsider, plain and honest.
4. TRANSCRIPT.md: the raw source is _tmp/conversations.json, a full
   account export containing ALL of AB's conversations. Extract
   ONLY the conversation titled "nbs-wor-1.0-z", in chronological
   order; every other conversation is out of scope per the Out of
   scope block. The export is sensitive: flag the file for immediate
   deletion in the _tmp clearance. Rewrite the extracted
   conversation as alternating "AB:" and "Claude:" turns; summarise
   each turn while keeping all substance, decisions, corrections
   and key numbers; clean voice-transcription garble; preserve
   chronology and add phase headers. REDACT: the Notion API token
   pasted early in the chat, any other token/key/code pattern, and
   anything matching common secret formats. State at the top that
   it is a faithful condensed record with redactions marked
   [redacted].
5. FINDINGS_AND_STRATEGY.md: research-style results document from
   the amended findings register: the honest ladder with intervals,
   the leak story told straight, the fixed-horizon survival result
   as the lead, AB's game versus the agents at equal blocks, the
   verified total simulation count from the run manifests (state
   the exact number and what it comprises), human-playable strategy
   lessons, and a short pointer to NEXT_STEPS.md.
6. champion-best-game.json: copy the champion's enriched best-game
   replay here with a one-line instruction at the top of
   FINDINGS_AND_STRATEGY.md's appendix: download, open cinema mode,
   drop the file in.
7. POST_NOTES.md: exact replacement sentences for the three stale
   claims in AB's locked post (sim count, "up to trained weights",
   "hundreds of games per contender"), plus the headline numbers
   for the first comment. Five to ten lines, nothing more.
8. Phase 3 close-out journal to _chronicle/sessions/ per
   LOG_PROMPT.md: the training feature is closed.

## Verify (before you close)
- Every number in every artefact traces to the findings register,
  a manifest or a touchdown; no number invented at assembly.
- TRANSCRIPT.md contains no secret material (scan, do not assume)
  and no content from any other conversation.
- The replay JSON in 04_publish/output/ verifies through the engine.
- The five artefacts read coherently side by side: no claim in one
  contradicted by another.
```
