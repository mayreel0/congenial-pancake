# 온설 프로필 공개 설정 결정 기록

## 배경

공개 프로필 페이지(PR #103/#104) 머지 직후 사용자 요청 4가지:
1. "내 정보"에서 남긴 고민/답변을 남들이 볼 수 없게 설정할 수 있어야 함.
2. 남긴 고민/답변 개수를 보여줘야 함.
3. "내 정보"에서 그 개수도 볼 수 없게 설정할 수 있어야 함.
4. 닉네임을 없앨 수 있어야 하는가? 비활성화 개념. 기존 작성 목록에서도 닉네임을 가릴 수 있으면 좋겠음.

명세 확정 전 몇 차례 추가 확인:
- 목록 공개 여부는 고민/답변 각각 독립(2개), 개수 공개 여부는 고민+답변 합쳐서 1개 — 총 3개 토글.
- 닉네임 지우기는 변경 쿨타임(기본 7일) 대상이 아님 — 언제든 자유롭게 허용.

## 기술적 발견: 닉네임 마스킹은 이미 공짜

`AuthorDisplayDto`는 게시물에 스냅샷으로 저장되지 않고, 응답 시점마다 `UsersService.nicknameMapFor()`로 **현재** `users.nickname`을 조회해서 만들어짐(`toAuthorDisplayDto`가 nickname이 falsy면 무조건 `{anonymous:true}`로 폴백). 따라서 닉네임을 지우기만 하면 과거에 남긴 글까지 전부, 별도 로직 없이 즉시 "익명"으로 보이게 됨. 4번 요청의 "기존 목록에서도 가리기"는 추가 구현이 필요 없고, 닉네임을 지울 수 있는 API만 있으면 됨(기존엔 `POST /auth/nickname`이 빈 문자열을 거부해서 지우는 방법 자체가 없었음).

## 결정

- **토글 3개**, `users` 테이블에 직접 컬럼 추가(기존 `nickname`/`nicknameChangedAt`와 같은 패턴): `show_requests_on_profile`, `show_replies_on_profile`, `show_counts_on_profile` — 전부 기본값 `true`(옵트아웃이지 옵트인이 아님 — 이미 게시물마다 닉네임 공개를 선택한 사람은 찾아질 수 있다는 데 암묵적으로 동의한 것으로 간주).
- **개수 토글은 목록 토글과 독립** — 목록을 가려도 개수는 계속 보여줄 수 있고(활동량만 신뢰 신호로 노출), 반대로 개수만 가리고 목록은 보여줄 수도 있음. `ProfileService`는 두 목록을 항상 서버에서 조회해두고(개수 계산에 필요), 토글에 따라 빈 배열/`null`로 응답만 다르게 함.
- **닉네임 지우기(`DELETE /auth/nickname`)는 쿨타임 완전 면제** — `UsersService.clearNickname()`은 `updateNickname()`과 별개 메서드로, 쿨타임 체크 자체를 하지 않음. `nickname`과 `nicknameChangedAt`을 함께 `NULL`로 리셋 — 지운 뒤 새 닉네임을 설정하는 것도 기존 "최초 설정은 무료" 로직이 `current.nickname !== null` 조건으로 이미 걸러주므로 자동으로 즉시 허용됨.
- 지운 뒤 예전 프로필 링크(`/u/[닉네임]-[판별자]`)는 자연스럽게 404 — PR #103에서 이미 정한 "닉네임 바뀌면 옛 링크는 그냥 깨짐" 정책과 동일.

## 산출물 (백엔드)

- 마이그레이션 `0013_greedy_loa.sql` — `users`에 컬럼 3개 추가.
- `UsersRepository.clearNickname()` / `updateProfileVisibility()` 신규. `UsersService`도 대응 메서드 추가(`clearNickname`은 쿨타임 검사 없이 그대로 위임, `updateProfileVisibility`도 부분 패치 그대로 위임).
- `AuthController`: `DELETE /auth/nickname`, `PATCH /auth/profile-visibility` 신규 라우트. `UserResponseDto`에 3개 필드 추가.
- `ProfileService.findProfile()` / `PublicProfileDto`: `requestsVisible`/`repliesVisible`/`countsVisible`(불리언) + `requestCount`/`replyCount`(개수 토글 꺼지면 `null`) 추가.
- 프론트엔드(`/me`에 토글 UI, 닉네임 지우기 버튼, `/u/[slug]`에 개수/비공개 상태 표시)는 별도 PR.

## 검증

- `apps/api-server` lint/typecheck/test(87/87)/build 통과.
- 실서버 검증(로그인 계정 + curl 조합):
  - `PATCH /auth/profile-visibility {showRequestsOnProfile:false}` → `/auth/me` 응답에 즉시 반영, 공개 프로필에서 `requests:[]`이지만 `requestCount`는 실제 개수 그대로 유지 확인.
  - `DELETE /auth/nickname` → 응답에서 `nickname:null`, `nicknameChangeAvailableAt:null`(쿨타임 중이던 계정이었는데도 즉시 해제) 확인.
  - 지운 직후 예전 프로필 URL(`/users/땃지/C376`) 404 확인.
  - 지우기 전 그 닉네임으로 공개했던 답장을 `GET /requests/feed`에서 재조회 → `author.anonymous: true`로 자동 전환된 것 확인(추가 코드 없이).

## 남은 일

- 프론트엔드: `/me`에 토글 3개 + "닉네임 지우기" UI, `/u/[slug]`에 개수 표시 및 "비공개로 설정했어요" 문구.

## 추가: 프론트엔드 (PR #106)

`/me`에 `ProfileVisibilitySection`(토글 3개, 클릭 즉시 반영) 추가. `NicknameSection`에 "지우기" 버튼 — `ui/ActionConfirmDialog`로 "기존 글도 익명으로 바뀐다"는 걸 확인받은 뒤 실행, 쿨타임 무관하게 항상 활성화. `/u/[slug]`는 백엔드의 `requestsVisible`/`repliesVisible`/`countsVisible` 불리언으로 "비공개" 안내 문구 vs "공개했지만 아직 없음" 문구를 구분하고, 개수는 목록 공개 여부와 무관하게 `countsVisible`만 보고 표시. 실브라우저 검증 중 발견한 것: 토글을 끈 직후 `/u/[slug]`를 다시 열면 즉시 반영되고(react-query 캐시 무효화), 개수는 목록을 꺼도 그대로 유지되는 것 확인.
