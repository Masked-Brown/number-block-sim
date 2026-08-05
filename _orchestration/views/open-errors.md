<!-- generated: sweep.py | 2026-08-05T12:41:54 | corpus: a745e5cc | oldest: 2026-08-05 | self: c8a68124 - do not hand-edit -->
# open-errors.md -- open error entries, summary line then indented detail body, minus those a later fact resolves by id

- da857d5416c4 | 2026-08-05 | validate-icm-seeding | the close contract cannot be satisfied under the no-push constraint | source: 0003_validate-icm-seeding_2026-08-05.md
  What was attempted: closing this job per CLAUDE.md's "How every job closes" (touchdown,
  commit-safe save, `sweep.py --apply`) while honouring the work order's explicit "Do not push.
  Leave the commit local". What actually happened: both sanctioned paths push unconditionally.
  Observation core, the fact: `commit_safe.py` skips the push only when `git remote` returns
  empty (line 448); `sweep.py` does the same inside the held lock (line 2146); `--help` on both
  shows no push-related flag, and the only environment variable either reads is
  COMMIT_SAFE_LOCK_TIMEOUT. What it blocks: a job cannot close locally on a repo that has a
  remote, so any instruction to withhold work from origin forces a bypass of the sanctioned save
  path. Testimony, kept apart: the likely reading is that push-in-lock was designed for the
  steady state (spec 2.1, closing the force-push race) and no one has yet needed a close that
  withholds. A `--no-push` flag on both, recorded in the trace as a deliberate choice rather
  than as a false "no remote" note, would close this without weakening the race guarantee.
