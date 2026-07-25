# 운영 체크리스트

이 문서는 main 브랜치 기준으로 칭찬 커뮤니티 MVP를 배포하고 확인하는 절차입니다.

## 배포 전 확인

필수 환경 변수:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_URL="https://..."
REDIS_URL="redis://..."
AI_PROVIDER="gemini"
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-3.1-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
NEXT_PUBLIC_SOCKET_URL="https://..."
```

네이버 OAuth를 사용할 때만 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 설정합니다.

## 배포 순서

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run verify
npm run build
```

`npm run verify` 안에 build가 포함되어 있지만, 배포 플랫폼이 별도 build 단계를 요구하는 경우 마지막 `npm run build`를 그대로 둡니다.

## 프로세스

앱 서버:

```bash
npm run start
```

worker 서버:

```bash
npm run jobs:dev
```

운영에서는 앱 서버와 worker를 별도 프로세스로 실행합니다. worker가 실행되면 `WorkerHeartbeat`가 갱신되고 `/moderation`의 worker 상태가 `정상`, `주의`, `지연`, `미확인` 중 하나로 표시됩니다.

## 배포 후 smoke

1. `/`와 `/posts`가 열린다.
2. 일반 계정으로 로그인한다.
3. 칭찬글을 작성한다.
4. `jobs:dev` worker가 실행 중인 상태에서 AI 칭찬 작업이 실패 없이 기록되는지 확인한다.
5. 글 상세에서 칭찬 댓글, 감사 반응, 답글을 확인한다.
6. `/notifications`에서 알림 읽음 처리를 확인한다.
7. 운영자 계정으로 `/moderation`에 접근한다.
8. worker 상태가 최근 활동으로 표시되는지 확인한다.
9. AI 사용량, 보류 댓글, 열린 신고, 랭킹 재계산 화면을 확인한다.

## 장애 확인

PostgreSQL:

```bash
pg_isready
npx prisma migrate status
```

Redis:

```bash
redis-cli ping
```

worker:

```bash
npm run jobs:dev
```

worker가 실행 중인데 `/moderation`에서 `지연` 또는 `미확인`으로 보이면 다음을 확인합니다.

- worker 프로세스가 앱과 같은 `DATABASE_URL`을 사용하는지.
- `npm run prisma:deploy`가 worker heartbeat migration까지 적용했는지.
- Redis와 AI provider key가 worker 환경에도 설정되어 있는지.

## PR merge 후 정리

```bash
git fetch --prune origin
git worktree list
git branch --merged main
```

merge된 worktree와 branch만 삭제합니다.

```bash
git worktree remove .worktrees/<name>
git branch -d codex/<branch>
git push origin --delete codex/<branch>
```

삭제 전 `git status --short --branch`로 해당 worktree가 깨끗한지 확인합니다.
