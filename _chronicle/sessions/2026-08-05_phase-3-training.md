Bee: nbs-[wor]-1.0-z
Feature: Phase 3, the training phase (the simulation lab, the campaign, the audit, the remediation)
Started: 2026-08-05
Ended: 2026-08-05

## What this feature was

The heart of the experiment: take the deterministic game built in Phase 2 and find out what
optimal play actually looks like, honestly enough to publish. The system needed it because
everything downstream, the write-up, the in-game accuracy grade, the post, quotes this
phase's numbers; a subtle unfairness here would have silently poisoned all of it. The phase
closed today with the register at F001 to F008, and this journal is its formal close.

## What got built

Five jobs in sequence, each gated. First the lab (train-lab-and-baselines): a headless
harness importing the one engine file, the frozen 500-seed exam with a disjoint training
pool, run folders that open with a manifest before the first game, three trivial baselines
and a hand-weighted heuristic on a pluggable feature registry. The smoke campaign settled an
inherited scare immediately: the build phase's observation that mindless stacking scored
5,300 was measured to death (strict stacking median 24) and retracted with a dated
correction.

Then the campaign (orchestrated-training-campaign): a worker-pool runner proven bit-identical
to serial before its speed counted, two cross-entropy breeding campaigns with fitness on
fixed paired seed blocks and champions validated on held-out seeds before naming, two new
features read out of the champion's death boards (fragmentation cost and preview readiness),
and expectimax search at fixed weights so the depth ablation isolated search alone. Alongside
it, behaviour probes answering the design's planted questions, and the discovery mid-campaign
of AB's practised human game at 121,496, which retired the 228-point reference.

Then the cold audit (adversarial-audit-training), which reproduced every number it attacked
and found the one real self-deception: a feature at the search leaves reading the engine's
already-drawn, unknowable next block. Then the remediation (remediate-and-game-v1.2):
leak-free agent versions re-sat the whole exam, the leak was measured at 7.8 per cent of
decisions and no measurable score, bootstrap intervals landed on every ladder rung, and the
new fixed-horizon panel produced the phase's best finding. Game v1.2 shipped in the same job,
grading human play against the leak-free champion entirely in the browser. Today's closing
job promoted the two panel findings (F007, F008) with AB's approval and assembled the publish
pack.

## The calls that mattered

The frozen exam, decided before any training ran, is the call everything else leaned on: 500
seeds, generated once, never touched by tuning, so every version ever named sat the identical
paper and the ladder means something. With it came immutable named versions and no-manifest-
no-run provenance, which is why the audit could reproduce every number it attacked.

Splitting the lab from the campaign, with a human gate between, was the second structural
call: prove the instrument honest before running the science. The stacking retraction and the
throughput honesty discipline (repeat every timing; this machine's noise swamps single runs)
both came out of that gate.

The adversarial audit was AB's call, made after pushing back that feature discovery and the
orchestrator idea should have come from the bee unprompted. It is the call that found the
leak. Structural scepticism was designed in precisely because relying on the designer to
spot their own blind spots had just been shown not to work.

On the leak itself, the remediation kept both halves: the leaked rows stay in the record,
marked superseded, because the pair is the measurement of what the leak was worth, and
deleting them would have destroyed evidence. The leaf mode became an explicit required
parameter with no default, because a silent default is how the leak survived review.

Finally, the promotion discipline held all day: the campaign job drafted candidates and
stopped; F007 and F008 entered the register only when AB's approval was recorded in a work
order. Slower than letting jobs write findings freely, and the reason the register can be
trusted.

## What bit, and what it taught

The leak bit hardest and taught the most. The campaign's decision log had confidently
recorded that deleting a risky recursion made the peek "structurally impossible"; the feature
layer was a second path and it was live. The lesson now sits in the stage contract: an
agent's information set is part of its version, and any feature reading the preview must
declare itself or the suite fails. The counter-lesson is just as useful for the write-up: a
plausible-sounding leak changed 7.8 per cent of decisions and bought nothing measurable, so
the ladder survived its own scandal intact.

The closing tool's placeholder trap quarantined two touchdowns in one day before being
diagnosed: the template writes NNNN in two places, the tool fixed one. The fix was one line;
the sibling repo carries the same latent bug and a port-back proposal is queued. Two smaller
bites, both browser-flavoured: Chrome throttles timers in background tabs (which made
grading crawl and had earlier desynchronised cinema playback) and a module-lifetime
MessageChannel port kept the Node test runner alive after the last test passed. Both fixes
are recorded in BUILD.md; the second was caught only because a hanging suite is impossible
to ignore.

The gentlest bite: the end-of-game medians the first findings were written against turned out
to flatter survival, and the fixed-horizon panel reframed the whole result. Comparing a
256-block human game to agents that ran two to five times longer was a category error the
panel now prevents; the register's "what not to do" list carries it.

## Where it leaves us

Training is closed. Ten named versions on the frozen exam, 78,103 recorded games, a register
at F001 to F008 with intervals and dated corrections, a champion whose best game is exported
and engine-verified, and a game that grades its player against that champion with no server.
The publish pack (BUILD_RECORD, TRANSCRIPT, FINDINGS_AND_STRATEGY, champion-best-game.json,
POST_NOTES) sits in 04_publish/output/ awaiting AB's read. The honest next action is AB's:
apply the three post corrections, delete the conversation export from _tmp and the email
copy, and post. After that, NEXT_STEPS.md holds the ranked roadmap, with the two one-hour
ablations and the retained practised-human set as the best value on it.

## Part 2 -- Orchestrator profile evidence

### Principles observed

Decisions-over-options, consistently: "The merge maths, I'll let you decide fully" and "the
number block sim name is going to be the GitHub name" are AB closing choices in one line so
work can move. Anti-overbuild: "we're not going to have any database, that's just for
somebody to screenshot and share if they want to", and the guardrail list AB kept intact all
day (no RL before a measured ceiling, no leaderboard, no third actor). Honest-downside:
asked whether the two-hour remediation job was a failure, AB wanted the reason, not
reassurance, and accepted "my sizing call, and I should have said so up front".

### Trade-offs observed

Depth against finishing, resolved explicitly at 14:44: "operator fatigue is starting to set
in... I'm fine to sacrifice a bit of depth just to finish this game off." The resolution was
not abandonment but a filter: rules-touching work went to the backlog file, honesty fixes
stayed in scope. Earlier, the same judgement ran the other way: told the depth-3 eval would
overrun the compute budget, the checkpoint continued it because the curve justified it.
Rigour spends time where it changes conclusions, not where it decorates them.

### Communication patterns observed

Voice-dictated brain dumps closed with an explicit ask ("unpack the full brain wave, give me
the updated sequence"), and a standing demand for plain English: "too many strange words,
for example, papering. Just give me things in simple English. That was not a good response."
Repeated requests to "stabilise" mid-flow: stop advancing, restate where things stand, then
proceed. A clone should lead with the state of play, keep vocabulary ordinary, and end with
exactly one open item.

### New or surprising patterns

AB grades the assistant on initiative, not only on correctness: "I'm not fully happy with
how you didn't consider that there could be other features until I mentioned it... Now I'm
not sure whether this testing phase is really actually going to work." The response that
restored confidence was structural (the adversarial audit phase), not verbal reassurance.
Candidate for the profile: trust is rebuilt by adding a check, never by an apology.

### Worked examples (two to three)

- **Situation:** the bee endorsed AB's orchestrator idea after the fact.
  **Decision:** add 03c and 03d, a cold maximum-effort audit plus a remediation phase.
  **Reasoning:** "the thing that would make me more comfortable is... a full, unbiased
  third-party analysis, coming in totally fresh." Scepticism became structure rather than
  sentiment.
- **Situation:** the rules spec proposed a tier-up purge mechanic.
  **Decision:** veto: "every single block should just stay and get merged together."
  **Reasoning:** faithfulness to the feel of the source game outranked a mechanic added for
  strategic depth; the experiment adapts to the game, not the reverse.
- **Situation:** the human reference score of 228 flattered the AI-versus-human gap.
  **Decision:** "I'm going to do a full human test run", producing the 121,496 replay.
  **Reasoning:** AB treats himself as an instrument that can be recalibrated; a suspect
  number gets replaced by a better measurement, not argued about.

### Durable vs contingent

Durable: decisions-over-options, plain-English demand, initiative-graded trust, measure
rather than argue. Contingent: the simple-mode depth sacrifice (explicitly fatigue-driven,
"from now on" scoped to that day's tail) and the one-day cadence of this whole project; a
future feature should not assume either.

## Part 3 -- Feedback capture

### The early sequence and read-backs
- FACT: "I'm fully happy with your output so far. Everything is clearly laid out, and well
  done." (on the phase 1 sequencing and clarification read-backs)
- ARTEFACT: short read-backs of AB's brain dumps as numbered phases, each reply ending with
  a single named open item.
- TESTIMONY: the bee's guess, labelled as such: the praise landed on legibility and on
  always knowing the one thing AB had to do next, not on any specific technical content.

### The training-phase breakdown
- FACT: "This is a really good response. Everything makes sense, and I think that Phase 2
  build is perfect." (on the training-ladder unpacking with the levels and statistical
  discipline)
- ARTEFACT: the four-level ladder (heuristic, bred weights, expectimax, RL-as-footnote) with
  a my-call recommendation per level and one paragraph of seed-discipline rationale.
- TESTIMONY: guess: naming a recommendation rather than listing options is what earned the
  "perfect"; the statistics paragraph gave the confidence without demanding AB verify it.

### The MAJOR 1 explanation
- FACT: "I'm not happy with the way you described major one, specifically too many strange
  words, for example, papering. Just give me things in simple English. That was not a good
  response."
- ARTEFACT: a findings review that used compressed reviewer idiom ("papering over",
  "own goal") to describe a prompt contradiction.
- TESTIMONY: guess: the failure was register, not content; the same verdict delivered in
  ordinary sentences would have passed. This moment set the plain-English constraint every
  later summary obeyed.

### The feature-discovery miss
- FACT: "I'm not fully happy with how you didn't consider that there could be other features
  until I mentioned it. You're kind of now telling me that the orchestrator idea I had is a
  good one... It's given me doubts."
- ARTEFACT: a training design that fixed the feature list at seven and treated AB's
  orchestrator suggestion as an improvement to adopt.
- TESTIMONY: guess: the objection was to initiative arriving from the wrong side of the
  table; the audit phase restored confidence because it made future misses detectable by
  structure rather than by AB's own vigilance.
