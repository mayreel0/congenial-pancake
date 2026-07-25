# 현재 작업 상태

마지막 업데이트: 2026-07-25

## 현재 기준

- 기본 작업 경로: `/Users/kjh/Desktop/project/project_3`
- 원격 저장소: `git@github.com:mayreel0/congenial-pancake.git`
- 기준 브랜치: `main`
- 새 작업 브랜치 규칙: `codex/<topic>`
- 완료된 작업 worktree는 PR merge 후 삭제합니다.

## main에 포함된 MVP 기능

- 이메일/비밀번호 회원가입, Auth.js credentials 로그인, 선택적 네이버 OAuth 로그인.
- OAuth 첫 로그인 후 닉네임 설정 온보딩.
- 로그아웃, 내 계정 상태 표시, 제재 사용자의 쓰기 제한.
- 공개 칭찬글 피드, 별도 `/posts` 목록, 글 상세 칭찬방.
- 글/댓글 페이지네이션과 날짜 정렬.
- 사람 칭찬 댓글, 감사 반응, 작성자 답글.
- 댓글/답글 기반 인앱 알림, 알림 읽음 처리.
- 게시글/댓글 신고 UX와 중복 신고 재사용.
- 운영자 `/moderation` 화면:
  - AI 칭찬 on/off와 하루 작업/댓글 제한.
  - 오늘 AI 작업 사용량과 이벤트 로그.
  - 보류 댓글 공개/작성자 전용/숨김 처리.
  - 열린 신고 처리/기각.
  - 신뢰 점수 조정과 감사 이벤트.
  - 랭킹 스냅샷 수동 재계산.
  - 보류 댓글, 열린 신고, AI 실패, worker 상태 요약.
- BullMQ/Redis 기반 AI 칭찬 worker와 랭킹 worker.
- worker heartbeat 저장과 `/moderation` worker 최근 활동 표시.
- 랭킹 카드와 응원이 필요한 글 CTA.
- `npm run verify`와 GitHub Actions CI.

## 운영 전 필수 확인

운영 배포 전에는 [OPERATIONS.ko.md](./OPERATIONS.ko.md)를 기준으로 확인합니다.

핵심 순서:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run verify
```

운영 환경에는 최소한 다음이 필요합니다.

- PostgreSQL `DATABASE_URL`
- Auth.js `AUTH_SECRET`, `AUTH_URL`
- Redis `REDIS_URL`
- Gemini 또는 OpenAI provider API key
- 앱 프로세스와 별도 worker 프로세스

## 로컬 주의사항

- main worktree에 `.vscode/` untracked가 남아 있을 수 있습니다. 사용자 로컬 설정으로 보고 별도 작업에 포함하지 않습니다.
- 오래된 worktree `codex/design-ai-usage-controls`는 main merge 여부가 명확하지 않아 임의 삭제하지 않았습니다.
- worktree 기반 작업 시 PR merge 후 `git fetch --prune origin`, `git worktree remove`, `git branch -d`, 원격 branch delete 순서로 정리합니다.

## 검증 규칙

일반 코드 변경 후 완료를 말하기 전에 아래를 순서대로 실행합니다.

```bash
npm run verify
```

`verify`는 다음을 순서대로 실행합니다.

```bash
npm run lint
npm run test
npm run build
npx tsc --noEmit
```

`npm run build`와 `npx tsc --noEmit`는 병렬로 실행하지 않습니다. 빌드 중 `.next/types`가 생성되는 동안 타입 검사가 중간 상태를 읽을 수 있습니다.

Prisma schema나 migration을 변경한 경우 추가로 실행합니다.

```bash
npm run prisma:generate
npx prisma migrate status
```

운영 배포에서는 migration 적용에 `npm run prisma:deploy`를 사용합니다.

## 다음 기능 후보

- 신고 처리 결과에 따른 자동 신뢰 점수 변화와 반복 위반자 처리.
- 제재 해제 요청 또는 운영자 메모 MVP.
- AI 실패 원인 분류, 위기/자해성 글 안전 처리, provider 진단 개선.
- 새 알림 카운트의 polling/SSE 기반 실시간성 개선.
- Playwright smoke를 로그인, 글쓰기, worker heartbeat, 알림 읽음까지 확장.
