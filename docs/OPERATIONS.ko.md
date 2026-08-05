# 운영 체크리스트

이 문서는 main 브랜치 기준으로 위로/칭찬 교환 MVP를 배포하고 확인하는 절차입니다.

## 배포 전 확인

필수 환경 변수:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_URL="https://..."
NEXT_PUBLIC_SOCKET_URL="https://..."
```

선택 환경 변수:

```env
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.1-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

AI provider 설정은 이후 작성 보조와 콘텐츠 품질 필터 기능을 위해 유지됩니다. MVP에서는 AI가 공개 답변을 자동 작성하지 않습니다.

## 배포 순서

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run verify
```

배포 플랫폼이 별도 build 단계를 요구하는 경우 `npm run build`를 추가로 실행합니다. `npm run verify`에는 이미 build가 포함되어 있습니다.

## 프로세스

앱 서버:

```bash
npm run start
```

진단 worker 서버:

```bash
npm run jobs:dev
```

worker는 `WorkerHeartbeat`를 갱신하는 진단 프로세스입니다. `/moderation`의 worker 상태가 `정상`, `주의`, `지연`, `미확인` 중 하나로 표시됩니다.

## 배포 후 smoke

1. `/`가 열린다.
2. 일반 계정으로 로그인한다.
3. 위로 요청을 작성한다.
4. 다른 계정으로 답변을 작성한다.
5. 첫 답변 알림이 생성되는지 확인한다.
6. `/notifications`에서 알림 읽음 처리를 확인한다.
7. `/me`에서 내가 쓴 위로 요청과 내가 남긴 답변을 확인한다.
8. 운영자 계정으로 `/moderation`에 접근한다.
9. worker 상태가 최근 활동으로 표시되는지 확인한다.
10. 보류된 위로 요청/답변, 열린 신고, 신뢰 점수 조정 화면을 확인한다.

## 장애 확인

PostgreSQL:

```bash
pg_isready
npx prisma migrate status
```

worker:

```bash
npm run jobs:dev
```

worker가 실행 중인데 `/moderation`에서 `지연` 또는 `미확인`으로 보이면 다음을 확인합니다.

- worker 프로세스가 앱과 같은 `DATABASE_URL`을 사용하는지.
- `npm run prisma:deploy`가 worker heartbeat migration까지 적용했는지.

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
