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

## 정정: "지우기"가 아니라 "감추기" (같은 날, 사용자 리뷰 피드백)

사용자 피드백: "닉네임 지우기 개념이 아니라 감추기임. 지금처럼 지우고 다시 닉네임을 정하면 닉네임 변경의 의미가 없잖음." — 정확한 지적. 원래 구현은 `nickname`과 `nicknameChangedAt`을 둘 다 `NULL`로 리셋했는데, `nicknameChangedAt`이 사라지면 `UsersService.updateNickname`의 쿨타임 체크(`current.nickname !== null`)가 항상 스킵되어 **지우고 바로 새 닉네임을 설정하면 쿨타임을 완전히 우회**할 수 있었음 — 애초에 쿨타임을 두는 목적(닉네임을 자주 바꾸며 신원을 세탁하는 것 방지)을 무력화하는 구멍.

**수정**: "지우기" API(`DELETE /auth/nickname`, `UsersService.clearNickname`)를 완전히 제거하고, 대신 `users.nickname_visible`(boolean, 기본 `true`) 순수 가시성 스위치로 교체 — `nickname`/`nicknameChangedAt` 둘 다 절대 건드리지 않음. 껐다 켜도 원래 닉네임이 그대로 돌아오고(같은 판별자, 같은 프로필 URL), 쿨타임 시계도 이 토글과 완전히 무관하게 흘러감. `UsersService.nicknameMapFor()`가 `nicknameVisible`이 꺼진 계정은 닉네임을 `null`로 매핑해서 `toAuthorDisplayDto`가 자동으로 익명 처리하고(4번 요청의 "기존 글도 가리기"는 여전히 공짜), `findByNicknameAndDiscriminator()`도 숨겨진 계정은 "못 찾음" 취급해서 `/u/[slug]`가 404됨 — 감춘 동안은 어떤 경로로도 못 찾는 게 일관됨. `PATCH /auth/profile-visibility`에 4번째 필드로 통합(별도 엔드포인트 안 만듦).

- 마이그레이션 `0014_lean_anita_blake.sql` 추가.
- 실서버 검증: `nicknameVisible: false`로 껐다가 다시 `true`로 켜는 동안 `nicknameChangeAvailableAt`이 완전히 동일한 값으로 유지되는 것 확인(쿨타임 시계 무영향). 감춘 동안 `/u/[닉네임]-[판별자]`가 404되는 것 확인.
- `apps/api-server` lint/typecheck/test(89/89)/build 통과.

## 추가: 프론트엔드 정정 + UI 피드백 3건 (PR #106)

백엔드 정정에 맞춰 프론트엔드도 다시 작업: "지우기" 버튼 + `ui/ActionConfirmDialog`를 "닉네임 공개" `ui/Toggle`로 교체(`useAuth().updateProfileVisibility({ nicknameVisible })`) — 가역적인 설정이라 확인 다이얼로그 자체를 없앰.

같은 라운드에 받은 UI 피드백 3건도 반영:
- 토글 3개(`ProfileVisibilitySection`) 사이 간격이 안 벌어지던 버그 — `Toggle`의 루트가 `inline-flex`라 `space-y-3`가 형제 요소 사이에 효과가 없었음(한 줄에 다 붙어 렌더링됨). 토글마다 `<div>`로 감싸서 수정.
- "개수 공개" 라벨이 뭘 가리키는지 모호하다는 지적 → "고민/답변 개수 공개"로 변경.
- 개수 표시를 프로필 헤더 아래 별도 요약 줄("남긴 고민 N개 · 남긴 답변 M개") 대신 각 섹션 `<h2>`에 "(N)" 형태로 통합(예: "남긴 고민 (3)") — 목록이 비공개여도 개수 토글이 켜져 있으면 그대로 표시, 개수 토글이 꺼지면 숫자 자체를 생략.

실브라우저 검증: 토글 3개가 세로로 잘 벌어지는 것, 닉네임 공개 토글을 껐을 때 `/u/[slug]`가 즉시 404되면서도 `/me`의 닉네임/가입일/쿨타임 표시는 그대로인 것, 다시 켰을 때 같은 판별자·같은 URL로 정확히 복원되는 것, 섹션 제목에 개수가 올바르게 붙는 것 확인.

## 추가: 토글 즉시 반영 → 저장/취소 버튼으로 (같은 날, 사용자 피드백)

사용자 피드백: "내정보에서 프로필 공개 설정을 토글할때마다 변경하는게 아니라 설정 후 저장을 눌러야 변경되게 수정해야할듯. 매번 api 날리는건 좋지 않은것같아." — `ProfileVisibilitySection`의 토글 3개를 클릭 즉시 `PATCH /auth/profile-visibility`를 날리던 방식에서, 로컬 `draft` 상태로만 바꾸고 "저장" 버튼을 눌러야 한 번에 반영되는 방식으로 변경. 여러 설정을 연달아 바꿔도 API 호출은 저장 시점에 한 번만 나감. "취소" 버튼은 `draft`를 `user`의 현재 값으로 되돌리고, 두 버튼 모두 `draft`가 `user`와 다를 때만 활성화됨.

`NicknameSection`의 "닉네임 공개" 토글은 그대로 즉시 반영 유지 — 단일 토글이라 배치할 대상이 없어 저장 버튼을 추가해도 API 호출 횟수가 줄지 않음(어차피 토글 1번 = 저장 1번).

- 실브라우저 검증: 토글 클릭 시 네트워크 요청이 전혀 안 나가는 것, 저장 클릭 시 PATCH가 정확히 1회만(변경된 필드 전부 포함) 나가는 것, 취소 시 원래 값으로 복원되고 API 호출이 없는 것 확인.
- `apps/web` lint/typecheck/test(95/95)/build 통과.

## 추가: 닉네임 공개 토글도 같은 섹션으로 통합 + 저장에 확인 다이얼로그 추가 (같은 날, 사용자 피드백)

사용자 피드백: "공개 프로필 설정부분만 아니라 닉네임 공개, 이후로 추가될 설정들까지 모두 설정 후 저장버튼 -> dialog -> 변경완료 순서로 가야할 것 같은데." 구조를 하나로 합칠지, 패턴만 통일할지 확인 결과 "하나로 합치기"로 확정.

- `NicknameSection`에 있던 "닉네임 공개" 토글(즉시 반영)을 제거하고, `ProfileVisibilitySection`을 `VisibilitySettingsSection`으로 이름을 바꿔 그 안에 흡수 — 이제 "공개 설정" 섹션 하나에 토글 4개(닉네임 공개 + 기존 3개)가 있고, 저장/취소도 하나. `NicknameSection`은 닉네임 텍스트/쿨타임만 남음.
- 저장 흐름에 확인 단계 추가: "저장" 클릭 → `ui/ActionConfirmDialog`("공개 설정을 저장할까요?") → 확인해야 실제 `PATCH /auth/profile-visibility` 발생. 섹션 자체의 "취소" 버튼은 다이얼로그 없이 바로 draft를 되돌림(취소는 확인할 결과가 없으므로).
- 앞으로 이 종류(가시성/공개 범위) 설정이 추가되면 전부 이 섹션에 들어가고, 자동으로 같은 편집→저장→확인→반영 흐름을 갖게 됨 — 사용자가 명시적으로 요청한 "이후로 추가될 설정들까지" 조건을 만족.
- 실브라우저 검증: 토글 4개가 한 섹션에 세로로 정렬되는 것, 저장 클릭 시 다이얼로그가 뜨는 것, 다이얼로그에서 확인해야 PATCH가 나가고(닉네임 공개 포함 전체 draft) 다이얼로그가 닫히는 것, 다이얼로그 취소와 섹션 취소 각각 API 호출 없이 되돌아가는 것 확인.
- `apps/web` lint/typecheck/test(95/95)/build 통과.
