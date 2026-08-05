---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: game-revision-v1.1
job: 0009
date: 2026-08-05
model: claude-fable-5
effort: extended thinking
---

## Aim
Revise the game per AB's playtest: RULES.md v1.1 (drifting probabilistic spawn model, 6-row
board, arrows-plus-space controls), a home screen, a researched dark-arcade visual overhaul
with feedback effects, cinema mode showing falling blocks, and the self-check canon clause
from AB's ruling on touchdown 0008's question.

## What it was told
Rules change first-class: section 3 rewritten to a drifting peaked distribution (exact,
deterministic, parameters as config tunables, probabilities exposed as a pure engine
function), board 7 to 6, controls cut, spawn-follows-lock. Replay format bumped, v1 refused
cleanly. Research game feel BEFORE designing the look; darker, rawer, not neon-cliche.
CLAUDE.md self-check clause per AB's ruling, B11 couplings riding.

## What it did
Edited: 01_rules/output/RULES.md (v1.1; v1.0 preserved as rules-v1.0.md, new),
01_rules/CONTEXT.md, docs/ (play.html and js/fx.js new; index.html now the home screen;
engine, config, board-render, ui, cinema, share, test.html, both test files revised),
02_build/output/BUILD.md, 02_build/CONTEXT.md, CLAUDE.md (self-check clause plus two v1.0
version references), README.md, _infrastructure/DESIGN.md (section 12), CHANGELOG.md (0005).
Tests green: 28 of 28 (node --test docs/test/). Live and verified at the existing Pages URL.
Delegation: none

## Deliverables
- 01_rules/output/RULES.md -- v1.1, the locked spec; rules-v1.0.md preserved beside it
- docs/ -- the revised game, live: home screen, arrows-plus-space play, live spawn
  percentages, dark-arcade treatment with proportional effects, cinema with falling blocks
- docs/js/engine.js -- integer spawn distribution, pure and bit-identical cross-environment;
  replay v2 embedding its spawn parameters
- 02_build/output/BUILD.md -- game feel research (written before the design work), the v1.1
  what-changed-and-why record, updated verification record
- CLAUDE.md -- the self-check design-pack scoping clause (canon, B11 couplings done)
- _infrastructure/CHANGELOG.md 0005, _infrastructure/DESIGN.md section 12 co-edit
- README.md -- board, controls and spawn lines corrected to v1.1

## How it went
Clean overall; the one real bug was found by verification doing its job. Notes for future
jobs:

1. The spawn model avoids floats on purpose: linear decay in integer milli-tiers, floor
   division as RULES.md states it, and a cumulative-weight draw against r mod W. Math.exp
   would have read nicer and is NOT guaranteed bit-identical across JS engines;
   cross-environment determinism is a tested property here, so the formula is integer end to
   end. The distribution tests pin their own parameter set (SCRIPT_SPAWN), so AB can retune
   config.js without touching a test.
2. Replays embed the spawn parameters they ran under and verify against them. This was not
   explicitly ordered but falls straight out of "retuning must never be a code edit": without
   it, every retune would silently invalidate every recorded game. RULES.md 7 now states it.
3. The verification-found bug: cinema's falling-block animation initially drove its
   step-completion through requestAnimationFrame, which browsers throttle in unfocused tabs;
   the playback timer kept advancing the move index while renders were skipped, desyncing
   counter from board and stranding orphan tiles. Rewritten so every step's final frame
   renders unconditionally and a new step force-completes any in-flight fall (forced reflow
   plus timeout, no rAF dependency). Full 4x playback now advances every frame with zero
   orphans. The general lesson: playback progression must never depend on the browser
   granting animation frames.
4. The 01_rules stage contract says new spec version = new file, prior versions kept; the
   order said version RULES.md in place. Honoured both: RULES.md stays the single live path
   every consumer references, v1.0 frozen beside it as rules-v1.0.md.
5. Research before design worked as ordered: the eight distilled findings (BUILD.md) directly
   shaped the effect budget (proportional-and-brief shake, escalation bound to chain index,
   depth-not-brightness for heavy tiers, the quiet possibilities panel, reduced-motion).
   The 2048 issue-71 lesson (high tiers converging on similar light golds) drove the
   distinct-hue-per-tier ramp.
6. Tuning observation for AB's fine-tune pass, recorded in BUILD.md: an unattended game
   (no steering, centre-column stacking) reached roughly 5,300 points through self-fed
   vertical merges, so repeated same-column stacking is generously rewarded under launch
   parameters. All eight curve parameters are config tunables, so this is a config edit.
7. Self-check on this order: it edits canon (CLAUDE.md); both B11 couplings were named and
   are done. The design-pack companion, under AB's own ruling being codified here, does not
   bind a project-local router clause; if AB wants the same clause in the estate starter's
   routers or an icm-final entry, that is an estate act outside this repo.
8. Scope nudges, all factual reconciliation, named here so nothing is silent: README's
   board/controls/spawn lines corrected (not in the order's scope list but public and flatly
   wrong after the rules change); CLAUDE.md's two v1.0 version references updated to v1.1 in
   the same gated act as the ordered clause; 01_rules/CONTEXT.md and 02_build/CONTEXT.md
   version references reconciled. The _config/CONTEXT.md extract-location gap from touchdown
   0008 remains open and queued; RULES.md section 8 now names docs/js/config.js as the
   tunables home, which the review may treat as evidence when it drains that item.
Grade: 4
Prompt quality: yes: the order was precise where precision mattered (the spawn model's
required properties, the refusal behaviour, research-before-design) and left the right
things open (the exact formula, the palette). Nothing in it fought the repo's standing
rules; the one tension (new-version-new-file) it left to the stage contract, resolved as
note 4.

## Correction passes
none

## Any errors
- cinema playback desynced under animation-frame throttling -- status: recovered
  What was attempted: verifying cinema mode's new falling-block animation by running full
  playback at 4x in the automation tab. What actually happened: the counter stayed at move
  0 while the board showed a late-game state with an orphaned falling tile; reproduced
  deterministically on a fresh load at 4x. Observation core: stepForward advanced the move
  index on every timer tick, but renderFrame ran only inside the fall animation's completion
  callback, which was scheduled via requestAnimationFrame; browsers throttle or suspend rAF
  in unfocused tabs, so completions never fired while the index ran to the end. Fix: the
  completion is now an idempotent complete() driven by setTimeout after a forced-reflow CSS
  transition, a new step force-completes any in-flight fall, and stepBack/loadReplay settle
  pending animation first. Verified: full playback at 1x, 2x and 4x advances every frame
  (29 distinct counter frames on a 28-move replay), zero orphan tiles, final score matching.
- CDP evaluate timed out during the live playthrough -- status: recovered
  What was attempted: driving a full arrows-and-space game on the live URL from one
  javascript_tool call awaiting game over (up to 90 s). What actually happened: the CDP
  Runtime.evaluate call timed out at 45 s while the in-page loop kept playing; the game
  finished on its own (28 blocks, score 228), confirmed by a follow-up read. Nothing was
  lost; the lesson is to keep browser-driving evaluations under the 45 s transport cap and
  poll from separate calls.

## Map flags
none (no maps exist in this repo; no flag is warranted)

## Gaps
gap: the unattended-play tuning observation (BUILD.md, v1.1 section): centre-column
stacking with no steering self-scores into the thousands under launch spawn parameters.
Not a defect against RULES.md v1.1 (the maths is as specified) and not this job's call to
retune; queued so AB's fine-tuning pass sees it alongside the config tunables built for
exactly this.

## Resolutions
none

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
# Claude Code work order -- game-revision-v1.1

From worker bee: nbs-[wor]-1.0-z
Model: opus | Effort: extended thinking | Rationale: a rules change plus
a visual and feel overhaul; the spawn maths must stay deterministic and
testable, and the design work needs real research not defaults.

## Task
Revise the game per AB's playtest: a new probabilistic spawn model
(a RULES.md change), simplified controls, a shorter board, a home
screen, a darker rawer visual treatment with engagement polish, and a
cinema mode that shows blocks falling.

## In scope
- 01_rules/output/RULES.md -- version to 1.1. Section 3 rewritten per
  the spawn model below. Section 1 board height 7 to 6. Section 2
  controls cut. Record the change and its date in the file.
- docs/ -- engine, UI, cinema, config, plus a new home screen.
- docs/test/ -- tests updated and extended for the new spawn model.
- 02_build/output/BUILD.md -- record what changed and why.
- _infrastructure/CHANGELOG.md -- entry for the rules version bump.
- CLAUDE.md work-order self-check -- add one clarifying clause: the
  icm-final design-pack coupling applies to estate-level system design,
  not to project-local facts such as a guardrail line. AB ruled this on
  touchdown 0008's numbered question. B11 couplings apply.

## Out of scope
- 03_train/, 04_publish/ -- nothing.
- No AI agent, no scoring changes beyond what the rules change forces.
- Merge maths, chain scoring, game-over rules -- unchanged.

## CONTEXT to read
- 01_rules/output/RULES.md, 01_rules/CONTEXT.md
- 02_build/CONTEXT.md, CONTEXT.md (root)
- 02_build/output/BUILD.md
- _orchestration/CONTEXT.md (canon edit rides this)

## Constraints
- The spawn model must stay fully deterministic from the seed, and the
  cross-environment determinism test must still pass. Existing replays
  will break; that is accepted, bump the replay format version and have
  cinema mode refuse an old replay with a clear message rather than
  replaying it wrongly.
- All spawn-curve parameters live in the config file as named tunables.
  Retuning difficulty must be a config edit, never a code edit.
- The AI in phase 3 will need the exact spawn probabilities for its
  lookahead. Expose them as a pure engine function, not UI-only maths.

## Do, part 1: the spawn model (rules change)
1. Replace the hard four-tier window with a probability distribution
   over every live tier from 2 up to the current ceiling:
   - A drifting centre tier that rises as the board's max tile rises.
   - Probability peaks at the centre and decays either side, so low
     tiers stay possible late (rare, not impossible) and high tiers
     appear occasionally early.
   - Every tier keeps a small floor probability; nothing ever hits zero.
   - Tune so early game is noticeably harder than v1.0 but a competent
     player still reaches a few hundred points. AB will fine-tune after.
2. Update RULES.md to state the model exactly, in plain terms plus the
   formula. Version 1.1, dated, with a one-line change note.
3. Tests: distribution sums to 1 at every stage, the centre drifts as
   specified, no tier ever reaches zero, determinism holds.

## Do, part 2: controls and board
4. Board height 7 to 6. Columns stay at 5.
5. Controls: left and right arrows, and space to drop. Remove Z X C V B
   entirely. Remove soft drop. Update the in-game help.
6. A new block spawns in the column where the previous block landed,
   not always the middle.

## Do, part 3: interface
7. Split the single info panel into two distinct boxes: NEXT, visually
   prominent, showing the one upcoming block; and SPAWN POSSIBILITIES,
   quieter, listing each possible value with its current percentage.
   Drop the word "window" and drop the floor number from the UI
   entirely. Percentages update live as the distribution drifts.
8. Home screen: title, Play, Cinema mode, How to play, and a link to
   the rules. Every screen can get back to it. Navigation should need
   no explanation.
9. Cinema mode: show the block falling before it locks, briefly, so a
   viewer sees the movement rather than blocks appearing. Fall speed
   scales with playback speed. Everything else (65/35 layout, reasoning
   panel, step, pause) unchanged.

## Do, part 4: look and feel
10. Research first, then design. Read up on what makes falling-block
    and merge games feel good to play: game feel and juice (screen
    shake, particle bursts, squash and stretch on landing), anticipation
    and feedback timing, near-miss tension, readable colour hierarchy in
    puzzle games, and why tile colour ramps work in 2048-likes. Write
    what you found into BUILD.md before you code, then design from it.
11. Visual direction from AB: darker, rawer, slightly arcade, not
    retro-pixel and not neon-cliche. Sharper corners, tiles noticeably
    less rounded. Keep a colour ramp so tier is readable at a glance;
    iterate the palette rather than replacing it wholesale. Higher tiers
    should feel like they carry weight.
12. Add restrained feedback effects: landing impact, merge burst scaled
    to merge size, chain reactions escalating visibly, a distinct signal
    when a merge is large, subtle danger state as the board fills.
    Respect prefers-reduced-motion. Effects serve legibility first; if
    an effect makes the board harder to read, cut it.

## Verify (before you close)
- All tests pass, including the new spawn-distribution ones. State the
  count.
- Determinism holds in Node and browser on the live URL.
- Play a full game on the live URL start to game-over using only arrows
  and space. Confirm the new spawn feel: harder, still fair.
- Cinema mode shows falling blocks, refuses a v1.0 replay cleanly, and
  plays a fresh one.
- Home screen reaches every mode and every mode gets back.
- RULES.md v1.1 and the code agree on the spawn model, exactly.
```
