---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: adversarial-audit-training
job: 0019
date: 2026-08-05
model: claude-fable-5
effort: maximum extended thinking
---

## Aim

Cold adversarial audit of the game, the lab, the training campaign and findings F001 to F006,
by a job that built none of it; plus advisory recommendations for deepening the game and the
experiment. One write exception: home the human benchmark replay.

## What it was told

Audit read-only for where the experiment fools itself (measurement integrity, version honesty,
findings evidence, champion behaviour, instrument bias, record honesty), reproduce at least two
ladder rows and one finding from pinned artefacts, explain AB's floating-block glitch from code
reading, then recommend rule changes and experiment extensions with costs and before/after-
publish calls. Fix nothing except homing nbs-replay-121496.json.

## What it did

Files changed: `nbs-replay-121496.json` moved from the repo root to
`03_train/output/reference/nbs-replay-121496.json` (the one canonical copy; the work order's
claim of a second copy in `_tmp/` was checked and is false, `_tmp/` holds only its .gitkeep and
CONTEXT.md, so there were no strays to remove beyond the root original). No other repo file
touched. Tests: green (docs suite 28 pass, lab suite 19 pass, run fresh).
Delegation: 1 subagent (Explore@inherited) for chronicle and run-folder inventory.

## Deliverables

- 03_train/output/reference/nbs-replay-121496.json -- AB's practised human game, engine-verified
  (score 121,496, hash a613b2d4) and verified in live cinema (green badge), F004's evidence.
- The audit report itself, carried in How it went below and in the job's closing output.

## How it went

The audit ran diagnostic-first: code read cold, then every load-bearing number reproduced from
the pinned artefacts before reconciling with the decision log. The infrastructure made that
easy, which is itself a finding: manifests pin engine commit and sha256, seeds carry their own
checksums, and every recorded game replays. Reproductions, named with their numbers:

1. All 2,500 recorded eval games (five ladder rows x 500) re-run through the engine: zero
   mismatches on score, final hash, max tile, blocks placed, longest chain. Seed order is
   exactly eval-v1's first 500 in every row.
2. Ladder rows reproduced from the registered immutable modules, agent level, bit-exact:
   heuristic-v2 500/500 games, expectimax-d2-v1 40/40, expectimax-d3-v1 8/8 (moves, score,
   hash). Medians, quartiles, maxima all recompute to the quoted digits.
3. Head-to-heads recomputed: d3 over d2 325/500, v1 over v0 298/500, d2 over v2 401/500. All
   as claimed; all far beyond sign-test noise.
4. Behaviour probe re-run (expectimax-d2-v1, 50 train games): every recorded figure reproduced
   exactly (takenWhenAvailable 0.896, declined 0.104, banked-instead 0.5369, burial 0.2203,
   margin 0.02017, merge totals 23267/1684/35, raisedOverHigherGain 0).
5. eval-v1 sha256 today equals the campaign's opening record (cb22c493...5df7d3); the file has
   exactly one commit in its history; train/eval overlap recomputed at 0 of 2,000.
6. Human replay and champion replay verify through the engine; the homed human replay was
   loaded into cinema on the live site and showed the green verified badge, 256 moves, 121,496.

**Audit verdicts per item.**

Item 1, measurement integrity: PASS with two CONCERNs. The exam is genuinely frozen and
training never touched it. CONCERN A, the real find of this audit: **expectimax depths 2 and 3
violate their stated information set through the feature layer.** `next-merge-ready` reads
`ctx.next` (03_train/lab/features/registered/next-merge-ready.js:28), and at depth 2 or more
positional features are evaluated only at leaf contexts (expectimax.js evaluate/bestLastPly),
where `ctx.next` is the engine's real but unknowable draw: the third block at d2 leaves, the
fourth at d3 leaves. The decision log's claim that the peek is "structurally impossible" is
false as stated; the deleted recursion was one peek path, the feature layer is another and it
is live. Quantified on 60 paired train games (offset 1600, outside every campaign block):
zeroing the leaked feature flips 7.8 per cent of d2 decisions (888 of 11,422 moves) but moves
the paired median only from 455,286 to 446,140 (head-to-head 33-27, not significant at n=60).
So the ladder's depth conclusions survive on magnitude, and the mechanism sentence in F001
does not survive verbatim. CONCERN B, milder: the two campaign features were designed by
inspecting the worst EVAL games of v0 and v1 (the death boards named in the decision log), so
feature selection saw exam games even though breeding never did. Defused mostly by the held-out
train validation (uplift 1.45x there, identical to the eval uplift), but publish-grade hygiene
would inspect train losses instead.

Item 2, version honesty: PASS. Reproductions 2 and 3 above. One nick: buildManifest drops the
agent's structured `search` block (manifest.js:64-71 keeps features and weights only), so d3's
coverage 0.9 is pinned in the module and the describe string but not as a structured manifest
field.

Item 3, findings: verdicts below.

Item 4, the champion: PASS, not exam exploitation. Column usage across all d3 eval games is
balanced (13.9 to 23.2 per cent); score is cascade-carried exactly as the game intends (50-game
decomposition: chain indices 3 to 5 carry 58 per cent of all points, chain 1 only 8.3);
survival median 639 blocks; overflow locks about one per game and only when forced. Train-seed
medians sit level with eval medians (my probe: 455k on train against 428k on eval for d2), so
no exam-shaped play. The 5.6x over v0 is real skill under the leak caveat above. One structural
note: candidatesOf prunes to open columns for every agent, so no agent ever CHOOSES an overflow
lock; the clutch-rescue mechanic (RULES.md 6) is unexplored by construction, not by evidence.

Item 5, the instrument: PASS with notes. Engine implements RULES.md 3 to 6 exactly as written
(the modulo draw is the spec's own; bias order 1e-6, immaterial). Metrics honest, quantile
method documented, best-ever CEM champion validated held-out (winner's curse handled). **The
floating-block glitch is explained from code, renderer only, engine clean, and was confirmed
live:** `.tile` carries `transition: top 130ms ease-in` (docs/css/style.css:151) and the
falling tile, unlike settled tiles (`no-anim`) and the ghost, never disables it; ui.js
positionFalling rewrites style.top every animation frame, each write restarting the 130ms
ease-in near zero velocity, so the rendered tile lags its true position by up to a cell and
hangs visibly above the stack until the settled render snaps it into place. Measured live on
the play page: computed top lagging the styled target with the transition active
(`top 0.13s ease-in, left 0.08s ease-out` on the falling tile). Secondary freeze mode, benign:
rAF throttling in a hidden tab pauses the fall entirely. One-line fix when a build job is
licensed: `.tile.falling { transition: left 80ms ease-out; }` (keep the slide, kill the lag).

Item 6, the record: PASS. The decision log matches the runs on disk everywhere I checked,
including the awkward bits (parallel speedup 3x not 10x, the killed-and-relaunched breed, the
14:20 budget overrun decision). Claims a fresh reader could not reproduce: none found beyond
the two-seed coverage-0.9 comparison, which the log itself flags as thin. The register-entry
authorisation tension is recorded openly rather than smoothed over.

**Findings verdicts.**

- F001 (depth dominant, strong): UPHOLD ON MAGNITUDE, AMEND MECHANISM. The 2.09x and 3.15x are
  reproduced and dwarf the measured leak effect, but "attributable to search alone" and the
  information-set purity claim are false until the leaf leak is fixed or priced honestly.
  Recommend the strong tier survives only with the amendment plus a clean re-run (proposal 1).
- F002 (fragmentation kills flat play, supported): UPHOLD. Breed records verify; generation 0
  of breed 2 beating breed 1's ceiling is the clean evidence the features carry value.
  Eval-death-board provenance noted (CONCERN B) but the held-out validation carries it.
- F003 (banking is a search behaviour, supported): UPHOLD. Probe reproduced digit for digit.
  Caveat for the write-up: d2's banking choices are partly leak-informed; the decline rate of a
  leak-free d2 was not measured and should be, cheaply, alongside proposal 1.
- F004 (human gap was an artefact, suggestive): UPHOLD AT SUGGESTIVE, with the boundary stated
  plainly now the replay is homed: one practised game by one player supports exactly one claim,
  that a practised human plays in the same REGIME as flat heuristic play rather than three
  orders below it; the 228-based gap reading is dead. It cannot support "sits level with",
  cannot order the human against v1 or v2 (flat agents' own q1-q3 spans 2 to 3x), and carries
  selection ambiguity (a downloaded replay is plausibly a best-of-session, and the file's
  score-stamped name comes from the download path). The finding's own thin-flag is honest;
  soften "sits level with" to "sits in the regime of" at publish.
- F005 (never bury a low tile, supported): UPHOLD. Weight trajectories and probes verify. The
  causal reading rests on breeding correlations; a one-row ablation (v2 weights, strand-risk 0)
  would convert it from correlational to causal for one eval run's cost.
- F006 (drift survived, not chased, supported): UPHOLD as the measured null it claims to be.
  Note the probe only detects MYOPIC chasing (a raise declined for strictly higher immediate
  gain); a strategic chaser sacrificing now for future spawn quality is outside every current
  feature's expressive range, which the finding's "untested in general" already concedes.

Grade: 4
Prompt quality: yes, unaided. The order's spine (form your own view first, reproduce from
pinned artefacts, one write exception, fix nothing) is exactly what surfaced the leak: reading
expectimax.js cold against the feature layer, rather than reading the decision log's assurance
first, is why the "structurally impossible" claim got checked instead of believed. One nick:
the order asserts a replay copy in `_tmp/` that does not exist, which cost a verification pass;
stated here so the bee knows the report of it was stale.

## Correction passes

none

## Any errors

none

## Map flags

none

## Gaps

gap: `03_train/output/_FINDINGS.md` F004's Evidence field says the replay sits at the repo
root, uncommitted; it now lives at `03_train/output/reference/nbs-replay-121496.json`. The
register is AB-gated, so this audit did not edit it; the next promotion pass should update the
path and may cite this job's cinema and engine verification.

gap: `03_train/output/DECISION_LOG.md` (expectimax design entry) records "the peek is now
structurally impossible". The log is append-only and the claim is false as stated (the leaf
feature layer reads the real draw; evidence in this touchdown). A later campaign job should
append the correction entry rather than edit; the write-up must not quote the sentence.

## Resolutions

- resolves: 0b7c9d5d941a -- the stray human replay is homed at
  `03_train/output/reference/nbs-replay-121496.json` under AB's explicit instruction in this
  job's work order (the human-gate decision the reroute was waiting for), engine-verified
  (score 121,496, hash a613b2d4) and cinema-verified on the live site (green badge); the root
  stray is gone and no `_tmp/` copy exists.

## Proposals

```
Proposal 1, before publish, the one that gates F001's tier: cut leak-free expectimax versions
(d2-v2, d3-v2) whose leaf evaluation either drops next-merge-ready or replaces it with its
expectation over the live distribution, and re-run the two eval rows (about 40 minutes at 6
workers for d3, minutes for d2). Publish the honest rows; keep v1 rows in the record as the
leak-measurement comparison. Also re-run the banking probe on the leak-free d2 so F003's rates
are clean. Invalidates nothing already published; restates two ladder rows.
```

```
Proposal 2, before publish: commission the practised-human set the smoke ladder already asked
for. Five to ten deliberate games by AB (and ideally one other person), all replays saved to
03_train/output/reference/, protocol noted (games played to completion, no cherry-picking;
retention of every game is what removes F004's selection ambiguity). Roughly an evening of
play; F004 is the only finding resting on n=1.
```

```
Proposal 3, before publish, pure analysis, no new runs: add uncertainty to the ladder.
Bootstrap CIs on each row's median and paired-difference intervals for each rung (the per-game
lines already exist in games.jsonl), plus a fixed-horizon robustness panel (score after N
blocks, recomputable by replaying recorded games through the engine) to show the ladder's
ordering is not an artefact of survival compounding. An afternoon of scripting.
```

```
Proposal 4, before publish, one CSS line in a licensed build job: fix the falling-tile hover
(style.css .tile transition applies to .tile.falling; give the falling tile its own transition
with top removed). Presentation only, zero effect on any result.
```

```
Proposal 5, either side of publish, one eval row each, cheap: (a) strand-risk ablation at v2
weights to make F005 causal; (b) an overflow-lock-considering expectimax variant to price the
clutch-rescue mechanic, which no current agent can choose; today it is unexplored by
construction and pricing it is a genuinely publishable curiosity.
```

```
Proposal 6, after publish, the tuning study: the spawn curve is well-shaped for the AI but the
human game is pairs (the homed human replay: 193 pairs, 23 triples, one chain-5 worth 36 per
cent of the score) while the AI's score is chains 3 to 7, so the game's stated soul, engineered
cascades, is largely inaccessible at human speed. Parameter tests worth running as a sweep,
each invalidating every absolute score, so batch them: slope 300 to 450 (sharper, more
plannable peak), centreGain 400 to 600 (faster drift, shorter survival tail, less score
compounding), floorWeight 40 to 20 (less late-game low-tier garbage, weaker fragmentation
pressure) and the converse directions as controls. Judge on median human-relevant horizon
(score at 256 blocks) and on flat-vs-search gap, not raw medians. Separately, the one RULE
change most likely to deepen human play is a two-block preview (rules v1.2): it moves banking,
the game's cleanest depth skill, inside human reach; large cost, invalidates everything,
after publish only.
```

## _tmp outputs

- none

## Work order verbatim

```
# Claude Code work order -- adversarial-audit-training

From worker bee: nbs-[wor]-1.0-z
Model: fable | Effort: maximum extended thinking | Rationale: the
whole point is a fresh, maximally sceptical mind auditing work it did
not do; findings from this audit gate everything published later.

## Task
You did not build this experiment. Audit it cold: the game, the lab,
the training campaign and its six findings. Your job is to find where
this experiment is fooling itself, then to recommend, separately, how
the game and the experiment could be made deeper and more intriguing.
You fix nothing, except one mechanical opening chore.

## Opening chore (the one write exception before read-only begins)
- Locate AB's human benchmark replay nbs-replay-121496.json (reported
  at the repo root; AB has since placed a copy in _tmp/). Home ONE
  canonical copy at 03_train/output/reference/nbs-replay-121496.json,
  remove the strays, verify it through the engine and in cinema mode
  on the live site, and commit it via the sanctioned close path at
  the end. It is load-bearing evidence for finding F004.

## In scope (read everything, in this spirit)
- docs/ -- the game and engine as shipped
- 01_rules/output/ -- the law and its versions
- 03_train/ -- harness, seeds, runs, weights, decision log, findings
- The record: touchdowns, CHANGELOG, BUILD.md

## Out of scope
- Fixing, retuning, retraining, editing findings. You report only.
- 04_publish/ -- nothing exists there yet.

## CONTEXT to read
- 03_train/CONTEXT.md, 01_rules/CONTEXT.md, CONTEXT.md (root)

## Part 1: the audit (find where we fool ourselves)
Form your own view before reading the decision log or findings, then
reconcile. Check at minimum, and add your own attacks:
1. Measurement integrity: eval-v1 genuinely frozen (hash history),
   train/eval genuinely disjoint, no feature or decision anywhere in
   the campaign that could have leaked exam information.
2. Version honesty: every ladder row a named immutable version, its
   pinned weights and features reproducing its claimed numbers.
   Re-run spot checks: pick at least two ladder rows and one finding
   and reproduce their numbers from the pinned artefacts yourself.
3. Findings F001-F006: for each, is the evidence sufficient for its
   confidence tier, is the mechanism claimed actually demonstrated,
   and what alternative explanation survives? Challenge F004
   specifically now that the human replay is homed: one practised
   game is one game; state plainly what it can and cannot support.
4. The champion: watch its enriched replay and probe its behaviour
   for degenerate strategies the exam might reward but a human would
   call cheap or dull. Is 5.6x real skill or exam exploitation?
5. The instrument: anything in the harness, spawn maths, or metrics
   that quietly biases results. Attempt to explain AB's reported
   floating-block glitch (a block visually hovering mid-air during
   human play) from code reading alone; renderer suspected, engine
   hash verified. Report a hypothesis or say it needs live repro.
6. The record: does the decision log honestly reflect the runs on
   disk? Any claim in any report a fresh reader could not reproduce?

## Part 2: recommendations (AB asked for these explicitly; advisory
only, nothing implemented)
7. Rule changes you would recommend and why: anything that would
   make the game a deeper, more intriguing testbed. Include your
   assessment of the spawn probability curve specifically: is the
   current drift well-tuned for interesting play, and what exact
   parameter changes would you test?
8. Experiment extensions that would add real depth or credibility:
   better tests, richer probes, stronger baselines, anything the
   ladder is missing.
9. For every recommendation: the cost, what existing results it
   would invalidate (a spawn change invalidates every score), and
   whether you would do it BEFORE or AFTER publishing v1 findings.
   Rank the full list by value for AB's goals: a rigorous, shareable
   experiment and an engaging game.

## Report
- PASS / CONCERN / FAIL per audit item with evidence paths.
- Findings verdict: for each of F001-F006, uphold, downgrade
  confidence, or challenge, with reasons.
- Ranked recommendations with costs and before/after-publish calls.
- What you would fix first, as a draft outline for 03d. Fix nothing.

## Verify (before you close)
- The homed replay verifies in engine and cinema; strays removed.
- Every reproduction you ran is named with its numbers.
- Your close lands clean first time.
```
