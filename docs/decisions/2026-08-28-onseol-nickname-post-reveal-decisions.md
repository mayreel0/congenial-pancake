# 온설 닉네임 게시물 노출 결정 기록

## 배경

[[2026-08-28-onseol-nickname-decisions]]에서 닉네임 저장/설정만 구현하고 "다음 라운드"로 남겨둔 부분 — 실제 글/답장 작성 시 익명/닉네임을 선택하고, 응답에 그 선택을 반영하는 기능. "다음 진행할 사안은 뭐가 있을까요?" 질문에 사용자가 "닉네임 게시물 노출"을 선택해 이번 라운드로 확정.

이번 라운드는 설계 판단이 필요한 지점들이 코드 탐색만으로 답이 나오는 것들이라 별도로 사용자 확인을 구하지 않고 진행 — 아래 "설계 판단"은 사용자 결정이 아니라 구현 근거 기록.

## 스키마: `requests`/`replies`에 `anonymous` 컬럼 + CHECK 제약

`anonymous: boolean('anonymous').notNull().default(true)` — 게시물당 선택([[2026-08-28-onseol-nickname-decisions]] 결정 1)이므로 계정이 아니라 각 row에 저장. 기본값 `true`라 기존 데이터/컬럼 추가 이전에 작성된 글은 전부 지금까지와 동일하게 익명으로 유지됨(마이그레이션에 별도 백필 불필요).

`requests_guest_must_be_anonymous`/`replies_guest_must_be_anonymous` CHECK 제약(`author_id is not null or anonymous = true`) 추가 — 게스트는 users row가 없어 닉네임을 가질 수 없으므로 "게스트인데 익명 아님"이 DB 레벨에서 구조적으로 불가능하도록 막음. 서비스 레이어 검증만으로는 버그로 우회될 수 있지만 CHECK는 우회 불가.

## 응답 형태: `author: AuthorDisplayDto`

`authorId`/`guestId` 자체는 지금까지처럼 HTTP 경계를 절대 넘지 않음(요청/응답 DTO 어디에도 없음). 대신 `src/common/author-display.ts`의 판별 유니온을 노출:

```ts
type AuthorDisplayDto =
  | { anonymous: true }
  | { anonymous: false; nickname: string; nicknameDiscriminator: string };
```

`anonymous: false`인데 그 시점에 닉네임이 사라진(예: 이론상 훗날 닉네임 삭제 기능이 생길 경우) 경우는 `anonymous: true`로 안전하게 폴백 — 빈 닉네임을 내려보내지 않음.

`toRequestResponseDto`/`toReplyResponseDto`는 `nicknameByUserId: Map<string, string | null>`를 필수 파라미터로 받도록 변경(기본값 없음) — 호출부 하나라도 빠뜨리면 타입체크가 즉시 실패하게 강제. 각 컨트롤러가 응답 대상 레코드들의 `authorId`를 모아 `UsersService.nicknameMapFor`로 한 번에 배치 조회(N+1 방지).

## `feed-author-slots.ts`는 수정하지 않음

`assignAuthorSlots`는 `/read` 피드에서 같은 스레드 안의 여러 작성자를 "익명 1", "익명 2"로 구분하는 용도. 닉네임을 켠 글이 섞여도 슬롯 자체는 모든 identity에 대해 그대로 계산됨 — 프론트가 `author.anonymous === false`일 때 슬롯 라벨 대신 실제 닉네임을 우선 표시하는 방식으로 통합(프론트는 다음 라운드).

## 닉네임 미설정 시 `anonymous: false` 요청 거부

`CreateRequestDto`/`CreateReplyDto`에 `anonymous?: boolean` 추가(기본 `true`로 취급). 로그인 사용자가 `anonymous: false`를 보냈는데 닉네임이 없으면 `NicknameRequiredException`(400) — 게스트는 애초에 이 옵션이 무의미(서비스 레이어에서 게스트 경로는 항상 익명 고정, dto.anonymous 무시).

관리자용 `AdminRequestResponseDto`/`AdminReplyResponseDto`(apps/api-server/src/admin/dto/)는 의도적으로 수정하지 않음 — "관리자도 누가 썼는지 몰라도 복구/삭제만 하면 된다"는 기존 정책 주석이 이미 있었고, 닉네임 공개는 사용자가 선택한 "공개 범위"이지 관리자 권한 확장과는 무관.

## 검증

- lint/typecheck/test/build 통과.
- 마이그레이션 `0010_sharp_rachel_grey.sql` 생성 및 로컬 적용 완료.
- curl 실사용 검증 예정: 익명 글 작성(기본값), 닉네임 공개 글 작성, 게스트가 `anonymous: false` 시도 시 무시되어 익명으로 저장되는지, 닉네임 미설정 사용자가 `anonymous: false` 시도 시 400, `/requests`·`/requests/feed`·`/replies/mine` 등 목록 응답에서 실제 닉네임+discriminator가 올바르게 내려오는지.

## 남은 일

- 프론트엔드: 글쓰기/답장 폼의 익명/닉네임 토글, `author.anonymous === false`일 때 실제 닉네임 렌더링(슬롯 라벨과의 통합).
- 공개 프로필 페이지는 여전히 범위 밖.
