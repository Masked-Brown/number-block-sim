# CHANGELOG.md - dated, append-only

What changed, when, by which act. Entries are appended at the end, never edited, never reordered,
never deleted. The one maintained file that cannot rot, because it only grows. This repo was
seeded blank-slate, so unlike its siblings there is no historical seed block; the record starts
at entry 0001.

Entry format (one entry per change event):

## NNNN - YYYY-MM-DD - <one-line summary>
- what: <the change, in one or two lines>
- where: <files touched>
- act: <job touchdown / review touchdown / human decision>
- decision: <for promotion gate decisions only, in the machine-read form: approve <candidate-id>
  or reject <candidate-id>, lowercase verb then the 12-hex id>

Promotion decisions (NORMS.md gate [D28]) are recorded here as their own entries with a
`decision:` line; the promotions view reads these lines to know a candidate is closed. The
lowercase form above is the one the sweep's parser matches; a decision line written any other
way does not close its candidate.

British English, no em-dashes, no exclamation marks.

---

## 0001 - 2026-08-05 - blank-slate seeding: the shared ICM infrastructure and the product zone

- what: the repo seeded whole from the estate's two live siblings, in six staged acts, each its
  own commit by explicit path (norm B10 throughout). Act 1 (285607f): the five-folder skeleton,
  the product-zone stage folders (01_rules to 04_publish with references/ and output/,
  03_train/output/runs/, _config/) and the !_tmp/CONTEXT.md gitignore negation. Act 2 (c303ff8):
  the rulebook; NORMS.md base layer B1-B12 byte-verbatim from youtube-pov, the grown layer
  seeded with the two inherited estate promotions, G1 (promoted in domain-wisdom-agent
  2026-07-21) and G2 (promoted in youtube-pov 2026-07-23, approve 5e13cba801d7 there), each
  landing together with its check in the copied loop code per the youtube-pov G1 precedent;
  DESIGN.md as youtube-pov's newer shared body merged with domain-wisdom-agent's
  commit-discipline, queued-vs-handed and open-error-ageing passages; the thin front door with
  an empty snapshot block. Act 3 (76edaf2): the loop code, schemas and prime assembler copied
  SHA-256-verified from domain-wisdom-agent's proven build, with one recorded adaptation:
  sweep.py's PRODUCT_ZONE_RE repointed from 01_-to-06_ to this repo's 01_ to 04_ plus _config.
  Act 4 (b8b65aa): the two-actor operating contracts and record templates, chosen per file for
  maturity across the siblings (domain-wisdom-agent's commit-safe CC_OPERATIONS.md and
  CC_TOUCHDOWN.md; youtube-pov's post-migration TEST_MODE.md, HANDOVER_PROMPT.md, LOG_PROMPT.md
  and prompts/CONTEXT.md), the six sweep-checked contract lines carried byte-verbatim, bee
  prefix nbs-. No OPERATIONS_SCOUT.md and no ORCHESTRATOR_PROFILE.md carried (two actors only;
  the absent canon file rides norm B7's D85 tolerance). Act 5 (c6f2773): CLAUDE.md authored
  fresh as the Layer 0 router with the commit-safe close from day one; the root CONTEXT.md as
  the product zone's Layer 1 task routing, stating the touchdowns-vs-stage-outputs separation;
  the four stage contracts (Layer 2, Inputs / Process / Outputs) with every undecided game
  detail marked TBD; 03_train's two-layer output (runs/ investigation layer, _FINDINGS.md
  verdict register) mirroring youtube-pov's analysis funnel; README rewritten. Act 6 (this
  entry's own commit): this CHANGELOG seeded fresh at entry 0001. Grown-norm candidates stay
  candidates: nothing number-block-shaped was promoted at seeding.
- where: the whole tree; per-act file lists are in the named commits.
- act: job touchdown (seed-icm-infrastructure, bee nbs-wor-1.0-z); the seeding order is AB's,
  carried by the worker bee's work order.

## 0002 - 2026-08-05 - rules locked at v1.0: 01_rules/output/RULES.md
- what: AB dropped and locked the game's rule specification at v1.0 (5x7 board and flow,
  deterministic seeded spawn with floor rise, orthogonal group merging, per-merge game score,
  the game-over condition), designed with the worker bee (nbs-wor-1.0-z) and committed by this
  job. Every canon and product-zone file that stated merge mechanics, spawn behaviour or scoring
  as TBD, or restated them inline instead of pointing at the spec, is reconciled to the locked
  file: `CLAUDE.md` ("What this is" and the guardrail bullet), `README.md`,
  `_infrastructure/DESIGN.md` A5, and `01_rules/CONTEXT.md`'s Outputs section, whose two TBD
  lines asserting settled-sounding premises are replaced. This entry is the co-edit CHANGELOG
  record (norm B11) for this job's canon edit to `CLAUDE.md`.
- where: 01_rules/output/RULES.md (new), 01_rules/CONTEXT.md, CLAUDE.md, README.md,
  _infrastructure/DESIGN.md
- act: job touchdown (lock-rules-reconcile-canon, bee nbs-wor-1.0-z); the rules were AB's
  decision, carried by the worker bee's work order and dropped as the file.

## 0003 - 2026-08-05 - ruling: a job may recover its own touchdown from quarantine during its own close
- what: AB's ruling on the B6/B12 tension surfaced by validation touchdown 0003 (the seeding
  job's self-recovery of its own quarantined touchdown): a job may recover its own touchdown
  from quarantine during its own close, before the job ends, with the round-trip recorded in the
  touchdown. Anything still in quarantine when a job ends is human-gated, no exceptions. This
  resolves the tension in favour of the recovery the seeding job made, and lands as a ruling in
  `_chronicle/prompts/CONTEXT.md`, not as a NORMS.md entry.
- where: _chronicle/prompts/CONTEXT.md
- act: human decision (AB), carried by job touchdown (lock-rules-reconcile-canon, bee
  nbs-wor-1.0-z).

## 0004 - 2026-08-05 - the playable game built and deployed; docs/ divergence; guardrail canon edit

- what: the game exists and is live. A pure deterministic engine (PCG32 via BigInt,
  bit-identical in Node and the browser, determinism a tested property: 23 passing engine
  tests plus a cross-environment hash check), a browser game, a cinema-mode replay viewer
  (versioned replay schema v1 with the optional reasoning[] array), and a GitHub Pages
  deployment from `main` `/docs` at https://masked-brown.github.io/number-block-sim/, enabled
  via the API. The code's home is `docs/`, a declared divergence from the plain stage shape
  (AB's decision, carried by the work order; the root CONTEXT.md routing and DESIGN.md A5
  record it), with `02_build/output/BUILD.md` as the architecture and verification record and
  `02_build/CONTEXT.md` reconciled (language TBD settled: vanilla JS ES modules, no
  dependencies; the sim interface contract's concrete base recorded). Canon edit under norm
  B11, this entry its CHANGELOG half and DESIGN.md A5 the co-edit: CLAUDE.md's guardrail
  bullet "no game UI polish, no deployment, no publishing infrastructure" replaced with the
  decided state, the Pages deployment existing as the only deployment surface while
  publishing infrastructure for the write-up stays unbuilt. README rewritten with the Play
  Now link.
- where: docs/ (new: index.html, cinema.html, test.html, package.json, css/, js/, test/),
  02_build/output/BUILD.md (new), 02_build/CONTEXT.md, CONTEXT.md, CLAUDE.md, README.md,
  _infrastructure/DESIGN.md
- act: job touchdown (build-game-engine-cinema, bee nbs-wor-1.0-z); the deployment and the
  guardrail change are AB's decision (2026-08-05), carried by the worker bee's work order.

## 0005 - 2026-08-05 - rules v1.1 and the game revision; self-check clause canon edit

- what: AB's playtest revision, locked as RULES.md v1.1 (v1.0 preserved beside it as
  rules-v1.0.md per 01_rules's new-version-new-file rule): the hard four-tier spawn window
  with floor rise replaced by a drifting probability curve over all live tiers (exact integer
  formula in the spec; the eight parameters are section 8 config tunables), board height 7 to
  6, controls cut to arrows plus space (direct-send and soft drop removed), the new block
  entering where the previous one locked. Engine, tests and UI reworked to match: 28 passing
  tests including exact-weight distribution checks, replay format v2 embedding its spawn
  parameters (v1 replays refused with a clear message), a home screen, NEXT and SPAWN
  POSSIBILITIES panels with live percentages, a researched dark-arcade visual treatment with
  proportional feedback effects (research recorded in BUILD.md before the design work), and
  cinema mode showing blocks falling at playback speed. Live at the existing Pages URL.
  Canon edit under norm B11, this entry its CHANGELOG half and DESIGN.md section 12 the
  co-edit: CLAUDE.md's work-order self-check gains the clause scoping the design-pack
  coupling to estate-level system design, per AB's ruling on touchdown 0008's numbered
  question; CLAUDE.md's two v1.0 version references updated to v1.1 in the same act as plain
  factual fixes. Stage contracts (01_rules, 02_build) reconciled to v1.1; README's board,
  controls and spawn lines corrected.
- where: 01_rules/output/RULES.md, 01_rules/output/rules-v1.0.md (new), 01_rules/CONTEXT.md,
  docs/ (play.html and js/fx.js new; index.html, cinema.html, test.html, css/style.css,
  js/engine.js, js/config.js, js/board-render.js, js/ui.js, js/cinema.js, js/share.js,
  test/engine.test.js, test/scripted-game.js revised), 02_build/output/BUILD.md,
  02_build/CONTEXT.md, CLAUDE.md, README.md, _infrastructure/DESIGN.md
- act: job touchdown (game-revision-v1.1, bee nbs-wor-1.0-z); the rules change, the controls
  cut and the visual direction are AB's decisions (2026-08-05), carried by the worker bee's
  work order; the self-check clause records AB's ruling of the same date.

## 0006 - 2026-08-05 - commit_safe.py: --pick-number now syncs the touchdown's frontmatter job: field
- what: closed the touchdown-number placeholder trap that had quarantined two touchdowns the
  same day (0011, 0013). CC_TOUCHDOWN.md's `NNNN` placeholder lives in two places, the
  filename and the frontmatter `job:` field; `commit_safe.py --pick-number` renamed the
  filename under the lock but left `job:` at its literal placeholder text, so a job that
  followed the template exactly quarantined its own touchdown on first close (schema failure:
  `job='NNNN'` fails pattern `^\d{4}$`). Fix (option (a) from touchdown 0013's own proposal):
  in the same held rename operation, `--pick-number` now also rewrites the frontmatter
  `job:` line to the picked number, scoped to that one line only (never a whole-body
  find-and-replace), computed and validated before any file is touched so a malformed
  touchdown refuses loudly rather than landing half-renamed. Proven by a scripted dry-run in
  an isolated throwaway clone (not a real record): the picked number landed in both places and
  the real sweep validated the touchdown first time, `quarantined=0`. CC_TOUCHDOWN.md itself
  needed no change; its `<NNNN>` is already generic template notation, and the fix makes the
  literal placeholder authors actually type resolve correctly. Estate check: `commit_safe.py`
  in domain-wisdom-agent (the repo this one's copy was proven against) still carries the
  unpatched rename with no frontmatter sync, so the trap is confirmed latent there; port-back
  is a deliberate later act, not done here. youtube-pov carries no commit_safe.py / pick-number
  mechanism at all (its job fills in the number itself when authoring the touchdown), so this
  specific trap does not apply to it in the same form.
- where: _orchestration/loop/commit_safe.py, _infrastructure/DESIGN.md (project appendix)
- act: job touchdown (fix-picknumber-and-corrections, bee nbs-[wor]-1.0-z); the fix was AB's
  approved direction (2026-08-05, carried by the worker bee's work order).

## 0007 - 2026-08-05 - decision: 03a simulation-lab gate passed; the stacking observation retracted, no game retuning
- what: AB's gate decision on the 03a job (touchdown 0013, train-lab-and-baselines): the
  ladder is healthy (heuristic-v0 median 114,210 against the recorded human playthrough's 228;
  determinism proven across four environments) and training proceeds on the game exactly as it
  stands. Two findings closed the open questions the job raised. First, BUILD.md's v1.1 tuning
  note that an unattended game reaching roughly 5,300 points showed same-column stacking to be
  generously rewarded did not survive measurement: over the frozen 500-game eval-v1 seed set,
  strict never-steer stacking has a median of 24 (about one seventieth of random's 1,700
  median) and is exactly column-invariant, while the spill variant reaches median 1,626,
  level with random and losing the head-to-head 247 to 253; the 5,300 game sits at the spill
  distribution's 94th percentile, so it was steered, not unattended as recorded. No spawn-curve
  retuning follows from it; BUILD.md's record stands untouched above a dated append-only
  correction (norm B3). Second, throughput is accepted at a best-of-five 820 games/min serial
  (this machine's run-to-run noise on identical code spans 548 to 812 games/min, which is why a
  single-pass figure is not trusted); no parallelisation is built now, per the CLAUDE.md
  guardrail against a training stack before a baseline agent's ceiling is measured.
- where: 02_build/output/BUILD.md (dated correction, appended; original text untouched)
- act: human decision (AB, 2026-08-05), carried by job touchdown
  (fix-picknumber-and-corrections, bee nbs-[wor]-1.0-z).
