# HANDOVER_PROMPT.md

When a worker bee runs out of room, or the work shifts from design to a long build, it does not just
stop. It writes a handover so a fresh chat resumes with no loss of state. Paste this into the outgoing
bee to produce the handover, then start a new bee with a fresh prime plus the handover.

The handover itself is pasted straight to the next bee; it is never a file committed to the repo.
The only handover-related file in the tree is this template, project canon at the `_chronicle` root
beside the record subfolders it shapes.

British English, no em-dashes, no exclamation marks.

---

Produce a handover document as a single artefact. It is a structured account a successor can boot from
cold. Open with the `Bee:` field. Keep it tight and factual; this is not a narrative, it is a baton.

```markdown
Bee: nbs-[wor]-<slug>
Handover written: <date>

## Who you are
<the successor's role and the slug to continue under: nbs-[wor]-<slug>-2>

## What this work is
<one paragraph: the goal of this piece of work and why it matters>

## What is built / done
- <each concrete thing that exists now, with the path if it is a file>

## Exactly where we are
<the single most important line: the precise next action, ready to pick up>

## Decisions locked this session
- <decision -- one line each, so the successor does not reopen them>

## Traps hit / things that bit
- <each trap and how it was resolved or avoided, so the successor does not repeat it>

## Open questions for AB
- <anything genuinely undecided that needs AB before proceeding>

## What to read on boot
- the prime's live-state block (the open-errors pointer and the last sweep digest; its source is
  the generated snapshot in `_infrastructure/INFRASTRUCTURE.md`)
- <any specific file the successor must see first>
```

The successor boots from this handover plus the prime, which carries the live-state block. AB starts
a fresh bee, pastes a fresh prime (`python _prime/src/prime.py`, then `_prime/PRIME_bee.md`) plus
this handover, and continues. The handover rides on top of the prime; it does not replace it.

---

## Writing it well

- Mark each fact as confirmed (verified by diagnostic this session) or assumed. They are not the same baton.
- Write file paths in full from the repo root, never "the puller script" or "that folder".
- State locked decisions as decided, not as open questions. Do not reopen what AB closed.
- The successor has this handover and the prime, and nothing else. If it matters and is not in the
  prime or the views, it goes here.

---

## Changelog

2026-08-05 -- seeded into number-block-sim from youtube-pov's copy (the post-migration boot
model: the prime's live-state block replaces the retired MAP_state pointer; the handover is
pasted, never committed). Bee prefix re-stamped to nbs-.
