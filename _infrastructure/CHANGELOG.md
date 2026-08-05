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
