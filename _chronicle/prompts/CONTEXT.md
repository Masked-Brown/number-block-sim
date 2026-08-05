# CONTEXT.md - local rules for `_chronicle/prompts/`

The touchdown record: one file per job, written by the job itself as its closing act, per the
template `_orchestration/CC_TOUCHDOWN.md` and validated against the schema version its own
`schema:` field names (`_orchestration/loop/schema/td_v<N>.json`; current: `td_v2.json`).

- Filename: `<NNNN>_<slug>_<YYYY-MM-DD>.md`. NNNN is a zero-padded ever-incrementing sequence:
  scan `pending/` and `completed/` for the highest number and add one. A same-number collision
  between parallel jobs is a tolerated minor cost, not a failure; the FULL filename is what must
  be unique. (A stated count of touchdowns is a different thing from a number allocation: it is
  a count of filenames, norm G1.)
- Write to `pending/` only, and nothing but touchdowns lands there (`.gitkeep` aside). The sweep
  snapshots it as its working set, so a stray non-touchdown file here is a hazard.
- Never write into `completed/` and never edit anything already there: completed touchdowns are
  the immutable record, moved there by the sweep alone. Location is the state; there is no
  harvested flag to flip.
- `quarantine/` holds touchdowns that failed validation, each beside a `<name>.reason.txt`
  naming why. Nothing is ever silently dropped. Leaving quarantine is a human act: fix the file
  and return it to `pending/`, or retire it deliberately. No tool empties it.
