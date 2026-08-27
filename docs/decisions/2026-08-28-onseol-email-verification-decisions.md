# 온설 이메일 인증 결정 기록

## 배경

`#89`/`#90` 머지 후 다음 라운드를 물었고, 사용자가 "이메일 인증 추가"를 선택했다 — 지난 라운드에서 관리자 계정 비밀번호 부여를 다루며 나왔던 "회원가입 자체를 없애야 하나?"라는 고민에서, 실제 문제는 이메일 인증 없는 즉석 가입으로 게스트 답장 상한(5개)을 무한히 우회할 수 있다는 점이라는 걸 확인하고 정리한 라운드.

## 결정 1: 이메일 발송은 Resend를 기본으로, Naver Cloud Mailer를 fallback으로 — 전략 패턴으로 몇 개든 추가 가능하게

이 프로젝트엔 이메일 발송 인프라가 전혀 없었다. 사용자가 "Resend 쓰다가 사용량 다 차면 자동 전환되게" 요청했고, fallback 제공자로 어디를 쓸지 물으니 "Naver Cloud 메일러로 하는데 전략패턴을 통해 몇개든 추가할 수 있으면 안됨?"이라고 답했다.

기존 `OAuthProvider` 인터페이스 + `OAuthProviderRegistry` 패턴을 그대로 재사용 가능한 구조라 판단해 동일하게 구현: `EmailProvider` 인터페이스(`send(message)`), `ResendEmailProvider`/`NaverCloudMailerProvider`가 구현, `EmailService`가 순서가 있는 provider 배열을 유지하며 앞에서부터 시도하다 실패하면 다음으로 넘어간다. Quota 초과만 정밀하게 감지하는 대신 **모든 실패를 fallback 트리거로 취급** — provider마다 에러 형태가 달라 quota-exceeded만 구분해내는 게 신뢰할 수 없고, 이 규모에서는 "실패하면 다음 걸 시도"가 가장 안전한 기본값이라고 판단해 별도 확인 없이 이 방향으로 구현. 두 provider 모두 실제 자격증명 없이도 구조적으로 검증(curl로 실제 Resend/Naver Cloud API에 요청이 나가고 401이 정상적으로 돌아옴을 확인) — Kakao/Naver OAuth 때와 동일한 패턴("코드 먼저 완성, 자격증명은 나중").

Naver Cloud Mailer의 HMAC 서명 구현은 NCP API Gateway의 공통 서명 규약(`HMAC-SHA256("{method} {path}\n{timestamp}\n{accessKey}")`, base64)을 문서 기반으로 구현했다 — 실제 발급받은 자격증명으로 검증된 적은 없어서, 진짜 Naver Cloud 계정을 발급받으면 반드시 실사용 테스트가 필요하다.

## 결정 2: 미인증 계정 동작 — 로그인은 되지만 회원 답장 무제한 특권은 없음

"이메일 인증 전까지 계정이 어떻게 동작해야 하는지" 물었고, 사용자가 "로그인은 되지만 회원 특권 없음"을 선택했다(마찰을 최소화하는 선택 — 인증 전 로그인 자체를 막는 대안은 가입 직후 이탈 트레이드오프가 커서 기각).

구현: `users.emailVerifiedAt`(nullable) 추가. 회원가입 시 null로 시작, 인증 링크 클릭 시 채워짐. **OAuth 로그인은 즉시 인증됨** — provider가 이미 이메일 소유를 보증했으므로 별도 인증 절차가 불필요하다는 판단(신규 OAuth 계정 생성 시 즉시 스탬프, 기존 계정에 새 provider를 연결하는 경우도 그 시점에 미인증 상태였다면 함께 인증 처리). `RepliesService.create()`는 로그인 사용자가 미인증이면 게스트와 동일한 `settings.guestReplyLimit` 상한을 적용(전역 카운트, 요청당 아님 — 게스트 상한과 동일한 방식). 인증된 회원은 기존처럼 무제한.

## 결정 3 (구현 중 발견): DB 마이그레이션에 기존 OAuth 계정 백필 필요

`users.emailVerifiedAt` 컬럼을 추가만 하면 기존에 이미 존재하던 OAuth 연동 계정(실제 관리자 계정 포함)도 전부 NULL(미인증)이 되어 갑자기 답장 상한에 걸리게 된다. 마이그레이션에 데이터 백필 문(`UPDATE users SET email_verified_at = created_at WHERE id IN (SELECT DISTINCT user_id FROM oauth_identities)`)을 수동으로 추가해 해결 — 실제 DB에 적용 후 실제 관리자 계정(`kim015jh@gmail.com`)이 정상적으로 인증됨으로 표시되는 것을 psql로 확인했다.

## 검증

- `apps/api-server`: lint/typecheck/test(60/60, 신규 3개 포함)/build 통과. 마이그레이션 실제 적용 + 백필 결과 확인(OAuth 연동 계정은 verified=true, 순수 비밀번호 계정은 false).
- curl로 전체 플로우 실사용 검증:
  - 이메일 제공자 미설정 상태에서 회원가입 → 계정 생성은 정상 성공(둘 다 401로 실패하지만 예외를 삼키고 로그만 남김), `emailVerified: false` 확인.
  - 서버 로그에서 Resend(401 invalid API key) → Naver Cloud Mailer(401 인증 실패) 순서로 실제 시도되고 실패하는 것을 실시간 확인 — fallback 체인이 실제로 동작함을 증명.
  - 실제 DB 설정값(`guestReplyLimit=7`, 관리자가 이전 라운드에 변경해둔 값)을 기준으로 7개까지 답장 성공, 8번째에서 정확히 차단됨을 확인.
  - **검증 중 발견한 버그**: 차단 메시지가 실제 설정값과 무관하게 "5 times"로 하드코딩되어 있었음(신규 예외뿐 아니라 기존 `ReplyGuestLimitExceededException`도 동일 문제) — 두 예외 모두 `limit`을 생성자 인자로 받아 메시지에 반영하도록 수정, 실제로 "7 times"로 정확히 뜨는 것 재확인.
  - 토큰 수동 발급(psql) → `/auth/verify-email` 소비 → `emailVerified: true` 확인 → 이후 8번째 답장 정상 성공 확인(상한 해제) → 같은 토큰 재사용 시 400 확인 → 이미 인증된 계정에서 `/auth/resend-verification` 호출 시 조용히 204(재발송 안 함) 확인.
- `apps/admin`: "비회원 답장 총량 제한" 설정 라벨/힌트를 "비회원·미인증 회원 답장 총량 제한"으로 수정(실제 의미가 넓어졌으므로) — lint/typecheck/test 통과.

## 남은 일

- 프론트엔드는 이번 라운드 범위 밖(백엔드 우선 원칙) — `/verify-email?token=...` 소비 페이지, 가입 직후 "메일함을 확인하세요" 안내, `/me`에 미인증 배지/재발송 버튼 등은 다음 라운드.
- 사용자가 Resend/Naver Cloud Mailer 계정을 만들고 실제 자격증명(`RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`NAVER_CLOUD_MAILER_*`)을 발급받아야 실제 이메일이 나간다 — 계정 생성은 어시스턴트가 대행할 수 없는 영역. Naver Cloud Mailer는 특히 발신 주소를 콘솔에서 사전 인증해야 발송이 성공한다.
- 답글 상한을 "총량"이 아니라 "몰아쓰기 감지"(짧은 시간 창 기반)로 바꾸는 논의는 여전히 보류 — 이메일 인증이 근본 원인(계정 생성 비용 0)을 얼마나 해결하는지 지켜본 뒤 재논의하기로 함.
