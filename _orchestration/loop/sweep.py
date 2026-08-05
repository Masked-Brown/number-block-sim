"""sweep.py -- the loop's sweep (LOOP_SPEC.md Part 1). Home: _orchestration/loop/.

The deterministic script that fires at every job close: it validates the pending touchdowns
against their versioned schemas (malformed goes to quarantine, never dropped), routes the facts
they carry (errors, map flags, gap tokens, proposals, resolutions), applies the review's verified
map edits and verifiable gap-facts under the lock, regenerates every view wholesale, writes one
frozen trace, moves the batch to completed/ (the commit point), adopts any new hand-dragged
session journal into the same commit, computes the split verdict (a queued gap item counts
toward review-warranted only when its route class is review-closable; human-gated and
product-zone items ride the handoff listed-not-counted, and the deadman's gap-queue clock
runs on them [D96]; an open error older than the ageing threshold routes itself onto the
handoff for re-examination, its age stated, the clock restarting from a re-statement
[D97]), stamps one digest line, and
reassembles the gitignored prime bundle last so its stamped sources match live state. It never thinks and it never fires the review: the verdict is a recording
the standing window acts on (see _orchestration/LOOP_PROMPT.md).

Command: python _orchestration/loop/sweep.py [--apply] [--ask "<question>"]
No flags is a dry run: the full plan is printed, nothing is written, no lock is taken. --ask
forces the verdict to review-warranted with the question as the handoff item; on a dry run it
prints the handoff it would record and exits 3 without writing. On a non-default git branch the
sweep runs dry only, whatever the flags: branch jobs sweep at merge.

Exit codes: 0 clean; 1 error (including any git failure, which aborts with the anomaly recorded
and the filesystem truth left intact); 2 lock wait timed out (held by a live fresh holder;
refused loudly after the wait, the dead-PID steal and the TTL backstop all declined to free
it); 3 clean and review-warranted recorded.

Commit discipline (BUILD_SPEC commit-discipline 2026-07-21): the lock discipline is shared
with commit_safe.py (imported from it, so ONE lockfile format and ONE recovery pattern exist:
PID+timestamp lockfile, wait-then-steal on a dead PID, 5-minute TTL backstop, loud wait
timeout, release-only-our-own-token). The sweep's whole run, its commit AND its push sit
inside the held lock; its commits carry the Commit-Safe trailer. The trailer audit
(canon-changed's sibling) scans commits new since the state-recorded baseline that touch the
record paths (_chronicle/) and raises untrailed-record-commit for any lacking the trailer:
prevention makes bypass rare, this detection makes it visible.

IO contract, uniform and carried from the estate's proven harness (loop_harvest.py):
- reads are utf-8-sig (a stray BOM is dropped, one is never written) with newline="" so nothing
  is translated by the platform layer; CRLF is normalised to LF on read on EVERY path the sweep
  parses (touchdowns, maps, canon, template, changelog alike -- both paths, closing the old
  map-read asymmetry);
- writes are encoding="utf-8", newline="", so the buffer lands byte-exact: UTF-8, no BOM, LF;
- there is no newline detection anywhere and no write ever re-expands to CRLF;
- every generated file is written temp-file-then-rename, so a crash mid-write never leaves a
  torn view;
- content hashes (map and canon baselines) are computed over the normalised text, so a pure
  CRLF-to-LF rewrite on disk is not a false outside-edit.

Harvest-internal behaviour carried from the retired _canonical/LOOP.md, kept on purpose:
- the sweep is non-interpretive: everything interpretive was decided by the job that wrote the
  touchdown; the sweep applies only exact-anchor ops and refuses everything else, identically
  for every caller;
- pending/ is snapshotted exactly once at start and processed in ascending (number, filename)
  order, so later touchdowns win where they overlap; .gitkeep, CONTEXT.md and non-.md files are
  excluded by name;
- anchor matching is exact against the text as read, never fuzzy; token tolerance (a label or
  'none'/'unchanged' with trailing prose) is word-boundary matching on an already-recognised
  token, never fuzzy matching;
- applies are all-or-nothing per touchdown: a review touchdown's verified edits resolve against
  scratch copies first and land together or not at all (a failure raises an anomaly and honours
  none of that touchdown's edit closures);
- an apply that finds Old absent and New already present counts as already-applied and continues
  silently, which is what makes a crashed run re-runnable;
- duplicate touchdown numbers are legal (parallel jobs): ordering keys on (int(number), filename)
  and collision checks are on the full destination filename, never the number;
- git discipline: filesystem move first, then stage explicit paths only (never git add -A, never
  git mv); every return code checked; the sweep commits its own run and pushes it inside the
  held lock (push moved inside the critical section by the commit-discipline build; a push
  failure is an anomaly, never an abort, because the commit point already stands).

Legacy (schema v1) touchdowns are records, not work: their '## Now update' blocks are inert here
(the old harvest's mechanism; counted skipped-with-reason), and their map flags are queued only
when harvested: false -- a harvested: true flag was already applied by the old harvest and is
skipped with that reason.

Design authority: the icm-final pack's LOOP_SPEC.md (non-shipping). This docstring is the
operational summary; there is no prose LOOP.md in the successor tree by design.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Roots and paths. The script sits two levels below the repo root; the wrong
# root must be impossible (the harness commits), so the root is derived and
# then asserted before any git call.
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]

LOOP_DIR = REPO_ROOT / "_orchestration" / "loop"
SCHEMA_DIR = LOOP_DIR / "schema"
VIEWS_DIR = REPO_ROOT / "_orchestration" / "views"
MAPS_DIR = REPO_ROOT / "_orchestration" / "maps"
PENDING_DIR = REPO_ROOT / "_chronicle" / "prompts" / "pending"
COMPLETED_DIR = REPO_ROOT / "_chronicle" / "prompts" / "completed"
QUARANTINE_DIR = REPO_ROOT / "_chronicle" / "prompts" / "quarantine"
TRACES_DIR = REPO_ROOT / "_chronicle" / "traces"
SESSIONS_DIR = REPO_ROOT / "_chronicle" / "sessions"
INFRA_DIR = REPO_ROOT / "_infrastructure"
FRONT_DOOR = INFRA_DIR / "INFRASTRUCTURE.md"
NORMS_PATH = INFRA_DIR / "NORMS.md"
CHANGELOG_PATH = INFRA_DIR / "CHANGELOG.md"
TEMPLATE_PATH = REPO_ROOT / "_orchestration" / "CC_TOUCHDOWN.md"
PRIME_BUNDLE = REPO_ROOT / "_prime" / "PRIME_bee.md"

STATUS_PATH = LOOP_DIR / "STATUS.md"
STATE_PATH = LOOP_DIR / "state.json"
LOCK_PATH = LOOP_DIR / "LOCK"
DEADMAN_LAST = LOOP_DIR / "deadman.last"

# The one lock discipline and the one trailer, shared with the sanctioned save path.
# Imported, never duplicated: one lockfile format, one recovery pattern (spec 2.6).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from commit_safe import LockTimeout, TRAILER_LINE, acquire_lock, release_lock  # noqa: E402

# The trailer audit's protected record paths, enumerated from the live tree: _chronicle/
# holds every record home (prompts/pending|completed|quarantine, traces/, sessions/, the two
# record-shaping prompt templates; mode-test/ is gitignored and cannot carry commits).
RECORD_AUDIT_PATHS = ["_chronicle/"]

CC_OPS_PATH = REPO_ROOT / "_orchestration" / "CC_OPERATIONS.md"
BEE_OPS_PATH = REPO_ROOT / "_orchestration" / "OPERATIONS_BEE.md"

CANON_FILES = [
    REPO_ROOT / "CLAUDE.md",
    NORMS_PATH,
    CC_OPS_PATH,
    BEE_OPS_PATH,
    TEMPLATE_PATH,
    REPO_ROOT / "_orchestration" / "LOOP_PROMPT.md",
    REPO_ROOT / "_orchestration" / "ORCHESTRATOR_PROFILE.md",
    REPO_ROOT / "_orchestration" / "TEST_MODE.md",
    REPO_ROOT / "_chronicle" / "HANDOVER_PROMPT.md",
    REPO_ROOT / "_chronicle" / "LOG_PROMPT.md",
]

# The B8-B11 and G1 contract lines ([issued] class): the substance NORMS.md names must be present
# in the contract that binds the actor. Matching collapses whitespace runs so a re-wrap
# never false-alarms; an absent line means the norm is no longer issued to anyone.
CONTRACT_LINES = [
    ("B8", CC_OPS_PATH,
     "Touchdown, then sweep, is the job's last act (norm B8)"),
    ("B9", CC_OPS_PATH,
     "A job facing an error greps `_orchestration/views/open-errors.md` before starting "
     "its own diagnosis (norm B9)"),
    ("B10", CC_OPS_PATH,
     "Git discipline (norm B10): explicit-path staging only, never `git add -A` or "
     "`git add .`; every git return code checked; never `git mv` where the source may "
     "be untracked"),
    ("B11", CC_OPS_PATH,
     "co-updates `_infrastructure/DESIGN.md` and `_infrastructure/CHANGELOG.md` in the "
     "same act (norm B11"),
    ("B11", BEE_OPS_PATH,
     "co-updates `_infrastructure/DESIGN.md` and `_infrastructure/CHANGELOG.md` in the "
     "same act (norm B11"),
    ("G1", CC_OPS_PATH,
     "A stated count of touchdowns is a count of filenames in `_chronicle/prompts/`, never "
     "the highest sequence number and never the count of distinct numbers (norm G1)"),
]

VIEW_NAMES = ["open-errors.md", "suggestions.md", "map-queue.md", "gap-queue.md",
              "promotions.md"]

SNAP_BEGIN = "<!-- snapshot:begin -->"
SNAP_END = "<!-- snapshot:end -->"

# Thresholds. All tunable proposals (LOOP_SPEC Part 6.2); none load-bearing to the shape.
PROPOSAL_COUNT_TRIGGER = 5          # unconsidered proposals at or above this fire the review
PROPOSAL_AGE_TRIGGER_DAYS = 7       # or the oldest unconsidered proposal at or past this age
PROMOTION_AGE_BREACH_DAYS = 7       # human-facing: candidate (incl. approved-unapplied) age
OPEN_ERRORS_COUNT_BREACH = 10       # human-facing: open-errors count at or above this
OPEN_ERRORS_AGE_BREACH_DAYS = 14    # human-facing: oldest open error older than this
OPEN_ERROR_AGE_ROUTE_DAYS = 7       # review-facing ageing route [D97]: an open error older
                                    # than this rides the handoff for re-examination, its
                                    # age stated; sits between the deadman's 3-day queue
                                    # nag and the 18-day breach observed live
HANDOFF_T_SECONDS = 12 * 3600       # an outstanding handoff younger than T is already-marked
DEADMAN_STALE_SECONDS = 90 * 60     # deadman.last older than this raises deadman-stale
STATUS_CAP_LINES = 200

# Route classes for queued gap items [D96; proposal 9b9493606556]: ONLY review-closable
# items count toward the review-warranted verdict; human-gated and product-zone items are
# listed-not-counted (they ride the handoff and the view for visibility, nothing hidden,
# nothing re-counted, and the deadman's gap-queue clock runs on them, the backlog only AB
# can drain). Classification is mechanical where a path is derivable; the review may
# reclassify with a reroutes: fact, its reasoning recorded, visible in the queue entry,
# never silent.
ROUTE_REVIEW_CLOSABLE = "review-closable"
ROUTE_HUMAN_GATED = "human-gated"
ROUTE_PRODUCT_ZONE = "product-zone"
ROUTE_CLASSES = (ROUTE_REVIEW_CLOSABLE, ROUTE_HUMAN_GATED, ROUTE_PRODUCT_ZONE)
PRODUCT_ZONE_RE = re.compile(r"^(?:0[1-4]_|_config$)")   # 01_rules/ to 04_publish/ plus _config/: the product zone

TOUCHDOWN_NAME_RE = re.compile(r"^(\d{4})_(.+)_(\d{4}-\d{2}-\d{2})\.md$")
STATUS_MARKER_RE = re.compile(r"--\s*status:\s*(open|recovered)\s*$")
# R-04 fix: strip ONLY the final bracket group from a heading, never greedily. The greedy
# \[.*\] form ate everything from the first '[' on a heading carrying two bracket groups.
BRACKET_HINT_RE = re.compile(r"\s*\[[^][]*\]\s*$")
STAMP_RE = re.compile(r"^<!-- generated: (\S+) \| ([^|]+?) \| (.+?) - do not hand-edit -->$")
# Both live entry-header formats: the dashed dated line ("YYYY-MM-DD -- ", this repo's own
# CHANGELOG format) and the numbered header ("## NNNN - YYYY-MM-DD - ", the estate's other
# live format), the date captured as group 1 in both, so the norm-B7 canon-changed fallback
# recognises a compliant entry whichever format carries it [D91, inherited from youtube-pov's
# landed fix].
CHANGELOG_ENTRY_RE = re.compile(r"^(?:## \d{4} - )?(\d{4}-\d{2}-\d{2}) --? ")
# A line that is exactly a markdown fence marker (a backtick run, surrounding whitespace
# tolerated); an info-stringed opener like ```python is not one, matching the template's
# bare fences.
FENCE_MARKER_RE = re.compile(r"^\s*`{3,}\s*$")


# ---------------------------------------------------------------------------
# IO helpers. The whole contract lives here; nothing else opens files.
# ---------------------------------------------------------------------------

def read_text(path):
    """Read for parsing: tolerate a BOM, normalise CRLF to LF (both paths, uniformly)."""
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        return fh.read().replace("\r\n", "\n")


def write_text(path, text):
    """Write byte-exact: UTF-8, no BOM, LF (the buffer is never translated)."""
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def write_generated(path, text):
    """Temp-file-then-rename so a crash mid-write never leaves a torn file."""
    tmp = path.with_name(path.name + ".tmp-%d" % os.getpid())
    write_text(tmp, text)
    os.replace(tmp, path)


def sha1_hex(text, n=8):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:n]


def item_id(filename, section, entry_text):
    """The stable item id [D47]: a hash of source touchdown + section + entry text."""
    return sha1_hex("%s|%s|%s" % (filename, section, entry_text.strip()), 12)


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def to_lines(text):
    ends = text.endswith("\n")
    lines = text.split("\n")
    if ends:
        lines.pop()
    return lines, ends


def from_lines(lines, ends):
    return "\n".join(lines) + ("\n" if ends else "")


# ---------------------------------------------------------------------------
# Touchdown parsing: frontmatter and fence-aware sections (carried pattern).
# Payloads are fenced by a line exactly '<' (directly after Old:/New:) and a
# line exactly '>>>'; inside a fence a '## ' line is payload, never a heading.
# Markdown code fences (```) are opaque the same way: a '## ' line inside one
# (the pasted Work order verbatim block) is body text, never a heading.
# ---------------------------------------------------------------------------

def parse_touchdown_text(text):
    """Return (frontmatter, sections, notes, error). sections maps heading text (final
    bracket group stripped -- the R-04 fix) to its list of body lines, in document order."""
    lines, _ = to_lines(text)
    if not lines or lines[0].strip() != "---":
        return None, None, [], "frontmatter missing its opening --- line"
    close = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            close = i
            break
    if close is None:
        return None, None, [], "frontmatter missing its closing --- line"
    fm = {}
    for ln in lines[1:close]:
        if not ln.strip():
            continue
        m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", ln)
        if not m:
            return None, None, [], "unparseable frontmatter line: %r" % ln
        fm[m.group(1)] = m.group(2).strip()
    notes = []
    sections = {}
    current = None
    in_payload = False
    in_fence = False
    prev = None
    for ln in lines[close + 1:]:
        if in_payload:
            sections[current].append(ln)
            if ln == ">>>":
                in_payload = False
            prev = ln
            continue
        if in_fence:
            # Inside a markdown code fence every line is body text: a '## ' line here is
            # quoted content, never a heading, and payload openers are not recognised.
            if FENCE_MARKER_RE.match(ln):
                in_fence = False
            if current is not None:
                sections[current].append(ln)
            elif ln.strip():
                notes.append("ignored content before first section heading: %r" % ln)
            prev = ln
            continue
        if ln == "<" and prev in ("Old:", "New:") and current is not None:
            sections[current].append(ln)
            in_payload = True
            prev = ln
            continue
        if FENCE_MARKER_RE.match(ln):
            in_fence = True
            if current is not None:
                sections[current].append(ln)
            elif ln.strip():
                notes.append("ignored content before first section heading: %r" % ln)
            prev = ln
            continue
        if ln.startswith("## "):
            heading = BRACKET_HINT_RE.sub("", ln[3:].strip())
            current = heading
            sections.setdefault(current, [])
        elif current is not None:
            sections[current].append(ln)
        elif ln.strip():
            notes.append("ignored content before first section heading: %r" % ln)
        prev = ln
    return fm, sections, notes, None


def section_is_none(body_lines, none_form="none"):
    body = "\n".join(body_lines).strip()
    if body == none_form or body == "- " + none_form:
        return True
    return bool(re.match(r"^%s(?![A-Za-z0-9_])" % re.escape(none_form), body))


# ---------------------------------------------------------------------------
# Entry parsers. Each returns (items, notes); a malformed entry becomes a note
# or an invalid-marked item, never a silent drop (norm B2).
# ---------------------------------------------------------------------------

def parse_error_entries(body_lines):
    """Error entries: a '- ' line opens one; following indented or blank lines belong to it.
    The status marker '-- status: open|recovered' is tolerated trailing inline after prose or
    alone on its own (possibly indented) line inside the entry."""
    if section_is_none(body_lines):
        return [], []
    items, notes = [], []
    current = None
    for ln in body_lines:
        if ln.startswith("- "):
            current = {"lines": [ln]}
            items.append(current)
        elif current is not None:
            current["lines"].append(ln)
        elif ln.strip():
            notes.append("content before first error entry: %r" % ln)
    out = []
    for it in items:
        status = None
        for ln in it["lines"]:
            m = STATUS_MARKER_RE.search(ln)
            if m:
                status = m.group(1)
                break
        summary = STATUS_MARKER_RE.sub("", it["lines"][0][2:]).strip()
        text = "\n".join(it["lines"])
        if status is None:
            notes.append("error entry with no status marker (kept as record): %r" % summary)
        out.append({"summary": summary, "status": status, "text": text})
    return out, notes


def split_chunks(body_lines, starters):
    """Split a section into chunks starting at lines beginning with any starter token,
    respecting payload fences. Returns (chunks, leading_note)."""
    starts = []
    in_payload = False
    for idx, ln in enumerate(body_lines):
        if in_payload:
            if ln == ">>>":
                in_payload = False
            continue
        if ln == "<" and idx > 0 and body_lines[idx - 1] in ("Old:", "New:"):
            in_payload = True
            continue
        if any(ln.startswith(s) for s in starters):
            starts.append(idx)
    if not starts:
        return None, "no recognised entry line found"
    note = None
    for ln in body_lines[:starts[0]]:
        if ln.strip():
            note = "content before the first entry line: %r" % ln
    chunks = []
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else len(body_lines)
        chunk = body_lines[s:e]
        while chunk and not chunk[-1].strip():
            chunk.pop()
        chunks.append(chunk)
    return chunks, note


def read_fenced_payload(chunk, i):
    """Read an Old:/New: payload opening at chunk[i] == '<'. Returns (lines, next_i, err)."""
    if i >= len(chunk) or chunk[i] != "<":
        return None, i, "payload must open with a line containing exactly '<'"
    i += 1
    payload = []
    while i < len(chunk) and chunk[i] != ">>>":
        payload.append(chunk[i])
        i += 1
    if i >= len(chunk):
        return None, i, "payload not closed with a line containing exactly '>>>'"
    return payload, i + 1, None


def parse_flag_chunk(chunk):
    """A map flag: Map:, Op:, fenced Old, fenced New (absent on remove), Evidence:.
    Returns (flag, reason); a reason routes the chunk to the queue marked invalid."""
    def skip_blanks(i):
        while i < len(chunk) and not chunk[i].strip():
            i += 1
        return i

    map_name = chunk[0][len("Map:"):].strip()
    i = skip_blanks(1)
    if i >= len(chunk) or not chunk[i].startswith("Op:"):
        return None, "missing Op: line"
    op = chunk[i][len("Op:"):].strip()
    i = skip_blanks(i + 1)
    if i >= len(chunk) or chunk[i] != "Old:":
        return None, "missing Old: line"
    old_lines, i, err = read_fenced_payload(chunk, i + 1)
    if err:
        return None, "Old " + err
    i = skip_blanks(i)
    new_lines = None
    if i < len(chunk) and chunk[i] == "New:":
        new_lines, i, err = read_fenced_payload(chunk, i + 1)
        if err:
            return None, "New " + err
        i = skip_blanks(i)
    evidence = None
    if i < len(chunk) and chunk[i].startswith("Evidence:"):
        evidence = chunk[i][len("Evidence:"):].strip()
        i = skip_blanks(i + 1)
    if i < len(chunk):
        return None, "unexpected trailing line in flag: %r" % chunk[i]
    if op not in ("replace", "append", "remove"):
        return None, "unknown Op value: %r" % op
    if op == "remove" and new_lines is not None:
        return None, "a remove flag must omit the whole New block"
    if op in ("replace", "append") and not new_lines:
        return None, "missing or empty New block"
    if not old_lines:
        return None, "Old payload is empty"
    if not evidence:
        return None, "missing or empty Evidence: line"
    if op == "append" and (len(old_lines) != 1 or not old_lines[0].lstrip().startswith("#")):
        return None, "append anchor must be a single heading line"
    return {"map": map_name, "op": op, "old_lines": old_lines, "new_lines": new_lines,
            "evidence": evidence}, None


def parse_gap_chunk(chunk):
    """gap-fact: <target> with fenced Old/New (and optional Recount: <glob>=<int> lines), or
    gap: <free text>. Returns (item, reason)."""
    head = chunk[0]
    if head.startswith("gap-fact:"):
        target = head[len("gap-fact:"):].strip()
        i = 1
        while i < len(chunk) and not chunk[i].strip():
            i += 1
        if i >= len(chunk) or chunk[i] != "Old:":
            return None, "gap-fact missing Old: line"
        old_lines, i, err = read_fenced_payload(chunk, i + 1)
        if err:
            return None, "gap-fact Old " + err
        while i < len(chunk) and not chunk[i].strip():
            i += 1
        if i >= len(chunk) or chunk[i] != "New:":
            return None, "gap-fact missing New: line"
        new_lines, i, err = read_fenced_payload(chunk, i + 1)
        if err:
            return None, "gap-fact New " + err
        recounts = {}
        while i < len(chunk):
            ln = chunk[i]
            if ln.startswith("Recount:") :
                m = re.match(r"^Recount:\s*(.+?)=(\d+)\s*$", ln)
                if not m:
                    return None, "unparseable Recount line: %r" % ln
                recounts[m.group(2)] = m.group(1).strip()
            elif ln.strip():
                return None, "unexpected trailing line in gap-fact: %r" % ln
            i += 1
        if not target:
            return None, "gap-fact has no target path"
        return {"kind": "gap-fact", "target": target, "old_lines": old_lines,
                "new_lines": new_lines, "recounts": recounts}, None
    text = head[len("gap:"):].strip()
    detail = [ln for ln in chunk[1:]]
    return {"kind": "gap", "text": text, "detail": detail}, None


def parse_verified_edit_chunk(chunk):
    """Verified-edit: <flag-id> / Map: / Op: / fenced Old / fenced New. The review's licensed
    edit record; the sweep applies it under the lock [D45]."""
    closes = chunk[0][len("Verified-edit:"):].strip()
    if not closes:
        return None, "Verified-edit names no flag id"
    rest = chunk[1:]
    while rest and not rest[0].strip():
        rest.pop(0)
    if not rest or not rest[0].startswith("Map:"):
        return None, "verified edit missing Map: line"
    flag, reason = parse_flag_chunk(["Map:" + rest[0][len("Map:"):]] + rest[1:] +
                                    (["Evidence: verified by the review touchdown"]
                                     if not any(l.startswith("Evidence:") for l in rest)
                                     else []))
    if reason:
        return None, reason
    flag["closes"] = closes
    return flag, None


def parse_resolutions(body_lines):
    """Resolution facts: '- resolves: <id> -- <note>' (bullet optional). Route
    reclassifications [D96]: '- reroutes: <id> -> <route-class> -- <reasoning>'; the
    reasoning is required, because a reclassification is recorded with its why, never
    bare. Returns (resolutions, reroutes, notes)."""
    if section_is_none(body_lines):
        return [], [], []
    items, reroutes, notes = [], [], []
    for ln in body_lines:
        if not ln.strip():
            continue
        m = re.match(r"^(?:- )?resolves:\s*(\S+)\s*(?:--\s*(.*))?$", ln.strip())
        if m:
            items.append({"closes": m.group(1), "note": (m.group(2) or "").strip(),
                          "text": ln.strip()})
            continue
        m = re.match(r"^(?:- )?reroutes:\s*(\S+)\s*->\s*(\S+)\s*(?:--\s*(.*))?$",
                     ln.strip())
        if m:
            cls = m.group(2)
            why = (m.group(3) or "").strip()
            if cls not in ROUTE_CLASSES:
                notes.append("reroutes fact with unknown route class %r (kept as "
                             "record): %r" % (cls, ln.strip()))
            elif not why:
                notes.append("reroutes fact with no reasoning (not honoured, kept as "
                             "record): %r" % ln.strip())
            else:
                reroutes.append({"target_id": m.group(1), "route": cls, "why": why,
                                 "text": ln.strip()})
            continue
        if ln.startswith((" ", "\t")):
            continue  # indented continuation of the previous fact's note
        notes.append("unrecognised line in Resolutions (kept as record): %r" % ln)
    return items, reroutes, notes


def parse_proposals(body_lines):
    """Proposals: the fenced terminal section [D3]. Each ``` fence is one proposal; a
    fenceless non-none body is one proposal whole."""
    if section_is_none(body_lines):
        return []
    blocks, current, in_fence = [], None, False
    for ln in body_lines:
        if ln.strip().startswith("```"):
            if in_fence:
                blocks.append("\n".join(current))
                current, in_fence = None, False
            else:
                current, in_fence = [], True
            continue
        if in_fence:
            current.append(ln)
    if in_fence and current is not None:
        blocks.append("\n".join(current))  # unclosed fence: kept, never dropped
    if not blocks:
        body = "\n".join(body_lines).strip()
        if body:
            blocks.append(body)
    return [b for b in blocks if b.strip()]


def parse_norm_candidates(body_lines):
    """Candidate: <rule> / Check: <check> / Red-case: <demonstration>, values continuing on
    indented lines. Returns (items, notes)."""
    if section_is_none(body_lines):
        return [], []
    chunks, note = split_chunks(body_lines, ("Candidate:",))
    notes = [note] if note else []
    if chunks is None:
        return [], ["Norm candidates section is neither 'none' nor Candidate: entries"]
    items = []
    for chunk in chunks:
        fields = {"Candidate": chunk[0][len("Candidate:"):].strip()}
        key = None
        for ln in chunk[1:]:
            m = re.match(r"^(Check|Red-case):\s*(.*)$", ln)
            if m:
                key = m.group(1)
                fields[key] = m.group(2).strip()
            elif key and ln.strip():
                fields[key] = (fields[key] + " " + ln.strip()).strip()
        items.append({"rule": fields.get("Candidate", ""),
                      "check": fields.get("Check", ""),
                      "red_case": fields.get("Red-case", ""),
                      "text": "\n".join(chunk)})
    return items, notes


# ---------------------------------------------------------------------------
# Anchor application (carried verbatim in spirit from loop_harvest: exact-anchor-once,
# never fuzzy, never partial).
# ---------------------------------------------------------------------------

def apply_replace(text, old, new):
    count = text.count(old)
    if count != 1:
        if count == 0 and new in text:
            return text, "already-applied"
        return None, "anchor text found %d times in the target (need exactly once)" % count
    return text.replace(old, new, 1), None


def apply_append(text, heading, new_lines):
    lines, ends = to_lines(text)
    matches = [i for i, ln in enumerate(lines) if ln == heading]
    if len(matches) != 1:
        return None, "heading line found %d times in the target (need exactly once)" % len(matches)
    h = matches[0]
    j = h + 1
    while j < len(lines) and not lines[j].startswith("#"):
        j += 1
    k = j
    while k - 1 > h and not lines[k - 1].strip():
        k -= 1
    if k - 1 > h and lines[k - 1].strip() == "---":
        k -= 1
        while k - 1 > h and not lines[k - 1].strip():
            k -= 1
    insert = list(new_lines)
    if k == h + 1:
        insert = [""] + insert
    if k == j and j < len(lines):
        insert = insert + [""]
    lines[k:k] = insert
    return from_lines(lines, ends), None


def apply_remove(text, old):
    count = text.count(old)
    if count != 1:
        if count == 0:
            return text, "already-applied"
        return None, "anchor text found %d times in the target (need exactly once)" % count
    idx = text.find(old)
    end = idx + len(old)
    if (idx == 0 or text[idx - 1] == "\n") and text[end:end + 1] == "\n":
        end += 1
    return text[:idx] + text[end:], None


def apply_edit(text, flag):
    old = "\n".join(flag["old_lines"])
    if flag["op"] == "replace":
        return apply_replace(text, old, "\n".join(flag["new_lines"]))
    if flag["op"] == "append":
        return apply_append(text, flag["old_lines"][0], flag["new_lines"])
    return apply_remove(text, old)


# ---------------------------------------------------------------------------
# Schemas.
# ---------------------------------------------------------------------------

def load_schemas():
    schemas = {}
    for p in sorted(SCHEMA_DIR.glob("td_v*.json")):
        data = json.loads(read_text(p))
        schemas[int(data["version"])] = data
    if not schemas:
        raise RuntimeError("no schema files found in %s" % SCHEMA_DIR)
    return schemas


def schema_cutoff(schemas):
    """The dated-fallback cutoff: the earliest 'introduced' among versions that require the
    schema: field. Before it, no-schema touchdowns validate against the lowest such-free
    version; on or after it they quarantine schema-missing."""
    dates = [s["introduced"] for s in schemas.values()
             if s.get("requires_schema_field") and s.get("introduced")]
    return min(dates) if dates else None


def fallback_version(schemas):
    free = [v for v, s in schemas.items() if not s.get("requires_schema_field")]
    return min(free) if free else None


def validate_touchdown(fm, sections, schema):
    """Return a list of failure strings (empty = valid)."""
    failures = []
    spec = schema["frontmatter"]
    for key, pattern in spec["required"].items():
        val = fm.get(key)
        if val is None or val == "":
            failures.append("frontmatter missing required field: %s" % key)
        elif not re.match(pattern, val):
            failures.append("frontmatter field %s=%r fails pattern %s" % (key, val, pattern))
    for key, pattern in spec.get("optional", {}).items():
        val = fm.get(key)
        if val is not None and val != "" and not re.match(pattern, val):
            failures.append("frontmatter field %s=%r fails pattern %s" % (key, val, pattern))
    if not spec.get("allow_extra", True):
        known = set(spec["required"]) | set(spec.get("optional", {})) | {"schema"}
        for key in fm:
            if key not in known:
                failures.append("unexpected frontmatter field: %s" % key)
    for heading in schema["sections"]["required"]:
        if heading not in sections:
            failures.append("missing required section: ## %s" % heading)
    deliv = schema.get("deliverables")
    if deliv and deliv["section"] in sections:
        for ln in sections[deliv["section"]]:
            entry = ln.strip()
            if entry.startswith("- "):
                path_part = entry[2:].split(" -- ")[0].strip().strip("`")
                for prefix in deliv["forbid_prefixes"]:
                    if path_part.replace("\\", "/").startswith(prefix):
                        failures.append("deliverable path points into %s (norm B6): %r"
                                        % (prefix, path_part))
    return failures


# ---------------------------------------------------------------------------
# Routing: turn one parsed touchdown into routable items with stable ids.
# ---------------------------------------------------------------------------

def route_touchdown(filename, fm, sections, schema, report, anomalies):
    """Return a dict of item lists. Every parsed routable item lands in exactly one list
    (routed, applied-eligible, or skipped-with-reason) -- the conservation check reconciles."""
    routing = schema["routing"]
    out = {"errors": [], "flags": [], "invalid_flags": [], "gap_facts": [], "gaps": [],
           "resolutions": [], "reroutes": [], "proposals": [], "verified_edits": [],
           "candidates": [], "skipped": [], "notes": [], "parsed_count": 0}
    date_str = fm.get("date", "")
    slug = fm.get("slug", "")

    err_sec = routing.get("errors_section")
    if err_sec and err_sec in sections:
        entries, notes = parse_error_entries(sections[err_sec])
        out["notes"] += notes
        for e in entries:
            e.update({"id": item_id(filename, err_sec, e["text"]), "source": filename,
                      "date": date_str, "slug": slug})
            out["errors"].append(e)
        out["parsed_count"] += len(entries)

    flags_sec = routing.get("flags_section")
    legacy_applied = (routing.get("legacy_harvested_gate")
                      and fm.get("harvested", "") == "true")
    if flags_sec and flags_sec in sections and not section_is_none(sections[flags_sec]):
        chunks, note = split_chunks(sections[flags_sec], ("Map:",))
        if note:
            out["notes"].append(note)
        if chunks is None:
            out["invalid_flags"].append({
                "id": item_id(filename, flags_sec, "\n".join(sections[flags_sec])),
                "reason": "unparseable-section", "source": filename, "date": date_str})
            out["parsed_count"] += 1
        else:
            for chunk in chunks:
                text = "\n".join(chunk)
                iid = item_id(filename, flags_sec, text)
                out["parsed_count"] += 1
                if legacy_applied:
                    out["skipped"].append(
                        (iid, "flag already applied by the legacy harvest (harvested: true)"))
                    continue
                flag, reason = parse_flag_chunk(chunk)
                if reason:
                    out["invalid_flags"].append({"id": iid, "reason": reason,
                                                 "source": filename, "date": date_str})
                    continue
                flag.update({"id": iid, "source": filename, "date": date_str})
                out["flags"].append(flag)

    legacy_now = routing.get("legacy_now_update_section")
    if legacy_now and legacy_now in sections:
        out["parsed_count"] += 1
        out["skipped"].append(
            (item_id(filename, legacy_now, "\n".join(sections[legacy_now])),
             "legacy v1 Now update: the old harvest's mechanism, not routed here"))

    gaps_sec = routing.get("gaps_section")
    if gaps_sec and gaps_sec in sections and not section_is_none(sections[gaps_sec]):
        chunks, note = split_chunks(sections[gaps_sec], ("gap-fact:", "gap:"))
        if note:
            out["notes"].append(note)
        if chunks is None:
            out["gaps"].append({"id": item_id(filename, gaps_sec,
                                              "\n".join(sections[gaps_sec])),
                                "target": "", "reason": "unparseable Gaps section",
                                "source": filename, "date": date_str})
            out["parsed_count"] += 1
        else:
            for chunk in chunks:
                text = "\n".join(chunk)
                iid = item_id(filename, gaps_sec, text)
                out["parsed_count"] += 1
                item, reason = parse_gap_chunk(chunk)
                if reason:
                    out["gaps"].append({"id": iid, "target": "", "reason": reason,
                                        "source": filename, "date": date_str})
                elif item["kind"] == "gap-fact":
                    item.update({"id": iid, "source": filename, "date": date_str})
                    out["gap_facts"].append(item)
                else:
                    out["gaps"].append({"id": iid, "target": "",
                                        "reason": item["text"] or "queued for the review",
                                        "source": filename, "date": date_str})

    res_sec = routing.get("resolutions_section")
    if res_sec and res_sec in sections:
        items, reroutes, notes = parse_resolutions(sections[res_sec])
        out["notes"] += notes
        for r in items:
            r.update({"id": item_id(filename, res_sec, r["text"]), "source": filename})
            out["resolutions"].append(r)
        for rr in reroutes:
            rr.update({"id": item_id(filename, res_sec, rr["text"]), "source": filename})
            out["reroutes"].append(rr)
        out["parsed_count"] += len(items) + len(reroutes)

    prop_sec = routing.get("proposals_section")
    if prop_sec and prop_sec in sections:
        for block in parse_proposals(sections[prop_sec]):
            out["proposals"].append({"id": item_id(filename, prop_sec, block),
                                     "text": block, "source": filename, "date": date_str})
            out["parsed_count"] += 1

    ve_sec = routing.get("verified_edits_section")
    if ve_sec and ve_sec in sections and not section_is_none(sections[ve_sec]):
        chunks, note = split_chunks(sections[ve_sec], ("Verified-edit:",))
        if note:
            out["notes"].append(note)
        if chunks is not None:
            for chunk in chunks:
                text = "\n".join(chunk)
                iid = item_id(filename, ve_sec, text)
                out["parsed_count"] += 1
                if fm.get("actor") != "review":
                    anomalies.append("verified-edit-from-non-review: %s in %s"
                                     % (iid, filename))
                    out["skipped"].append((iid, "verified edit from a non-review actor: "
                                                "not applied, anomaly raised"))
                    continue
                edit, reason = parse_verified_edit_chunk(chunk)
                if reason:
                    anomalies.append("verified-edit-malformed: %s in %s (%s)"
                                     % (iid, filename, reason))
                    out["skipped"].append((iid, "malformed verified edit: %s" % reason))
                    continue
                edit.update({"id": iid, "source": filename})
                out["verified_edits"].append(edit)

    nc_sec = routing.get("norm_candidates_section")
    if nc_sec and nc_sec in sections:
        items, notes = parse_norm_candidates(sections[nc_sec])
        out["notes"] += notes
        for c in items:
            c.update({"id": item_id(filename, nc_sec, c["text"]), "source": filename,
                      "date": date_str})
            out["candidates"].append(c)
        out["parsed_count"] += len(items)

    # Conservation (norm B2): everything parsed is in exactly one disposition list.
    disposed = (len(out["errors"]) + len(out["flags"]) + len(out["invalid_flags"])
                + len(out["gap_facts"]) + len(out["gaps"]) + len(out["resolutions"])
                + len(out["reroutes"]) + len(out["proposals"])
                + len(out["verified_edits"])
                + len(out["candidates"]) + len(out["skipped"]))
    if disposed != out["parsed_count"]:
        anomalies.append("conservation-mismatch: %s parsed %d routable items but disposed %d"
                         % (filename, out["parsed_count"], disposed))
    return out


# ---------------------------------------------------------------------------
# Corpus: completed/ plus this run's validated batch.
# ---------------------------------------------------------------------------

def schema_for(fm, filename, schemas, cutoff, fb_version):
    """Pick the schema version for a touchdown; None means schema-missing quarantine."""
    declared = fm.get("schema")
    if declared:
        try:
            v = int(declared)
        except ValueError:
            return None, "schema field is not an integer: %r" % declared
        if v not in schemas:
            return None, "schema version %d has no schema file" % v
        return v, None
    m = TOUCHDOWN_NAME_RE.match(filename)
    file_date = m.group(3) if m else fm.get("date", "")
    if cutoff and file_date >= cutoff:
        return None, "schema-missing"
    if fb_version is None:
        return None, "no fallback schema version exists"
    return fb_version, None


def collect_corpus_items(batch, schemas, cutoff, fb_version, report, anomalies):
    """Route every completed touchdown plus the validated batch. Returns (routed_list,
    corpus_hash). Completed files that fail to parse are anomalies, never dropped."""
    routed = []
    corpus_bits = []
    completed = []
    if COMPLETED_DIR.exists():
        for p in sorted(COMPLETED_DIR.iterdir()):
            if p.is_file() and p.suffix == ".md" and TOUCHDOWN_NAME_RE.match(p.name):
                completed.append(p)
    for p in completed:
        text = read_text(p)
        corpus_bits.append("%s@%s" % (p.name, sha1_hex(text)))
        fm, sections, notes, err = parse_touchdown_text(text)
        if err:
            anomalies.append("completed-unparseable: %s (%s)" % (p.name, err))
            continue
        version, why = schema_for(fm, p.name, schemas, cutoff, fb_version)
        if version is None:
            # A completed record with no resolvable schema is still a record: note, skip.
            report.append("  note: completed/%s has no resolvable schema (%s); "
                          "carried as an unrouted record" % (p.name, why))
            continue
        routed.append((p.name, fm,
                       route_touchdown(p.name, fm, sections, schemas[version],
                                       report, anomalies)))
    for td in batch:
        corpus_bits.append("%s@%s" % (td["filename"], sha1_hex(td["text"])))
        routed.append((td["filename"], td["fm"], td["routed"]))
    corpus_hash = sha1_hex("|".join(sorted(corpus_bits)))
    return routed, corpus_hash


# ---------------------------------------------------------------------------
# Views.
# ---------------------------------------------------------------------------

def make_stamp(tool, iso, extras, body):
    segs = ["generated: %s" % tool, iso]
    segs += extras
    segs += ["self: %s" % sha1_hex(body)]
    return "<!-- " + " | ".join(segs) + " - do not hand-edit -->"


def render_view(name, title, lines, iso, corpus_hash, oldest, extra_tokens=None):
    body = "# %s -- %s\n\n" % (name, title)
    if lines:
        body += "\n".join(lines) + "\n"
    else:
        body += "none.\n"
    stamp = make_stamp("sweep.py", iso,
                       ["corpus: %s" % corpus_hash, "oldest: %s" % (oldest or "none")]
                       + list(extra_tokens or []),
                       body)
    return stamp + "\n" + body, body


def oldest_date(items):
    dates = [it.get("date") for it in items if it.get("date")]
    return min(dates) if dates else None


def error_detail_lines(entry_text):
    """An open error's plain-English detail body for the view: every line after the
    summary line, a line that is only the status marker dropped (the status already
    gates the view), surrounding blanks trimmed, each line indented at least two
    spaces so the body nests under its summary bullet."""
    body = []
    for ln in entry_text.split("\n")[1:]:
        if STATUS_MARKER_RE.search(ln) and not STATUS_MARKER_RE.sub("", ln).strip():
            continue
        body.append(ln)
    while body and not body[0].strip():
        body.pop(0)
    while body and not body[-1].strip():
        body.pop()
    return [(ln if ln.startswith("  ") else "  " + ln.lstrip()) if ln.strip() else ""
            for ln in body]


GAP_PATH_TOKEN_RE = re.compile(r"[\w][\w.\\/-]*")


def classify_gap_route(target, reason_text):
    """The mechanical route class for a queued gap item [D96], mechanical where a path is
    derivable: a derivable path naming a canon (norm-B7-hashed) file is human-gated, one
    under a product zone (01_ to 06_) is product-zone, anything else review-closable, the
    safe default. The path comes from the gap-fact target when set, and from path-like
    tokens in the free-text reason otherwise (both are scanned; human-gated wins over
    product-zone, the stricter gate first). The review's reroutes: override is applied by
    the caller, never here."""
    canon_names = {p.name for p in CANON_FILES}
    tokens = []
    if target:
        tokens.append(target)
    if reason_text:
        tokens += GAP_PATH_TOKEN_RE.findall(reason_text)
    paths = []
    for tok in tokens:
        t = tok.replace("\\", "/").strip("/").rstrip(".,;:-")
        if t:
            paths.append(t)
    for p in paths:
        base = p.split("/")[-1]
        if base in canon_names or re.fullmatch(r"td_v\d+\.json", base):
            return ROUTE_HUMAN_GATED
    for p in paths:
        if PRODUCT_ZONE_RE.match(p.split("/")[0]):
            return ROUTE_PRODUCT_ZONE
    return ROUTE_REVIEW_CLOSABLE


def build_views(routed, resolved_ids, norms_text, changelog_decisions, iso, corpus_hash,
                today):
    """Every view is a pure function of the corpus: printed wholesale, sorted, id-stamped."""
    errors, flags, invalid_flags, gaps, proposals, candidates = [], [], [], [], [], []
    reroutes = {}
    for _fn, _fm, r in routed:
        errors += [e for e in r["errors"] if e["status"] == "open"]
        flags += r["flags"]
        invalid_flags += r["invalid_flags"]
        gaps += r["gaps"]
        proposals += r["proposals"]
        candidates += r["candidates"]
        for rr in r.get("reroutes", []):
            # Later touchdowns win (routed is in corpus order), like every other fact.
            reroutes[rr["target_id"]] = rr

    open_errors = sorted([e for e in errors if e["id"] not in resolved_ids],
                         key=lambda e: (e["date"], e["id"]))
    open_props = sorted([p for p in proposals if p["id"] not in resolved_ids],
                        key=lambda p: (p["date"], p["id"]))
    open_flags = sorted([f for f in flags if f["id"] not in resolved_ids],
                        key=lambda f: (f["date"], f["id"]))
    open_invalid = sorted([f for f in invalid_flags if f["id"] not in resolved_ids],
                          key=lambda f: (f["date"], f["id"]))
    open_gaps = sorted([g for g in gaps if g["id"] not in resolved_ids],
                       key=lambda g: (g["date"], g["id"]))

    # Route classes [D96]: mechanical first, then any review reroutes: override, which is
    # rendered in the queue entry with its reasoning and source, never applied silently.
    annotated = []
    for g in open_gaps:
        route = classify_gap_route(g.get("target") or "", g.get("reason") or "")
        reclass = None
        rr = reroutes.get(g["id"])
        if rr:
            reclass = ("reclassified %s -> %s: %s (%s)"
                       % (route, rr["route"], rr["why"], rr["source"]))
            route = rr["route"]
        annotated.append(dict(g, route=route, reclass=reclass))
    open_gaps = annotated
    counted_gaps = [g for g in open_gaps if g["route"] == ROUTE_REVIEW_CLOSABLE]
    listed_gaps = [g for g in open_gaps if g["route"] != ROUTE_REVIEW_CLOSABLE]

    cands = []
    for c in candidates:
        if c["id"] in resolved_ids:
            continue
        in_norms = bool(norms_text) and bool(
            (c["rule"] and c["rule"] in norms_text) or (c["check"] and c["check"] in norms_text))
        decision = changelog_decisions.get(c["id"])
        if in_norms or decision == "reject":
            continue  # closed: present in NORMS.md, or rejected by a decision line [D49]
        state = "approved-unapplied" if decision == "approve" else "open"
        try:
            age = (today - date.fromisoformat(c["date"])).days if c["date"] else 0
        except ValueError:
            age = 0
        cands.append(dict(c, state=state, age=age))
    cands.sort(key=lambda c: (c["date"], c["id"]))

    views = {}
    error_lines = []
    for e in open_errors:
        error_lines.append("- %s | %s | %s | %s | source: %s"
                           % (e["id"], e["date"], e["slug"], e["summary"], e["source"]))
        error_lines += error_detail_lines(e["text"])
    views["open-errors.md"] = (
        "open error entries, summary line then indented detail body, minus those a later "
        "fact resolves by id",
        error_lines,
        oldest_date(open_errors))
    views["suggestions.md"] = (
        "fenced proposals, minus those a closure fact folds or declines by id",
        ["- %s | %s | %s | source: %s"
         % (p["id"], p["date"], p["text"].strip().split("\n")[0], p["source"])
         for p in open_props],
        oldest_date(open_props))
    flag_lines = ["- %s | %s | %s | anchor: %s | evidence: %s | source: %s"
                  % (f["id"], f["map"], f["op"], f["old_lines"][0].strip(),
                     f["evidence"], f["source"]) for f in open_flags]
    flag_lines += ["- %s | invalid: %s | source: %s"
                   % (f["id"], f["reason"], f["source"]) for f in open_invalid]
    views["map-queue.md"] = (
        "valid unapplied semantic-map flags (and invalid-marked flags), minus those a later "
        "fact records applied or rejected by id",
        flag_lines, oldest_date(open_flags + open_invalid))
    def gap_line(g):
        line = ("- %s | route: %s | target: %s | %s | source: %s"
                % (g["id"], g["route"], g.get("target") or "n/a",
                   (g["reason"].strip().split("\n")[0] if g["reason"] else "queued"),
                   g["source"]))
        if g.get("reclass"):
            line += " | %s" % g["reclass"]
        return line

    gap_lines = ["counted (review-closable; these count toward the review-warranted "
                 "verdict):"]
    gap_lines += [gap_line(g) for g in counted_gaps] or ["- none"]
    gap_lines.append("")
    gap_lines.append("listed, not counted (human-gated / product-zone; ride the handoff "
                     "for visibility, and the deadman's clock runs here):")
    gap_lines += [gap_line(g) for g in listed_gaps] or ["- none"]
    views["gap-queue.md"] = (
        "queued gap: items, minus drained; counted (review-closable) then "
        "listed-not-counted (human-gated / product-zone) [D96]",
        gap_lines if open_gaps else [],
        oldest_date(open_gaps),
        ["oldest-listed: %s" % (oldest_date(listed_gaps) or "none")])
    views["promotions.md"] = (
        "norm candidates, minus those closed by presence in NORMS.md or a reject decision",
        ["- %s | %s | rule: %s | check: %s | red-case: %s | age: %dd | state: %s"
         % (c["id"], c["date"], c["rule"] or "(missing)",
            "yes" if c["check"] else "missing", "yes" if c["red_case"] else "missing",
            c["age"], c["state"]) for c in cands],
        oldest_date(cands))

    rendered = {}
    for name in VIEW_NAMES:
        entry = views[name]
        extras = entry[3] if len(entry) > 3 else None
        rendered[name] = render_view(name, entry[0], entry[1], iso, corpus_hash,
                                     entry[2], extras)
    stats = {"open_errors": open_errors, "open_flags": open_flags,
             "open_invalid": open_invalid, "open_gaps": open_gaps,
             "open_props": open_props, "candidates": cands}
    return rendered, stats


def build_snapshot_block(iso, corpus_hash, plan, maps_info):
    def count(p, exts=(".md",)):
        if not p.exists():
            return 0
        return len([f for f in p.iterdir()
                    if f.is_file() and f.suffix in exts
                    and f.name not in (".gitkeep", "CONTEXT.md")])
    # End-of-run truth: the disk counts adjusted for this run's moves and quarantines
    # (and this run's own trace), so the block never claims the pre-move state.
    pending_end = count(PENDING_DIR) - len(plan["moves"]) - len(
        [q for q in plan["quarantines"] if q[0].suffix == ".md"])
    completed_end = count(COMPLETED_DIR) + len(plan["moves"])
    quarantine_end = count(QUARANTINE_DIR) + len(
        [q for q in plan["quarantines"] if q[0].suffix == ".md"])
    body_lines = [
        "Generated snapshot: locations and counts, regenerated by every sweep run.",
        "",
        "- touchdowns: pending %d | completed %d | quarantine %d (_chronicle/prompts/)"
        % (pending_end, completed_end, quarantine_end),
        "- traces: %d (_chronicle/traces/)" % (count(TRACES_DIR) + 1),
        "- views: %s (_orchestration/views/)" % ", ".join(VIEW_NAMES),
        "- maps: %s (_orchestration/maps/)"
        % (", ".join("%s (%s)" % (n, c) for n, c in maps_info) or "none"),
        "- loop: sweep.py, deadman.py, schema/ (_orchestration/loop/)",
        "- prime: _prime/src/prime.py -> _prime/PRIME_bee.md",
    ]
    body = "\n".join(body_lines) + "\n"
    stamp = make_stamp("sweep.py", iso, ["corpus: %s" % corpus_hash], body)
    return stamp + "\n" + body


# ---------------------------------------------------------------------------
# Step 0 self-checks. Baselines come from the owned state file, never a trace
# or a deletable view [D43].
# ---------------------------------------------------------------------------

def parse_stamp(first_line):
    m = STAMP_RE.match(first_line)
    if not m:
        return None
    segs = [s.strip() for s in m.group(3).split("|")]
    info = {"tool": m.group(1), "time": m.group(2).strip()}
    for seg in segs:
        if seg.startswith("sources:"):
            info["sources"] = {}
            for part in seg[len("sources:"):].split(","):
                part = part.strip()
                if "@" in part:
                    path, h = part.rsplit("@", 1)
                    info["sources"][path.strip()] = h.strip()
        elif seg.startswith("self:"):
            info["self"] = seg[len("self:"):].strip()
        elif seg.startswith("corpus:"):
            info["corpus"] = seg[len("corpus:"):].strip()
        elif seg.startswith("oldest:"):
            info["oldest"] = seg[len("oldest:"):].strip()
    return info


def check_stamped_file(path, anomalies):
    text = read_text(path)
    lines = text.split("\n")
    info = parse_stamp(lines[0]) if lines else None
    if not info or "self" not in info:
        anomalies.append("unstamped-generated-file: %s" % path.name)
        return
    body = "\n".join(lines[1:])
    if sha1_hex(body) != info["self"]:
        anomalies.append("hand-edit-detected: %s (body no longer matches its self hash)"
                         % path.name)
    for src, h in info.get("sources", {}).items():
        src_path = REPO_ROOT / src
        if not src_path.exists():
            anomalies.append("stale-generated-file: %s names missing source %s"
                             % (path.name, src))
        elif sha1_hex(read_text(src_path)) != h:
            anomalies.append("stale-generated-file: %s was assembled before %s changed"
                             % (path.name, src))


def git_run(args_list):
    """The one shell-out. R-11: the root is asserted before every git call; a wrong root
    must be impossible because the harness commits."""
    assert (REPO_ROOT / ".git").exists(), \
        "refusing to run git: %s has no .git (wrong REPO_ROOT?)" % REPO_ROOT
    assert (REPO_ROOT / "_orchestration").is_dir(), \
        "refusing to run git: %s has no _orchestration/ (wrong REPO_ROOT?)" % REPO_ROOT
    return subprocess.run(["git", "-C", str(REPO_ROOT)] + args_list,
                          capture_output=True, text=True)


def changelog_baseline(changelog_text):
    """The CHANGELOG baseline the state file records: the line count plus a hash of those
    lines, so the next run can tell exactly which lines this change-set appended."""
    lines, _ends = to_lines(changelog_text)
    return {"lines": len(lines), "hash": sha1_hex("\n".join(lines))}


def changelog_added_lines(changelog_text, baseline):
    """The lines appended since the recorded baseline, or None when no usable baseline
    exists (absent, malformed, or the recorded prefix no longer hashes clean -- CHANGELOG.md
    is append-only, so an edited prefix means the baseline can vouch for nothing)."""
    if not isinstance(baseline, dict):
        return None
    count, prefix_hash = baseline.get("lines"), baseline.get("hash")
    lines, _ends = to_lines(changelog_text)
    if not isinstance(count, int) or not 0 <= count <= len(lines):
        return None
    if sha1_hex("\n".join(lines[:count])) != prefix_hash:
        return None
    return lines[count:]


def changelog_names_currently(name, changelog_text, added_lines, today_str):
    """Norm B7's 'matching entry', read as a CURRENT entry only: the canon file's name sits
    in the CHANGELOG lines added since the recorded baseline (this change-set recorded
    itself), or -- when no usable baseline exists -- inside an entry dated the run's date.
    A historical mention alone never satisfies."""
    if added_lines is not None:
        return any(name in ln for ln in added_lines)
    current = False
    lines, _ends = to_lines(changelog_text)
    for ln in lines:
        m = CHANGELOG_ENTRY_RE.match(ln)
        if m:
            current = m.group(1) == today_str
        if current and name in ln:
            return True
    return False


def trailer_audit(state_prev, anomalies, notes):
    """The commit-discipline detection, canon-changed's sibling: scan commits new since the
    state-recorded baseline that touch the record paths (RECORD_AUDIT_PATHS); any such commit
    lacking the Commit-Safe trailer is raised as untrailed-record-commit. Runs on the loop,
    not in the job, so the committer cannot bypass it. Returns the new baseline (HEAD at scan
    time) for the state file; on first run it initialises the baseline at HEAD (the deploy
    position, spec 4.3) and scans nothing, so pre-existing history is never retro-flagged."""
    if not (REPO_ROOT / ".git").exists():
        return None
    r = git_run(["rev-parse", "HEAD"])
    if r.returncode != 0:
        notes.append("trailer-audit skipped: no HEAD to scan from (%s)"
                     % (r.stderr or r.stdout).strip())
        return None
    head = r.stdout.strip()
    baseline = (state_prev or {}).get("trailer_audit_baseline")
    if not baseline:
        notes.append("trailer-audit baseline initialised at HEAD %s; commits before it are "
                     "never scanned (the deploy baseline)" % head[:12])
        return head
    r = git_run(["cat-file", "-e", "%s^{commit}" % baseline])
    if r.returncode != 0:
        anomalies.append("trailer-audit-baseline-unusable: recorded baseline %s is not a "
                         "known commit; re-baselining at HEAD %s" % (baseline[:12], head[:12]))
        return head
    r = git_run(["log", "--format=%H%x01%B%x02", "%s..%s" % (baseline, head), "--"]
                + RECORD_AUDIT_PATHS)
    if r.returncode != 0:
        anomalies.append("git-failed: trailer-audit log: %s"
                         % (r.stderr or r.stdout).strip())
        return baseline
    for entry in r.stdout.split("\x02"):
        if not entry.strip():
            continue
        sha, _sep, body = entry.strip("\n").partition("\x01")
        sha = sha.strip()
        if not any(ln.strip() == TRAILER_LINE for ln in body.split("\n")):
            anomalies.append("untrailed-record-commit: %s touches %s with no '%s' trailer; "
                             "the record was written outside commit-safe (canon-changed's "
                             "sibling)" % (sha[:12], ",".join(RECORD_AUDIT_PATHS),
                                           TRAILER_LINE))
    return head


def step0_checks(state_prev, schemas, report, anomalies, notes):
    current_schema = schemas[max(schemas)]
    # Template-schema coupling: the authoring template must agree with the current schema.
    if not TEMPLATE_PATH.exists():
        anomalies.append("template-missing: %s" % TEMPLATE_PATH.name)
    else:
        tpl = read_text(TEMPLATE_PATH)
        for heading in current_schema["sections"]["required"]:
            if "## " + heading not in tpl:
                anomalies.append("template-schema-mismatch: template lacks '## %s'" % heading)
        for key in current_schema["frontmatter"]["required"]:
            if not re.search(r"(?m)^%s:" % re.escape(key), tpl):
                anomalies.append("template-schema-mismatch: template lacks frontmatter "
                                 "field '%s:'" % key)

    # Contract-line presence (norms B8-B11, [issued] class): verify the instruction is
    # present in the contract that binds the agent; compliance itself is the adversarial
    # audit's to hunt (NORMS.md, check classes).
    for norm, path, needle in CONTRACT_LINES:
        if not path.exists():
            anomalies.append("contract-line-missing: %s absent; the norm %s line cannot "
                             "be verified" % (path.name, norm))
            continue
        haystack = " ".join(read_text(path).split())
        if " ".join(needle.split()) not in haystack:
            anomalies.append("contract-line-missing: the norm %s line is absent from %s"
                             % (norm, path.name))

    # Stamp checks: the prime bundle, every view, and the front-door snapshot block
    # must carry a healthy stamp (FOLDER_TREE.md section 4 scope).
    if PRIME_BUNDLE.exists():
        check_stamped_file(PRIME_BUNDLE, anomalies)
    if VIEWS_DIR.exists():
        for p in sorted(VIEWS_DIR.glob("*.md")):
            check_stamped_file(p, anomalies)
    if FRONT_DOOR.exists():
        fd_text = read_text(FRONT_DOOR)
        if SNAP_BEGIN in fd_text and SNAP_END in fd_text:
            block = fd_text.split(SNAP_BEGIN, 1)[1].split(SNAP_END, 1)[0].strip("\n")
            if block:
                block_lines = block.split("\n")
                info = parse_stamp(block_lines[0])
                if not info or "self" not in info:
                    anomalies.append("unstamped-generated-file: %s snapshot block"
                                     % FRONT_DOOR.name)
                elif sha1_hex("\n".join(block_lines[1:]) + "\n") != info["self"]:
                    anomalies.append("hand-edit-detected: %s snapshot block"
                                     % FRONT_DOOR.name)

    # Map and canon hash baselines vs the owned state file.
    maps_info, map_hashes = [], {}
    if MAPS_DIR.exists():
        for p in sorted(MAPS_DIR.glob("*.md")):
            if p.name == "CONTEXT.md":
                continue
            text = read_text(p)
            cls = "generated" if text.startswith("<!-- generated:") else "verified"
            maps_info.append((p.name, cls))
            if cls == "verified":
                map_hashes[p.name] = sha1_hex(text)
            else:
                anomalies.append("generated-map-without-generator: %s (no generator is "
                                 "defined in this system yet)" % p.name)
    if state_prev:
        for name, h in map_hashes.items():
            prev = state_prev.get("map_hashes", {}).get(name)
            if prev and prev != h:
                anomalies.append("map-edited-outside-review: %s changed with no intervening "
                                 "review verified-edit record" % name)
    else:
        notes.append("map hashes re-baselined (no prior state)")

    canon_hashes = {}
    changelog_text = read_text(CHANGELOG_PATH) if CHANGELOG_PATH.exists() else ""
    for p in CANON_FILES + sorted(SCHEMA_DIR.glob("td_v*.json")):
        if not p.exists():
            notes.append("canon file absent (pre-migration state): %s" % p.name)
            continue
        canon_hashes[p.name] = sha1_hex(read_text(p))
    if state_prev:
        added = changelog_added_lines(changelog_text,
                                      state_prev.get("changelog_baseline"))
        today_str = date.today().isoformat()
        for name, h in canon_hashes.items():
            prev = state_prev.get("canon_hashes", {}).get(name)
            if prev and prev != h and not changelog_names_currently(
                    name, changelog_text, added, today_str):
                anomalies.append("canon-changed: %s changed with no matching CHANGELOG "
                                 "entry (norm B7)" % name)
    else:
        notes.append("canon hashes re-baselined (no prior state)")

    # Records are immutable (norm B3): tracked files under the record paths must be clean.
    if (REPO_ROOT / ".git").exists():
        rels = []
        for d in (COMPLETED_DIR, TRACES_DIR, SESSIONS_DIR):
            if d.exists():
                rels.append(str(d.relative_to(REPO_ROOT)).replace("\\", "/"))
        if rels:
            r = git_run(["status", "--porcelain", "--"] + rels)
            if r.returncode != 0:
                anomalies.append("git-status-failed: %s" % (r.stderr or r.stdout).strip())
            else:
                for ln in r.stdout.splitlines():
                    if ln[:2].strip() and not ln.startswith("??") and not ln.startswith("A"):
                        anomalies.append("record-modified: %s (norm B3)" % ln[3:].strip())

    # The deadman's own liveness stamp, as the sweep sees it.
    deadman_age = None
    if DEADMAN_LAST.exists():
        deadman_age = max(0.0, datetime.now().timestamp() - DEADMAN_LAST.stat().st_mtime)
        if deadman_age > DEADMAN_STALE_SECONDS:
            anomalies.append("deadman-stale: deadman.last is %.0f minutes old"
                             % (deadman_age / 60))
    else:
        notes.append("deadman.last absent (the deadman has not yet run; scheduled at W4)")

    return maps_info, map_hashes, canon_hashes, changelog_baseline(changelog_text), deadman_age


# ---------------------------------------------------------------------------
# The run.
# ---------------------------------------------------------------------------

def default_branch():
    r = git_run(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip().split("/", 1)[-1]
    for cand in ("main", "master"):
        r = git_run(["rev-parse", "--verify", "--quiet", "refs/heads/%s" % cand])
        if r.returncode == 0:
            return cand
    return "main"


def load_state():
    if not STATE_PATH.exists():
        return None, True
    try:
        return json.loads(read_text(STATE_PATH)), False
    except (OSError, ValueError):
        return None, True


def parse_changelog_decisions():
    """Human decision lines in CHANGELOG.md: 'approve <id>' / 'reject <id>' anywhere on a
    dated, append-only line."""
    decisions = {}
    if not CHANGELOG_PATH.exists():
        return decisions
    for ln in read_text(CHANGELOG_PATH).split("\n"):
        for verb in ("approve", "reject"):
            for m in re.finditer(r"\b%s\s+([0-9a-f]{12})\b" % verb, ln):
                decisions[m.group(1)] = verb
    return decisions


def compute_run(args, schemas, lock_events=None):
    """Steps 0-7, all in memory: identical for a dry run and an apply run, so the dry run
    prints exactly what an apply would do. Only the effects executor writes. lock_events
    carries any stale-lock steal the acquisition performed; each is recorded as an anomaly
    (the steal is loud, never silent)."""
    report, anomalies, notes = [], list(lock_events or []), []
    plan = {"quarantines": [], "moves": [], "map_writes": {}, "gap_writes": {},
            "batch": [], "report": report, "anomalies": anomalies, "notes": notes}

    state_prev, state_missing = load_state()
    if state_missing:
        anomalies.append("state-file-missing: %s absent or unreadable; this run re-baselines"
                         % STATE_PATH.name)
    plan["state_prev"] = state_prev
    plan["state_missing"] = state_missing

    maps_info, map_hashes, canon_hashes, changelog_base, deadman_age = step0_checks(
        state_prev, schemas, report, anomalies, notes)
    plan.update(maps_info=maps_info, map_hashes=map_hashes, canon_hashes=canon_hashes,
                changelog_baseline=changelog_base, deadman_age=deadman_age)

    # The trailer audit (commit discipline): read-only, so dry and apply runs report
    # identically; only an apply run advances the recorded baseline (via the state write).
    plan["trailer_baseline"] = trailer_audit(state_prev, anomalies, notes)

    cutoff = schema_cutoff(schemas)
    fb_version = fallback_version(schemas)

    # Step 1: one snapshot of pending/, ascending (number, name); exclusions by name.
    candidates = []
    if PENDING_DIR.exists():
        for p in sorted(PENDING_DIR.iterdir()):
            if not p.is_file() or p.name in (".gitkeep", "CONTEXT.md"):
                continue
            if p.suffix != ".md":
                notes.append("non-.md file in pending/ excluded by name: %s" % p.name)
                continue
            candidates.append(p)
    snapshot = []
    for p in candidates:
        m = TOUCHDOWN_NAME_RE.match(p.name)
        if not m:
            plan["quarantines"].append((p, "bad-filename",
                                        "filename fails NNNN_slug_YYYY-MM-DD.md"))
            anomalies.append("quarantined: %s (bad-filename)" % p.name)
            continue
        snapshot.append((int(m.group(1)), p.name, p))
    snapshot.sort(key=lambda t: (t[0], t[1]))
    plan["snapshot_size"] = len(candidates)

    # Step 2: validate or quarantine; full-filename collision check against completed/.
    batch = []
    for _nnnn, name, path in snapshot:
        report.append("== %s ==" % name)
        if (COMPLETED_DIR / name).exists():
            plan["quarantines"].append((path, "collision",
                                        "a file of this name already sits in completed/"))
            anomalies.append("quarantined: %s (collision)" % name)
            report.append("  quarantine: collision with completed/%s" % name)
            continue
        try:
            text = read_text(path)
        except (OSError, UnicodeDecodeError) as exc:
            plan["quarantines"].append((path, "unreadable", str(exc)))
            anomalies.append("quarantined: %s (unreadable)" % name)
            report.append("  quarantine: unreadable (%s)" % exc)
            continue
        fm, sections, td_notes, err = parse_touchdown_text(text)
        if err:
            plan["quarantines"].append((path, "invalid-frontmatter", err))
            anomalies.append("quarantined: %s (invalid-frontmatter)" % name)
            report.append("  quarantine: %s" % err)
            continue
        version, why = schema_for(fm, name, schemas, cutoff, fb_version)
        if version is None:
            reason = "schema-missing" if why == "schema-missing" else "schema-unresolvable"
            plan["quarantines"].append((path, reason, why))
            anomalies.append("quarantined: %s (%s)" % (name, reason))
            report.append("  quarantine: %s (%s)" % (reason, why))
            continue
        failures = validate_touchdown(fm, sections, schemas[version])
        if failures:
            plan["quarantines"].append((path, "invalid",
                                        "; ".join(failures)))
            anomalies.append("quarantined: %s (invalid vs td_v%d)" % (name, version))
            for f in failures:
                report.append("  quarantine (vs td_v%d): %s" % (version, f))
            continue
        report.append("  valid against td_v%d%s" % (
            version, "" if fm.get("schema") else " (dated fallback)"))
        for n in td_notes:
            report.append("  note: %s" % n)
        routed = route_touchdown(name, fm, sections, schemas[version], report, anomalies)
        td = {"filename": name, "path": path, "fm": fm, "sections": sections,
              "text": text, "version": version, "routed": routed}
        batch.append(td)
        plan["moves"].append((path, COMPLETED_DIR / name))
    plan["batch"] = batch

    # Step 3: route across the corpus; apply the review's verified edits and verifiable
    # gap-facts (in memory here; written by the executor under the lock).
    routed_all, corpus_hash = collect_corpus_items(batch, schemas, cutoff, fb_version,
                                                   report, anomalies)
    plan["corpus_hash"] = corpus_hash

    resolved_ids = set()
    for _fn, _fm, r in routed_all:
        for res in r["resolutions"]:
            resolved_ids.add(res["closes"])

    applied_count = 0
    verified_map_names = set()
    # Verified edits: per source touchdown, all-or-nothing against scratch copies.
    by_source = {}
    for _fn, fm, r in routed_all:
        for edit in r["verified_edits"]:
            by_source.setdefault(edit["source"], []).append(edit)
    scratch = dict(plan["map_writes"])
    for source in sorted(by_source):
        edits = by_source[source]
        local = {}
        failed = None
        applied_now = 0
        for edit in edits:
            map_path = MAPS_DIR / (edit["map"] + ".md")
            if not map_path.exists():
                failed = (edit, "map %s does not exist" % edit["map"])
                break
            key = str(map_path)
            text = local.get(key, scratch.get(key))
            if text is None:
                text = read_text(map_path)
            if text.startswith("<!-- generated:"):
                failed = (edit, "map %s is generated-class, never an edit target" % edit["map"])
                break
            new_text, reason = apply_edit(text, edit)
            if reason == "already-applied":
                local[key] = text
                continue
            if reason:
                failed = (edit, reason)
                break
            local[key] = new_text
            applied_now += 1
        if failed:
            edit, reason = failed
            anomalies.append("verified-edit-failed: %s from %s (%s); none of that "
                             "touchdown's edits applied" % (edit["id"], source, reason))
            report.append("  verified edits from %s: FAILED (%s); all-or-nothing, "
                          "none applied" % (source, reason))
            continue
        scratch.update(local)
        for edit in edits:
            resolved_ids.add(edit["closes"])
            resolved_ids.add(edit["id"])
            verified_map_names.add(edit["map"])
        applied_count += applied_now
        if applied_now:
            report.append("  verified edits from %s: %d applied under the lock"
                          % (source, applied_now))
    plan["map_writes"] = {k: v for k, v in scratch.items()}
    # A verified edit applied this run re-baselines its map's hash to the post-apply
    # bytes in the same run, so the next run's provenance check (norm B5) sees no
    # phantom delta. Only maps this run writes are re-baselined; a map changed with
    # no verified-edit record in any run still raises map-edited-outside-review.
    for key, text in plan["map_writes"].items():
        plan["map_hashes"][Path(key).name] = sha1_hex(text)

    # Gap-facts: apply iff the target exists, is a CONTEXT.md, Old matches exactly once,
    # and every substituted token verifies individually [D46]. Anything less queues.
    gap_targets = []
    extra_gaps = []
    for _fn, _fm, r in routed_all:
        for gf in r["gap_facts"]:
            target_rel = gf["target"].replace("\\", "/")
            target = REPO_ROOT / target_rel
            reason = None
            if Path(target_rel).name != "CONTEXT.md":
                reason = "gap-fact target is not a CONTEXT.md file (eligible targets only)"
            elif not target.exists():
                reason = "gap-fact target does not exist: %s" % target_rel
            if reason is None:
                key = str(target)
                text = plan["gap_writes"].get(key)
                if text is None:
                    text = read_text(target)
                old = "\n".join(gf["old_lines"])
                new = "\n".join(gf["new_lines"])
                old_tokens = old.split()
                changed = [t for t in new.split() if t not in old_tokens]
                unverified = []
                for tok in changed:
                    t = tok.strip("`.,;:()[]")
                    ok = False
                    if t and (REPO_ROOT / t.replace("\\", "/")).exists():
                        ok = True
                    elif t and re.fullmatch(r"\d+", t):
                        glob_pat = gf["recounts"].get(t)
                        if glob_pat and len(list(REPO_ROOT.glob(glob_pat))) == int(t):
                            ok = True
                    elif t and ("/" not in t and "\\" not in t):
                        hits = [p for p in REPO_ROOT.rglob(t)
                                if ".git" not in p.parts]
                        if hits:
                            ok = True
                    if not ok:
                        unverified.append(tok)
                if unverified:
                    reason = ("gap-fact substitution not verifiable: %s"
                              % ", ".join(unverified))
                else:
                    new_text, apply_reason = apply_replace(text, old, new)
                    if apply_reason == "already-applied":
                        resolved_ids.add(gf["id"])
                        continue
                    if apply_reason:
                        reason = "gap-fact %s" % apply_reason
                    else:
                        plan["gap_writes"][key] = new_text
                        resolved_ids.add(gf["id"])
                        applied_count += 1
                        gap_targets.append(target_rel)
                        report.append("  gap-fact %s applied to %s" % (gf["id"], target_rel))
                        continue
            extra_gaps.append(dict(id=gf["id"], target=gf["target"], reason=reason,
                                   source=gf["source"], date=gf["date"]))
            report.append("  gap-fact %s queued: %s" % (gf["id"], reason))
    for g in extra_gaps:
        for _fn, _fm, r in routed_all:
            if r is not None and g["source"] == _fn:
                r["gaps"].append(g)
                break
    plan["applied_count"] = applied_count
    plan["gap_apply_targets"] = gap_targets
    plan["resolved_ids"] = resolved_ids

    # A review touchdown in the batch clears the outstanding handoff marker.
    plan["review_processed"] = any(td["fm"].get("actor") == "review" for td in batch)

    # Step 4: regenerate the views wholesale (in memory; written by the executor).
    norms_text = read_text(NORMS_PATH) if NORMS_PATH.exists() else ""
    decisions = parse_changelog_decisions()
    iso = now_iso()
    plan["iso"] = iso
    today = date.today()
    rendered, stats = build_views(routed_all, resolved_ids, norms_text, decisions,
                                  iso, corpus_hash, today)
    plan["views"] = rendered
    plan["view_stats"] = stats
    plan["snapshot_block"] = None
    if FRONT_DOOR.exists():
        fd_text = read_text(FRONT_DOOR)
        if SNAP_BEGIN in fd_text and SNAP_END in fd_text:
            plan["front_door_text"] = fd_text
            plan["snapshot_block"] = build_snapshot_block(iso, corpus_hash, plan, maps_info)
        else:
            notes.append("front-door snapshot skipped: %s has no snapshot markers"
                         % FRONT_DOOR.name)
    else:
        notes.append("front-door snapshot skipped: %s does not exist yet (arrives at W3)"
                     % FRONT_DOOR.name)

    # New session journals: a hand-dragged NEW file directly under sessions/ is adopted
    # by this run (enumerated here so a dry run prints it; staged by explicit path in
    # the executor). Untracked files only, via git's own untracked view, so a MODIFIED
    # tracked session file is never adopted and stays a step-0 record-modified anomaly
    # (norm B3).
    plan["session_adoptions"] = []
    if (REPO_ROOT / ".git").exists() and SESSIONS_DIR.exists():
        r = git_run(["ls-files", "--others", "--exclude-standard", "-z", "--",
                     str(SESSIONS_DIR.relative_to(REPO_ROOT)).replace("\\", "/")])
        if r.returncode != 0:
            anomalies.append("git-failed: ls-files --others sessions: %s"
                             % (r.stderr or r.stdout).strip())
        else:
            for rel in sorted(x for x in r.stdout.split("\0") if x):
                p = REPO_ROOT / rel
                if p.is_file() and p.parent == SESSIONS_DIR:
                    plan["session_adoptions"].append(p)

    # Step 7: the split verdict, computed on end-of-run state, ambiguity fires.
    triggers, trigger_items = [], set()
    def trigger(label, ids):
        triggers.append(label)
        trigger_items.update(ids)
    try:
        if stats["open_flags"] or stats["open_invalid"]:
            trigger("map-queue non-empty (%d)" % (len(stats["open_flags"])
                                                  + len(stats["open_invalid"])),
                    [f["id"] for f in stats["open_flags"] + stats["open_invalid"]])
    except Exception as exc:  # ambiguity fires
        trigger("map-queue trigger unevaluable (%s)" % exc, ["ambiguous:map-queue"])
    # D96: only review-closable gap items count toward review-warranted; human-gated and
    # product-zone items are listed-not-counted (they ride the handoff and the view, and
    # the deadman clocks them). An item with no route field is counted, the safe side.
    listed_gaps = []
    try:
        counted = [g for g in stats["open_gaps"]
                   if g.get("route", ROUTE_REVIEW_CLOSABLE) == ROUTE_REVIEW_CLOSABLE]
        listed_gaps = [g for g in stats["open_gaps"]
                       if g.get("route", ROUTE_REVIEW_CLOSABLE) != ROUTE_REVIEW_CLOSABLE]
        if counted:
            trigger("gap-queue counted non-empty (%d review-closable; %d listed, "
                    "not counted)" % (len(counted), len(listed_gaps)),
                    [g["id"] for g in counted])
    except Exception as exc:
        trigger("gap-queue trigger unevaluable (%s)" % exc, ["ambiguous:gap-queue"])
    plan["listed_gaps"] = sorted("%s (%s)" % (g["id"], g["route"]) for g in listed_gaps)
    # D97: an open error older than the ageing threshold routes itself onto the review
    # handoff for re-examination, its age stated, so stale errors are re-examined on a
    # rhythm instead of never. The review re-verifies against disk and either closes it
    # with evidence or re-states it (a resolution fact closing the old id plus a fresh
    # entry naming the current blocker), which restarts this clock from the re-statement.
    # Review-closable FOR RE-EXAMINATION even where the underlying fix is human-gated:
    # the re-statement is the review's work, the fix is not; error entries are not gap
    # items, so the D96 counted/listed split is untouched.
    try:
        aged = []
        for e in stats["open_errors"]:
            if not e.get("date"):
                continue
            age = (today - date.fromisoformat(e["date"])).days
            if age > OPEN_ERROR_AGE_ROUTE_DAYS:
                aged.append((e, age))
        if aged:
            trigger("open errors past the %dd ageing route (re-examine, close with "
                    "evidence or re-state): %s"
                    % (OPEN_ERROR_AGE_ROUTE_DAYS,
                       ", ".join("%s (%dd old)" % (e["id"], age) for e, age in aged)),
                    [e["id"] for e, _age in aged])
    except Exception as exc:
        trigger("open-error ageing trigger unevaluable (%s)" % exc,
                ["ambiguous:error-ageing"])
    if anomalies:
        trigger("new-this-run anomalies (%d)" % len(anomalies),
                ["anomaly:" + sha1_hex(a, 12) for a in anomalies])
    try:
        props = stats["open_props"]
        oldest_prop_age = 0
        if props:
            oldest_prop_age = max((today - date.fromisoformat(p["date"])).days
                                  for p in props if p["date"])
        if len(props) >= PROPOSAL_COUNT_TRIGGER or oldest_prop_age >= PROPOSAL_AGE_TRIGGER_DAYS:
            trigger("unconsidered proposals over threshold (%d, oldest %dd)"
                    % (len(props), oldest_prop_age), [p["id"] for p in props])
    except Exception as exc:
        trigger("proposal trigger unevaluable (%s)" % exc, ["ambiguous:proposals"])
    if args.ask:
        trigger("direct ask", ["ask:" + sha1_hex(args.ask, 12)])

    # Human-facing breaches: never the review's to act on [D48].
    human = []
    try:
        qcount = len([p for p in QUARANTINE_DIR.iterdir()
                      if p.is_file() and p.name != ".gitkeep"]) if QUARANTINE_DIR.exists() else 0
        qcount += len(plan["quarantines"])
        if qcount:
            human.append("quarantine non-empty (%d files incl. reason files)" % qcount)
    except Exception as exc:
        human.append("quarantine breach unevaluable (%s)" % exc)
    try:
        old_cand = [c for c in stats["candidates"] if c["age"] > PROMOTION_AGE_BREACH_DAYS]
        if old_cand:
            human.append("promotion candidates older than %dd: %d"
                         % (PROMOTION_AGE_BREACH_DAYS, len(old_cand)))
    except Exception as exc:
        human.append("promotion breach unevaluable (%s)" % exc)
    try:
        oe = stats["open_errors"]
        if len(oe) >= OPEN_ERRORS_COUNT_BREACH:
            human.append("open errors at or above %d (%d)"
                         % (OPEN_ERRORS_COUNT_BREACH, len(oe)))
        if oe:
            oldest_err_age = max((today - date.fromisoformat(e["date"])).days
                                 for e in oe if e["date"])
            if oldest_err_age > OPEN_ERRORS_AGE_BREACH_DAYS:
                human.append("oldest open error is %dd old (threshold %dd)"
                             % (oldest_err_age, OPEN_ERRORS_AGE_BREACH_DAYS))
    except Exception as exc:
        human.append("open-errors breach unevaluable (%s)" % exc)
    plan["human_breaches"] = human

    current_set = sorted(trigger_items)
    hist = (state_prev or {}).get("trigger_history", [])
    review_not_converging = False
    review_warranted = bool(triggers)
    if review_warranted and len(hist) >= 2 and hist[-1] == hist[-2] == current_set:
        # Anti-flap [D48, adv B2]: an identical review-facing item-id set that did not
        # shrink across the two most recent firings is not re-marked; it becomes a
        # breach for the deadman, not another strong-model firing.
        review_not_converging = True
        review_warranted = False
        report.append("  anti-flap: the two most recent firings carried this identical "
                      "item-id set; not re-marking (review-not-converging)")
    review_warranted_recorded = review_warranted
    plan["triggers"] = triggers
    plan["trigger_items"] = current_set
    plan["review_not_converging"] = review_not_converging
    plan["verdict"] = ("review-warranted" if review_warranted
                       else ("review-not-converging" if review_not_converging else "clean"))

    # Outstanding-handoff marker: young and outstanding means already-marked [D43].
    handoff_prev = (state_prev or {}).get("handoff")
    handoff = handoff_prev
    if plan["review_processed"]:
        handoff = None
    if review_warranted_recorded:
        outstanding = False
        if handoff:
            try:
                age = (datetime.now()
                       - datetime.fromisoformat(handoff["recorded"])).total_seconds()
                outstanding = age < HANDOFF_T_SECONDS
            except (KeyError, ValueError):
                outstanding = False
        if not outstanding:
            handoff = {"recorded": iso, "trigger": triggers, "items": current_set,
                       "ask": args.ask or None}
            # D96: the listed-not-counted gap items ride the handoff as their own clearly
            # separated section; they are never in items (nothing hides, nothing re-counts).
            if plan["listed_gaps"]:
                handoff["listed"] = plan["listed_gaps"]
        else:
            report.append("  handoff outstanding and younger than T: already-marked, "
                          "not re-recorded")
    plan["handoff"] = handoff

    new_hist = (hist + [current_set])[-2:] if review_warranted else hist[-2:]
    plan["trigger_history"] = new_hist

    # The digest line (timestamp added at write so dry and apply print identically).
    # S3: an apply that came from a gap-fact names its target(s) in parentheses after the
    # count; verified-edit applies stay a bare count and a no-apply run prints plain applied=0.
    applied_part = "applied=%d" % applied_count
    named_targets = []
    for t in gap_targets:
        if t not in named_targets:
            named_targets.append(t)
    if named_targets:
        applied_part += "(%s)" % ",".join(named_targets)
    plan["digest_body"] = ("sweep | batch=%d quarantined=%d %s queued=%d "
                           "anomalies=%d | verdict=%s"
                           % (plan["snapshot_size"], len(plan["quarantines"]),
                              applied_part,
                              len(stats["open_flags"]) + len(stats["open_invalid"])
                              + len(stats["open_gaps"]),
                              len(anomalies), plan["verdict"]))
    return plan


# ---------------------------------------------------------------------------
# Effects (apply runs only), in LOOP_SPEC step order.
# ---------------------------------------------------------------------------

def unique_dest(directory, name):
    dest = directory / name
    if not dest.exists():
        return dest
    stem, suffix = dest.stem, dest.suffix
    for tag in "bcdefgh":
        cand = directory / ("%s-%s%s" % (stem, tag, suffix))
        if not cand.exists():
            return cand
    raise RuntimeError("no free name for %s in %s" % (name, directory))


def build_trace(plan):
    lines = ["# trace -- one frozen photograph of this sweep run", ""]
    lines.append("digest: %s | %s" % (plan["iso"], plan["digest_body"]))
    lines.append("")
    lines.append("## Snapshot")
    if plan["batch"] or plan["quarantines"]:
        for td in plan["batch"]:
            lines.append("- %s (td_v%d)" % (td["filename"], td["version"]))
        for path, reason, detail in plan["quarantines"]:
            lines.append("- %s -> quarantine (%s: %s)" % (path.name, reason, detail))
    else:
        lines.append("- pending/ was empty")
    lines.append("")
    lines.append("## Routing and outcomes")
    lines += plan["report"] or ["- nothing routed"]
    lines.append("")
    lines.append("## Anomalies")
    lines += ["- %s" % a for a in plan["anomalies"]] or ["- none"]
    lines.append("")
    lines.append("## Notes")
    lines += ["- %s" % n for n in plan["notes"]] or ["- none"]
    lines.append("")
    lines.append("## Verdict")
    lines.append("- verdict: %s" % plan["verdict"])
    lines += ["- trigger: %s" % t for t in plan["triggers"]]
    lines += ["- human-facing breach: %s" % b for b in plan["human_breaches"]]
    lines.append("")
    lines.append("## State as written this run")
    lines.append("```json")
    lines.append(json.dumps(plan["state_out"], indent=2, sort_keys=True))
    lines.append("```")
    lines.append("")
    lines.append("## Views as they stand this run")
    for name in VIEW_NAMES:
        full, _body = plan["views"][name]
        lines.append("")
        lines.append("### %s" % name)
        lines.append("```")
        lines.append(full.rstrip("\n"))
        lines.append("```")
    return "\n".join(lines) + "\n"


def execute(plan, args):
    """The write phase: quarantines, applied edits, views, trace, moves, state, digest,
    then one commit of exactly this run's paths."""
    staged = []

    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    for path, reason, detail in plan["quarantines"]:
        dest = unique_dest(QUARANTINE_DIR, path.name)
        os.replace(path, dest)
        reason_file = dest.with_name(dest.name + ".reason.txt")
        write_text(reason_file, "%s: %s\n" % (reason, detail))
        staged += [dest, reason_file, path]

    for key, text in list(plan["map_writes"].items()) + list(plan["gap_writes"].items()):
        write_generated(Path(key), text)
        staged.append(Path(key))

    VIEWS_DIR.mkdir(parents=True, exist_ok=True)
    for name in VIEW_NAMES:
        full, _body = plan["views"][name]
        write_generated(VIEWS_DIR / name, full)
        staged.append(VIEWS_DIR / name)

    if plan.get("snapshot_block"):
        fd = plan["front_door_text"]
        pre, rest = fd.split(SNAP_BEGIN, 1)
        _mid, post = rest.split(SNAP_END, 1)
        write_generated(FRONT_DOOR, pre + SNAP_BEGIN + "\n" + plan["snapshot_block"]
                        + SNAP_END + post)
        staged.append(FRONT_DOOR)

    plan["state_out"]["written"] = now_iso()
    trace_text = build_trace(plan)
    TRACES_DIR.mkdir(parents=True, exist_ok=True)
    trace_name = datetime.now().strftime("%Y-%m-%dT%H-%M") + "_trace.md"
    trace_path = unique_dest(TRACES_DIR, trace_name)
    write_generated(trace_path, trace_text)
    staged.append(trace_path)

    # Step 6: the commit point. Filesystem move; a vanished source is an anomaly, not a crash.
    COMPLETED_DIR.mkdir(parents=True, exist_ok=True)
    for src, dest in plan["moves"]:
        if not src.exists():
            plan["anomalies"].append("move-source-vanished: %s" % src.name)
            continue
        os.replace(src, dest)
        staged += [src, dest]

    write_generated(STATE_PATH, json.dumps(plan["state_out"], indent=2, sort_keys=True)
                    + "\n")
    staged.append(STATE_PATH)

    # Step 8: the digest heartbeat, best-effort, capped, header preserved.
    try:
        digest_line = "%s | %s" % (plan["state_out"]["written"], plan["digest_body"])
        if STATUS_PATH.exists():
            lines, _ends = to_lines(read_text(STATUS_PATH))
        else:
            lines = ["# STATUS.md -- sweep digest lines only, capped at %d lines; "
                     "the heartbeat" % STATUS_CAP_LINES, ""]
        header, body = lines[:2], lines[2:]
        body.append(digest_line)
        body = body[-(STATUS_CAP_LINES - 2):]
        write_generated(STATUS_PATH, from_lines(header + body, True))
        staged.append(STATUS_PATH)
    except Exception as exc:
        print("digest write failed (best-effort, swallowed): %s" % exc)

    # The prime bundle is reassembled at each run's end, after every one of its
    # generated sources (the views, the front-door snapshot, the STATUS digest) is
    # on disk, so the stamped source hashes match live state until the next edit.
    # The bundle is gitignored: never staged, never committed; a failure is an
    # anomaly, not an abort (the next run's step 0 catches a stale bundle).
    r = subprocess.run([sys.executable, str(REPO_ROOT / "_prime" / "src" / "prime.py")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        plan["anomalies"].append("prime-regeneration-failed: prime.py exited %d: %s"
                                 % (r.returncode, (r.stderr or r.stdout).strip()))

    # Git: explicit paths only, every return code checked, failure aborts loudly.
    tracked = set()
    r = git_run(["ls-files", "-z"])
    if r.returncode != 0:
        plan["anomalies"].append("git-failed: ls-files: %s" % (r.stderr or r.stdout).strip())
        return None
    tracked = set(r.stdout.split("\0"))
    # Adopt the new session journals enumerated at plan time; a vanished one is an
    # anomaly, not a crash (the same tolerance as the completed/ moves).
    for p in plan.get("session_adoptions", []):
        if p.exists():
            staged.append(p)
        else:
            plan["anomalies"].append("session-adopt-vanished: %s" % p.name)
    rels = []
    for p in staged:
        rel = str(p.relative_to(REPO_ROOT)).replace("\\", "/")
        if p.exists() or rel in tracked:
            if rel not in rels:
                rels.append(rel)
    if rels:
        r = git_run(["add", "--"] + rels)
        if r.returncode != 0:
            plan["anomalies"].append("git-failed: add returned %d: %s"
                                     % (r.returncode, (r.stderr or r.stdout).strip()))
            return None
        r = git_run(["diff", "--cached", "--quiet"])
        if r.returncode == 1:
            msg = "sweep: %s\n\n%s\n" % ("%s | %s" % (plan["state_out"]["written"],
                                                      plan["digest_body"]), TRAILER_LINE)
            r = git_run(["commit", "-m", msg, "--"] + rels)
            if r.returncode != 0:
                plan["anomalies"].append("git-failed: commit returned %d: %s"
                                         % (r.returncode, (r.stderr or r.stdout).strip()))
                return None
        elif r.returncode not in (0, 1):
            plan["anomalies"].append("git-failed: diff --cached returned %d" % r.returncode)
            return None

    # Push inside the held lock (spec 2.1: push races invite the careless rebase or
    # force-push that can rewrite the record; a second inside the lock closes that door).
    # A push failure after the commit is an anomaly, never an abort: the commit point
    # stands and the next successful push carries it. No remote is a note, not a failure.
    r = git_run(["remote"])
    if r.returncode != 0:
        plan["anomalies"].append("git-failed: remote returned %d: %s"
                                 % (r.returncode, (r.stderr or r.stdout).strip()))
    elif not r.stdout.strip():
        plan["notes"].append("push skipped: no remote configured")
    else:
        r = git_run(["push"])
        if r.returncode != 0:
            plan["anomalies"].append("git-push-failed: %s; the commit stands and origin "
                                     "lags until the next successful push (never rebase, "
                                     "never force-push)"
                                     % (r.stderr or r.stdout).strip())
    return trace_path


# ---------------------------------------------------------------------------
# Main.
# ---------------------------------------------------------------------------

def print_summary(plan, mode_line):
    print("sweep -- plan")
    print("Snapshot: %d pending file(s) considered." % plan["snapshot_size"])
    print()
    for line in plan["report"]:
        print(line)
    print()
    print("== Quarantine ==")
    for path, reason, detail in plan["quarantines"]:
        print("  %s -> %s (%s)" % (path.name, reason, detail))
    if not plan["quarantines"]:
        print("  none")
    print("== Moves ==")
    for src, dest in plan["moves"]:
        print("  %s -> completed/" % src.name)
    if not plan["moves"]:
        print("  none")
    print("== Writes ==")
    for key in sorted(plan["map_writes"]):
        print("  map: %s" % Path(key).name)
    for key in sorted(plan["gap_writes"]):
        print("  gap target: %s" % Path(key).name)
    for p in plan.get("session_adoptions", []):
        print("  session adopt: %s (new file, staged by explicit path)" % p.name)
    print("  views: %s" % ", ".join(VIEW_NAMES))
    print("  front-door snapshot: %s" % ("yes" if plan.get("snapshot_block") else "skipped"))
    print("  prime bundle: %s reassembled at run end (gitignored, never staged)"
          % PRIME_BUNDLE.name)
    print("  trace: one frozen trace this run")
    print("== Anomalies ==")
    for a in plan["anomalies"]:
        print("  %s" % a)
    if not plan["anomalies"]:
        print("  none")
    print("== Notes ==")
    for n in plan["notes"]:
        print("  %s" % n)
    if not plan["notes"]:
        print("  none")
    print("== Verdict ==")
    print("  verdict: %s" % plan["verdict"])
    for t in plan["triggers"]:
        print("  trigger: %s" % t)
    for b in plan["human_breaches"]:
        print("  human-facing: %s" % b)
    if plan.get("handoff"):
        print("  handoff: %s" % json.dumps(
            {k: plan["handoff"][k] for k in ("trigger", "items", "listed", "ask")
             if plan["handoff"].get(k) is not None}, sort_keys=True))
    print("  digest: %s" % plan["digest_body"])
    print(mode_line)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="The loop's sweep: validate, route, regenerate, trace, move, verdict, "
                    "digest. Dry run by default; --apply performs the writes and moves.")
    parser.add_argument("--apply", action="store_true",
                        help="perform the writes and moves (default is a dry run)")
    parser.add_argument("--ask", metavar="QUESTION",
                        help="force the verdict to review-warranted with this question as "
                             "the handoff item")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    if not (REPO_ROOT / "_orchestration").is_dir():
        print("FATAL: %s has no _orchestration/ directory; refusing to run from a wrong "
              "root." % REPO_ROOT)
        return 1

    schemas = load_schemas()

    apply_mode = args.apply
    branch_note = None
    if apply_mode and (REPO_ROOT / ".git").exists():
        r = git_run(["rev-parse", "--abbrev-ref", "HEAD"])
        if r.returncode != 0:
            print("FATAL: git rev-parse failed: %s" % (r.stderr or r.stdout).strip())
            return 1
        branch = r.stdout.strip()
        default = default_branch()
        if branch != default:
            apply_mode = False
            branch_note = ("branch-dry: on branch %r, not the default %r; the sweep runs "
                           "dry only, branch jobs sweep at merge [D55]" % (branch, default))

    lock_token = None
    lock_events = []
    if apply_mode:
        # The shared discipline (commit_safe.py): wait on a live fresh holder, steal a
        # dead-PID or TTL-stale lock loudly, time out LOUDLY rather than block forever.
        try:
            LOOP_DIR.mkdir(parents=True, exist_ok=True)
            lock_token = acquire_lock(LOCK_PATH,
                                      label=" ".join(sys.argv[1:]) or "sweep",
                                      events=lock_events)
        except LockTimeout as exc:
            print("sweep -- REFUSED: %s" % exc)
            print("The wait, the dead-PID steal and the TTL backstop all declined to "
                  "free it: a live fresh holder is working. Re-run when it finishes.")
            return 2

    plan = compute_run(args, schemas, lock_events)

    plan["state_out"] = {
        "schema": 1,
        "written": plan["iso"],
        "map_hashes": plan["map_hashes"],
        "canon_hashes": plan["canon_hashes"],
        "changelog_baseline": plan["changelog_baseline"],
        "last_review": (plan["iso"] if plan["review_processed"]
                        else (plan["state_prev"] or {}).get("last_review")),
        "handoff": plan["handoff"],
        "trigger_history": plan["trigger_history"],
        "review_not_converging": plan["review_not_converging"],
        "deadman_last_age_seconds": plan["deadman_age"],
        "state_file_was_missing": plan["state_missing"],
        "quarantine_count": len(plan["quarantines"]),
        "human_breaches": plan["human_breaches"],
        "last_verdict": plan["verdict"],
        "trailer_audit_baseline": plan.get("trailer_baseline"),
    }

    if apply_mode:
        # try/finally is the sweep's trap: an exception mid-run releases the lock (the
        # hard-kill case the trap cannot catch is what the dead-PID steal and TTL cover).
        try:
            trace_path = execute(plan, args)
            if trace_path is None:
                print_summary(plan, "Mode: apply -- ABORTED on git failure; filesystem "
                                    "truth stands, re-run converges (idempotence).")
                return 1
            print_summary(plan, "Mode: apply -- writes, moves, one commit and the push "
                                "performed under the lock (trace: %s)." % trace_path.name)
        finally:
            release_lock(LOCK_PATH, lock_token)
    else:
        footer = "Mode: dry run -- nothing was written, no lock taken."
        if branch_note:
            footer = "Mode: %s" % branch_note
        print_summary(plan, footer)

    return 3 if plan["verdict"] == "review-warranted" else 0


if __name__ == "__main__":
    sys.exit(main())
