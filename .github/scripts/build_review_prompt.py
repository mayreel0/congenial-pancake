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

MAX_DIFF_CHARS = 400_000

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
이번 PR에서 변경된 diff 코드를 분석하고, 아래 8가지 영역에 대해 엄격하게 리뷰해 줘.

[리뷰 기준 및 체크리스트]
1. 보안:
   - SQL 인젝션, XSS, 하드코딩된 비밀키/API 키, 안전하지 않은 파일 작업
   - 새로운 API 엔드포인트의 인증 및 권한 부여(Authentication/Authorization) 미들웨어/가드 누락 여부
   - 로그(Logger)에 비밀번호, 토큰, 주민번호 등 민감한 개인정보(PII)를 그대로 노출하는가?
2. 성능:
   - N+1 쿼리 패턴, 불필요한 메모리 할당, 비동기 내 블로킹 I/O
   - 데이터베이스 페이징(Pagination) 누락으로 인한 대량 데이터 로드 및 메모리 오버헤드 위험
   - 전역 객체 축적이나 이벤트 리스너 클린업 누락으로 인한 메모리 누수(Memory Leak) 패턴
3. 스타일:
   - 명명 규칙 위반, 코드 중복, 과도한 순환 복잡도, 타입 누락
   - 코드 내 의미를 알 수 없는 매직 넘버(Magic Number) 및 하드코딩된 문자열 (enum 이나 상수로 분리 유도)
4. MVC 패턴 역할 준수:
   - Controller가 비즈니스 로직을 직접 처리하고 있지는 않은가?
   - Service나 Model이 HTTP 요청/응답(req, res) 객체에 직접 의존하여 계층 구조가 깨졌는가?
5. SOLID 원칙:
   - 단일 책임 원칙(SRP): 하나의 클래스나 함수가 너무 많은 각기 다른 일을 처리하는가?
   - 개방-폐쇄 원칙(OCP) 및 의존역전 원칙(DIP): 인터페이스 기반 확장성 설계 여부 및 구체 클래스 직접 의존 체크
6. 에러 핸들링:
   - try-catch 블록 누락으로 서버가 예기치 않게 크래시될 위험이 있는가?
   - 예외 발생 시 시스템 내부 정보(Stack Trace 등)를 사용자에게 유출하는가?
7. 비동기 처리:
   - async 함수 호출 시 await를 누락하여 프로미스 객체가 그대로 반환되는가?
   - 독립적인 비동기 작업들을 Promise.all 없이 직렬 처리하여 속도를 저하시키는가?
8. 모노레포 의존성 규칙:
   - 공통(shared) 패키지가 개별 서비스 패키지의 내부 모듈을 역참조(Circular Dependency)하는가?

[출력 포맷 및 언어 제약조건]
- 모든 답변은 반드시 한국어로 작성해.
- 지적할 문제가 있는 부분만 코멘트로 남겨.
- 수정이 필요한 위치(파일명, 라인 번호)를 명시하고, 기존 코드와 수정 제안 코드를 마크다운
  diff 형식(-, +)으로 비교해서 설명해.
- 칭찬할 점이 있다면 짧고 간결하게 요약해.
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

    prompt = REVIEW_INSTRUCTIONS + f"\n\n[이번 PR의 diff]\n\n{diff}\n"

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(f"## PR #{pr_number} 리뷰 프롬프트\n\n")
            summary_file.write(
                "아래 코드 블록 전체를 복사해서 Antigravity(또는 다른 LLM 채팅창)에 "
                "붙여넣으세요.\n\n"
            )
            summary_file.write("````text\n")
            summary_file.write(prompt)
            summary_file.write("\n````\n")
    else:
        print(prompt)

    return 0


if __name__ == "__main__":
    sys.exit(main())
