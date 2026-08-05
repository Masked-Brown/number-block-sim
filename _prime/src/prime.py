"""prime.py -- the prime assembler (PRIME_SPEC.md). Home: _prime/src/.

Assembles the single bee bundle, _prime/PRIME_bee.md, overwritten each assembly. The prime
exists for the blind bee alone: a claude.ai chat that cannot read the disk. Sighted actors
(Claude Code jobs, sub-agents) read the disk and get no prime.

Invocation: python _prime/src/prime.py [--folder <path>]

Assembly, in order (PRIME_SPEC section 3):
 1. the stamp (generated, sources, hashes; the size table appended as a comment segment)
 2. front matter: what this bundle is, one short paragraph (a verbatim constant below)
 3. CLAUDE.md, the router, in full
 4. the actor contract: _orchestration/OPERATIONS_BEE.md, in full
 5. _orchestration/CC_OPERATIONS.md, in full (the bee writes work orders against it)
 6. _infrastructure/INFRASTRUCTURE.md, the front door, in full
 7. live-state block: an open-errors POINTER (count + view path + ask-for-it-in-full line)
    and the last 5 lines of _orchestration/loop/STATUS.md
 8. maps: POINTER BLOCK ONLY (name + one-line topic + path per map); never a map in full
 9. the target folder's CONTEXT.md (--folder), in full; a note when no folder is named
10. closing section "Judge what you need" (a verbatim constant below)

Rules (PRIME_SPEC sections 5 and 6):
- hard-fail with a nonzero exit if any named source is missing; never a partial bundle;
- each file part under a banner '# ==== FILE: <path> (<bytes>) ====';
- an assembled bundle over 50 KB (51,200 bytes) is REFUSED: nothing is written, the per-part
  byte table is printed with the three largest parts flagged, exit nonzero. There is no
  override flag; the remedy is trimming the source or the scope, never widening the budget;
- any single part over 20 KB is flagged in the size table even when the total passes;
- assembly is concatenation plus the two verbatim constants: never edit, summarise or rewrite
  a source.

IO contract (shared with the loop machinery): reads utf-8-sig with CRLF normalised to LF;
the bundle is written UTF-8, no BOM, LF, temp-file-then-rename. The stamp's source hashes
are what the sweep's step 0 checks for staleness. Exit codes: 0 assembled; 1 missing source;
2 budget refused.
"""

import argparse
import hashlib
import os
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

BUDGET_BYTES = 51200
PART_FLAG_BYTES = 20480

OUT_PATH = REPO_ROOT / "_prime" / "PRIME_bee.md"
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
OPERATIONS_BEE = REPO_ROOT / "_orchestration" / "OPERATIONS_BEE.md"
CC_OPERATIONS = REPO_ROOT / "_orchestration" / "CC_OPERATIONS.md"
FRONT_DOOR = REPO_ROOT / "_infrastructure" / "INFRASTRUCTURE.md"
OPEN_ERRORS_VIEW = REPO_ROOT / "_orchestration" / "views" / "open-errors.md"
STATUS_PATH = REPO_ROOT / "_orchestration" / "loop" / "STATUS.md"
MAPS_DIR = REPO_ROOT / "_orchestration" / "maps"

# The front-matter constant: what this bundle is, one short paragraph (PRIME_SPEC section 3,
# part 2 names its role; the paragraph implements it).
FRONT_MATTER = """\
## What this bundle is

This is the prime bundle: the pack assembled for a worker bee at spawn. You are the one
blind actor in this system, a claude.ai chat that cannot read the disk, so everything you
cannot ask the disk for is here: the router, your operating contract, the work-order
contract you write against, the infrastructure front door, a live-state pointer, and the
maps as pointers. It replaces nothing standing and nobody watching: there is no Queen. It
was generated from live disk at your spawn and is disposable; trust its stamp, and ask for
anything it points at.
"""

# The closing section, verbatim from PRIME_SPEC section 4. The actor contract instructs the
# bee to act on it FIRST, before any other opening-ritual step.
CLOSING = """\
## Judge what you need

You have the essentials, nothing more. Before your first act, judge what else this
task needs and ask for it now. On the shelf (ask, and it will be pasted or read):

- the maps listed above, any of them in full
- any folder's CONTEXT.md
- the suggestions, map-queue, gap-queue or promotions view
- specific completed touchdowns or session journals
- NORMS.md, CHANGELOG.md, DESIGN.md

If you proceed without asking, that is your judgement that the essentials suffice.
When mid-task you cannot find something, say so immediately; do not guess.
"""


def read_text(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        return fh.read().replace("\r\n", "\n")


def sha1_8(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


def nbytes(text):
    return len(text.encode("utf-8"))


def rel(path):
    return str(path.relative_to(REPO_ROOT)).replace("\\", "/")


def fail(msg, code):
    print("prime.py: REFUSED -- %s" % msg)
    print("Nothing was written; no partial bundle is ever emitted.")
    return code


def banner(path, text):
    return "# ==== FILE: %s (%d) ====\n\n%s" % (rel(path), nbytes(text), text)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Assemble the bee prime bundle.")
    parser.add_argument("--folder", metavar="PATH",
                        help="folder whose CONTEXT.md rides as part 9, repo-relative")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    # Every named source is checked up front: one missing source is a hard fail.
    sources = [CLAUDE_MD, OPERATIONS_BEE, CC_OPERATIONS, FRONT_DOOR, OPEN_ERRORS_VIEW,
               STATUS_PATH]
    folder_context = None
    if args.folder:
        folder_context = REPO_ROOT / args.folder.replace("\\", "/") / "CONTEXT.md"
        sources.append(folder_context)
    if not MAPS_DIR.is_dir():
        return fail("maps directory is missing: %s" % rel(MAPS_DIR), 1)
    missing = [rel(p) for p in sources if not p.exists()]
    if missing:
        return fail("missing source file(s): %s" % ", ".join(missing), 1)

    texts = {p: read_text(p) for p in sources}

    # Part 7: the live-state block. Open errors ride as a pointer, never the list in full.
    view_lines = texts[OPEN_ERRORS_VIEW].split("\n")
    open_count = len([ln for ln in view_lines if ln.startswith("- ")])
    status_lines = [ln for ln in texts[STATUS_PATH].split("\n") if ln.strip()][-5:]
    live_state = ("## Live state\n\n"
                  "- open errors: %d -- the list lives in _orchestration/views/"
                  "open-errors.md; ask for it in full if the task needs it\n"
                  "- last sweep digest lines (_orchestration/loop/STATUS.md):\n"
                  % open_count)
    live_state += "".join("  %s\n" % ln for ln in status_lines)

    # Part 8: the maps as pointers only. The estate's prime bloat was 81 percent maps; the
    # maps are a verified cache and never ride the prime in full.
    map_files = sorted(p for p in MAPS_DIR.glob("*.md") if p.name != "CONTEXT.md")
    map_ptrs = ["## The maps (pointers only, never pasted in full)", ""]
    for p in map_files:
        topic = ""
        for ln in read_text(p).split("\n"):
            if ln.strip():
                topic = ln.lstrip("#").strip() or ln.strip()
                break
        map_ptrs.append("- %s: %s -- %s" % (p.stem, topic, rel(p)))
    if not map_files:
        map_ptrs.append("- none yet")
    maps_block = "\n".join(map_ptrs) + "\n"

    if folder_context is not None:
        part9 = banner(folder_context, texts[folder_context])
    else:
        part9 = ("## Folder context\n\nNo target folder was named at assembly "
                 "(--folder); ask for any folder's CONTEXT.md when the task lands "
                 "somewhere specific.\n")

    parts = [
        ("02-front-matter", FRONT_MATTER),
        ("03-CLAUDE.md", banner(CLAUDE_MD, texts[CLAUDE_MD])),
        ("04-OPERATIONS_BEE.md", banner(OPERATIONS_BEE, texts[OPERATIONS_BEE])),
        ("05-CC_OPERATIONS.md", banner(CC_OPERATIONS, texts[CC_OPERATIONS])),
        ("06-INFRASTRUCTURE.md", banner(FRONT_DOOR, texts[FRONT_DOOR])),
        ("07-live-state", live_state),
        ("08-maps-pointers", maps_block),
        ("09-folder-context", part9),
        ("10-judge-what-you-need", CLOSING),
    ]

    body = "\n".join(text.rstrip("\n") for _name, text in parts) + "\n"

    sizes = [(name, nbytes(text)) for name, text in parts]
    three_largest = {n for n, _b in sorted(sizes, key=lambda t: -t[1])[:3]}
    over_flags = [n for n, b in sizes if b > PART_FLAG_BYTES]

    size_segments = []
    for name, b in sizes:
        tag = "!over-20KB" if name in over_flags else ""
        size_segments.append("%s=%d%s" % (name, b, tag))
    stamp_sources = ["%s@%s" % (rel(p), sha1_8(texts[p])) for p in sources]
    stamp = ("<!-- generated: prime.py | %s | sources: %s | sizes: %s | self: %s"
             " - do not hand-edit -->"
             % (datetime.now().isoformat(timespec="seconds"),
                ", ".join(stamp_sources), ",".join(size_segments), sha1_8(body)))
    bundle = stamp + "\n" + body
    total = nbytes(bundle)

    print("prime.py -- per-part size table (bytes):")
    for name, b in sizes:
        marks = []
        if name in three_largest:
            marks.append("largest-3")
        if name in over_flags:
            marks.append("OVER the 20 KB per-part flag")
        print("  %-24s %7d%s" % (name, b, ("  [" + ", ".join(marks) + "]") if marks else ""))
    print("  %-24s %7d  (budget %d)" % ("TOTAL (with stamp)", total, BUDGET_BYTES))

    if total > BUDGET_BYTES:
        return fail("assembled bundle is %d bytes, over the %d-byte budget; the three "
                    "largest parts are flagged above. Trim the source or the scope; there "
                    "is no override flag." % (total, BUDGET_BYTES), 2)

    tmp = OUT_PATH.with_name(OUT_PATH.name + ".tmp-%d" % os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="") as fh:
        fh.write(bundle)
    os.replace(tmp, OUT_PATH)
    print("assembled: %s (%d bytes)" % (rel(OUT_PATH), total))
    return 0


if __name__ == "__main__":
    sys.exit(main())
