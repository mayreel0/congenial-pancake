# 온설 비회원 글쓰기 허용 결정 - 2026-08-21

`docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md`가 확정한 신고 3명 임계치를 그대로 둔 채, requests/replies 백엔드(`apps/api/src/requests`, `replies`, `reports`, `moderation`)를 실제로 구현하면서 나온 결정을 기록한다.

## 배경

`requests`/`replies`/`reports` 스키마는 애초에 `authorId`/`reporterId`를 `NOT NULL`로 걸어뒀다 — 사실상 "글쓴이는 항상 로그인한 실제 유저"를 전제한 설계였다. 그런데 초기 프로토타입 결정(`docs/decisions/2026-08-14-onseol-product-decisions.md`)은 "로그인 전 작성한 요청과 답변은 임시 저장한다"고 되어 있어, 애초에 비회원도 글을 쓸 수 있는 서비스로 구상됐다. 백엔드 구현 라운드에서 이 둘이 충돌한다는 게 드러나 다시 확인했고, 사용자는 "초기 사용자 접근성"을 이유로 비회원 글쓰기를 유지하기로 재확인했다.

## 결정 1: 비회원도 요청(온설)·답장을 쓸 수 있다

`requests.author_id`/`replies.author_id`를 nullable로 바꾸고, 각 테이블에 `guest_id`(text, nullable) 컬럼을 추가했다. `CHECK (author_id IS NOT NULL OR guest_id IS NOT NULL)` 제약으로 "둘 중 하나는 반드시 있어야 한다"를 DB 레벨에서 강제한다.

## 결정 2: 비회원 식별은 클라이언트가 만든 guestId로

로그인 사용자는 세션으로 식별하고, 비로그인 요청은 브라우저가 만들어 들고 있는 랜덤 id를 `X-Guest-Id` 헤더로 보내 식별한다. 서버는 이 값을 검증하지 않고(발급 주체가 없으므로 위조 가능) 그대로 신뢰한다 — 지금 규모에서 guestId 위조로 얻는 이득이 없어(요청 1회/답장 5회라는 낮은 한도, 신고 불가) 검증 비용을 들이지 않기로 했다.

### 근거

비회원에게 `authorId`가 없으면 기존에 스키마가 보장하던 두 안전장치가 무력화된다: `replies`의 `(requestId, authorId)` unique(요청당 답장 1회 제한)와 `reports`의 `(targetType, targetId, reporterId)` unique(신고자 중복 방지, 3명 임계치의 전제). guestId 없이 그냥 `authorId`를 nullable로만 뒀다면 NULL은 unique 제약에서 서로 다른 값으로 취급되어 두 안전장치가 전부 뚫린다.

## 결정 3: 비회원 제한 수치

- 요청(온설) 작성: guestId당 **1회**. `requests.guest_id`에 unique 제약을 걸어 DB 레벨에서 강제(1회라는 한도가 정확히 "유일성"과 같은 표현이라 가능).
- 답장 작성: 요청 하나당 guestId당 **5회**. 로그인 사용자는 기존처럼 요청당 정확히 1회 유지(`replies_request_author_unique`는 `authorId`가 NULL인 guest 행에 적용되지 않으므로 그대로 둠). "5회"는 유일성으로 표현할 수 없는 규칙이라 DB 제약이 아니라 `RepliesService`에서 사전 카운트 체크로 구현했다 — 동시 요청 레이스 컨디션이 이론상 있지만, 이 규모에서는 감수 가능한 리스크로 남긴다(기존 `auth.service.ts`의 이메일 중복 사전 체크도 같은 종류의 트레이드오프를 이미 갖고 있다).

### 근거

로그인 유도를 위해 아예 못 쓰게 막는 대신, 낮은 한도로 "일단 써보게" 하는 쪽을 택했다. 답장을 요청보다 넉넉하게(5회) 둔 이유는 답장이 요청보다 훨씬 짧고 저부담인 상호작용이라 여러 번 시도해보는 사용 패턴이 자연스럽다고 판단해서다.

## 결정 4: 신고는 로그인 사용자만

비회원은 `POST /reports`를 아예 호출할 수 없다(`SessionGuard` — 세션 없으면 401). `reports.reporter_id`는 그대로 `NOT NULL`로 두고 스키마·3명 임계치 로직을 전혀 바꾸지 않았다.

### 근거

guestId로 신고까지 허용하면 같은 사람이 guestId를 여러 개 만들어(또는 애초에 검증 안 되는 값이라 그냥 다른 문자열을 보내서) 신고 3명 임계치를 혼자 채울 수 있다 — 방금 확정한 자동 숨김 정책 자체가 무력화된다. 신고는 콘텐츠를 사라지게 만드는 액션이라 쓰기(요청/답장)보다 신뢰할 수 있는 신원이 필요하다고 판단해 로그인 필수로 남겼다.

## 산출물

- 마이그레이션: `apps/api/drizzle/0002_pretty_mikhail_rasputin.sql` (`requests`/`replies`의 `authorId` nullable화, `guestId` 컬럼 추가, CHECK 제약, `requests.guestId` unique).
- `apps/api/src/auth/`: `OptionalSessionGuard`, `OptionalCurrentUser()` 데코레이터 추가(기존 `SessionGuard`/`CurrentUser()`는 변경 없음) — 세션이 있으면 쓰고 없으면 guestId로 넘어가는 라우트에서 사용.
- `apps/api/src/common/decorators/guest-id.decorator.ts`: `X-Guest-Id` 헤더 파라미터 데코레이터.
- `apps/api/src/requests/`, `replies/`, `reports/`, `moderation/`: repository/service/controller/DTO 전부 구현. 새 도메인 예외(`GuestIdRequiredException`, `RequestGuestLimitExceededException`, `ReplyAlreadySubmittedException`, `ReplyGuestLimitExceededException`, `ReportAlreadySubmittedException`, `RequestNotFoundException`, `ReplyNotFoundException`)는 기존 `common/exceptions/app.exception.ts`에 추가.
- 응답 DTO는 `authorId`/`guestId`를 클라이언트에 노출하지 않는다 — 로그인 여부와 무관하게 누가 썼는지는 계속 비공개(프로토타입의 "익명 N" 표시와 같은 방향).

## 검증

- 단위 테스트(`pnpm --filter api test`, 41개): `requests.service.spec.ts`/`replies.service.spec.ts`/`reports.service.spec.ts`/`moderation.service.spec.ts` 신규 추가, 기존 19개(auth 등) 포함 전부 통과.
- 로컬 Postgres에 마이그레이션 적용 후 실제 서버(`start:dev`)에 `curl`로 직접 검증: 로그인 사용자 요청 작성 → 다른 사용자 답장 → 같은 사용자 재답장 시도 409, guest 요청 1회 성공 후 2회째 409, guestId 없이 쓰기 시도 400, guest 답장 5회 성공 후 6회째 409, guest의 `/reports` 호출 401, 서로 다른 로그인 사용자 3명 신고 시 대상이 `GET /requests` 목록에서 사라짐(자동 숨김) 확인, 같은 사용자 중복 신고 409 확인.
- 프론트엔드는 이번 라운드에서 변경하지 않음 — `apps/web`은 여전히 100% 로컬스토리지 프로토타입. 프론트에서 guestId를 실제로 생성/저장/전송하는 것은 다음 라운드(프론트 연동) 과제다.
