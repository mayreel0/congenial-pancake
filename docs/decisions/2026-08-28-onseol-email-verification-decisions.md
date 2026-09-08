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

## 추가 확인 (후속): 실제 Resend 계정으로 발송 시도 — 도메인 미인증 상태에선 계정 소유자 본인에게도 발송 불가

사용자가 실제 Resend API 키를 `.env`에 넣은 뒤(`RESEND_FROM_EMAIL=onboarding@resend.dev`), 실제 관리자 계정(`kim015jh@gmail.com`)을 대상으로 `/auth/resend-verification`을 실제로 호출해 검증했다. Resend가 `403 "The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"`로 명확히 거부 — Resend 대시보드에서 그 이메일이 정확히 계정 등록 이메일임을 재확인했으므로, "계정 소유자 본인에게는 도메인 인증 없이도 발송 가능"이라는 기존 가정이 틀렸다는 뜻이다. 현재 Resend 정책은 도메인 인증 없이는 **누구에게도**(계정 소유자 포함) 발송이 안 되는 것으로 보인다.

이 과정에서 별도 버그도 발견: `/auth/resend-verification`이 전송 실패 시 원인 없는 500을 그대로 흘려보내고 있었음(회원가입은 의도적으로 실패를 삼키지만, 사용자가 직접 요청한 재발송은 실패 원인을 알려줘야 함) — `EmailSendFailedException`(502, `AUTH_EMAIL_SEND_FAILED`)을 추가해 수정, 실제로 502가 정확히 뜨는 것 재확인.

**결론**: 코드/구현은 문제 없음(실제 Resend API에 정확한 형식으로 요청이 나가고, 정확히 응답을 처리함) — 다만 실제 이메일 발송 자체는 도메인을 소유하고 Resend에서 DNS로 인증하기 전까지는 테스트 불가능하다. 온설은 아직 배포 도메인이 없어(이전 라운드부터 반복적으로 보류된 결정) 지금 당장은 이 부분을 더 진행할 수 없음 — 사용자가 도메인을 마련하면 그때 재검증하기로 함.

## 남은 일

- 프론트엔드는 이번 라운드 범위 밖(백엔드 우선 원칙) — `/verify-email?token=...` 소비 페이지, 가입 직후 "메일함을 확인하세요" 안내, `/me`에 미인증 배지/재발송 버튼 등은 다음 라운드.
- 사용자가 Resend/Naver Cloud Mailer 계정을 만들고 실제 자격증명(`RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`NAVER_CLOUD_MAILER_*`)을 발급받아야 실제 이메일이 나간다 — 계정 생성은 어시스턴트가 대행할 수 없는 영역. Naver Cloud Mailer는 특히 발신 주소를 콘솔에서 사전 인증해야 발송이 성공한다.
- 답글 상한을 "총량"이 아니라 "몰아쓰기 감지"(짧은 시간 창 기반)로 바꾸는 논의는 여전히 보류 — 이메일 인증이 근본 원인(계정 생성 비용 0)을 얼마나 해결하는지 지켜본 뒤 재논의하기로 함.

## 추가 (2026-09-07): fallback을 Naver Cloud Mailer → SES로 교체

PR #91을 머지 전 rebase하던 중, 사용자가 실제로 NCP 메일러 이용 신청을 시도하다가 **사업자 등록이 없으면 API 이용 신청 자체가 막힌다**는 걸 확인 — 개인/비사업자 계정으로는 애초에 설정할 수 없는 provider였다는 뜻이라 대체가 불가피했다.

대안으로 Amazon SES, Mailgun, "Resend 단일 운영(무료 한도 안에서는 fallback 자체가 불필요)", "Mailgun+SES 병행(무료 한도 소진 시 로테이션)"을 놓고 추천과 함께 확인 요청. 결정: **Resend + SES(추천안)**. 근거:
- SES는 Lambda 발신이 아닌 이상 사실상 첫 통부터 유료(1,000통당 $0.10)지만, 그만큼 매우 저렴 — Mailgun은 예전과 달리 지금은 영구 무료 플랜이 아니라 기간제 체험판이라 "무료 한도 로테이션"의 전제 자체가 불안정.
- 이 프로젝트는 아직 실사용자가 없는 단계라 Resend 무료 한도(월 3,000통)를 채울 일이 당분간 없음 — 3벤더 로테이션은 아직 존재하지 않는 스케일 문제를 미리 푸는 과도한 설계.
- SES는 이미 있는 AWS 계정/EC2 인스턴스 프로파일(`infra/terraform/ec2.tf`)에 `ses:SendEmail`/`ses:SendRawEmail` 권한만 추가하면 되어 새 벤더 관계·새 자격증명 관리가 필요 없음 — `NAVER_CLOUD_MAILER_ACCESS_KEY`/`SECRET_KEY`류 env var가 통째로 사라지고 `AWS_REGION`/`SES_FROM_EMAIL`만 남음.

구현: `NaverCloudMailerProvider` 삭제, `SesEmailProvider`(`@aws-sdk/client-ses`) 신설 — AWS SDK 기본 자격증명 체인을 그대로 사용(로컬은 `~/.aws` 프로필/env var, 프로덕션은 EC2 인스턴스 role). `EmailService`의 provider 배열은 `[resend, ses]`로 교체. 이 fallback은 여전히 quota 로테이션이 아니라 "Resend 자체 장애 시" 대비 목적 — 결정 1의 원래 취지(모든 실패를 fallback 트리거로 취급)는 그대로 유지.

프로덕션 배포용 `terraform.tfvars`/SSM 시크릿/`user-data.sh.tftpl`에 `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`SES_FROM_EMAIL` 실제 값을 배선하는 작업은 여전히 보류 — 이미 합의된 대로 프론트엔드 라운드와 함께 한 번에 처리(SES는 인스턴스 role 기반이라 이 중 SSM 시크릿 관리 대상이 아님, IAM 권한 자체는 이번에 미리 부여해둠).

## 추가 (2026-09-08): 프로덕션 도메인 인증 + 실제 배선 완료, 배포 파이프라인의 시크릿 반영 공백 발견

도메인(`onseol.com`)이 이번에 실제로 살아있는 상태(AWS Phase 1 배포 완료, 2026-09-01 결정 기록 참고)라 보류돼 있던 도메인 인증을 진행했다.

**DNS/도메인 인증**: Resend 대시보드에서 안내한 DKIM(TXT)/SPF(`send`/`rsend` CNAME)/DMARC 레코드와, SES 자체 도메인 아이덴티티의 DKIM CNAME 3개를 각각 `infra/terraform/email-dns.tf`, `infra/terraform/ses.tf`로 추가해 Route53에 반영(PR #147). 실제 검증:
- Resend: `dig`로 레코드 전파 확인 후 실제 발송 테스트(`test@onseol.com` → `delivered@resend.dev`) 성공.
- SES: `aws sesv2 get-email-identity`로 `VerificationStatus: SUCCESS`, `DkimAttributes.Status: SUCCESS` 확인.

`ses.tf`에서 `for_each = toset(...tokens)` 형태로 DKIM 레코드 3개를 만들려던 첫 시도는 "Invalid for_each argument"로 실패 — 토큰 값 자체가 apply 이후에만 알려지는데 `for_each`의 키는 plan 시점에 알려져야 해서다. 인덱스로 고정된 리소스 3개(`ses_dkim_0`/`_1`/`_2`)로 바꿔 해결.

**SSM 배선**: `ssm.tf`의 `app_secret_names`에 `resend_api_key`/`resend_from_email`/`ses_from_email` 3개를 추가, `user-data.sh.tftpl`이 부팅 시 이 값들을 읽어 컨테이너 env로 주입하도록 배선. 실값 설정 순서를 한 번 실수함 — Terraform이 아직 만들지 않은 파라미터 이름으로 먼저 `put-parameter`를 실행해버려서(이 프로젝트의 기존 관례는 항상 "Terraform이 `CHANGE_ME` 플레이스홀더를 먼저 만들고, 그 다음에 실값을 덮어쓴다"인데 순서를 반대로 함) `terraform apply`가 이미 존재하는 파라미터를 새로 만들려다 실패할 뻔했다 — apply 전에 두 파라미터를 지워서 바로잡음.

**배포 파이프라인의 공백 발견**: 실값을 다 넣고 `RESEND_API_KEY`까지 등록한 뒤 실제 회원가입으로 검증하니 `AUTH_EMAIL_SEND_FAILED`(502)가 남. 원인은 `/etc/onseol-api.env`가 EC2 인스턴스 **부팅 시점에 딱 한 번만** SSM에서 값을 읽어 만들어지고, `deploy-api.yml`의 재배포(컨테이너 재시작)는 그 파일을 그대로 재사용한다는 점 — SSM 파라미터를 바꿔도 실행 중인 컨테이너에는 반영되지 않았다(`docker logs`로 `RESEND_API_KEY=CHANGE_ME`였던 것을 직접 확인). 이번엔 인스턴스가 이미 `terraform apply`로 교체돼 있었는데도 그 교체 시점이 실값 설정보다 빨라서 같은 문제가 발생했다.

수정: `deploy-api.yml`의 재배포 스텝이 컨테이너를 재시작하기 전에 `app_secret_names`의 10개 파라미터를 SSM에서 다시 읽어 env 파일의 해당 줄만 덮어쓰도록 변경(`DATABASE_URL`/`CORS_ORIGIN` 등 정적 값은 그대로 둠 — 이들은 인스턴스 교체가 있어야만 바뀌므로). 이제부터는 시크릿을 회전할 때 GitHub Actions의 수동 "Run workflow"만으로 반영 가능.

**남은 일**: 이 수정을 적용한 뒤 실제 이메일 발송이 끝까지 성공하는지(회원가입 → 실제 수신함 도달) 아직 재검증 전.
