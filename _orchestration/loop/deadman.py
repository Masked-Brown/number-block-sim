"""deadman.py -- the loop's dumb clock (LOOP_SPEC.md Part 3). Home: _orchestration/loop/.

Runs each standing-window cycle (~30 minutes). No judgement, a fixed short list of checks;
silent when healthy; on breach it appends one nag line to _orchestration/loop/ALARMS.md and
prints it (the OS-notification transport beyond stdout is an operational choice, not this
script's). It inherits the sweep's ambiguity-fires rule: a check it cannot evaluate counts as
breached. Scheduling is one task per project and is not this script's concern.

The seven checks:
1. oldest included file age in _chronicle/prompts/pending/ over 60 minutes (an unswept
   touchdown, named in the nag); included mirrors the sweep's snapshot filter (.md files,
   .gitkeep and CONTEXT.md excluded), so a file the sweep never moves cannot hold this red;
2. _chronicle/prompts/quarantine/ non-empty;
3. LOCK present and older than 60 minutes;
4. the oldest item in any queue view older than its threshold (map-queue and gap-queue: 3
   days; promotions, including approved-unapplied: 7 days), read from each view's machine
   stamp line ('oldest: <date>'), never from its markdown body; for gap-queue the clock
   runs on the LISTED-not-counted section ('oldest-listed: <date>' in the stamp, falling
   back to 'oldest:' on a pre-separation stamp), because the human-gated / product-zone
   backlog is the one only AB can drain [D96];
5. the newest trace older than the newest completed/ touchdown (a bypassed or hand-edited
   completed/ whose work never swept), with a two-minute tolerance for the trace filename's
   minute resolution;
6. a review-not-converging marker in state.json, or an outstanding handoff marker older than
   T (12 hours), still unanswered;
7. the deadman.last age reported by the last sweep is stale, or the state file was missing at
   the last sweep (both read from state.json, the sweep's owned instrument).

ALARMS.md is this script's own channel and has this single writer, so a nag can never rotate
the sweep's STATUS.md heartbeat out of its cap. Nag once per breach transition plus one daily
repeat, never every cycle. Each breach line carries a stable id; a human marks it answered
with a dated line containing 'answered <id>'; an answered breach stays silent until it clears.
The deadman records clears ('cleared' lines) so transitions stay computable from the file
alone. Its own liveness: it overwrites deadman.last with a timestamp each cycle; the sweep
reports that age and raises deadman-stale when it ages out.

IO contract (shared with sweep.py): reads are utf-8-sig with CRLF normalised to LF; writes
are UTF-8, no BOM, LF, temp-file-then-rename. Exit codes: 0 healthy, 1 one or more breaches
active this cycle.
"""

import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

LOOP_DIR = REPO_ROOT / "_orchestration" / "loop"
VIEWS_DIR = REPO_ROOT / "_orchestration" / "views"
PENDING_DIR = REPO_ROOT / "_chronicle" / "prompts" / "pending"
QUARANTINE_DIR = REPO_ROOT / "_chronicle" / "prompts" / "quarantine"
COMPLETED_DIR = REPO_ROOT / "_chronicle" / "prompts" / "completed"
TRACES_DIR = REPO_ROOT / "_chronicle" / "traces"
ALARMS_PATH = LOOP_DIR / "ALARMS.md"
STATE_PATH = LOOP_DIR / "state.json"
LOCK_PATH = LOOP_DIR / "LOCK"
DEADMAN_LAST = LOOP_DIR / "deadman.last"

PENDING_AGE_SECONDS = 60 * 60
LOCK_AGE_SECONDS = 60 * 60
QUEUE_THRESHOLD_DAYS = {"map-queue.md": 3, "gap-queue.md": 3, "promotions.md": 7}
HANDOFF_T_SECONDS = 12 * 3600
SWEEP_REPORTED_DEADMAN_STALE = 90 * 60
TRACE_TOLERANCE_SECONDS = 120
DAILY_REPEAT_SECONDS = 24 * 3600

STAMP_OLDEST_RE = re.compile(r"\boldest: (\S+)")
# D96: gap-queue's clock runs on the listed-not-counted section (human-gated /
# product-zone, the backlog only AB can drain), read from its own stamp token.
STAMP_OLDEST_LISTED_RE = re.compile(r"\boldest-listed: (\S+)")
NAG_LINE_RE = re.compile(r"^(\S+) \| (nag|cleared) \| (\S+)(?: \| (.*))?$")
ANSWER_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\b.*\banswered\s+(\S+)")


def read_text(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        return fh.read().replace("\r\n", "\n")


def write_generated(path, text):
    tmp = path.with_name(path.name + ".tmp-%d" % os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    os.replace(tmp, path)


def listing(directory, exclude=(".gitkeep", "CONTEXT.md")):
    if not directory.exists():
        return []
    return [p for p in directory.iterdir() if p.is_file() and p.name not in exclude]


def compute_breaches(now):
    """Return [(id, detail)]. Any check that raises counts as breached (ambiguity fires)."""
    breaches = []

    def check(breach_id, fn):
        try:
            detail = fn()
        except Exception as exc:
            detail = "check could not be evaluated (%s); ambiguity fires" % exc
        if detail:
            breaches.append((breach_id, detail))

    def c1():
        # Mirror the sweep's pending-snapshot filter exactly (.md files, .gitkeep and
        # CONTEXT.md excluded by name): every such file a sweep run moves, to completed/ or
        # to quarantine/, so none can sit here forever; anything else the sweep never moves
        # and must not hold this check red. The clock is the OLDEST included file, so a
        # backlog cannot hide behind a fresh arrival, and the nag names the file.
        files = [p for p in listing(PENDING_DIR) if p.suffix == ".md"]
        if not files:
            return None
        oldest = min(files, key=lambda p: p.stat().st_mtime)
        age = now.timestamp() - oldest.stat().st_mtime
        if age > PENDING_AGE_SECONDS:
            return ("oldest pending touchdown %s is %.0f minutes old, unswept"
                    % (oldest.name, age / 60))
        return None
    check("pending-unswept", c1)

    def c2():
        files = listing(QUARANTINE_DIR)
        if files:
            return "quarantine holds %d file(s); leaving quarantine is a human act" % len(files)
        return None
    check("quarantine-nonempty", c2)

    def c3():
        if not LOCK_PATH.exists():
            return None
        age = now.timestamp() - LOCK_PATH.stat().st_mtime
        if age > LOCK_AGE_SECONDS:
            return ("LOCK is %.0f minutes old; a crashed sweep leaves it deliberately, a "
                    "human clears it after looking" % (age / 60))
        return None
    check("lock-stale", c3)

    for view_name, threshold in sorted(QUEUE_THRESHOLD_DAYS.items()):
        def c4(view_name=view_name, threshold=threshold):
            path = VIEWS_DIR / view_name
            if not path.exists():
                return None  # no view yet means no queue yet (pre-first-sweep state)
            first_line = read_text(path).split("\n", 1)[0]
            label = "oldest item in %s" % view_name
            m = None
            if view_name == "gap-queue.md":
                # D96: the clock runs on the listed-not-counted section (human-gated /
                # product-zone, AB's desk); a pre-separation stamp falls back to oldest:.
                m = STAMP_OLDEST_LISTED_RE.search(first_line)
                if m:
                    label = ("oldest listed-not-counted item in %s (human-gated / "
                             "product-zone, only AB can drain it)" % view_name)
            if m is None:
                m = STAMP_OLDEST_RE.search(first_line)
            if not m:
                return "stamp line of %s carries no oldest date; ambiguity fires" % view_name
            oldest = m.group(1)
            if oldest == "none":
                return None
            age_days = (now.date() - datetime.fromisoformat(oldest).date()).days
            if age_days > threshold:
                return ("%s is %d days old (threshold %d)"
                        % (label, age_days, threshold))
            return None
        check("queue-stale:%s" % view_name, c4)

    def c5():
        completed = listing(COMPLETED_DIR)
        completed = [p for p in completed if p.suffix == ".md"]
        if not completed:
            return None
        traces = [p for p in listing(TRACES_DIR) if p.name.endswith("_trace.md")]
        if not traces:
            return "completed/ holds touchdowns but no trace exists; work never swept"
        newest_completed = max(p.stat().st_mtime for p in completed)
        def trace_time(p):
            stem = p.name[:len("0000-00-00T00-00")]
            return datetime.strptime(stem, "%Y-%m-%dT%H-%M").timestamp()
        newest_trace = max(trace_time(p) for p in traces)
        if newest_completed > newest_trace + TRACE_TOLERANCE_SECONDS:
            return ("newest completed/ touchdown postdates the newest trace; a bypassed or "
                    "edited completed/ whose work never swept")
        return None
    check("trace-behind", c5)

    def c6():
        if not STATE_PATH.exists():
            return None  # no sweep has run yet; check 7 owns the missing-state signal
        import json
        state = json.loads(read_text(STATE_PATH))
        if state.get("review_not_converging"):
            return "the sweep recorded review-not-converging; the review is flapping"
        handoff = state.get("handoff")
        if handoff and handoff.get("recorded"):
            age = (now - datetime.fromisoformat(handoff["recorded"])).total_seconds()
            if age > HANDOFF_T_SECONDS:
                return ("review handoff recorded %s is still outstanding past T"
                        % handoff["recorded"])
        return None
    check("review-unanswered", c6)

    def c7():
        if not STATE_PATH.exists():
            return None  # pre-first-sweep: nothing reported yet
        import json
        state = json.loads(read_text(STATE_PATH))
        if state.get("state_file_was_missing"):
            return "the state file was missing at the last sweep (it re-baselined)"
        age = state.get("deadman_last_age_seconds")
        if age is not None and age > SWEEP_REPORTED_DEADMAN_STALE:
            return ("the last sweep saw deadman.last %.0f minutes old; this task may have "
                    "been dead" % (age / 60))
        return None
    check("sweep-instruments", c7)

    return breaches


def parse_alarms():
    """Return {breach_id: {'last': 'nag'|'cleared'|'answered', 'time': datetime|None}}."""
    state = {}
    if not ALARMS_PATH.exists():
        return state
    for ln in read_text(ALARMS_PATH).split("\n"):
        m = NAG_LINE_RE.match(ln)
        if m:
            when = None
            try:
                when = datetime.fromisoformat(m.group(1))
            except ValueError:
                pass
            state[m.group(3)] = {"last": m.group(2), "time": when}
            continue
        m = ANSWER_RE.match(ln)
        if m:
            state[m.group(1)] = {"last": "answered", "time": None}
    return state


def main():
    if not (REPO_ROOT / "_orchestration").is_dir():
        print("FATAL: %s has no _orchestration/ directory; refusing to run from a wrong "
              "root." % REPO_ROOT)
        return 1
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    now = datetime.now()
    breaches = compute_breaches(now)
    known = parse_alarms()

    header = ("# ALARMS.md -- deadman nags only; single writer: deadman.py. A human answers "
              "a breach with a dated line containing 'answered <id>'.")
    existing = read_text(ALARMS_PATH) if ALARMS_PATH.exists() else header + "\n"
    new_lines = []

    active_ids = {b for b, _d in breaches}
    for breach_id, detail in breaches:
        prior = known.get(breach_id)
        nag = False
        if prior is None or prior["last"] == "cleared":
            nag = True  # breach transition
        elif prior["last"] == "nag":
            if prior["time"] is None or \
                    (now - prior["time"]).total_seconds() >= DAILY_REPEAT_SECONDS:
                nag = True  # the one daily repeat
        # prior 'answered': silent until the breach clears and re-transitions
        if nag:
            line = "%s | nag | %s | %s" % (now.isoformat(timespec="seconds"), breach_id,
                                           detail)
            new_lines.append(line)
            print(line)
    for breach_id, prior in known.items():
        if breach_id not in active_ids and prior["last"] in ("nag", "answered"):
            new_lines.append("%s | cleared | %s" % (now.isoformat(timespec="seconds"),
                                                    breach_id))

    if new_lines:
        if not existing.endswith("\n"):
            existing += "\n"
        write_generated(ALARMS_PATH, existing + "\n".join(new_lines) + "\n")

    LOOP_DIR.mkdir(parents=True, exist_ok=True)
    write_generated(DEADMAN_LAST, now.isoformat(timespec="seconds") + "\n")
    return 1 if breaches else 0


if __name__ == "__main__":
    sys.exit(main())
