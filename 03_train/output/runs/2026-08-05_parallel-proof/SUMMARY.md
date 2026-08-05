# 2026-08-05_parallel-proof -- the worker pool: proof and measurement

Job: orchestrated-training-campaign. The pool (`lab/parallel.js`) fans games out over
`worker_threads`, one seed at a time per worker, records collected by seed index. No engine
change, no dependency. This folder holds the two records that license every later campaign to
use it: the bit-identity proof and the honest throughput measurement.

British English, no em-dashes, no exclamation marks.

## Bit-identity: proved, with the definition stated

`parallel-check.json`: heuristic-v0, first 100 eval-v1 seeds, serial versus a 10-worker pool.
Every record compared as serialised JSON, metrics and full move lists included. **100 of 100
games identical, zero mismatches.** The lab suite (`lab.test.js`) asserts the same for
random-v1, heuristic-v0 and an ephemeral weighted candidate through the pool, so the property
is retested on every suite run, not trusted to one proof.

One definitional point, discovered by the first failing version of the test: `harnessMs`, the
per-game wall-clock field, differs between ANY two runs, two serial ones included, because it
is a measurement of the harness rather than of the game. Bit-identity is therefore defined
over the game-defining content (seed, moves, score, tiles, merge counts, hashes) via
`gameIdentity()`, which excludes the stopwatch and nothing else. This mirrors the runner's
existing discipline: RULES.md 7 scopes duration to human play, and the runner already names
`harnessMs` a throughput measurement, never a game metric.

## Throughput: about 3x on this machine, and why not more

Measured per the lab's standing rule (touchdown 0013): repeated passes, best, median and
worst, on a 13th Gen i7-1355U (2 P-cores, 8 E-cores, 12 threads, 15 W), node v20.20.2. Each
parallel rep pays the full pool lifecycle including worker startup, as a real campaign does.
heuristic-v0, 200 games per pass.

| configuration | best g/min | median g/min | worst g/min |
|---|---:|---:|---:|
| serial (same session) | 1,152 | 1,013 | 919 |
| 4 workers (3 reps) | 2,042 | 1,570 | 1,538 |
| **6 workers (5 reps)** | **3,442** | **2,204** | **2,066** |
| 8 workers (3 reps) | 2,729 | 1,984 | 1,973 |
| 10 workers (5 reps) | 1,757 | 1,381 | 1,097 |

**The quotable figure: 6 workers, best 3,442 games/min, median 2,204, worst 2,066; speedup
about 3x best-over-best.** The full record is `throughput-parallel-6workers.json`; the
10-worker record and the sweep passes are alongside.

Touchdown 0013 projected near 8,000 games/min from near-linear scaling on twelve cores. That
does not happen on this hardware, and the mechanism is worth recording: this is a 15 W
ultrabook part whose single-thread pace relies on boost clocks that collapse under all-core
load, and whose eight E-cores are much slower than its two P-cores. Ten workers oversubscribe
the slow cores and throttle the fast ones; six is the measured sweet spot. The pool scales;
the silicon does not. Campaign default set to 6 workers on this machine, chosen by this sweep.
