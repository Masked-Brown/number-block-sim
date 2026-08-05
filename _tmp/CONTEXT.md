# CONTEXT -- _tmp/

## What this folder is
Scratch and diagnostic dumps. Always a single flat folder, never subdivided. The staging spot for
one-time mechanisms (a seed file dropped here, the mechanism reads it, the folder cleared on
completion) and for canon-edit backups taken before a CC job edits a canon doc or
`INFRASTRUCTURE.md`.

## Working rules
- Always a single flat folder. Never subdivided into subfolders.
- Empty is its resting state. Once a mechanism completes, everything it staged here is deleted.
- Canon-edit backups: a CC job editing a canon doc or `INFRASTRUCTURE.md` backs it up here first,
  flat, as `backup_<filename>`, disambiguated by folder prefix on a filename collision (for example,
  two files both named CONTEXT.md become `backup_canonical_CONTEXT.md` and
  `backup_coordination_CONTEXT.md`).
- Gitignored except `.gitkeep` and this CONTEXT.md.
- No secrets ever land here, even transiently. This repo holds no secrets yet; when one arrives,
  where it lives is recorded (locations only, never values) before it is used.

## Inputs
- Seed files AB drops here for a mechanism to read.
- Backups taken before canon-doc or `INFRASTRUCTURE.md` edits.
- Diagnostic and scratch outputs from CC jobs.

## Do not
- Do not subdivide into subfolders.
- Do not leave anything here past a mechanism's completion without a plan to promote or delete it.
- Do not write secrets here, ever.
