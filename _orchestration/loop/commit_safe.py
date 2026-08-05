"""commit_safe.py -- the sanctioned save path for every write to the record.
Home: _orchestration/loop/, beside sweep.py (BUILD_SPEC commit-discipline 2026-07-21).

In ONE held operation it: acquires the repo lock (full stale-lock recovery), optionally picks
the next touchdown number under that lock, stages the caller's explicitly named paths only,
commits with the Commit-Safe trailer, pushes, and releases. The lock guards the index, not the
files: a job may only stage paths it exclusively owns (the ownership invariant in
CC_OPERATIONS.md); shared surfaces (the common maps, the views) are sweep-owned and never
job-staged.

Command:
  python _orchestration/loop/commit_safe.py -m "<message>" [--pick-number FILE]
      [--lock-timeout SECONDS] <path> [<path> ...]

- Paths are explicit file paths only. `-A`, `.`, `..` and glob patterns (`*`, `?`, `[`) are
  REFUSED with a loud error before any lock is taken; directories are refused too (a
  directory pathspec is a broad stage through the side door).
- --pick-number FILE: FILE sits in _chronicle/prompts/pending/ named `NNNN_<slug>_<date>.md`
  (literal NNNN placeholder, or a provisional number). Under the lock the next number is
  picked per td_v2's filename_pattern as the highest well-formed touchdown filename across
  pending/ and completed/ plus one, FILE is renamed to it, and the renamed path replaces FILE
  in the staged set. FILE must also appear in the path list. The picked number is ALSO written
  to FILE's frontmatter `job:` field in the same held operation (scoped to that one line only,
  never a whole-body find-and-replace): CC_TOUCHDOWN.md's NNNN placeholder lives in both the
  filename and this field, and a rename that fixed only the first used to quarantine the
  touchdown on its own close (touchdowns 0011 and 0013).
- The trailer is `Commit-Safe: yes`, appended as a proper git trailer block. The sweep's
  trailer audit raises any commit touching record paths without it.
- Push: skipped with a loud note when the repo has no remote; a push failure is a loud error
  and the commit stands (never rebase, never force-push; surface it instead).

Exit codes: 0 done; 1 refused or error; 2 lock wait timed out (surfaced loudly, never a
silent block).

The lock discipline (shared; sweep.py imports these functions so ONE lockfile format and ONE
recovery pattern exist in this repo):
- Lockfile `_orchestration/loop/LOCK`, one line: `<ISO timestamp> | pid <PID> | <label>`
  (the format the sweep has always written; unchanged).
- Acquire is atomic create-exclusive. On failure the caller WAITS, polling every 2 s.
- A lock whose holder PID is dead is stolen, loudly (`LOCK-STEAL:` on the caller's output;
  the sweep records the same event as a run anomaly).
- TTL backstop: a lock older than 5 minutes is stale regardless of PID (PIDs recycle); it is
  broken and logged the same way. The critical section is seconds, so 5 minutes is generous.
- The waiting side times out LOUDLY (default 360 s, past the TTL so a stale lock is stolen
  before a waiter gives up; override with --lock-timeout or COMMIT_SAFE_LOCK_TIMEOUT).
- A trap (try/finally plus atexit plus SIGINT/SIGTERM/SIGBREAK handlers) releases the lock on
  ordinary crashes; release removes the lockfile only when its bytes still match this
  process's token, so a successor's lock is never removed by mistake. The PID and TTL checks
  exist for the hard-kill case no trap can catch.

Aliveness check: on Windows `os.kill(pid, 0)` is NOT a probe (Python routes any non-CTRL
signal to TerminateProcess, which would kill the holder); this module uses
OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION) + GetExitCodeProcess == STILL_ACTIVE via
ctypes, with access-denied counted alive. On POSIX it is the classic kill -0.

IO contract shared with sweep.py: reads utf-8-sig, writes UTF-8 no BOM, LF.
"""

import argparse
import atexit
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LOOP_DIR = REPO_ROOT / "_orchestration" / "loop"
SCHEMA_DIR = LOOP_DIR / "schema"
LOCK_PATH = LOOP_DIR / "LOCK"
PENDING_DIR = REPO_ROOT / "_chronicle" / "prompts" / "pending"
COMPLETED_DIR = REPO_ROOT / "_chronicle" / "prompts" / "completed"

TRAILER_KEY = "Commit-Safe"
TRAILER_LINE = "Commit-Safe: yes"

LOCK_TTL_SECONDS = 5 * 60
LOCK_WAIT_TIMEOUT_SECONDS = 360.0
LOCK_POLL_SECONDS = 2.0

# Fallback only; the live pattern is read from the highest td_v*.json (filename_pattern).
TOUCHDOWN_NAME_FALLBACK_RE = r"^(\d{4})_(.+)_(\d{4}-\d{2}-\d{2})\.md$"

LOCK_LINE_RE = re.compile(r"^(?P<iso>\S+) \| pid (?P<pid>\d+) \| (?P<label>.*)$")

GLOB_CHARS = ("*", "?", "[", "]")


class LockTimeout(Exception):
    """The wait for the repo lock exceeded its timeout; surfaced loudly, never swallowed."""


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# The one lock discipline. sweep.py imports acquire_lock/release_lock/LockTimeout.
# ---------------------------------------------------------------------------

def pid_alive(pid):
    """Is a process with this PID alive? Platform-correct; NEVER os.kill(pid, 0) on
    Windows, where that call terminates the target instead of probing it."""
    if not isinstance(pid, int) or pid <= 0:
        return False
    if os.name == "nt":
        import ctypes
        kernel32 = ctypes.windll.kernel32
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        STILL_ACTIVE = 259
        ERROR_ACCESS_DENIED = 5
        handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            # Access denied means the process exists but is protected: alive.
            return kernel32.GetLastError() == ERROR_ACCESS_DENIED
        try:
            code = ctypes.c_ulong()
            if kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
                return code.value == STILL_ACTIVE
            return True  # openable but unreadable: fail safe, treat as alive
        finally:
            kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # exists, not ours: alive
    except OSError:
        return True  # fail safe


def read_lock(lock_path):
    """Return {'raw', 'iso', 'pid'} for the lockfile, or None if it does not exist.
    An unparseable lock returns raw with iso/pid None (held; TTL falls back to mtime)."""
    try:
        with open(lock_path, "r", encoding="utf-8-sig", newline="") as fh:
            raw = fh.read()
    except FileNotFoundError:
        return None
    except OSError:
        return {"raw": "<unreadable>", "iso": None, "pid": None}
    first = raw.strip().split("\n")[0] if raw.strip() else ""
    m = LOCK_LINE_RE.match(first)
    if not m:
        return {"raw": raw, "iso": None, "pid": None}
    return {"raw": raw, "iso": m.group("iso"), "pid": int(m.group("pid"))}


def lock_age_seconds(info, lock_path):
    """Age of the held lock: the timestamp inside the file when parseable, the file's
    mtime otherwise, None when the file has vanished."""
    if info and info.get("iso"):
        try:
            held = datetime.fromisoformat(info["iso"])
            return max(0.0, (datetime.now() - held).total_seconds())
        except ValueError:
            pass
    try:
        return max(0.0, time.time() - os.stat(lock_path).st_mtime)
    except OSError:
        return None


def acquire_lock(lock_path=LOCK_PATH, label="commit-safe", timeout=None, events=None,
                 log=print):
    """Acquire the repo lock with the full recovery discipline: wait on a live fresh
    holder, steal a dead-PID or TTL-stale lock (loudly; appended to events when given),
    time out LOUDLY (LockTimeout) rather than blocking forever. Returns the token whose
    bytes release_lock later verifies."""
    if timeout is None:
        timeout = float(os.environ.get("COMMIT_SAFE_LOCK_TIMEOUT",
                                       LOCK_WAIT_TIMEOUT_SECONDS))
    lock_path = Path(lock_path)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout
    announced = False
    while True:
        token = "%s | pid %d | %s\n" % (now_iso(), os.getpid(), label)
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
                fh.write(token)
            return token
        except FileExistsError:
            pass
        except OSError as exc:
            log("lock not creatable (%s); counting as held (fail-safe)" % exc)
        info = read_lock(lock_path)
        if info is None:
            continue  # vanished between attempts; retry the create immediately
        age = lock_age_seconds(info, lock_path)
        stale = None
        if age is not None and age > LOCK_TTL_SECONDS:
            stale = "older than the %d s TTL (age %.0f s)" % (LOCK_TTL_SECONDS, age)
        elif info.get("pid") is not None and not pid_alive(info["pid"]):
            stale = "holder pid %d is dead" % info["pid"]
        if stale:
            event = ("lock-steal: stale lock broken: %s (was: %s)"
                     % (stale, info.get("raw", "").strip() or "unreadable"))
            log("LOCK-STEAL: " + event)
            if events is not None:
                events.append(event)
            try:
                os.remove(str(lock_path))
            except FileNotFoundError:
                pass  # another waiter broke it first; the create race decides
            except OSError as exc:
                log("stale lock could not be removed (%s); still waiting" % exc)
            continue
        if time.monotonic() >= deadline:
            raise LockTimeout(
                "lock %s is held (%s) and the %.0f s wait timed out. The holder is "
                "alive and fresher than the %d s TTL; NOT proceeding. Investigate the "
                "holder before retrying." % (lock_path,
                                             info.get("raw", "").strip() or "unreadable",
                                             timeout, LOCK_TTL_SECONDS))
        if not announced:
            log("lock held (%s); waiting up to %.0f s"
                % (info.get("raw", "").strip() or "unreadable", timeout))
            announced = True
        time.sleep(LOCK_POLL_SECONDS)


def release_lock(lock_path, token, log=print):
    """Release only our own lock: the file is removed only when its bytes equal the
    token this process wrote, so a lock stolen from us (and now a successor's) is never
    removed. Idempotent; safe from traps."""
    try:
        with open(lock_path, "r", encoding="utf-8-sig", newline="") as fh:
            current = fh.read()
    except FileNotFoundError:
        return
    except OSError as exc:
        log("lock unreadable at release (%s); not removing" % exc)
        return
    if current != token:
        log("lock at release is no longer ours (stolen while stalled?); not removing")
        return
    try:
        os.remove(str(lock_path))
    except FileNotFoundError:
        pass
    except OSError as exc:
        log("lock could not be removed at release: %s" % exc)


# ---------------------------------------------------------------------------
# Number pick (under the lock only; the caller never picks its own).
# ---------------------------------------------------------------------------

def touchdown_name_re():
    """The live td filename pattern, read from the highest td_v*.json; the built-in
    fallback is the same regex and is used only if the schema read fails."""
    try:
        import json
        best = None
        for p in sorted(SCHEMA_DIR.glob("td_v*.json")):
            with open(p, "r", encoding="utf-8-sig", newline="") as fh:
                data = json.loads(fh.read())
            if best is None or int(data["version"]) > best[0]:
                best = (int(data["version"]), data.get("filename_pattern"))
        if best and best[1]:
            return re.compile(best[1])
    except Exception as exc:
        print("commit-safe -- note: schema filename_pattern unreadable (%s); "
              "using the built-in fallback" % exc)
    return re.compile(TOUCHDOWN_NAME_FALLBACK_RE)


def next_touchdown_number(name_re):
    """The next touchdown number: highest well-formed touchdown filename across pending/
    and completed/ plus one. Read under the lock, which is what closes the number fork."""
    highest = 0
    for directory in (PENDING_DIR, COMPLETED_DIR):
        if not directory.exists():
            continue
        for p in directory.iterdir():
            if not p.is_file():
                continue
            m = name_re.match(p.name)
            if m:
                highest = max(highest, int(m.group(1)))
    return highest + 1


JOB_FRONTMATTER_LINE_RE = re.compile(r"^job:\s*.*$")


def job_field_synced_text(path, number):
    """Return FILE's full text with ONLY the frontmatter `job:` field's value set to the
    picked number, computed BEFORE any disk mutation so a refusal here leaves the original
    file completely untouched. Scoped to the single job: line inside the frontmatter block
    (between the opening and closing `---`); the rest of the frontmatter and the whole body
    are never touched -- this is a targeted line replacement, not a find-and-replace.

    Closes the placeholder trap: CC_TOUCHDOWN.md's NNNN placeholder lives in two places, the
    filename and this field, and the rename above used to fill only the first, so a job that
    followed the template literally quarantined its own touchdown on its first close
    (frontmatter field job='NNNN' fails pattern ^\\d{4}$). Hit twice the same day (touchdowns
    0011 and 0013, both recovered by hand); this is the durable fix, option (a) from 0013's
    own proposal."""
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        text = fh.read().replace("\r\n", "\n")
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        refuse("touchdown %s has no opening frontmatter delimiter; refusing to pick its "
               "number without being able to sync the job: field" % path.name)
    close = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            close = i
            break
    if close is None:
        refuse("touchdown %s has no closing frontmatter delimiter; refusing to pick its "
               "number without being able to sync the job: field" % path.name)
    for i in range(1, close):
        if JOB_FRONTMATTER_LINE_RE.match(lines[i]):
            lines[i] = "job: %04d" % number
            return "\n".join(lines)
    refuse("touchdown %s frontmatter has no job: field to sync to the picked number"
           % path.name)


# ---------------------------------------------------------------------------
# Path validation: the broad-stage refusal, checked before any lock is taken.
# ---------------------------------------------------------------------------

def validate_paths(raw_paths):
    """Return repo-relative forward-slash paths, or raise SystemExit loudly. Explicit
    named file paths only: no -A/., no globs, no directories, no pathspec magic,
    nothing outside the repo."""
    if not raw_paths:
        refuse("no paths named; commit-safe stages explicitly named paths only")
    rels = []
    for raw in raw_paths:
        if raw in ("-A", "--all", ".", "..") or raw.startswith("-"):
            refuse("broad or option-like path %r; explicit named file paths only "
                   "(never -A, never ., never a flag)" % raw)
        if any(ch in raw for ch in GLOB_CHARS):
            refuse("glob pattern %r; explicit named file paths only (no *, ?, [ ])" % raw)
        if raw.startswith(":"):
            refuse("pathspec magic %r is not accepted" % raw)
        p = Path(raw)
        resolved = (p if p.is_absolute() else Path.cwd() / p).resolve()
        try:
            rel = resolved.relative_to(REPO_ROOT)
        except ValueError:
            refuse("path %r resolves outside the repo (%s)" % (raw, REPO_ROOT))
        if resolved.is_dir():
            refuse("path %r is a directory; a directory pathspec is a broad stage. "
                   "Name each file." % raw)
        rels.append(str(rel).replace("\\", "/"))
    seen = set()
    ordered = []
    for r in rels:
        if r not in seen:
            seen.add(r)
            ordered.append(r)
    return ordered


def refuse(why):
    print("commit-safe -- REFUSED: %s" % why)
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Git, same discipline as the sweep: root asserted, every return code checked.
# ---------------------------------------------------------------------------

def git_run(args_list):
    assert (REPO_ROOT / ".git").exists(), \
        "refusing to run git: %s has no .git (wrong REPO_ROOT?)" % REPO_ROOT
    assert (REPO_ROOT / "_orchestration").is_dir(), \
        "refusing to run git: %s has no _orchestration/ (wrong REPO_ROOT?)" % REPO_ROOT
    return subprocess.run(["git", "-C", str(REPO_ROOT)] + args_list,
                          capture_output=True, text=True)


def fail(step, r):
    print("commit-safe -- ERROR: git %s returned %d: %s"
          % (step, r.returncode, (r.stderr or r.stdout).strip()))
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Main: the one held operation.
# ---------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="The sanctioned save path: lock, optional number-pick, stage named "
                    "paths only, commit with the Commit-Safe trailer, push, release.")
    parser.add_argument("-m", "--message", required=True, help="commit message")
    parser.add_argument("--pick-number", metavar="FILE",
                        help="a pending touchdown named NNNN_<slug>_<date>.md (literal "
                             "NNNN or provisional number); renamed to the next number "
                             "under the lock")
    parser.add_argument("--lock-timeout", type=float, default=None, metavar="SECONDS",
                        help="wait this long for the lock (default %.0f s, or "
                             "COMMIT_SAFE_LOCK_TIMEOUT)" % LOCK_WAIT_TIMEOUT_SECONDS)
    parser.add_argument("paths", nargs="*", help="explicit file paths to stage")
    args, unknown = parser.parse_known_args(argv)
    if unknown:
        refuse("unrecognised argument(s) %s; broad stages (-A) and flags are never "
               "accepted as paths" % ", ".join(repr(u) for u in unknown))

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    rels = validate_paths(args.paths)

    pick_rel = None
    if args.pick_number:
        pick_rel = validate_paths([args.pick_number])[0]
        if pick_rel not in rels:
            refuse("--pick-number file %s must also be in the staged path list" % pick_rel)
        pick_abs = REPO_ROOT / pick_rel
        if not pick_abs.is_file():
            refuse("--pick-number file %s does not exist" % pick_rel)
        if pick_abs.parent != PENDING_DIR:
            refuse("--pick-number file must sit in _chronicle/prompts/pending/")
        if not re.match(r"^(NNNN|\d{4})_(.+)_(\d{4}-\d{2}-\d{2})\.md$", pick_abs.name):
            refuse("--pick-number filename %r is not NNNN_<slug>_<date>.md" % pick_abs.name)

    token = acquire_lock(LOCK_PATH, label="commit-safe pid %d" % os.getpid(),
                         timeout=args.lock_timeout)
    print("commit-safe -- lock acquired (%s)" % token.strip())

    released = {"done": False}

    def cleanup():
        if not released["done"]:
            released["done"] = True
            release_lock(LOCK_PATH, token)

    atexit.register(cleanup)
    for signame in ("SIGINT", "SIGTERM", "SIGBREAK"):
        sig = getattr(signal, signame, None)
        if sig is not None:
            try:
                signal.signal(sig, lambda signum, frame: sys.exit(128 + signum))
            except (ValueError, OSError):
                pass

    try:
        if pick_rel:
            name_re = touchdown_name_re()
            n = next_touchdown_number(name_re)
            old_abs = REPO_ROOT / pick_rel
            new_name = "%04d_%s" % (n, old_abs.name.split("_", 1)[1])
            new_abs = old_abs.with_name(new_name)
            if new_abs.exists():
                refuse("picked name %s already exists in pending/ (should be "
                       "impossible under the lock)" % new_name)
            synced_text = job_field_synced_text(old_abs, n)
            os.replace(old_abs, new_abs)
            with open(new_abs, "w", encoding="utf-8", newline="") as fh:
                fh.write(synced_text)
            new_rel = str(new_abs.relative_to(REPO_ROOT)).replace("\\", "/")
            rels = [new_rel if r == pick_rel else r for r in rels]
            print("commit-safe -- picked touchdown number %04d (%s, frontmatter job: "
                  "field synced)" % (n, new_name))

        r = git_run(["add", "--"] + rels)
        if r.returncode != 0:
            fail("add", r)
        r = git_run(["diff", "--cached", "--quiet", "--"] + rels)
        if r.returncode == 0:
            print("commit-safe -- ERROR: the named paths carry no staged changes; "
                  "nothing committed (already committed, or wrong paths?)")
            raise SystemExit(1)
        if r.returncode != 1:
            fail("diff --cached", r)

        message = args.message.rstrip() + "\n\n" + TRAILER_LINE + "\n"
        r = git_run(["commit", "-m", message, "--"] + rels)
        if r.returncode != 0:
            fail("commit", r)
        r = git_run(["rev-parse", "--short", "HEAD"])
        sha = r.stdout.strip() if r.returncode == 0 else "?"
        print("commit-safe -- committed %s (%d path(s), trailer %s)"
              % (sha, len(rels), TRAILER_LINE))

        r = git_run(["remote"])
        if r.returncode != 0:
            fail("remote", r)
        if not r.stdout.strip():
            print("commit-safe -- push skipped: no remote configured (the commit "
                  "stands locally)")
        else:
            r = git_run(["push"])
            if r.returncode != 0:
                print("commit-safe -- ERROR: push failed (%s). The commit stands; "
                      "NEVER rebase or force-push to clear this. Surface it."
                      % (r.stderr or r.stdout).strip())
                raise SystemExit(1)
            print("commit-safe -- pushed")
        return 0
    finally:
        cleanup()
        print("commit-safe -- lock released")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except LockTimeout as exc:
        print("commit-safe -- LOCK TIMEOUT: %s" % exc)
        sys.exit(2)
