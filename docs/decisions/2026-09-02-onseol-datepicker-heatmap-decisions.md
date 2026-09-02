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

이번 라운드는 사용자 요청으로 **문서 → 백엔드 → 프론트엔드** 순서(다른 라운드에서 써 온 백엔드/프론트엔드/문서 순서와 다름, 이 라운드에 한해 문서를 먼저 작성). 세 PR 모두 `v1` 기반, 순차 진행(스택 금지 — `[[pr_splitting_default]]`) — **#128(문서, 머지) → #129(백엔드, 머지) → #130(프론트엔드, 머지)**.

## 프론트엔드 재검토 (2026-09-02, PR #130 진행 중)

계획대로 `HeatmapCalendar(mode="single"/"range")`를 `/read`·`/records`에 상시 노출하는 형태로 처음 구현했으나, 두 차례 사용자 피드백으로 최종 형태가 달라졌다.

**1차 재검토 — 팝오버 필드로 전환.** "달력이 너무 큰데?" — 페이지에 항상 펼쳐진 7열 그리드가 부담스럽다는 지적. `packages/ui`에 `HeatmapCalendarField`를 신규 추가: `ui/TextField`처럼 생긴 컴팩트한 트리거 버튼을 클릭하면 그 아래 앵커된 팝오버로 `HeatmapCalendar`가 뜨는 구조로 변경(`MoreMenu`의 open-state + `useDismissOnOutsideClick` 패턴 재사용). 단일 선택은 날짜를 고르면 즉시 팝오버가 닫히고, range 선택은 시작일만 고른 상태(from만 있고 to는 없음)에서는 열려있다가 양끝이 다 채워져야 닫히도록 함.

**2차 재검토 — range 모드 자체를 제거, `/records`를 시작일/종료일 두 필드로 분리.** 팝오버로 바꾼 뒤에도 두 가지 문제가 남았다: (1) 필드 하나에 "2026년 8월 28일 ~ 2026년 8월 30일" 같은 텍스트가 들어가면 고정 너비 안에서 두 줄로 줄바꿈됨, (2) 범위가 이미 완성된 상태에서 아무 날짜나 클릭하면 무조건 "새 범위 시작"으로 처리돼 한쪽 끝만 조정하는 게 불가능함(예: 종료일만 하루 늘리기가 안 됨) — 기존 `DateRangeFilter`(입력 2개)가 갖고 있던 독립 편집성이 후퇴한 것.

해결: `HeatmapCalendar`에서 `mode="range"`(클릭 2번, `onRangeChange`)를 완전히 제거하고 **단일 선택 전용**으로 되돌렸다. 대신 `selected`/`onSelect`에 더해 `minDate`/`maxDate`(둘 다 optional)를 받도록 확장 — 원래 `/read`의 "오늘 이후 비활성화"용으로만 있던 `maxDate`를 범용 상/하한 제약으로 일반화한 것. `/records`는 `HeatmapCalendarField`를 **시작일/종료일 두 개**(`flex flex-wrap gap-3`로 나란히 배치) 렌더링하고, 서로의 현재 값을 상대 필드의 `maxDate`/`minDate`로 넘겨 거꾸로 된 범위 자체를 선택 불가능하게 만들었다(시작일 필드엔 `maxDate={to}`, 종료일 필드엔 `minDate={from}`). 두 필드는 `calendarMonth` 상태를 공유하지만(같은 달을 보여줌), `open` 상태는 각자 독립적 — `useDismissOnOutsideClick`이 서로를 자연스럽게 상호 배타적으로 만들어줘서(다른 필드를 클릭하면 그 클릭이 "바깥 클릭"으로 처리돼 먼저 열려있던 팝오버가 닫힘) 별도 조율 로직 없이 한 번에 하나만 열림.

`useDateRangePage`도 이 과정에서 `setRange(from, to)` 하나였다가 원래대로(범위 도입 이전과 동일하게) `setFrom`/`setTo` 독립 setter로 되돌아갔다.

## 검증

- `pnpm --filter api-server test`: 171/171 (신규 KST 헬퍼 유닛 테스트 12개 포함).
- `pnpm --filter web test`: 131/131 — 달 경계 근처에서 실행되면 흔들릴 수 있는 두 테스트(`/read`의 "이전 날짜 클릭", `/records`의 range 필터)는 `vi.setSystemTime`으로 고정된 날짜를 씀.
- `pnpm --filter web lint`, `pnpm --filter ui lint`, 양쪽 `tsc --noEmit` — 클린.
- 로컬 Postgres에 시딩된 실 데이터로 `curl`을 통해 세 카운트 엔드포인트 직접 검증: 기본 범위(파라미터 없으면 이번 달로 폴백), 명시적 범위의 실제 카운트+0-채움, 100일 초과 범위 클램프, `mine/counts` 비인증 401, `replies/mine/counts` 게스트 200(0-값).
- 실브라우저(Chrome)로 `/read`·`/records` 모두 다회 검증: 달 이동, 날짜/범위 클릭에 따른 URL 반영과 실제 목록 필터링, 색상 강도(실 데이터 기준 상대적 4단계), 팝오버 열기/닫기(선택 시 자동 닫힘, 바깥 클릭 시 닫힘), `/records` 두 필드의 min/maxDate 상호 제약(예: 시작일을 8/28로 찍으면 종료일 캘린더에서 8/27 이전이 비활성화됨), 콘솔 에러 없음.
