# 온설 공개 프로필 페이지 결정 기록

## 배경

닉네임 공개 게시물 기능(PR #92/#93) 도입 당시 공개 프로필 페이지는 "닉네임만 먼저"로 범위 밖에 뒀던 항목. `/records` 탭 분리 라운드 직후, 백로그 정리 중 사용자가 "이제 만들 때가 된 것 같다"며 범위를 다시 열었고, 같은 시점에 `/records` 탭별 페이지네이션/인피니티 스크롤 작업과 병렬로 진행하기로 함(코덱스에게 페이지네이션 위임, 이쪽은 직접 진행).

## 결정: 설계 추천안 그대로 확정

옵션 없이 추천안 하나로 제시, 사용자 확인만 받고 진행:

- **라우트**: `/u/[닉네임]-[판별자]` (예: `/u/민들레-D59D`). 로그인 없이 누구나 조회 가능(`/read`와 동일 — 닉네임 공개의 목적 자체가 "로그인 안 해도 그 사람 글을 알아볼 수 있게"이므로 로그인 요구는 목적에 반함).
- **내용**: 그 계정이 **게시물별로 직접 공개를 선택한** 글(고민+답변)만 모아서 보여줌 — 비공개(익명) 글은 절대 노출 안 함. 새로운 정보를 만들어내는 게 아니라, 이미 각 게시물에서 공개하기로 선택한 것들을 한 곳에 모아 보여주는 것뿐.
- **진입점**: `/read`, `/answer`, `/records` 등 닉네임이 표시되는 모든 곳에서 닉네임을 누르면 이 페이지로 연결(프론트엔드 라운드에서 작업).

## 산출물 (백엔드)

- `src/profile/`을 새 모듈로 분리 — `UsersModule`에 직접 얹지 않은 이유: `UsersModule`은 이미 `RequestsModule`/`RepliesModule`에 의해 import되고 있어서, `UsersModule`이 그 둘을 다시 import하면 순환 참조가 생김. `ReportsModule`이 `RequestsModule`+`RepliesModule`을 조합하는 것과 같은 이유로 별도 모듈.
- `GET /users/:nickname/:discriminator` — `ProfileController`, 인증 가드 없음(공개).
- `UsersRepository.findByNickname()` + `UsersService.findByNicknameAndDiscriminator()`로 닉네임+판별자 조합을 계정 하나로 해석. 닉네임은 유니크하지 않으므로(같은 닉네임을 여러 명이 쓸 수 있음, 판별자로 구분) 닉네임으로 먼저 후보를 뽑고 판별자로 필터링. 판별자는 대소문자 구분 없이 매칭.
- `RequestsRepository.findPublicByAuthor()` / `RepliesRepository.findPublicByAuthor()` 신규 — `findMine()`("본인에게는 필터링 없이 그대로 보여줌")과 달리 **타인에게 보여주는 뷰**이므로 `anonymous: false`(공개 선택) + `hidden: false` + `deletedAt IS NULL`(신고/삭제로 숨겨지지 않음) 전부 적용. 답장은 원본 고민 자체도 visible해야 함(공개 선택한 답장이라도, 그 답장이 달린 고민이 숨겨졌다면 프로필을 통해 그 고민이 다시 노출되면 안 되므로).
- 닉네임을 바꾸거나 지운 뒤에는 예전 `/u/[닉네임]-[판별자]` 링크가 자연스럽게 404됨 — 별도 처리 없이 "그 닉네임을 현재 쥐고 있는 계정이 없으면 못 찾음"으로 충분하다고 판단(디스코드 태그 변경 시 옛 멘션이 깨지는 것과 동일한 동작).

## 검증

- `apps/api-server` lint/typecheck/test(83/83)/build 통과.
- 실서버 curl 검증: `curl http://localhost:8080/users/민들레/D59D` → 실제 계정의 공개 고민 1건 + 답장 2건(각각 원본 고민 본문 포함) 정상 반환. 존재하지 않는 닉네임 조회 시 404 확인.

## 남은 일

- 프론트엔드(`/u/[slug]` 페이지, 닉네임 표시 위치마다 링크 연결)는 별도 PR — 이 PR은 백엔드만.

## 추가: 프론트엔드 (PR #104)

`/u/[slug]` 라우트 + `/read`/`/answer`/`/records`의 모든 닉네임 표시 위치에 링크 연결. 실브라우저 검증 중 실제 버그 하나 발견: Next.js의 `useParams()`는 서버 컴포넌트의 `params` prop과 달리 URL 세그먼트를 디코딩하지 않고 그대로 줌 — 이걸 모르고 그대로 `encodeURIComponent`에 넘기면 이미 퍼센트 인코딩된 문자열을 다시 인코딩해서(`%EB...` → `%25EB...`) 백엔드 호출이 항상 404가 남. `parseProfileSlug`에서 매칭 전에 `decodeURIComponent`를 한 번 거치도록 수정하고 회귀 테스트 추가.
