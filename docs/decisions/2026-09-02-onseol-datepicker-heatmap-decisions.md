# DatePicker 히트맵 — `/read` 날짜 네비 + `/records` 기간 필터 교체

## 배경

백로그에 등록되어 있던 항목(2026-08-31 등록, `[[onseol_roadmap]]` 9번): `/read`의 하루 단위 이전/다음 네비게이션(`DayNav`)과 `/records`의 기간 필터(`DateRangeFilter`, 네이티브 `<input type="date">` 2개)를, 글이 많은 날일수록 진하게 칠해지는 캘린더 뷰(GitHub 커밋 그래프/잔디 스타일 아이디어)로 교체한다.

모노레포에 날짜 라이브러리(`date-fns`, `react-day-picker` 등)가 전혀 없어서 새로 만들어야 하고, "일자별 개수" 카운트 백엔드 엔드포인트도 아직 없어서 신규 작업이 필요함을 먼저 확인했다.

## 설계 결정 (AskUserQuestion으로 확정)

- **`/records` 범위 선택 방식**: 히트맵 클릭 2번(시작일 → 종료일)으로 range 지정. 기존 from/to 텍스트 입력창은 완전히 대체·제거 — 병행 유지 옵션은 채택 안 함.
- **`/read`에서 글 0개인 날짜**: 회색으로 표시하되 클릭은 그대로 가능 — 지금 `DayNav`도 글 없는 날짜로 이동을 막지 않으므로(빈 피드 상태 그대로 노출) 동일한 동작 유지. 비활성화하지 않음.

## 계획된 설계

### 공용 컴포넌트: `packages/ui/src/components/HeatmapCalendar.tsx`

- 한 달 단위 그리드(7열), prev/next 달 내비게이션 내장.
- `counts: {date: string, count: number}[]` prop으로 셀 색상 강도 결정 — 그 달 안에서의 상대적 단계(절대 숫자 고정 tier가 아니라 그 달 최댓값 기준)로, 전체 트래픽 수준이 달라져도 항상 의미 있는 농도 차이가 나오게 함.
- `mode="single"`(`/read`용, 클릭 1번으로 날짜 이동) / `mode="range"`(`/records`용, 클릭 2번으로 시작~끝 지정).

### 백엔드: 신규 카운트 엔드포인트 3개

기존 `landing` 모듈의 카운트 쿼리 패턴(오늘/전체를 `Promise.all`로 병렬 카운트)을 일자별 그룹핑으로 확장:

- `GET /requests/feed/counts?from=&to=` — 공개, `/read` 히트맵용. `/requests/feed`가 실제로 보여주는 기준(답장이 달린 요청)과 동일하게 카운트.
- `GET /requests/mine/counts?from=&to=` — 인증 필요(`SessionGuard`), `/records` "내가 남긴 고민" 탭용.
- `GET /replies/mine/counts?from=&to=` — 인증 필요, `/records` "내가 남긴 답변" 탭용.

세 엔드포인트 모두 KST 일자 기준으로 그룹핑하고, 글이 없는 날짜도 0으로 채워서 응답(프론트에서 range 안의 모든 날짜를 순회할 필요 없게). `packages/shared/src/dto.ts`에 `dayCountsResponseSchema`(`{from, to, days: [{date, count}]}` 형태, 기존 `landingStatsResponseSchema`처럼 flat-counts 스타일) 추가 예정.

### 프론트엔드

- `/read`: `DayNav` → `HeatmapCalendar(mode="single")`로 교체. 클릭 시 기존 `useUrlState` 기반 `date` 흐름 그대로 재사용(네비게이션 로직 자체는 안 바뀜, 트리거만 바뀜).
- `/records`: `DateRangeFilter` 제거, `HeatmapCalendar(mode="range")`로 교체. 두 탭(내가 남긴 고민/내가 남긴 답변)이 각각 독립적으로 자기 탭의 카운트 엔드포인트를 사용 — 기존에도 `useDateRangePage(prefix)`로 두 탭 상태가 이미 분리되어 있던 것과 동일한 구조 유지.

### PR 분리

이번 라운드는 사용자 요청으로 **문서 → 백엔드 → 프론트엔드** 순서(다른 라운드에서 써 온 백엔드/프론트엔드/문서 순서와 다름, 이 라운드에 한해 문서를 먼저 작성). 세 PR 모두 `v1` 기반, 순차 진행(스택 금지 — `[[pr_splitting_default]]`).

## 검증

구현 전 계획 문서라 아직 없음 — 백엔드/프론트엔드 PR이 머지된 뒤 이 문서에 추가 예정.
