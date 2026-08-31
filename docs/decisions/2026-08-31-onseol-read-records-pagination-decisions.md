# 온설읽기 / 내 기록 페이지네이션 결정 기록

## 배경

사용자가 정리한 다음 라운드 백로그 7개 중 첫 번째로 착수: `/read`(온설읽기)와 `/records`(내 기록)의 페이지네이션, `/answer`(답하기)의 무한스크롤, 로딩 스켈레톤. 이번 라운드는 그중 백엔드 페이지네이션 부분(`/read`, `/records`) — `/answer` 무한스크롤과 프론트엔드는 별도.

## 확정된 UX 방향

여러 차례 확인 끝에 확정:

- **`/read`(온설읽기)**: 무한스크롤이 아니라 **날짜(day) 단위 페이지네이션** — 온설이 "오늘 N개의 이야기가 남겨졌고..." 같은 하루 리듬을 가진 서비스라, 계속 흘러가는 피드보다 "그날의 온설"을 한 단위로 넘겨보는 게 제품 정체성과 맞음(사용자 확인). 기본값은 **어제**. 하루 안에 글이 많으면 그 안에서도 번호 페이지네이션.
- **`/records`(내 기록)**: **날짜 범위**(시작일~종료일) 선택 + 번호 페이지네이션. 기본값은 **전체 기간**(범위 미선택 시 전체 히스토리를 페이지네이션).
- 리스트는 두 곳 다 한 줄에 카드 하나씩(세로 배치) — 가로 그리드 아님.
- **향후**: 깃허브 커밋 잔디 스타일 활동 히트맵을 나중에 붙일 수 있게, 지금부터 날짜별 데이터 구조로 설계.

번호 페이지네이션이 필요한 두 곳 다 **offset/limit 방식**을 선택했다 — cursor 방식은 "다음 페이지"만 가능하고 "3페이지로 바로 이동"이 안 되기 때문.

## 기술 결정

- **KST 날짜 경계**: 온설은 한국 전용 서비스라 "그날"은 항상 KST 달력일. KST는 DST 없는 고정 UTC+9라 타임존 라이브러리 없이 순수 산술로 처리(`apps/api-server/src/common/kst-date.ts`).
- **공용 페이지네이션 응답 타입**: `apps/api-server/src/common/pagination.dto.ts`의 `PaginatedDto<T>` (`items`/`page`/`pageSize`/`totalItems`/`totalPages`) — 이번에 처음 도입되는 패턴이라 앞으로 페이지네이션이 필요한 엔드포인트는 이걸 재사용.
- **쿼리 파라미터 파싱**: 전역 `ValidationPipe`에 `transform: true`가 없어서(다른 DTO에 영향 줄 수 있어 건드리지 않음) `@Query()` DTO 클래스 대신 개별 `@Query('key')` 파라미터를 받아 컨트롤러에서 직접 파싱. 잘못된/누락된 `date`·`from`·`to`·`page`는 400 에러 대신 조용히 기본값으로 폴백 — URL의 오래된/잘못된 파라미터로 페이지가 깨지면 안 되는 단순 브라우징 UI라는 판단.
- **`GET /requests/feed`**: `date`(KST, 기본 어제) + `page` 파라미터 추가. 응답에 실제 사용된 `date`도 같이 반환(기본값 적용 여부를 프론트가 알아야 함).
- **`GET /requests/mine`, `GET /replies/mine`**: `from`/`to`(날짜 범위, 기본 무제한) + `page` 파라미터 추가.
- **부수 수정**: `/replies/mine`의 정렬을 기존 오래된순(`asc`)에서 최신순(`desc`)으로 변경 — 번호 페이지네이션에서 1페이지가 최신이라는 통상적 기대에 맞춤(`/requests/mine`은 원래도 최신순). 이 순서에 의존하는 다른 곳은 없음을 확인.
- 백엔드 변경만으로 끝 — 프론트엔드(`/read`, `/records` UI, 스켈레톤)는 별도 PR.

## 검증

- `apps/api-server` lint/typecheck/test(120/120)/build 통과. 새로 작성: `kst-date.spec.ts`(날짜 경계·잘못된 날짜·"어제" 계산), `pagination.dto.spec.ts`, `findFeed`/`findMine` 리포지토리 테스트(날짜 필터+페이지네이션), 컨트롤러 레벨 테스트(파라미터 기본값/폴백).
- 실서버 curl 검증: `date` 파라미터 없이 호출 시 KST 기준 어제 데이터 반환, 잘못된 `date` 값은 조용히 어제로 폴백, 명시적 `date`로 필터링 확인.

## 추가: 프론트엔드 UI (별도 PR) + 답하기 무한스크롤도 같이 처리

프론트엔드 라운드 시작 시 사용자가 "답하기의 답변 로그(채팅 스타일 이력)도 이번에 무한스크롤로 바꿀까요?"라는 질문에 "지금 같이 구현"으로 답해, 원래 백로그의 3번(답하기 무한스크롤)도 이번 라운드에 포함시킴 — `/replies/mine`이 답변 로그의 유일한 데이터 소스인데 페이지네이션을 걸면서 이 화면이 자동으로 최근 20개로 잘리는 회귀가 생기는 걸 발견했기 때문.

- `/read`: `DayNav`(이전/다음 날) + `ui/Pagination`(하루 안 번호 페이지) + `ui/Skeleton` 로딩. 다음 날 버튼은 "어제"에서 막힘(오늘은 아직 마감 안 된 하루).
- `/records`: 두 탭(내가 남긴 고민/답변) 각각 `DateRangeFilter`(네이티브 `<input type="date">` 시작일/종료일) + `ui/Pagination` + `ui/Skeleton`. 날짜 범위를 바꾸면 페이지 1로 리셋(`useDateRangePage` 훅). 두 탭 구조가 동일해서 이 라운드 안에서 바로 공용화(패턴만 확인되면 나중에 추출하는 원칙과 별개로, 처음부터 같은 PR에서 2곳이 쓰는 게 확정이라 즉시 공용화).
- `/answer`: 답변 로그를 `useInfiniteQuery`로 전환 — 1페이지가 최신이고 다음 페이지로 갈수록 과거라, "위로 스크롤하면 과거 로드"라는 방향과 정확히 맞물림. 스크롤 컨테이너 맨 위(가장 오래된 위치)에 sentinel을 두고 `IntersectionObserver`로 감지, 과거 페이지가 위에 붙을 때 `scrollTop`을 높이 변화량만큼 보정해서 화면이 튀지 않게 함.
- `ui/Pagination`, `ui/Skeleton` 신규 공용 컴포넌트 — 카드 모양은 각 페이지가 `Skeleton` 조각을 조합해서 직접 구성(공용 컴포넌트가 카드 모양까지 알 필요 없게).
- jsdom에 `IntersectionObserver`가 없어서 `vitest.setup.ts`에 최소 mock(`MockIntersectionObserver`, 인스턴스 export)을 추가 — 테스트가 sentinel의 콜백을 직접 호출해 "스크롤로 보임"을 흉내낼 수 있음.

- 실브라우저 검증(백엔드 PR 브랜치를 임시로 빌려와서): `/read`에서 이전/다음 날 이동 시 실제로 다른 날짜 데이터가 뜨고 "다음 날"이 어제에서 비활성화되는 것, `/records`에서 날짜 범위 입력 후 목록이 필터링되고 페이지 2로 이동 시 다른 항목이 뜨는 것, `/answer`는 콘솔 에러 없이 정상 렌더(테스트 계정 데이터가 20개 미만이라 실제 무한스크롤 트리거는 못 봤지만, 유닛 테스트로 sentinel→fetchNextPage→과거 항목 병합 전 과정 확인).
- `apps/web` lint/typecheck/test(106/106)/build 통과. `apps/admin` lint/typecheck 통과(무관함 확인).

## 추가: pageSize를 클라이언트가 선택 가능하게 (10/20/50, 기본 10) + 페이지네이션 UI 상시 표시

사용자 피드백: "한 페이지사이즈를 20으로 해두었는데 기본은 10으로 하고 10, 20, 50 조절할 수 있게 하자. 그리고 페이지네이션은 다음페이지가 없어도 UI를 보여줘야해."

- `DEFAULT_PAGE_SIZE` 20 → 10, `PAGE_SIZE_OPTIONS = [10, 20, 50]` 화이트리스트 도입 (`apps/api-server/src/common/pagination.dto.ts`). `parsePageSizeParam`도 `parsePageParam`과 같은 원칙(잘못된/화이트리스트 밖 값은 400 대신 조용히 기본값 10으로 폴백)을 따름.
- `GET /requests/feed`, `GET /requests/mine`, `GET /replies/mine` 모두 `pageSize` 쿼리 파라미터 지원.
- `ui/Pagination`에 페이지 크기 `<select>`(10/20/50) 추가, 그리고 **`totalPages <= 1`이어도 더 이상 `null`을 반환하지 않고 항상 렌더링** — 크기 선택 UI가 페이지 수와 무관하게 계속 닿을 수 있어야 하기 때문(예: 10개 기준 1페이지뿐이어도 50개로 바꾸고 싶을 수 있음). 페이지 크기를 바꾸면 페이지 1로 리셋.
- `/answer`의 무한스크롤(`useMyAnswerLogInfiniteQuery`)은 이 선택 UI 대상이 아님 — pageSize 파라미터 없이 호출해 서버 기본값(10)을 그대로 씀. 채팅 로그 특성상 "페이지 크기"라는 개념을 사용자에게 노출할 필요가 없다고 판단.

- 실브라우저 검증(백엔드 PR 브랜치를 임시로 빌려와서): `/records`에서 페이지 크기를 50으로 바꾸면 실제로 더 많은 항목이 한 페이지에 로드되고 페이지네이션 컨트롤(선택 UI 포함)이 1페이지 상태로도 계속 보이는 것, `/read`에서 항목이 페이지 크기보다 적은 날에도 페이지네이션 컨트롤이 그대로 보이는 것 확인.
- `apps/api-server` lint/typecheck/test(132/132)/build 통과. `apps/web` lint/typecheck/test(107/107)/build 통과.
