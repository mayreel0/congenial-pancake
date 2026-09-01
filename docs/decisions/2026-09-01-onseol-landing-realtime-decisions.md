# 랜딩페이지 실시간 통계 + 실제 예시 대화

## 배경

`apps/web` 랜딩페이지(`app/components/landing/`)가 완전히 가짜 고정값이었다 — `landing-data.ts`에 "오늘의 위로 요청 18", "오늘의 답장 42", "답변을 기다리는 글 6"이라는 하드코딩된 통계와 가짜 예시 대화 1개가 그대로 박혀 있었다. Vercel 배포까지 마친 시점에 사용자가 지적: 고정값을 실제 데이터로 바꾸고, 통계는 오늘뿐 아니라 이번 달/전체 누적도, 예시 대화도 하나가 아니라 여러 개를 실제 게시물에서 가져와 순환 표시하자고 확인.

예시 대화를 실제 게시물로 바꾸는 것의 프라이버시 문제를 먼저 짚었음 — 온설은 애초에 `authorId`/`guestId`가 API 응답 밖으로 절대 안 나가는 구조라, 익명 처리된 요청+답장 본문만 공개 노출하는 건 기존 정책과 같은 선상이라고 확인 후 진행 확정.

## 백엔드: 새 `landing` 모듈 (`apps/api-server/src/landing/`)

인증 불필요, 공개 엔드포인트. `reports` 모듈(module/controller/service/repository 분리, `DRIZZLE`는 repository에서만 참조)을 템플릿으로 사용.

### `GET /public/stats` → `LandingStatsResponseDto`

```json
{
  "requests": { "today": 0, "month": 0, "total": 0 },
  "replies": { "today": 0, "month": 0, "total": 0 },
  "waitingForReply": 0
}
```

- `waitingForReply`는 기간이 아니라 **지금 이 순간 답장이 0개인 글 수**(스냅샷) — `NOT EXISTS` 서브쿼리로 계산. `GROUP BY`+`HAVING count=0`은 "그룹 개수"가 아니라 "그룹별 카운트"를 반환해서 틀리므로 안 씀.
- 오늘/이번 달 경계는 서비스 레이어에서 KST 기준으로 계산해 `Date`로 레포지토리에 넘김 — 레포지토리는 순수 카운트만, 날짜 산술은 안 함(`RequestsRepository.findQueueCandidate` 패턴과 동일).
- `apps/api-server/src/common/kst-date.ts`에 `todayKstDateString()`, `kstMonthToDateRange()`(이번 달 KST 1일 00:00 ~ 지금) 추가.
- 단일 객체 응답이므로 `@ZodResponse({ type: LandingStatsResponseDto })` 사용.

### `GET /public/samples?limit=6` → `SampleExchangesResponseDto`

```json
{ "samples": [{ "request": { "body": "...", "createdAt": "..." }, "reply": { "body": "...", "createdAt": "..." } }] }
```

- `replies` INNER JOIN `requests`, 양쪽 다 `hidden=false AND deletedAt IS NULL`, `ORDER BY random() LIMIT limit`(limit은 1~10로 clamp, 기본 6).
- `@ZodResponse` 안 붙임 — 복합/배열 응답은 `/admin/moderation/hidden`과 동일하게 의도적으로 제외(`apps/api-server/AGENTS.md` "DTOs vs domain models"). 타입은 `import type`으로만 공유.

응답 스키마는 `packages/shared/src/dto.ts`에 추가(기존 파일-하나-내부import-없음 컨벤션 유지).

## 프론트엔드: `apps/web`

- `app/lib/landing/{api,queries}.ts` — `app/lib/requests/{api,queries}.ts` 패턴 그대로, `useLandingStatsQuery()`/`useSampleExchangesQuery(limit)`를 `useQuery`로 감쌈. 둘 다 `retry: false` — 공개 랜딩페이지라 fetch 실패 시 에러 상태 대신 그 섹션만 조용히 숨김(`isError`일 때 `null` 반환).
- `ActivityStats.tsx` — 오늘/이번달/전체 × 위로요청/답장 6칸 그리드 + `waitingForReply` 별도 텍스트. 로딩 중엔 `ui/Skeleton`.
- `SampleExchange.tsx` — 여러 개를 `useState`로 인덱스 관리, `setInterval`(6초)로 자동 순환. 새 라이브러리 없이 순수 React/CSS로 처리(이 코드베이스에 애니메이션 라이브러리 없음). 샘플 0개/실패 시 섹션 자체를 숨김.
- `landing-data.ts`의 하드코딩 배열(`activityStats`, `sampleExchange`) 제거 — 상수(`SAMPLE_EXCHANGE_LIMIT`, `SAMPLE_ROTATION_INTERVAL_MS`)만 남김.
- `vitest.setup.ts`의 기본 fetch 목에 `/public/stats`(0값)/`/public/samples`(빈 배열) 케이스 추가 — 안 그러면 기존 401 폴백에 걸려 `LandingPage.test.tsx` 깨짐.

## 검증

- `pnpm --filter api-server test`: 163/163 (새 `LandingService` 유닛 테스트 5개 포함).
- 로컬 Postgres에 실제 데이터 시딩 후 `curl localhost:3001/public/stats`, `/public/samples?limit=6`로 실제 값 확인 — KST 월 경계가 정확히 동작함을 확인(오늘이 9/1이라 8/29에 만든 글은 "이번 달"에서 정확히 제외됨).
- `pnpm --filter web test`: 131/131 (새 `ActivityStats`/`SampleExchange` 테스트 8개 포함, 순환 동작은 `vi.useFakeTimers({ shouldAdvanceTime: true })`로 검증).
- 실제 브라우저(Chrome)로 `apps/web` dev 서버 + 시딩된 로컬 DB 붙여서 렌더링 확인 — 첫 로드 때 `ActivityStats.tsx`에 `"use client"`가 빠져있어서 서버 컴포넌트에서 훅을 호출하는 500 에러가 났던 걸 이 단계에서 발견해 수정(유닛 테스트는 RSC 경계를 체크 안 해서 못 잡음 — 실브라우저 검증이 아니었으면 놓쳤을 버그).
- 순환 자체도 실브라우저에서 확인했는데, 처음 6~8초 안에는 안 바뀌어서 버그인가 의심했음 — `document.hidden`이 `true`(자동화 탭이 백그라운드로 처리됨)라 Chrome이 `setInterval`을 스로틀링하고 있었던 것으로 확인, 30초 넘게 기다리니 정상적으로 다음 샘플로 전환됨. 코드 버그 아님, 자동화 탭 환경 특성.

## 하지 않은 것

- 통계/샘플 API 응답에 캐싱/rate limit 별도 추가 안 함 — 이미 전역 `ThrottlerModule`(100req/60s per IP)이 적용됨, 별도 처리 불필요.
- 샘플 선택 기준을 "최근 N개"가 아니라 "무작위 N개"로 함 — 서비스 초기엔 최근 글만 보여주면 콘텐츠가 적어 매번 비슷해 보일 수 있어서, 시간이 지나며 콘텐츠가 쌓일수록 자연스럽게 다양해지는 무작위 방식을 선택.
