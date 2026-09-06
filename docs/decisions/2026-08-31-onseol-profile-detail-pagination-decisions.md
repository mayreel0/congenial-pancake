# 공개 프로필(/u/[slug]) 상세보기 + 페이지네이션 — 백엔드

## 배경

백로그 8번: 공개 프로필에서 "남긴 고민"/"남긴 답변" 제목(예: "남긴 고민 (13)")을 클릭하면 전체 목록을 페이지네이션으로 보고, 개별 항목을 클릭하면 그 글의 상세를 볼 수 있어야 함. 지금까지 `PublicProfileDto`는 두 목록을 전부(페이지네이션 없이) 인라인으로 내려주고 있었음.

사용자와 두 가지를 먼저 확정:

1. **메인 프로필 페이지 목록**: 미리보기만(최근 몇 개) 보여주고 제목 클릭시 전체 페이지네이션 목록으로 이동. (지금처럼 전체 인라인 유지 + 별도 이동 옵션 추가 안 함.)
2. **상세 화면 내용**: 고민 상세와 답변 상세 둘 다 "그 글이 달린 스레드 전체"(원 고민 + 거기 달린 모든 공개 답변, `/read`와 동일한 형태)를 보여주고, 답변 상세로 들어간 경우엔 그중 이 프로필 주인이 쓴 답변만 프론트에서 강조 표시. 즉 두 상세 화면은 사실상 같은 스레드 뷰이고, 강조 대상만 다름.

## 설계

- **재사용**: `/read`의 `findFeed`/`toFeedItemDto`가 이미 "요청 + 공개 답변 전체(익명이면 슬롯 기반 익명 표시)"를 만드는 정확히 같은 로직이라, 상세 응답 DTO는 새로 만들지 않고 기존 `FeedItemResponseDto`를 그대로 재사용. 답변 상세도 같은 DTO를 반환 — 어떤 답변을 강조할지는 프론트가 이미 URL의 replyId로 알고 있으므로 백엔드가 별도 필드를 얹을 필요 없음.
- **새 리포지토리 메서드**: `RequestsRepository.findFeedItemById(requestId)` — `findFeed`/`findMine`과 같은 스레드 모양(`{request, replies}`, 답변은 오래된 순)이지만 "답변이 최소 1개 있어야 함" 조건 없이 단일 요청 하나만 조회(0개 답변인 자기 글도 상세가 열려야 하므로).
- **페이지네이션**: `RequestsRepository`/`RepliesRepository`의 기존 `findPublicByAuthor(authorId)`(전체 조회, unpaginated)를 `findPublicByAuthor(authorId, pagination)`으로 변경 — count 쿼리 + limit/offset. 메인 프로필 엔드포인트(미리보기)와 새 목록 엔드포인트가 이 하나의 메서드를 공유: 미리보기는 `{page: 1, pageSize: PROFILE_PREVIEW_SIZE(5)}`로 호출하고 리스트 자체는 잘라도(최근 5개), 카운트("N")는 그 쿼리의 진짜 `totalItems`를 쓰므로 부정확해지지 않음.
- **소유권/공개여부 검증**: 상세 엔드포인트 4개(목록 2 + 스레드 2) 전부 `ProfileService`에서 nickname/discriminator로 유저를 찾고, 해당 리스트의 `show*OnProfile` 스위치가 꺼져 있으면 `undefined`를 반환 → 컨트롤러가 404. 스레드 상세는 추가로 "요청/답변이 정말 이 프로필 주인 것이고 anonymous:false로 공개한 것"까지 확인 — 아니면 404. 이렇게 하면 나중에 소유자가 목록을 비공개로 바꾼 뒤에도 예전에 공유/북마크된 링크가 그대로 열리는 일이 없음(지금 프로필 페이지 자체가 닉네임 비공개시 404 되는 것과 동일한 원칙).
- **라우트**: `GET /users/:nickname/:discriminator/requests|replies?page=&pageSize=` (목록), `GET /users/:nickname/:discriminator/requests/:requestId`, `GET /users/:nickname/:discriminator/replies/:replyId` (상세) — 전부 기존 `ProfileController`(`@Controller('users')`)에 추가. `ProfileController`가 이제 `UsersService`도 직접 주입받아 스레드 안의 다른 사람들 닉네임까지 배치 조회(`nicknameMapFor`) — `RequestsController.feed()`와 같은 패턴.

## 검증

- `apps/api-server` lint/typecheck/test(158/158)/build 통과.
- 실서버 curl 검증: `/users/민들레/C376/requests`, `/replies` 페이지네이션 목록 정상 동작(`totalItems`/`totalPages` 포함), 메인 프로필 엔드포인트가 여전히 정확한 카운트를 보여주면서 목록만 미리보기로 줄어든 것 확인. `/users/민들레/C376/requests/:id`가 그 고민 + 달린 익명 답변까지 포함한 스레드를 반환, `/replies/:id`가 부모 고민 스레드를 정확히 찾아 반환(그 안의 답변 author가 revealed로 나옴) 확인. 존재하지 않는 id는 404.

## 추가: 프론트엔드 (별도 PR)

- `/u/[slug]` 메인 페이지: `ProfileSection`의 제목("남긴 고민 (N)")이 이제 `visible`일 때만 `/u/[slug]/requests`(또는 `/replies`)로 가는 링크가 됨. 백엔드가 이미 미리보기(5개)만 내려주므로 프론트는 그대로 렌더링만 함 — 별도 slice 없음.
- 신규 라우트 `/u/[slug]/requests`, `/u/[slug]/replies`: `ui/Pagination` + `apps/web/app/lib/useUrlState`(8/31 URL 동기화 라운드에서 나온 훅)로 `?page=&pageSize=` 관리. `/records`/`/read`와 같은 서버 컴포넌트+`<Suspense>` 래핑 패턴(`useSearchParams()` 필요). 목록 항목은 `<li><Link>...</Link></li>` 형태의 새 `ProfileListItemLink`(카드 전체가 클릭 가능) — 기존 `ProfilePostCard`(순수 `<li>`)를 그대로 `<Link>`로 감싸면 `<ol>` 바로 아래에 `<a>`가 오게 돼서 구조가 깨지므로 재사용하지 않고 새로 만듦.
- 신규 라우트 `/u/[slug]/requests/[requestId]`, `/u/[slug]/replies/[replyId]`: 스레드 렌더링은 `/read`가 이미 쓰는 `ReadThread`를 그대로 재사용(`showActions={false}`로 신고/저장 버튼만 숨김) — 백엔드가 정확히 같은 `FeedItemDto` 모양을 돌려주므로 새 컴포넌트를 만들 필요가 없었음. 답변 상세는 `ReadThread`에 새로 추가한 `highlightReplyId` prop으로 그 답변에 `ring-2 ring-primary`를 줌(다른 답변은 그대로) — `/read`는 이 prop을 안 넘기므로 기존 화면엔 영향 없음.
- `authorSlot` 기반 익명 닉네임 라벨링(`buildFeedItemLabels`)은 `/read`(`app/read/labels.ts`)에만 있던 걸 `app/lib/feed-item-labels.ts`로 옮김 — 이번 라운드에서 `/u/[slug]`의 두 상세 페이지가 정확히 같은 로직이 필요한 두 번째 실사용처가 생겼으므로([[feature_then_extract_shared_component]] 원칙상 "두 번째 실사용처가 생기면 공용화"에 해당).
- 프로필 주인이 아직 답변이 하나도 없는 자기 글의 상세를 열어도(백엔드가 "답변 0개 허용"으로 설계됨) 정상 렌더링됨을 실브라우저로 확인.

- 실브라우저 검증(백엔드 PR 브랜치를 임시로 빌려와서): 메인 프로필 → "남긴 답변" 제목 클릭 → 페이지네이션 목록 → 항목 클릭 → 스레드 상세(그 답변에 링 강조) 전체 흐름 확인. "남긴 고민" 쪽도 동일하게 확인, 답변이 없는 고민의 상세도 정상 렌더링됨을 확인.
- `apps/web` lint/typecheck/test(124/124)/build 통과.
