# BUILD_RECORD.md -- how number-block-sim was built

The build story of a one-day experiment: a falling number-block game rebuilt from scratch, an
AI ladder trained to play it, and the honest measurement of what optimal play looks like.
Written for a technical outsider from the repo's own records (the architecture record
`02_build/output/BUILD.md`, the per-job touchdowns in `_chronicle/prompts/completed/`, the
campaign's `03_train/output/DECISION_LOG.md` and the infrastructure CHANGELOG). Everything
here happened on 2026-08-05, in one working day.

The results themselves live in `FINDINGS_AND_STRATEGY.md` beside this file. This document is
the story of the machine that produced them: what was built, in what order, what broke, and
what caught it.

## How the work was organised

Two actors built everything. A planning chat (the "worker bee") designed the sequence and
wrote precise work orders; Claude Code jobs executed them one at a time on the repo, each job
closing with an immutable logbook entry (a "touchdown") and an automated sweep that validates
the record. The repo carries its own rulebook: files are staged by explicit path only,
records are append-only, and a background loop nags any job that forgets to close. That
machinery matters to this story because it caught real mistakes, twice before lunch.

## Phase 1: infrastructure before code

The first act was git init, before any file was written, a lesson inherited from a sibling
project that once lost work in a pre-git era. The repo was then seeded whole from two existing
projects carrying the same infrastructure, and a deliberate second job validated the seeding
adversarially: fresh eyes, read-only, ordered to compare the new repo against its sources and
report rather than fix.

The validator earned its keep immediately. It found that the seeding prompt itself had
contradicted the repo's own rules (the project description stated merge mechanics as decided
while the product zone declared them TBD), and it refused two tempting workarounds on a close
it could not perform honestly, reporting the conflict instead. Both findings became small
follow-up jobs. The pattern, an independent check that fixes nothing and reports everything,
repeats through this story.

## Phase 2: rules first, then the game

The game's rules were locked as a written specification (`01_rules/output/RULES.md` v1.0)
before any game code existed: a 5-column board, one falling block at a time with an honest
one-block preview, orthogonally connected equal tiles merging to value times 2^(n-1), scores
multiplied by chain index so engineered cascades beat incidental pairs, and game over on
overflow with a clutch-rescue exception. Every later stage implements this file exactly; a
job that finds it ambiguous must stop and ask rather than interpret.

The build's load-bearing decision is that the engine is one pure module. `docs/js/engine.js`
takes a board state and a column and returns the new state plus an event list. No DOM, no
timers, no hidden randomness: the seeded generator is PCG32, implemented in BigInt so it is
bit-identical in Node and every browser, and asserted against reference vectors computed
independently. The browser game, the replay viewer and the later simulation harness all import
this same file, so the AI trains on exactly the game humans play. Determinism is a tested
property, not a hope: a scripted game must produce the same final hash in Node and in the
browser, and that check runs on the live site.

Replays fell out of this for free. A game is fully determined by its seed and move list, so a
few hundred bytes replay any game pixel for pixel. The replay format was versioned from day
one and carries an optional per-move reasoning array, which is how the AI's games later became
watchable: cinema mode, a page on the site, plays any replay with a reasoning panel beside the
board. The game deployed to GitHub Pages the same morning; push equals deploy, no build step,
no dependencies, anywhere.

AB's first playtest then drove a real revision, locked as rules v1.1: the board cut from 7
rows to 6, controls simplified to arrows and space, and the spawn model replaced wholesale.
The original hard four-tier spawn window became a probability distribution over every live
tier, peaking at a centre that drifts upward as the board's biggest tile grows, with a floor
weight so no tier's probability ever reaches zero. The maths is deliberately integer end to
end, because transcendental float functions are not guaranteed bit-identical across
JavaScript engines and determinism outranks elegance here. The game shows the live
distribution to the player; the AI's lookahead later used the same numbers through the same
engine call, which is what made the foresight experiment honest. The look and feel was
researched before it was styled (game-feel and juice literature, distilled into eight binding
findings in BUILD.md), and the v1.1 verification played a full game on the live URL.

## Phase 3: a lab you can trust, then the science

The training stage was split deliberately: first build the measurement instrument and prove it
honest, then run the science. The lab (`03_train/lab/`) is a headless Node harness that
imports the engine, never reimplements it. Its disciplines are the experiment's spine:

- A frozen exam. `eval-v1` is exactly 500 seeds, generated once, committed, checksummed, and
  never touched by training. Every headline number in the project is a median over those same
  500 games. A disjoint 2,000-seed practice pool serves all tuning.
- Named immutable versions. An agent's identity pins its features and weights; any change is a
  new version. Comparisons happen only between named versions that sat the identical exam.
- No manifest, no run. Every run folder opens with full provenance (agent, features, weights,
  seed checksum, engine commit and hash, spawn parameters) before the first game is played.
- Features as pluggable modules. A board-judgement feature is one file declaring its name,
  version and scoring function; adding or retiring one never touches the harness.

The first campaign settled an early scare cheaply. The v1.1 build had recorded an observation
that an unattended one-column game reached roughly 5,300 points, suggesting the game rewarded
brainless stacking. Measured properly over the frozen exam, strict never-steer stacking has a
median of 24, roughly one seventieth of the random baseline's 1,700, and the 5,300 game turned
out to sit at the 94th percentile of the steered variant's distribution: a false alarm from a
single unmeasured sample. The correction was appended to the record, dated, with the original
text left standing, and no retuning followed.

The campaign proper then climbed a ladder. Cross-entropy breeding tuned the hand-set weights
(fitness always on fixed practice-seed blocks with common random numbers, champions validated
on a held-out block before being named). Reading the bred champion's death boards showed every
loss dying the same way, a checkerboard of adjacent tiles too far apart in tier to ever merge,
which no existing feature measured; two new features (tier-gap cost and preview-merge
readiness) entered as modules, and the second breed's generation zero already beat the first
breed's entire ceiling. Expectimax search was then added over the honest preview and the live
spawn distribution, at fixed weights, so depth isolated search and nothing else. Behaviour
probes measured what changed: only the searching agent ever declines a cheap merge to bank a
bigger one. Mid-campaign, a practised human replay (score 121,496) was found, engine-verified
and eventually homed as the reference game; it retired the earlier 228-point unpractised
reference outright.

Practical honesty cost real effort here. The worker-pool runner had to be proven bit-identical
to the serial runner before its throughput counted; measured speed-up on this machine was
about 3x at 6 workers, not the hoped near-linear 10x, and every quoted timing in the record is
a best/median/worst over repeats because single runs on this hardware lie. A three-hour
compute checkpoint was written into the campaign and exercised mid-run, on evidence, before
the most expensive row was allowed to finish.

## The audit, and the one real self-deception it found

With the campaign closed, a fresh session was ordered to audit everything cold: maximum
scepticism, no knowledge of the builders' reasoning, fix nothing. Every number it attacked
reproduced exactly. And it found something real: at the deepest point of the search tree, one
feature read the engine's already-drawn next block, a value no player could legally know. The
decision log had even recorded that class of peek as "structurally impossible" after an
earlier path was closed; the feature layer was a second path, and it was live.

The remediation is the project's best story about its own methods, told in full in the
findings document. Leak-free agent versions were cut and sat the whole 500-game exam; paired
on identical seeds, the leak had changed 7.8 per cent of the agent's decisions and no
measurable score (both difference intervals contain zero). The leaked versions stay in the
record, marked superseded, because the pair is the measurement of what the leak was worth.
Two standing tests now hold the door shut: perturbing only the engine's hidden randomness must
never move a leak-free agent's choice and must move a leaked one's, and any feature that reads
the preview must be declared or the suite fails.

## Game v1.2: the game grades you back

The final build gave the game a post-game breakdown: every stat the rules define, plus an
accuracy grade, the percentage of moves on which the player matched the leak-free champion's
judgement, computed entirely in the browser with no network. That forced the project's one
deliberate duplication: GitHub Pages serves only the game's folder, so the judge is a faithful
copy of one pinned agent version, and a standing test in the lab imports the browser copy,
replays 270 real positions, and fails on a single disagreed column. The copy cannot drift
silently. A composite performance score (accuracy, score index, pace) ships beside it, every
constant a named tunable, the components shown so the number explains itself.

## What broke, and what caught it

The honest list, because the catches are the story:

- The seeding prompt contradicted the repo's own TBD discipline. Caught by the adversarial
  validation job, fixed in the rules-lock job.
- The closing tool quarantined two jobs' records in one day: it renamed the touchdown file
  with the picked number but left the placeholder inside the file, so the schema check
  correctly refused it. Caught by the sweep's validation, diagnosed, fixed in one line, and
  the same latent trap was confirmed unpatched in a sibling repo for a deliberate port-back.
- Cinema playback desynchronised in background tabs, because browsers throttle animation
  frames. Caught by the build job's own live verification, fixed so every step renders
  unconditionally.
- The 5,300-point stacking observation was false. Caught by measuring it: a dedicated stacker
  baseline over the frozen exam.
- The expectimax leaf preview leak survived a code review and a confident decision-log entry.
  Caught by the cold adversarial audit reading the code against the feature modules.
- The falling tile visually hovered above the stack: a CSS transition re-triggered every
  animation frame, so the drawn position lagged the true one by up to a cell. Reported by AB
  from play, diagnosed by the audit from code alone, fixed with one CSS rule and verified live
  at 0px lag.
- In-browser grading took over forty seconds in a backgrounded tab, because Chrome clamps
  timers there to roughly one per second. Caught by live measurement; the yield now rides a
  MessageChannel message, which is not throttled. The fix then hung the Node test suite,
  because a live port keeps the event loop alive; caught by the suite refusing to exit, fixed
  by closing the channel per grade.
- The one human reference score of 228 was an artefact of an unpractised tester. Caught by AB
  playing a real game; the practised 121,496 replay replaced it and reshaped a finding.

## Where it ended

At close of day: a playable, deployed game at v1.2 with an in-browser AI grade; a rules spec
locked at v1.1; a lab whose exam is frozen and whose runs are reproducible from their
manifests; ten named agent versions measured over 78,103 recorded simulated games; a findings
register at F001 to F008 with confidence tiers and dated corrections; the champion's best game
exported as a watchable, engine-verified replay; and a costed roadmap (`NEXT_STEPS.md`) for
everything deliberately not built. The numbers, and what they mean for how to play, are in
`FINDINGS_AND_STRATEGY.md`.
