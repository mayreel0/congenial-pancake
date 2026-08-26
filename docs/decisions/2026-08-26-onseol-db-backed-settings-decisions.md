# 온설 DB 기반 설정 테이블 결정 기록

## 배경

`docs/decisions/2026-08-22-onseol-answer-queue-decisions.md`/`2026-08-21-onseol-anonymous-posting-decisions.md`에서 정한 세 가지 숫자 — 답변 큐 신선도(60시간), 답변 큐 답장 캡(5), 비회원 답장 총량 제한(5) — 는 코드에 하드코딩된 상수였다. `docs/decisions/2026-08-25-onseol-api-rate-limiting-decisions.md`(백로그 항목 4) 때 "DB 기반 설정 테이블로 옮기고 `/admin`에서 조정 가능하게" 하고 싶었지만 당시엔 `/admin`이 없어서 미뤘다. `apps/admin`이 실제로 생긴 뒤 이 항목을 마저 진행했다.

게스트 1요청 제한은 대상에서 제외했다 — `requests_guest_id_unique` DB 유니크 제약으로 구현돼 있어 숫자 하나가 아니라 구조 자체를 바꿔야 하므로 범위가 다르다.

## 결정 1: key-value가 아니라 단일 행(single-row) 테이블

`settings` 테이블은 `id smallint primary key`(항상 1)에 `CHECK (id = 1)` 제약을 걸어 행이 하나만 존재하도록 강제한다. 지금 필드가 3개뿐이고 앞으로도 이 세 개 외에 급격히 늘어날 이유가 없다고 판단해, stringly-typed key-value 테이블보다 타입 안전하고 마이그레이션으로 관리하기 쉬운 이 방식을 택했다. `requests` 테이블의 기존 `CHECK` 컨벤션을 그대로 따랐다.

## 결정 2: 캐싱 없음 — 매 호출마다 DB에서 직접 읽는다

`SettingsService.get()`은 캐싱 레이어 없이 매번 DB를 조회한다. 지금 트래픽 규모에서 병목이 될 가능성은 낮고, 미리 캐싱을 넣으면 무효화(invalidation) 로직이라는 별도 복잡도가 생긴다 — "필요해지면 그때 넣는다"는 이 프로젝트의 일관된 원칙을 그대로 적용했다.

## 결정 3: 리포지토리가 아니라 서비스 계층에서 설정을 읽는다

`apps/api-server/AGENTS.md`의 "Architecture boundary" 원칙(서비스는 리포지토리 인터페이스에만 의존, Drizzle 클라이언트는 리포지토리 안에서만)과 같은 이유로, `SettingsService`는 `RequestsRepository`/`AnswerInteractionsRepository`가 아니라 그걸 호출하는 `RequestsService`/`AnswerInteractionsService`/`RepliesService`가 주입받는다. 리포지토리는 여전히 순수 데이터 접근 계층으로 남고, 값은 파라미터로 전달된다 (`RequestsRepository.findQueueCandidate(viewer, { freshnessHours, replyCap })`, `AnswerInteractionsRepository.findHeldForAuthor(authorId, freshnessHours)`). 리포지토리가 다른 서비스를 직접 의존하는 역방향 계층 구조를 피하기 위함이다.

## 결정 4: 행이 없으면 지연 생성(lazy bootstrap)한다 — 시드 마이그레이션 대신

`SettingsRepository.get()`은 `id=1` 행이 없으면 그 자리에서 만들고 반환한다(`onConflictDoNothing` + 동시성 레이스 대비 재조회). 마이그레이션 SQL에 `INSERT` 시드를 손으로 추가하는 대신 이 방식을 택한 이유: 스키마의 컬럼 `default` 값(60/5/5)이 초기값의 유일한 출처가 되고, 행이 어떤 이유로든 사라져도 다음 요청에서 자동으로 복구된다(self-healing). 실제로 마이그레이션 직후 `SELECT * FROM settings`는 빈 테이블이었고, 첫 `/requests/queue` 호출 후에야 기본값(60/5/5)으로 행이 생겼음을 확인했다.

## 결정 5: `apps/admin`에 실질적인 네비게이션 셸을 처음으로 추가한다

`apps/admin`은 지금까지 라우트가 "신고 검토" 하나뿐이라 네비게이션이 없었다(`apps/admin/AGENTS.md`: "add a real nav shell only when a second section is actually being built, not preemptively"). "설정"이 두 번째 섹션이 되면서 그 시점이 왔다. `AdminNav` 컴포넌트(신고 검토/설정 탭 + 로그아웃)를 신설했고, `apps/web`의 `ServiceNav`와 같은 이유로 `usePathname()` 훅 대신 `activePath`를 명시적 prop으로 받는다 — 테스트에서 App Router 컨텍스트 없이도 렌더링 가능하고, 각 페이지가 자기 경로를 이미 알고 있어 훅이 굳이 필요 없다. 레이아웃(`layout.tsx`)에 한 번만 두는 대신 각 페이지(`AdminReview.tsx`, `SettingsReview.tsx`)가 직접 `<AdminNav activePath="..." />`를 렌더링한다 — 기존 "헤더가 무조건 마운트된다" 패턴(mount-loop 버그 회피)을 페이지 단위로 유지하기 위함이다.

## 부수 발견: `set-state-in-effect` — 비동기로 로드된 데이터로 로컬 폼 상태를 초기화할 때

설정 폼(`SettingsReview.tsx`)의 초안은 `useEffect`로 쿼리 결과가 도착하면 `setForm(...)`을 호출하는 방식이었는데, ESLint의 `react-hooks/set-state-in-effect` 규칙에 걸렸다(effect 안에서 곧바로 setState하면 연쇄 렌더링을 유발할 수 있다는 경고). React 공식 권장 패턴대로, 데이터가 실제로 로드된 뒤에만 마운트되는 자식 컴포넌트(`SettingsForm`)로 분리해 `useState(() => toFormState(settings))`의 지연 초기화 함수로 최초 1회만 값을 seed하도록 바꿨다 — 이후 `settings` prop이 리페치로 갱신돼도(참조가 바뀌어도) 같은 위치의 같은 컴포넌트이므로 React가 인스턴스를 재사용해 재초기화되지 않는다. 이 덕분에 저장 성공 후에도 진행 중인 편집이나 "저장했어요" 메시지가 사라지지 않는다.

## 검증

- `pnpm --filter api-server lint/typecheck/test(56, +3)/build`, `pnpm --filter admin lint/typecheck/test(19, +6)/build` 모두 통과.
- **실제 마이그레이션 적용**: `drizzle-kit generate` → `db:migrate`로 로컬 Postgres에 `settings` 테이블 생성 확인.
- **지연 생성 실증**: 마이그레이션 직후 `SELECT * FROM settings`가 빈 테이블 → 게스트로 `GET /requests/queue` 실제 호출 → 기본값(60/5/5) 행이 자동 생성됨을 psql로 확인.
- **설정이 실제로 답변 큐 로직에 반영되는지 실증**: `queue_freshness_hours`를 1로 낮춘 뒤 60시간보다 오래된 요청 37개가 큐에서 전부 제외됨(빈 응답) → 다시 60으로 복원하니 즉시 요청이 다시 잡힘을 curl로 확인.
- **Chrome 실사용 검증**: 이미 로그인된 관리자 세션으로 `/settings` 방문 → 실제 DB 값(60/5/5) 표시 확인 → 신선도 값을 48로 수정 후 저장 → "저장했어요" 표시 + psql로 DB에 실제 반영됨을 확인 → 새로고침해도 48 유지 확인 → 60으로 복원.
