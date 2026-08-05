# 현재 작업 상태

마지막 업데이트: 2026-08-05

## 저장소 기준

- 기본 작업 경로: `/Users/kjh/Desktop/project/project_3`
- 원격 저장소: `git@github.com:mayreel0/congenial-pancake.git`
- 기준 브랜치: `main`
- 새 작업 브랜치 규칙: `codex/<topic>`
- 완료된 작업 worktree는 PR merge 후 삭제합니다.

## 현재 도메인

현재 구현 기준 도메인은 `ComfortRequest`/`ComfortReply`입니다. 기존 칭찬 커뮤니티 도메인인 `PraisePost`/`PraiseComment`와 랭킹, 감사 반응, 자동 AI 칭찬 worker는 피벗 과정에서 제거되었습니다.

피벗 설계 기준:

- [위로/칭찬 교환 서비스 피벗 설계](./superpowers/specs/2026-08-01-comfort-pivot-design.ko.md)
- [ComfortRequest/ComfortReply 구현 계획](./superpowers/plans/2026-08-05-comfort-request-reply-implementation.ko.md)

## 현재 MVP 기능

- 이메일/비밀번호 회원가입, Auth.js credentials 로그인, 선택적 네이버 OAuth 로그인.
- OAuth 첫 로그인 후 닉네임 설정 온보딩.
- 로그아웃, 내 계정 상태 표시, 제재 사용자의 쓰기 제한.
- 하루 한 번 위로 요청 작성.
- 다른 사람의 위로 요청에 1인 1답변 작성.
- 최근 위로/답변 예시와 답변 가능한 요청 표시.
- 첫 답변 인앱 알림과 알림 읽음 처리.
- `/me`에서 내가 쓴 위로 요청과 내가 남긴 답변 확인.
- 신고, 운영자 검토, 제재, 신뢰 점수 구조.
- `/moderation`에서 보류된 위로 요청/답변, 열린 신고, 신뢰 점수, AI 설정/사용량, worker 상태 확인.
- `npm run jobs:dev` 진단 worker heartbeat.
- `npm run verify`와 GitHub Actions CI.

## AI 기준

MVP에서는 AI가 공개 답변을 자동 작성하지 않습니다. AI provider 설정과 사용량 기록은 이후 작성 보조와 콘텐츠 품질 필터 기능을 위해 유지합니다.

## 운영 전 필수 확인

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run verify
```

운영 환경에는 최소한 다음이 필요합니다.

- PostgreSQL `DATABASE_URL`
- Auth.js `AUTH_SECRET`, `AUTH_URL`
- 선택적 Naver OAuth 설정
- 선택적 Gemini 또는 OpenAI provider API key
- 앱 프로세스와 선택적 진단 worker 프로세스

## 로컬 주의사항

- main worktree에 `.vscode/` untracked가 남아 있을 수 있습니다. 사용자 로컬 설정으로 보고 별도 작업에 포함하지 않습니다.
- worktree 기반 작업 시 PR merge 후 `git fetch --prune origin`, `git worktree remove`, `git branch -d`, 원격 branch delete 순서로 정리합니다.

## 검증 규칙

일반 코드 변경 후 완료를 말하기 전에 아래를 실행합니다.

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

Prisma schema나 migration을 변경한 경우 추가로 실행합니다.

```bash
npm run prisma:generate
npx prisma migrate status
```

## 다음 기능 후보

- 로그인 전 로컬 임시 저장과 로그인 후 이어받기.
- 신고 UX를 메인 comfort 카드와 답변 UI에 노출.
- 앱 푸시 알림 또는 웹 푸시 알림 설계.
- AI 작성 보조 UI와 안전/품질 필터 고도화.
- 답변이 부족한 요청 우선 노출 정책.
- 모바일 앱 MVP 범위 정의.
