---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: build-game-engine-cinema
job: 0008
date: 2026-08-05
model: claude-fable-5
effort: extended thinking
---

## Aim
Build the playable game: pure deterministic engine, browser UI, cinema-mode replay viewer,
live GitHub Pages deployment, all implementing RULES.md v1.0 exactly; align the records and
the guardrail canon.

## What it was told
Engine first with Node tests (determinism a tested property, bit-identical Node/browser
PCG32), then the browser game in docs/, cinema mode, local run, Pages via gh api, README
rewrite with Play Now, and the canon alignment last (CLAUDE.md guardrail line, B11
couplings, root CONTEXT.md routing, 02_build updates, BUILD.md). RULES.md read-only law;
stop on any rule ambiguity.

## What it did
New: docs/ (index.html, cinema.html, test.html, package.json, css/style.css, js/engine.js,
js/config.js, js/board-render.js, js/ui.js, js/cinema.js, js/share.js, test/engine.test.js,
test/scripted-game.js), 02_build/output/BUILD.md. Edited: 02_build/CONTEXT.md, CONTEXT.md
(root), CLAUDE.md (guardrail bullet only), README.md, _infrastructure/DESIGN.md (A5),
_infrastructure/CHANGELOG.md (entry 0004). Tests green: 23 of 23 (node --test docs/test/).
Pages enabled (main, /docs) and verified live.
Delegation: none

## Deliverables
- docs/ -- the playable game, live at https://masked-brown.github.io/number-block-sim/
  (engine, UI, cinema mode, tunables, tests; push equals deploy)
- 02_build/output/BUILD.md -- architecture and verification record, points at docs/
- 02_build/CONTEXT.md -- reconciled to the built state; language TBD settled, sim interface
  contract's concrete base recorded
- CONTEXT.md -- docs/ routing line (the declared divergence)
- CLAUDE.md -- the guardrail bullet replaced with the decided deployment state (canon, B11)
- _infrastructure/DESIGN.md -- A5 third adaptation (docs/ home) co-edit
- _infrastructure/CHANGELOG.md -- entry 0004
- README.md -- rewritten: tagline, PLAY NOW link, features, the experiment, RULES.md link

## How it went
Smooth overall; the engine-first order paid for itself. What a future job should know:

1. Work-order self-check (CLAUDE.md, Before you act): this order edits canon (CLAUDE.md).
   Couplings (b) DESIGN.md and (c) CHANGELOG were named in the order and are done. Coupling
   (a), the design-pack (icm-final) companion, is NOT named in the order. Ruling taken
   rather than blocking a fully AB-decided build: the design pack lives outside the repos
   (DESIGN.md section 12) and records estate-level system design; this edit is a
   project-product guardrail fact, not ICM system design, and the sibling precedent
   (CHANGELOG 0002, the previous CLAUDE.md canon edit) also carried only the two in-repo
   couplings. Raised to AB as the numbered question in the closing output, not silently
   patched: does the guardrail edit need an icm-final companion entry, and should the
   self-check text say the design-pack coupling applies only to infrastructure-design edits?
2. The one rules-shaped design point: RULES.md 3 requires both "preview shows the next
   block" and "no new blocks of a retired tier will spawn". A value drawn at preview time
   can violate the second across a floor rise. The engine therefore draws each block's tier
   OFFSET one block ahead and binds it to a value under the floor at its own spawn time; the
   preview is honest and rebinds on a rise. The rules force this design rather than leave it
   open, so it is recorded as an implementation decision in BUILD.md, not a rule resolution.
3. Determinism held cross-environment first try: PCG32 asserted against reference vectors
   computed by an independent Python implementation, and the scripted game (seed 20260805,
   54 moves, score 840) hashes ffb7f2f9 in Node and in Chrome on the live URL alike.
   docs/package.json ("type": "module") makes Node parse the same .js files the browser
   loads; earlier the suite ran only via Node's syntax detection, which is flimsier.
4. Two of my first test fixtures were invalid (a pre-existing adjacent equal pair meant the
   "cascade" merged simultaneously on pass 1); the engine was right and the fixtures wrong,
   which is the correct failure direction. Rebuilt with a buried-partner construction that
   also exercises the lowest-leftmost tie-break and a four-pass chain.
5. gh exists at "C:\Program Files\GitHub CLI\gh.exe" but is not on PATH in this shell; and
   piping JSON to gh api under PowerShell 5.1 mangles it (HTTP 400) where --input <file>
   works. Pages enabled via the API as ordered; first build went 404 to 200 in about 40 s.
6. Verification: all RULES.md sections 1 to 6 behaviours are covered by a test or
   demonstrated in the live playthrough, including arrows-nudge and soft drop (demonstrated
   separately after the scripted playthrough, which only used direct-send and hard drop).
   None is neither. Cinema verified and replayed the auto-saved live game; the reasoning
   panel was exercised with a synthetic reasoning[] replay through the engine.
7. CONTEXT gap hit: _config/CONTEXT.md still expects the constants extract to live in
   _config/, while the order (AB) put the single section 8 tunables file at
   docs/js/config.js; _config/CONTEXT.md was not in this job's edit scope, so queued in
   Gaps. Also queued: docs/ has no zone classification (see Gaps).
Grade: 4
Prompt quality: yes with two nicks: the order as written produced this result unaided, its
scope, ordering and verify list all load-bearing; it assumed gh api works (true only via
full path here) and omitted the design-pack coupling statement its own canon edit trips.

## Correction passes
none

## Any errors
- CHANGELOG entry 0004 briefly inserted before 0003 in the working tree -- status: recovered
  What was attempted: appending entry 0004 to _infrastructure/CHANGELOG.md, an append-only
  record. What actually happened: the first edit anchored on 0003's header and inserted 0004
  above it, violating append-at-end ordering. Caught immediately on review of the edit,
  removed, and re-appended after 0003's final line; the record on disk and in git history
  only ever carried the correct order (the slip never reached a commit). Why it matters: an
  ordering violation in the one append-only file would have been a B7-adjacent mess for the
  next reader; the recovery cost was two edits and nothing downstream saw it.
- gh api rejected piped JSON with HTTP 400 -- status: recovered
  What was attempted: enabling Pages by piping '{"source":{"branch":"main","path":"/docs"}}'
  to gh api --input -. What actually happened: under PowerShell 5.1 the piped body arrived
  mangled and the API answered 400 Problems parsing JSON. Recovered by writing the JSON to a
  temp file (ASCII, no newline) and passing --input <file>; the call then succeeded. Why it
  matters: any future job driving gh api from PowerShell should pass bodies by file, never
  by pipe.

## Map flags
none (no maps exist in this repo; no flag is warranted)

## Gaps
gap: _config/CONTEXT.md's working rules still state the machine-readable constants extract
will live in _config/ ("the intended first resident"), but AB's build order placed the
single RULES.md section 8 tunables file at docs/js/config.js, and rule constants (sections 1
to 6) live in the engine as locked rules, not in any extract. _config/CONTEXT.md was
read-only for this job. Queued for reconciliation: either repoint _config/CONTEXT.md at
docs/js/config.js as the section 8 home, or decide _config/ still gains a derived extract
when 03_train/ needs one.

gap: docs/ now exists as the game's home (declared divergence, CHANGELOG 0004) but has no
zone classification: the zone index (CLAUDE.md, CC_OPERATIONS.md) defines the product zone
as 01_rules to 04_publish plus _config, and sweep.py's PRODUCT_ZONE_RE matches the same
set, so docs/ is unclassified for zone rules and gap routing. Product-jobs-edit-it,
loop-never-touches-it is the natural reading; whether PRODUCT_ZONE_RE and the zone index
should name docs/ is AB's call (a canon and loop-code change with its own couplings).

## Resolutions
none

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
# Claude Code work order -- build-game-engine-cinema

From worker bee: nbs-[wor]-1.0-z
Model: opus | Effort: extended thinking | Rationale: multi-surface build
where engine purity and determinism are load-bearing for every later
phase; architectural mistakes here are expensive.

## Task
Build the playable game: a pure deterministic engine, a browser UI, a
cinema-mode replay viewer, and a live GitHub Pages deployment with a
Play Now link. Everything implements 01_rules/output/RULES.md exactly.

## In scope
- docs/ -- NEW, the game's home and the Pages-served folder: engine,
  UI, cinema mode, config. Declared divergence from plain stage shape;
  record it in root CONTEXT.md and the CHANGELOG.
- 02_build/output/ -- BUILD.md: architecture record, decisions taken,
  how to run locally, pointing at docs/.
- 02_build/CONTEXT.md -- update Inputs/Process/Outputs to match what
  was actually built; clear any TBD this build settles.
- CLAUDE.md -- guardrail line only: replace "no deployment, no
  publishing infrastructure" with the decided state (Pages deployment
  exists for the playable game; publishing WRITE-UP infrastructure is
  still 04_publish's concern). AB decided this 2026-08-05. B11
  couplings apply: DESIGN.md co-edit plus CHANGELOG entry.
- README.md -- rewrite in the style of AB's slice-of-life repo: title,
  one-line tagline, PLAY NOW link to the Pages URL, short feature
  list, how the experiment works, link to RULES.md.
- Root CONTEXT.md -- add docs/ to the routing (built game lives there;
  02_build/output/ holds the records).

## Out of scope
- 03_train/, 04_publish/ -- nothing training- or publishing-related.
- No AI agent, no accuracy metric, no composite human score.
- No leaderboard, no database, no analytics.
- 01_rules/output/RULES.md -- read-only law. If you find it ambiguous
  or unimplementable at any point, STOP and report the exact gap; do
  not resolve rule ambiguity yourself.
- _orchestration/, _infrastructure/ beyond the named canon edit.

## CONTEXT to read
- 01_rules/output/RULES.md -- the law this build implements
- 02_build/CONTEXT.md
- CONTEXT.md (root, Layer 1)
- _config/CONTEXT.md -- tuning constants convention (RULES.md section 8)
- _orchestration/CONTEXT.md -- rides because of the canon edit

## Constraints
- Vanilla JS ES modules, no framework, no bundler, no build step, no
  dependencies. Push equals deploy; the sim harness in 03 will import
  the same engine file from Node, so the engine must run in both
  environments unchanged.
- The engine is a pure logic module: no DOM, no timers, no rendering,
  no Math.random. Board state in, move in, new state and events out.
  The renderer owns time; the engine owns truth.
- Seeded PCG32 exactly as RULES.md states, implemented to be
  bit-identical in Node and browser (BigInt arithmetic is acceptable).
  Cross-environment determinism is a TESTED property.
- Replay schema, versioned from day one:
  {version, seed, moves[], meta{date, player, result-metrics}} plus an
  OPTIONAL reasoning[] array (one entry per move: plain-English
  one-liner plus named feature scores). Human replays omit it; the
  Phase 3 AI will fill it. Cinema mode must handle both.
- Single tunables file in docs/ carrying every RULES.md section 8
  constant; no magic numbers in engine or UI.
- All metrics from RULES.md section 7 tracked and present in replay
  meta, including per-move timestamps for human play.

## Do
1. Engine first, tests with it (Node's built-in test runner, no deps):
   merge and cascade cases including simultaneous groups and the
   2^(n-1) maths, chain-index scoring, floor-rise with no purge,
   stranded-block behaviour, clutch-rescue and game-over edges, and a
   replay-determinism test: play a scripted game, save the replay,
   re-run it, assert identical final state hash and score.
2. Browser game in docs/: falling block at constant slow speed, next
   preview, Z X C V B plus arrows plus space exactly per RULES.md,
   score, current spawn window shown, game-over screen with metrics,
   personal best in localStorage, replay auto-saved each game with a
   download button, and a share-card image (canvas-rendered score
   card the player can save). Clean modern dark UI, readable tile
   numbers with a colour ramp by tier; no 1980s pixel styling.
3. Cinema mode in docs/ (own page or route): load a replay from file
   picker or URL parameter, verify it replays via the engine, layout
   65 percent board and 35 percent reasoning panel, play, pause,
   step, speed control, move counter and running score. Reasoning
   panel shows the one-liner large and feature bars small when
   reasoning[] exists, and a clean "no reasoning in this replay"
   state when it does not.
4. Local run: a one-line static-server instruction in BUILD.md
   (python -m http.server or equivalent), verified working.
5. GitHub Pages: enable via gh api, branch main, path /docs. Poll
   until the site answers, verify the game loads at the live URL. If
   the API shape rejects the call, stop and report the exact command
   for AB to run in the repo settings instead.
6. README rewrite per In scope, Play Now pointing at the live URL.
7. Canon alignment last: the CLAUDE.md guardrail edit, DESIGN.md
   co-edit, CHANGELOG entries, root CONTEXT.md routing line,
   02_build updates, BUILD.md.

## Verify (before you close)
- All engine tests pass; state the count.
- Replay determinism test passes in Node AND in the browser (same
  seed and moves produce the same final hash in both).
- The live Pages URL loads and a full game is playable start to
  game-over. Cinema mode loads the auto-saved replay of that game.
- A fresh agent reading CLAUDE.md, root CONTEXT.md, then
  02_build/CONTEXT.md finds no contradiction about where the game
  lives or what is deployed.
- Every RULES.md section 1 to 6 behaviour is either covered by a test
  or demonstrated in the playthrough; name any that is neither.
```
