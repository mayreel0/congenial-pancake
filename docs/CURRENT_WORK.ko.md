# 현재 작업 상태

마지막 업데이트: 2026-08-05

## 현재 기준

- 기본 작업 경로: `/Users/kjh/Desktop/project/project_3`
- 원격 저장소: `git@github.com:mayreel0/congenial-pancake.git`
- 기준 브랜치: `main`
- 새 작업 브랜치 규칙: `codex/<topic>`
- 완료된 작업 worktree는 PR merge 후 삭제합니다.

## 제품 방향

프로젝트는 기존 "칭찬 커뮤니티"에서 "익명 위로/칭찬 교환 서비스"로 피벗합니다.

피벗 설계 기준:

- [위로/칭찬 교환 서비스 피벗 설계](./superpowers/specs/2026-08-01-comfort-pivot-design.ko.md)

핵심 결정:

- 기존 `PraisePost`/`PraiseComment`를 의미만 바꿔 재사용하지 않습니다.
- 신규 `ComfortRequest`/`ComfortReply` 모델을 기준으로 구현합니다.
- 아직 운영 데이터가 없으므로 기존 칭찬 커뮤니티 데이터 보존 마이그레이션은 MVP 필수 조건이 아닙니다.
- AI는 자동 공개 댓글 작성자가 아니라 작성 보조와 안전/품질 필터 역할로 사용합니다.
- 기존 랭킹, 칭찬방, 감사 반응, AI 자동 칭찬 worker 중심 UX는 피벗 구현에서 대체하거나 제거합니다.

## main에 포함된 기존 MVP 기능

아래 기능은 현재 코드에 존재하지만, 일부는 피벗 후 유지 대상이고 일부는 대체 대상입니다.

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

## 피벗 후 유지 대상

- 이메일/비밀번호 회원가입, Auth.js credentials 로그인, 선택적 네이버 OAuth 로그인.
- OAuth 첫 로그인 후 닉네임 설정 온보딩.
- 로그아웃, 내 계정 상태 표시, 제재 사용자의 쓰기 제한.
- 신고, 운영자 검토, 제재, 신뢰 점수 구조.
- 인앱 알림 기반 구조.
- 페이지네이션과 날짜 정렬 패턴.
- AI provider 연동과 AI 사용량 기록 구조.
- worker heartbeat 구조.
- `npm run verify`와 GitHub Actions CI.

## 피벗 후 대체 또는 제거 대상

- `PraisePost`, `PraiseComment` 중심 도메인.
- 공개 칭찬글 피드와 `/posts` 중심 UX.
- 글 상세 칭찬방 `PraiseRoom`.
- 감사 반응 `Reaction`과 작성자 답글 `Reply` 중심 흐름.
- `AiPraiseJob` 기반 자동 칭찬 댓글 worker.
- 랭킹 스냅샷과 `/rankings` 중심 UX.
- 운영자 화면에서 AI 자동 칭찬 제어가 핵심인 배치.

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

- 피벗 구현 계획 문서 작성.
- `ComfortRequest`/`ComfortReply` Prisma schema와 마이그레이션.
- 기존 `/posts`, `/rankings`, `PraiseRoom`, AI 자동 칭찬 worker 대체 계획.
- 메인 화면: 오늘 위로 요청 여부, 위로 요청 작성, 다른 사람에게 답변하기.
- 최근 위로/답변 실제 데이터 섹션.
- 로그인 전 로컬 임시 저장과 로그인 후 이어받기.
- 첫 답변 알림.
- 콘텐츠 품질 게이트와 AI 보조 답변 품질 루프.
