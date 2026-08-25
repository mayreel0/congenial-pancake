# 온설 /admin 신고 검토 모듈 결정 기록

## 배경

`docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md`가 이미 스캐폴딩해둔 `/admin` 결정(화이트리스트 기반 관리자 식별, "신고 검토" 하나만 초기 범위, 복구/영구 삭제)을 실제로 구현했다. 그 문서가 "이 문서에서 확정하지 않음"으로 남겨둔 항목 중 하나 — 관리자가 복구한 항목이 재신고로 즉시 다시 자동 숨김되는 문제 — 를 이번에 확정했다.

## 결정 1: 복구 후 재신고 카운트는 복구 시점부터 새로 센다

`requests`/`replies`에 `reviewedAt` 컬럼을 추가했다. 관리자가 "복구"하면 `hidden=false`로 되돌리는 동시에 `reviewedAt`을 현재 시각으로 찍는다. 이후 `ReportsService.create()`의 자동 숨김 판단은 `reviewedAt`이 있으면 그 이후에 달린 신고만 센다(`ReportsRepository.countDistinctReporters()`의 `since` 파라미터).

### 근거 (사용자 확인 완료, 2026-08-25)

세 가지 안을 제시했다: (A) 복구 시점 이후 신고만 새로 카운트, (B) 복구 시 기존 신고 기록 삭제, (C) 지금은 손 안 댐. A를 선택함 — B는 과거에 실제로 3명이 신고했다는 감사 기록 자체가 사라지는 게 단점이었고, C는 오탐 신고로 복구된 글이 단 1명의 새 신고만으로 즉시 재차 숨겨질 수 있는 실사용 리스크가 있었다. A는 감사 추적을 보존하면서(옛 신고 행은 지우지 않음) 재발 방지 임계치만 복구 시점 기준으로 리셋한다. 관리자 화면에 보여주는 `reportCount`는 의도적으로 스코프 없는 전체 누적 신고 수(심각도 판단용 컨텍스트)로 남겨, 자동 숨김 트리거에 실제로 쓰이는 숫자와는 다르다.

## 결정 2: 이번 라운드 범위는 "신고 검토" 화면 하나뿐

통계 등 다른 섹션은 만들지 않았다 — 원 결정 문서의 범위 제한을 그대로 따름. `/admin`은 `ServiceNav`의 일반 네비게이션 목록에 넣지 않았다(일반 사용자에게 관리자 링크가 노출될 이유가 없음) — 화이트리스트에 포함된 사람만 직접 URL로 접근.

## 결정 3: 프론트엔드는 서버 응답(403)으로만 권한 여부를 판단한다

클라이언트는 `ADMIN_USER_IDS` 화이트리스트를 알 방법이 없다(서버만 안다) — 로그인 상태에서 `GET /admin/moderation/hidden`을 실제로 호출해보고, 403이면 "권한 없음" 화면을, 401/로그아웃 상태면 로그인 유도 화면을 보여준다. `AdminGuard`(`apps/api/src/admin/admin.guard.ts`)는 `SessionGuard` 다음에 실행되어 `request.userId`를 `ADMIN_USER_IDS` 환경변수(콤마 구분)와 대조한다.

## 구현 중 발견한 버그: 로딩 상태에 따라 `ServiceNav`를 조건부 마운트하면 무한 루프

프론트 초안에서 `review.status === "loading"`일 때 `return null`로 `ServiceNav`까지 통째로 안 그리다가, 로그인/권한 상태가 확정되면 그제서야 `ServiceNav`를 마운트하는 구조로 짰다. `ServiceNav`도 같은 `/auth/me` 쿼리를 구독하는데, React Query는 새 옵저버가 마운트될 때마다(기본 `staleTime: 0`) 백그라운드 refetch를 트리거한다 — 그 refetch가 진행되는 동안 쿼리가 다시 `pending`이 되어 `loading` 상태로 돌아가고, 그러면 `ServiceNav`가 언마운트되고, 언마운트되었다가 다시 조건이 풀리면 재마운트되며 또 refetch가 걸리는 식으로 끝없이 반복됐다(로컬 테스트에서 500ms 안에 /auth/me가 100번 넘게 호출되는 것으로 확인). `/read`(`ReadFeed.tsx`)가 로딩 상태와 무관하게 `ServiceNav`를 항상 최상단에 그리는 이유가 바로 이것이었다는 걸 이번에 알게 됨 — `AdminReview.tsx`도 같은 패턴으로 고쳤다: `ServiceNav`는 항상 마운트하고, `<main>` 내부 콘텐츠만 `status`에 따라 분기.

## 산출물

- 스키마: `requests`/`replies`에 `reviewed_at` 컬럼 추가 (마이그레이션 `0005_spotty_jasper_sitwell.sql`).
- 백엔드: `apps/api/src/admin/`(`AdminController`, `AdminGuard`, `dto/`), `RequestsRepository`/`RepliesRepository`의 `findHidden`/`restore`/`softDelete`, `ReportsRepository.countDistinctReporters`의 `since` 파라미터, `ReportsService.countDistinctReporters()`(관리자 화면용).
- 프론트: `apps/web/app/admin/`(`page.tsx`, `AdminReview.tsx`, `useAdminReview.ts`, 테스트), `apps/web/app/lib/admin/`(`api.ts`, `queries.ts`).
- `apps/api/AGENTS.md`에 "Admin (신고 검토)" 섹션 추가, "Still-empty modules" 섹션 제거(더 이상 빈 모듈 없음).

## 검증

- `pnpm --filter api lint/typecheck/test(53)/build`, `pnpm --filter web lint/typecheck/test(70)/build` 모두 통과.
- 로컬 Postgres + 실제 서버에 curl로 직접 검증: 비관리자 403, 관리자 200 + `reportCount` 정확성, 자동 숨김(3명 신고) → 관리자 화면에 노출 → 복구 → 공개 목록에 즉시 재노출 → 복구 이후 신규 신고 1건은 재숨김 안 됨 → 복구 이후 신규 신고 3건(총 6건) 누적 시 정확히 재숨김 → 영구 삭제 시 DB row는 남고(`deleted_at` 세팅) 관리자 화면에서만 사라짐. 답변(replies) 경로도 동일하게 확인.
- 실제 Chrome 브라우저로 실사용자 계정(kim015jh@gmail.com)을 화이트리스트에 넣고 `/admin` 접속 — 비화이트리스트 상태에서 "이 계정은 접근 권한이 없어요" 정상 노출, 화이트리스트 추가 후 신고 검토 목록 정상 렌더링(무한 루프 없음), 복구 버튼 클릭 시 목록에서 즉시 제거, 영구 삭제 확인 다이얼로그 정상 동작(실제 삭제는 실행하지 않고 취소로 검증). 테스트 계정/데이터는 모두 정리함.
