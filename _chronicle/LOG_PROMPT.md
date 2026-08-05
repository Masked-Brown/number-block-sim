# LOG_PROMPT.md

Paste this at the close of a feature to produce the journal. One prose artefact, dropped in
`_chronicle/sessions/`. Narrative, not a build record. Tell the story so a future read understands
not just what was built but why the calls were made.

British English, no em-dashes, no exclamation marks.

---

Produce the journal as a single downloadable .md file artefact, not pasted inline in the chat, so it
can be saved straight to `_chronicle/sessions/`. Open with the `Bee:` field. Write in prose, not
bullet-soup.

```markdown
Bee: nbs-[wor]-<slug>
Feature: <short name>
Started: <date>
Ended: <date>

## What this feature was
<the goal, and why it mattered to the system>

## What got built
<the narrative of the work: what was made, in what order, what it does now>

## The calls that mattered
<the decisions taken and the reasoning, especially any that closed off an alternative or that a
future self might second-guess>

## What bit, and what it taught
<traps hit, surprises, anything the system learned from friction; candidates for a source-level fix>

## Where it leaves us
<the state of play after this feature, and the honest next action>
```

---

## Part 2 (optional) -- Orchestrator profile evidence

Only include this when the session revealed something real about how AB reasons. Evidence, not flattery:
every entry points to a specific moment in this chat, and quotes him where it lands. If a heading had
nothing real this session, write "Nothing observed this session" rather than padding it. This feeds
`_orchestration/ORCHESTRATOR_PROFILE.md` when AB runs an enrichment pass.

```markdown
## Part 2 -- Orchestrator profile evidence

### Principles observed
Which operating principles showed up (architecture-first, legibility-over-cleverness,
regenerate-not-copy, anti-overbuild, decisions-over-options, honest-downside), each with the specific
moment that evidences it.

### Trade-offs observed
Moments AB resolved a conflict between two principles, and how. The most valuable heading: his judgement
lives in the trade-offs, not the principles alone. If none surfaced this session, say so.

### Communication patterns observed
How he ran the conversation: terseness, decisions-not-options, pushback given or demanded, what he cut
short. Anything that would change how a clone talks to him.

### New or surprising patterns
Anything that does not fit the headings above, flagged as a candidate for the profile. If nothing new,
say so explicitly.

### Worked examples (two to three)
- **Situation:** what was on the table
- **Decision:** the call he made
- **Reasoning:** why, in his terms (quote him if possible)

### Durable vs contingent
For each observation above: DURABLE (how he always reasons) or CONTINGENT (specific to this session,
must not become a standing rule). When unsure, mark contingent.
```

---

## Part 3 (optional) -- Feedback capture

Only include this when the conversation holds explicit feedback: a moment where AB actually rated an
output good or bad, in his own words. Scan this conversation for those moments only; never infer
sentiment from tone, from silence, or from an output simply being used. Each moment is recorded as
three separated fields, because this system runs on checks, not grades: AB's verdict is a fact, the
output's shape is a fact, and a model reconstructing why its own output was praised is the
job-observed confabulation class the fact-plus-testimony split exists for, so the inferred reason
stays labelled a guess and is never stated as fact. Purpose, stated so no future reader mistakes it:
these entries are training data for the orchestrator profile, consumed by a later enrichment pass;
they are not self-grading.

```markdown
## Part 3 -- Feedback capture

### <the output, in a few words>
- FACT: AB's verbatim verdict, quoted, and which output it was on.
- ARTEFACT: the concrete structure or format that output used, described plainly.
- TESTIMONY: the bee's inferred reason it landed, explicitly labelled a guess, never stated as fact.
```

---

## Changelog

2026-08-05 -- seeded into number-block-sim from youtube-pov's copy (the post-migration shape:
journal home `_chronicle/sessions/`, Part 2 orchestrator-profile evidence, Part 3 explicit
feedback capture as separated FACT / ARTEFACT / TESTIMONY fields). Bee prefix re-stamped to nbs-.
