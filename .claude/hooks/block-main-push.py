#!/usr/bin/env python3
"""PreToolUse hook: block `git push` that would land commits directly on
main/v1. This repo's AGENTS.md requires every change to go through a work
branch + PR — this hook makes that a real gate for Claude Code sessions
instead of only a prose rule an agent could forget.

Best-effort argument parsing, not a full git CLI grammar — it's a safety
net against the common ways this could happen (explicit target, implicit
push while checked out on a protected branch, --all/--mirror), not a
guarantee against every possible git invocation.
"""

import json
import os
import re
import subprocess
import sys

PROTECTED_BRANCHES = {"main", "v1"}


def current_branch(cwd: str) -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=cwd or None,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def dst_branch(spec: str, current: str) -> str:
    if ":" in spec:
        _src, dst = spec.split(":", 1)
    else:
        dst = spec
    if dst == "HEAD":
        dst = current
    if dst.startswith("refs/heads/"):
        dst = dst[len("refs/heads/"):]
    return dst


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    if data.get("tool_name") != "Bash":
        return 0

    command = (data.get("tool_input") or {}).get("command") or ""
    cwd = data.get("cwd") or ""

    if not re.search(r"(^|[;&|]\s*)git\s+push\b", command):
        return 0

    m = re.search(r"git\s+push\b(.*)", command)
    rest = m.group(1) if m else ""
    rest = re.split(r"[;&|]", rest)[0]
    tokens = rest.split()

    if any(t in ("--all", "--mirror") for t in tokens):
        print(
            "차단됨: `git push --all`/`--mirror`는 main/v1을 포함해 모든 브랜치를 "
            "한 번에 push할 수 있어 금지되어 있습니다. 특정 작업 브랜치만 지정해서 "
            "push하세요 (AGENTS.md: main/v1 직접 push 금지, 브랜치+PR로 진행).",
            file=sys.stderr,
        )
        return 2

    non_flag = [t for t in tokens if not t.startswith("-")]
    branch = current_branch(cwd)

    if len(non_flag) <= 1:
        # no refspec given (`git push` or `git push origin`) — implicit,
        # targets the current branch's upstream.
        targets = [branch]
    else:
        targets = [dst_branch(spec, branch) for spec in non_flag[1:]]

    hit = next((b for b in targets if b in PROTECTED_BRANCHES), None)
    if hit:
        print(
            f"차단됨: '{hit}' 브랜치로의 직접 push는 금지되어 있습니다. "
            "작업 브랜치를 만들고 PR을 통해 병합하세요 "
            "(AGENTS.md: main/v1 직접 push 금지).",
            file=sys.stderr,
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
