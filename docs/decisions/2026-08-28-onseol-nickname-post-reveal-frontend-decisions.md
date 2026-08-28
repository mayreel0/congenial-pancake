# 온설 닉네임 게시물 노출 프론트엔드 결정 기록

## 배경

[[2026-08-28-onseol-nickname-post-reveal-decisions]]에서 백엔드(PR #93)만 구현되고 프론트엔드는 다음 라운드로 남겨뒀던 부분. "다음 진행할 사안은 뭐가 있을까요?" 질문에 사용자가 이 라운드를 선택.

## 발견: 닉네임 설정 화면이 프론트엔드에 아예 없었음

작업을 시작하기 전 코드를 확인해보니, PR #92(닉네임 저장 백엔드)가 나간 뒤에도 프론트엔드에는 닉네임을 설정하는 UI가 전혀 없었다 — `POST /auth/nickname`을 호출하는 곳이 curl 말고는 없었음. 그래서 "글쓰기 폼에 토글만 추가"하면 유저가 애초에 닉네임을 설정할 방법이 없어 토글이 무용지물이 되는 문제를 사용자에게 보고했고, "/me에 닉네임 설정 포함(추천)"으로 이번 라운드 범위를 확정.

## 산출물

- `packages/api`의 `CurrentUser` 타입에 `nickname`/`nicknameDiscriminator` 추가 — `/auth/me` 응답이 항상 포함하는데 프론트엔드 타입이 못 따라가고 있었음.
- `apps/web/app/lib/api.ts`에 `updateNickname()`, `apps/web/app/lib/auth/queries.ts`에 `useUpdateNicknameMutation()`, `useAuth()`에 `updateNickname()` 노출.
- `/me` 페이지에 `NicknameSection` 컴포넌트 추가 — 현재 닉네임 표시(없으면 "설정하기" 버튼), 인라인 편집 폼(1~20자, 공백만 불가 — 백엔드 검증 메시지 그대로 노출).
- `apps/web/app/lib/requests/api.ts`/`replies/api.ts`에 `AuthorDisplayDto` 타입 추가, `RequestDto`/`ReplyDto`/`FeedReplyDto`/`MyAnswerLogEntryDto`에 `author`(또는 `requestAuthor`/`replyAuthor`) 필드 추가. `createRequest`/`createReply`에 `anonymous?: boolean` 파라미터 추가.
- `apps/web/app/lib/author-label.ts`(신규): `authorDisplayLabel(author, fallbackLabel)` — `anonymous:false`면 `닉네임#discriminator`, 아니면 기존 익명 라벨(폴백) 그대로. `/read`(`authorSlot` 기반 라벨)와 `/answer`(세션 카운터 기반 "익명 N" 라벨)가 같은 헬퍼를 공유 — 두 곳 다 동일한 "실제 닉네임이 있으면 그걸 우선 표시" 규칙이라 중복 구현하지 않음.
- `RequestComposer`(오늘 글쓰기)/`AnswerComposer`(답장) 둘 다 익명/닉네임 토글 추가 — **닉네임이 설정된 로그인 사용자에게만 노출**, 그 외(게스트, 닉네임 미설정 회원)에게는 토글 자체가 안 보임(백엔드가 어차피 게스트의 `anonymous:false`를 무시하고, 닉네임 미설정 회원은 400을 받으므로 — 무의미한 옵션을 아예 안 보여주는 쪽을 택함).
- `/read`의 `ReadThread`, `/answer`의 `AnswerLog`(현재 답할 차례인 요청 + 과거 답변 로그의 요청 둘 다) 모두 `authorDisplayLabel`을 통해 실제 닉네임 우선 표시.

## 검증

- `apps/web`/`packages/api`/`packages/ui` lint/typecheck/test(67/67)/build 통과. `apps/admin`도 `CurrentUser` 타입 변경 영향 없음 확인(lint/test 통과).
- 실브라우저(Chrome) 실사용 검증: `/me`에서 닉네임 미설정 → "설정하기" → "민들레" 입력 → 저장 → `민들레#C376`로 정확히 표시 확인. `/today` 글쓰기 폼에 "닉네임(민들레)으로 남기기" 토글이 뜨는 것 확인, 체크 후 글 작성. `/answer` 답장 폼에도 동일 토글 노출 확인. `/read`에서 이전 curl 테스트로 만들어둔 "닉네임 공개 테스트 글"이 실제로 `민들레#479C`로 표시되고, 같은 스레드의 익명 답장은 여전히 `조용한 파도`(슬롯 기반 라벨)로 표시되는 걸 확인 — 한 스레드 안에 공개/익명이 섞이는 케이스가 정확히 렌더링됨.

## 남은 일

- 공개 프로필 페이지는 여전히 범위 밖.
- `/answer`에서 "닉네임 공개한 글에 실제로 답할 때" 라벨이 맞게 뜨는지는 코드 경로(동일한 `authorDisplayLabel` 헬퍼)로는 확인했지만, 별도 계정으로 직접 답하기까지는 이번 라운드에서 실측하지 않음 — 다음에 관련 버그 리포트가 오면 이 지점부터 확인.
