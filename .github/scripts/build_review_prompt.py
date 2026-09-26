#!/usr/bin/env python3
"""Build a code-review prompt for a PR, for a human to paste into an LLM.

No LLM API calls here on purpose — Gemini's free tier (RPM 5 / RPD 20,
same on both 2.5-flash and 3.8-flash) is too small for a per-PR CI job,
and paying for higher quota wasn't worth it for this project's scale. This
script only automates the tedious part (diff extraction + lockfile/
generated-file exclusion + prompt assembly); a person copies the output
into Antigravity (or any other chat UI) by hand. Run via
.github/workflows/build-review-prompt.yml, manually (workflow_dispatch),
never on every PR push.
"""

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

MAX_DIFF_CHARS = 400_000

# Shared verbatim with the other project that uses the same review rules —
# edit the criteria there too, not only here.
CRITERIA_PATH = Path(__file__).resolve().parents[2] / "docs" / "review-criteria.md"

# git's plain ":!pattern" shorthand does NOT enable glob magic even when
# the pattern contains "**" — confirmed empirically (":!**/pnpm-lock.yaml"
# silently matches nothing, root-level or nested). The long-form
# ":(exclude,glob)pattern" is what actually makes "**" match across
# directory boundaries; the two root-only lockfiles don't need glob at all
# since pnpm/npm never nest a second lockfile inside this workspace.
EXCLUDE_PATHSPECS = [
    ":(exclude)pnpm-lock.yaml",
    ":(exclude)package-lock.json",
    ":(exclude,glob)**/*.svg",
    ":(exclude,glob)**/*.png",
    ":(exclude,glob)**/*.jpg",
    ":(exclude,glob)**/*.jpeg",
    ":(exclude,glob)**/*.woff*",
    ":(exclude,glob)apps/api-server/drizzle/meta/**",
]

REVIEW_INSTRUCTIONS = """\
너는 시니어 소프트웨어 아키텍트이자 타협 없는 코드 리뷰어야.
이번 PR을 아래 리뷰 기준에 따라 엄격하게 리뷰해 줘.
PR 요약이나 설명만 믿지 말고, 소스·호출부·테스트가 함께 제공되면 확인해.

{criteria}

[출력 포맷 및 언어 제약조건]
- 모든 답변은 반드시 한국어로 작성해.
- 실행 가능한 지적만 남겨.
- 각 지적에는 파일명과 라인 번호, 원인, 실제 영향, 심각도, 구체적인 수정 방향을 쓰고,
  필요하면 기존 코드와 수정 제안 코드를 마크다운 diff 형식(-, +)으로 비교해.
- 확인된 결함, 잠재 위험, 런타임에서 검증되지 않은 동작을 구분해.
- 이전 리뷰 지적사항이 함께 제공된 경우에만 각 항목의 해결 여부와 수정으로 새로 생긴 문제를 확인해.
  제공되지 않았다면 해결 여부를 추측하지 마.
- 리뷰 중 코드를 수정하거나 PR을 머지하지 마.
"""


def run_diff(base_sha: str, head_sha: str) -> str:
    result = subprocess.run(
        ["git", "diff", "--no-color", base_sha, head_sha, "--", ".", *EXCLUDE_PATHSPECS],
        capture_output=True,
        text=True,
        check=True,
    )
    diff = result.stdout
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n... (diff가 너무 커서 이후 내용은 생략됨) ..."
    return diff


def fetch_pr_shas(repo: str, pr_number: str, token: str) -> tuple[str, str]:
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read())
    return payload["base"]["sha"], payload["head"]["sha"]


def main() -> int:
    github_token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPOSITORY"]
    pr_number = os.environ["PR_NUMBER"]

    base_sha, head_sha = fetch_pr_shas(repo, pr_number, github_token)
    diff = run_diff(base_sha, head_sha)

    if not diff.strip():
        print("리뷰 대상 diff가 없음(제외 패턴에 걸리는 파일만 변경됨).")
        return 0

    criteria = CRITERIA_PATH.read_text(encoding="utf-8").strip()
    prompt = (
        REVIEW_INSTRUCTIONS.format(criteria=criteria)
        + f"\n\n[이번 PR의 diff]\n\n{diff}\n"
    )

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(f"## PR #{pr_number} 리뷰 프롬프트\n\n")
            summary_file.write(
                "아래 코드 블록 전체를 복사해서 Antigravity(또는 다른 LLM 채팅창)에 "
                "붙여넣으세요.\n\n"
            )
            summary_file.write("- 재검토라면 이전 리뷰 지적사항도 함께 붙여넣으세요.\n")
            summary_file.write(
                "- Gemini가 수정한 커밋이라면 수정 맥락이 없는 새 세션에서 재검토하세요.\n\n"
            )
            summary_file.write("````text\n")
            summary_file.write(prompt)
            summary_file.write("\n````\n")
    else:
        print(prompt)

    return 0


if __name__ == "__main__":
    sys.exit(main())
