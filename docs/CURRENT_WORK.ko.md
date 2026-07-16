# 현재 작업 상태

마지막 업데이트: 2026-07-15

## 현재 기준

- 기본 작업 경로: `/Users/kjh/Desktop/project/project_3`
- 원격 저장소: `git@github.com:mayreel0/congenial-pancake.git`
- 기준 브랜치: `main`
- 새 작업 브랜치 규칙: `codex/<topic>`

## 최근 완료

- PR #5 `feat: add AI usage controls`가 `main`에 merge되었습니다.
- 포함된 기능:
  - `AiControlSetting`, `AiUsageEvent`, `AiUsageEventStatus`
  - AI 사용 여부와 하루 작업/댓글 제한
  - AI worker의 provider 호출 전 제한 검사
  - `/api/moderation/ai-controls`
  - `/moderation`의 AI 제어 섹션
  - README와 실행 가이드 업데이트
- PR #6 `chore: add project guardrails and verify script`가 `main`에 merge되었습니다.
- 포함된 내용:
  - `AGENTS.md`
  - `npm run verify`
  - CI의 verify script 사용
  - 이 현재 작업 상태 문서

## 현재 진행

- 운영 가능한 MVP를 단단하게 만드는 moderation 액션 강화 브랜치:
  - `codex/harden-moderation-ops`
- 목표:
  - 운영자가 보류 댓글을 공개, 작성자 전용, 숨김으로 처리
  - 운영자가 열린 신고를 처리 또는 기각
  - 운영자가 `/moderation`에서 신뢰 점수 조정
  - 모든 운영 액션은 `ModerationEvent`로 감사 기록 생성

## 로컬 주의사항

- `package-lock.json`에 기존 unstaged 변경이 남아 있을 수 있습니다.
- 확인된 변경 내용은 `fsevents` 항목에 `"dev": true`가 추가된 metadata 변경입니다.
- 이 변경은 출처가 명확해지기 전까지 별도 작업에 포함하지 않습니다.

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

## 다음 기능 후보

- 랭킹 스냅샷 재계산 worker 연결
- 운영자 화면에서 AI usage event 상세 목록 보기
- Playwright 로그인/글쓰기/AI 제어 흐름 보강
- AI worker 실환경 실행 가이드 보강
