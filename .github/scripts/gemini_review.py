#!/usr/bin/env python3
"""Gemini PR code review.

Stdlib-only by design: no third-party GitHub Action, no pip installs — the
only trust surface is this file plus Google's own Gemini REST API and
GitHub's own REST API. Run via .github/workflows/gemini-review.yml on every
PR opened/synchronize against v1.

Flow: diff the PR's base..head commits (excluding lockfiles/generated
files) -> ask Gemini for a structured JSON review (summary + line comments)
-> post each line comment as a real inline PR review comment, falling back
any that GitHub rejects (e.g. a line outside the diff hunk) into the
top-level summary comment instead of silently dropping them.
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

MAX_DIFF_CHARS = 400_000
MAX_COMMENTS = 20
GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
# A brand-new, popular model (like gemini-3.8-flash at launch) can return
# 503 UNAVAILABLE ("experiencing high demand") under real, transient load
# — confirmed empirically against this exact endpoint. Retry with backoff
# before giving up, rather than treating every 503 as a hard failure.
GEMINI_RETRY_DELAYS_SECONDS = [5, 15, 30]

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
- 지적할 문제가 있는 부분만 코멘트로 남겨 — 문제가 없으면 comments는 빈 배열로 둬.
- 각 코멘트는 파일명(path, 저장소 루트 기준 상대경로)과 diff에 실제로 나타나는
  변경 후(+) 파일 기준의 줄 번호(line)를 정확히 지정해야 해 — diff의 @@ 헤더를
  근거로 정확히 계산해.
- 각 코멘트의 본문(body)에는 무엇이 문제인지 설명하고, 기존 코드와 수정 제안
  코드를 마크다운 diff 코드블록(-, + 표시)으로 비교해서 보여줘.
- summary 필드에는 전체적으로 칭찬할 점이 있다면 짧고 간결하게, 그리고 전반적인
  총평을 한두 문단으로 남겨줘.
- 최대 {max_comments}개까지만, 가장 중요한 문제 위주로 코멘트를 남겨.
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


def call_gemini(api_key: str, model: str, diff: str) -> dict:
    prompt = REVIEW_INSTRUCTIONS.format(max_comments=MAX_COMMENTS) + (
        f"\n\n[이번 PR의 diff]\n```diff\n{diff}\n```\n"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "summary": {"type": "STRING"},
                    "comments": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "path": {"type": "STRING"},
                                "line": {"type": "INTEGER"},
                                "body": {"type": "STRING"},
                            },
                            "required": ["path", "line", "body"],
                        },
                    },
                },
                "required": ["summary", "comments"],
            },
        },
    }
    url = GEMINI_ENDPOINT_TEMPLATE.format(model=model)
    request_bytes = json.dumps(body).encode("utf-8")

    last_error: urllib.error.HTTPError | None = None
    for attempt, delay in enumerate([0, *GEMINI_RETRY_DELAYS_SECONDS]):
        if delay:
            print(f"Gemini 503(UNAVAILABLE) — {delay}초 후 재시도 ({attempt}/{len(GEMINI_RETRY_DELAYS_SECONDS)})")
            time.sleep(delay)
        request = urllib.request.Request(
            url,
            data=request_bytes,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.loads(response.read())
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except urllib.error.HTTPError as error:
            if error.code != 503:
                raise
            last_error = error

    assert last_error is not None
    raise last_error


def github_request(method: str, url: str, token: str, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read())


def post_inline_comment(
    repo: str, pr_number: str, token: str, head_sha: str, comment: dict
) -> str | None:
    """Returns an error message on failure, None on success."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/comments"
    body = {
        "body": comment["body"],
        "commit_id": head_sha,
        "path": comment["path"],
        "line": comment["line"],
        "side": "RIGHT",
    }
    try:
        github_request("POST", url, token, body)
        return None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        return f"{comment['path']}:{comment['line']} — {detail[:200]}"


def post_summary_comment(
    repo: str, pr_number: str, token: str, summary: str, failed: list[str]
) -> None:
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    parts = ["## 🤖 Gemini 코드 리뷰", "", summary]
    if failed:
        parts += [
            "",
            "### ⚠️ 인라인으로 남기지 못한 항목",
            "(diff에 포함되지 않은 줄이라 GitHub가 거부한 코멘트입니다)",
            "",
            *[f"- {item}" for item in failed],
        ]
    github_request("POST", url, token, {"body": "\n".join(parts)})


def main() -> int:
    api_key = os.environ["GEMINI_API_KEY"]
    github_token = os.environ["GITHUB_TOKEN"]
    model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
    repo = os.environ["GITHUB_REPOSITORY"]
    pr_number = os.environ["PR_NUMBER"]
    base_sha = os.environ["BASE_SHA"]
    head_sha = os.environ["HEAD_SHA"]

    diff = run_diff(base_sha, head_sha)
    if not diff.strip():
        print("리뷰 대상 diff가 없음(제외 패턴에 걸리는 파일만 변경됨) — 종료.")
        return 0

    try:
        review = call_gemini(api_key, model, diff)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        print(f"::warning::Gemini API 호출 실패: {error} — {detail[:2000]}")
        post_summary_comment(
            repo,
            pr_number,
            github_token,
            "Gemini API 호출에 실패해서 이번 라운드는 리뷰를 남기지 못했어요. "
            "GEMINI_API_KEY 설정이나 워크플로 로그를 확인해주세요.",
            [],
        )
        return 0
    except (urllib.error.URLError, KeyError, json.JSONDecodeError) as error:
        print(f"::warning::Gemini API 호출 실패: {error}")
        post_summary_comment(
            repo,
            pr_number,
            github_token,
            "Gemini API 호출에 실패해서 이번 라운드는 리뷰를 남기지 못했어요. "
            "GEMINI_API_KEY 설정이나 워크플로 로그를 확인해주세요.",
            [],
        )
        return 0

    summary = review.get("summary", "").strip() or "리뷰할 내용을 찾지 못했어요."
    comments = review.get("comments", [])[:MAX_COMMENTS]

    failed: list[str] = []
    for comment in comments:
        error = post_inline_comment(repo, pr_number, github_token, head_sha, comment)
        if error:
            failed.append(error)

    post_summary_comment(repo, pr_number, github_token, summary, failed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
