# VPN 내부 모바일 개발 환경 (DEV-98)

공유기 L2TP/IPsec VPN 또는 테스트 LAN에서는 개발 PC의 **LAN IPv4**로,
Tailscale 연결 기기에서는 **개발 PC 자신의 Tailscale IPv4**로 접속한다.
기존 공인 호스트의 3000 포트 접속은 더 이상 사용하지 않는다.
사용자는 개발 API/DB와 운영 환경이 분리되어 있다고 확인했다.

## 네트워크 준비 — 사용자가 수행

1. 기존 WAN 3000 포트포워딩을 제거한다. 3002, 6006, 8080, 8081, DB 포트도 WAN으로
   포워딩하지 않는다. UPnP 자동 포워딩, DMZ, 공용 IPv6 인바운드 우회도 확인한다.
2. 사용할 경로를 구분한다. L2TP/IPsec은 PC LAN 주소로의 라우팅, Tailscale은 PC와 테스트
   기기의 같은 tailnet 연결 및 접근 정책을 확인한다. Tailscale 앱에서 **PC 항목의 주소**인지
   확인하며 휴대폰 자신의 주소나 접속에 실패한 목적지를 PC 주소라고 추정하지 않는다.
   같은 공유기 Wi-Fi 접속은 LAN 테스트이며 외부 VPN 검증으로 기록하지 않는다.
3. 개발 PC 방화벽에서 web 3000, admin 3002, Storybook 6006은 실제 VPN 클라이언트
   대역/테스트 기기에서만 허용한다. 공유기가 VPN 트래픽을 SNAT한다면 PC가 보는 출발지에
   맞춰 공유기 쪽 접근 제한도 적용한다. LAN 테스트 기기는 별도로 허용하고 Tailscale 접근은
   tailnet 정책과 PC 방화벽에서 제한한다. 사설 IP 바인딩이나 CORS만으로 접근이 제한되지는 않는다.
4. 로컬 Postgres는 루프백에만 listen하고, Docker를 쓴다면 포트 publish도
   `127.0.0.1:5432:5432`처럼 한정한다. 실제 DB 이름과 연결 대상이 개발 전용인지 확인한다.
   로컬 SSH 터널로 운영 DB를 연결해서는 안 된다.

VPN 비밀키, 계정 비밀번호, 토큰, 실제 내부 주소와 전체 DB URL을 기록하거나 커밋하지 않는다.
이 저장소의 설정은 공유기·방화벽 규칙을 변경하지 않는다.

## 실행

반드시 **DEV-98 워크트리**의 터미널에서 실행한다. DEV-97 또는 원본 저장소의 서버에는
이 프록시가 없을 수 있다. 먼저 `pwd`, `git branch --show-current`로 경로와 `agent/DEV-98`
브랜치를 확인하고 `tools/dev/vpn-next-config.cjs`가 있는지 확인한다. 브랜치를 변경하지 않는다.
3000/3002/6006/8080이 이미 사용 중이면 사용자 본인이 기존 서버의 터미널·실행 경로를 확인하고
필요한 프로세스를 종료한 뒤 시작한다. 다른 워크트리 서버를 자동 종료하거나 재사용하지 않는다.

API 개발 설정은 `apps/api-server/.env`를 사용한다. web/admin의 VPN 호스트 두 키는
각 앱의 `.env.development.local`에만 둔다. `.env.local`은 production build에도 로드되므로
VPN 호스트를 넣지 않는다. `.env.example`을 참고하되 운영 값을 복사하지 않는다.

### 기존 환경파일 정리

관리 세션의 최신 적용 보고(2026-10-21 19:17 UTC)에 따라 설정 준비는 완료된 것으로 기록한다.
API의 기존 자격증명·DB URL을 보존하고 호스트 두 개를 추가했으며 실제 `validateEnv` 실행으로
development 모드, loopback DB, 호스트 2개, `/api` 경로와 Origin 7개를 확인했다는 보고다.
web/admin은 `.env.development.local`에 호스트만 추가했고, 세 파일의 권한 600과 Git ignore
대상 여부도 확인했다. 이 Agent가 비밀파일을 직접 읽거나 재검증한 결과는 아니다.
설정 재적용이나 비밀값 제공을 요청하지 않는다. 아래 표는 향후 유지보수 참고용이다.

기존 파일을 `.env.example`로 통째로 덮어쓰지 않는다. 예시의 빈 자격증명 값은 기존 개발용
값을 삭제하라는 뜻이 아니다. 비밀값 중복 백업을 만들거나 대화·로그·커밋에 노출하지 않는다.

| 대상 | 정리할 값 |
| --- | --- |
| API `.env` | `NODE_ENV=development`, `PORT=8080` |
| API `.env` | `DATABASE_URL`은 기존 개발 계정·DB명을 유지하되 실제 로컬 Postgres인지 확인. 운영 터널 금지 |
| API `.env` | 기본 `CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:8081` |
| API `.env` | 기본 `API_PUBLIC_URL=http://localhost:8080`, `WEB_PUBLIC_URL=http://localhost:3000` |
| web/admin 기존 API 설정 | 기본 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`. VPN 모드에서는 config가 `/api`로 덮어씀 |
| web/admin `.env.development.local` | 동일한 `DEV_VPN_HOST`와 선택적 `DEV_VPN_ADDITIONAL_HOSTS`만 설정 |
| API `.env` | web/admin과 같은 두 호스트 설정 |

개발 실행에서 Next.js는 `.env.development.local`을 `.env.local`보다 우선하며, 이미 설정된
셸 환경변수는 파일보다 우선한다. production build에서는 `.env.development.local`을 읽지 않는다.
API는 `apps/api-server/.env`에 설정한다.
`DEV_VPN_HOST`를 파일로 관리한다면 사용하지 않을 때는 키를 제거한다. 빈 문자열로
남기면 API IPv4 검증에서 거부된다. 추가 호스트만 설정하는 것도 허용하지 않는다.
Google 키는 현재 API 스키마에서 필수이므로 기존 **개발용** 값을 보존하며 임의의 가짜 값으로
기동 성공을 만들지 않는다. 기타 개발 인증·메일·관리자 설정도 필요한 기존 값을 보존한다.

### 서버 시작

호스트 파일 설정은 이미 적용되었으므로 API/web/admin에서 다시 export할 필요는 없다.
아래 셸 설정은 임시 호스트 override가 필요하거나 frontend CLI 바인딩 값을 지정할 때의 예다.
Storybook은 Next.js 서버가 아니므로 이 환경파일의 자동 로드를 전제로 하지 않는다.
아래 CLI 명령에서 `$DEV_VPN_HOST`를 사용하려면 해당 터미널에 값을 설정해야 한다.
`<PC_PRIMARY_IPV4>`는 PC의 LAN 또는 Tailscale 주소, `<PC_OTHER_IPV4>`는 추가 접속 주소로
대체한다(예시 문자열 그대로 실행하지 않는다). 모든 API/web/admin 터미널에서 같은 값을 사용한다.

```sh
export DEV_VPN_HOST='<PC_PRIMARY_IPV4>'
export DEV_VPN_ADDITIONAL_HOSTS='<PC_OTHER_IPV4>'
export NODE_ENV=development
```

단일 주소만 쓰면 `unset DEV_VPN_ADDITIONAL_HOSTS`로 추가 목록을 비운다. 여러 추가 주소는
쉼표로 구분한다. RFC1918과 Tailscale이 사용하는 `100.64.0.0/10` 범위의 IPv4만 지원한다.
범위 전체를 허용하는 것이 아니라 **나열한 주소만** Next 개발 Origin과 API CORS/CSRF에 추가한다.
이 주소 검증은 PC 소유권이나 실제 Tailscale 연결을 증명하지 않는다.

아래는 기본적으로 단일 주소에 바인딩한다. LAN과 Tailscale에서 **동시에** 접속하려면
위 방화벽·tailnet 접근 제한을 먼저 적용한 뒤, 세 frontend 명령의 `--hostname`/`--host` 값을
`0.0.0.0`으로 바꾼다. 이는 모든 로컬 IPv4 인터페이스에서 수신하므로 공용 인터페이스까지
포함할 수 있다. WAN 포워딩 제거와 방화벽 제한 없이 사용하지 않는다. `0.0.0.0`은 바인딩
값일 뿐이며 `DEV_VPN_HOST`나 접속 URL에 넣지 않는다. API는 계속 루프백에만 바인딩한다.

API 터미널:

```sh
pnpm --filter api-server start:dev
```

web 터미널:

```sh
pnpm --filter web dev --port 3000 --hostname "$DEV_VPN_HOST"
```

admin 터미널:

```sh
pnpm --filter admin dev --hostname "$DEV_VPN_HOST"
```

Storybook 터미널:

```sh
pnpm --filter storybook-app storybook --host "$DEV_VPN_HOST" --no-open
```

VPN 연결 기기와 개발 PC의 브라우저 모두 다음 주소를 사용한다:

| 서비스 | 주소 | API 경로 |
| --- | --- | --- |
| web | `http://<PC_REACHABLE_IPV4>:3000` | 같은 Origin의 `/api/*` |
| admin | `http://<PC_REACHABLE_IPV4>:3002` | 같은 Origin의 `/api/*` |
| Storybook | `http://<PC_REACHABLE_IPV4>:6006` | 컴포넌트 표시, 자체 API 없음 |

`<PC_REACHABLE_IPV4>`는 해당 기기에서 도달 가능한 설정 목록의 주소다.
LAN 아이폰은 LAN 주소, 모바일 데이터의 Tailscale 갤럭시는 PC의 Tailscale 주소를 사용한다.

web/admin에서 `DEV_VPN_HOST`가 설정되면 Next config가 `NEXT_PUBLIC_API_BASE_URL=/api`를
주입한다. 기존 `.env.local`의 localhost/운영 API 값보다 우선한다. 두 서버는 고정 upstream
`http://127.0.0.1:8080`으로 요청을 프록시하며 임의 원격 upstream 설정은 제공하지 않는다.
admin은 이 개발 모드에서만 정적 export 설정을 해제한다. 운영 빌드 설정은 유지한다.

API에도 같은 `DEV_VPN_HOST` 및 `DEV_VPN_ADDITIONAL_HOSTS`가 필요하다. 기본 호스트가 있으면:

- `NODE_ENV=development`, `PORT=8080`, 루프백 `DATABASE_URL`을 요구한다.
- API와 선택적으로 실행하는 Swagger 서버는 `127.0.0.1`에만 바인딩한다.
- 기존 CORS/CSRF 허용 목록에 나열한 각 IP의 3000/3002 Origin을 추가한다.
- `API_PUBLIC_URL`은 `http://<PC_PRIMARY_IPV4>:3000/api`,
  `WEB_PUBLIC_URL`은 `http://<PC_PRIMARY_IPV4>:3000`으로 설정한다.

환경변수를 바꾸면 관련 서버를 재시작한다. 파일로 관리하는 frontend 호스트는
`.env.development.local`에 한정하고, 임시 셸 override는 사용 후 해제한다.
production/build 셸에 호스트가 남아 있으면 오류로 중단한다.

주소는 소스에 하드코딩하지 않는다. LAN 주소는 공유기의 DHCP 예약으로 관리할 수 있다.
Tailscale 주소는 실제 PC 등록 정보를 기준으로 확인하며 기기 재등록 등으로 바뀌면 두 환경변수를
갱신하고 API/web/admin/Storybook을 재시작한다. 방화벽·tailnet 정책과 OAuth 등록도 함께 확인한다.

## 쿠키와 기능 범위

프록시는 기존 HttpOnly 세션/guest 쿠키를 브라우저의 내부 IP 호스트에 전달한다.
SameSite=Lax는 유지하며 개발 HTTP에서만 Secure=false다. 운영 Secure=true 설정은 변경하지 않는다.
web/admin은 **같은 내부 IP**로 접속해야 쿠키를 공유한다. 쿠키는 포트별로 분리되지 않아
한 앱에서 로그아웃하면 다른 앱의 같은 세션도 종료된다. localhost와 내부 IP의 세션은 별개다.
LAN IP와 Tailscale IP 사이에도 쿠키는 공유되지 않는다. 각 주소에서 따로 로그인하고,
주소를 전환한 뒤 로그인 화면이 나오는 것을 세션 유지 실패와 혼동하지 않는다.

먼저 개발 이메일/비밀번호 계정으로 로그인하고, admin에는 개발 `ADMIN_USER_IDS`에 등록된
계정을 사용한다. 기존 서버의 인증·관리자 권한 검사와 CSRF 검사는 그대로 적용된다.
프록시는 일반 요청, OAuth 이동, SSE가 사용하는 공통 API base에 적용된다.
API는 개발 프록시의 루프백 주소를 보므로 기기들이 IP rate limit을 공유할 수 있다.
429가 나면 응답의 제한 시간을 확인하며 보안 우회 토큰을 설정하지 않는다.

OAuth를 검증하려면 제공자 콘솔에 개발 callback
`http://<PC_PRIMARY_IPV4>:3000/api/auth/<provider>/callback`이 허용되어 있어야 한다.
OAuth는 반드시 기본 호스트(`DEV_VPN_HOST`)에서 시작한다. 추가 호스트에서 시작하면
기본 호스트로 돌아올 때 OAuth state 쿠키를 공유하지 못한다. 서버는 요청 Host로 callback을
임의 변경하지 않는다. 양쪽 주소의 일반 이메일 로그인을 먼저 확인한다.
제공자가 사설 IP/HTTP callback을 허용하지 않으면 이 VPN HTTP 구성으로 OAuth를 완료할 수 없다.
운영 callback으로 우회하지 말고 해당 제공자와 제약을 기록한다.
VPN은 브라우저의 secure context를 만들지 않으므로 HTTP 내부 IP에서는 PWA/service worker/web push
등 HTTPS 필수 기능을 검증할 수 없다. 일반 로그인·조회·쓰기와 구분한다.

Swagger는 모바일 검증의 필수 조건이 아니며 기본적으로 실행하지 않는다. 필요하면 개발 PC에서
`pnpm --filter api-server start:swagger:watch`를 실행해 `http://localhost:8081`로 확인한다.
이 모드에서는 루프백 전용이므로 모바일 직접 접근이나 WAN 공개를 하지 않는다.

## 확인 기록

2026-10-12 제공된 댓글: 갤럭시는 모바일 데이터+Tailscale, 아이폰은 공유기 Wi-Fi LAN에서
백엔드 결과가 표시되지 않았다고 보고했다. 함께 제공된 읽기 전용 점검에서는 web/API가
DEV-97 워크트리에서 실행 중이었고 그 web에는 DEV-98 프록시가 없었다. 모바일의 요청 URL과
HTTP 상태는 미확인이다. 따라서 이 보고를 DEV-98 구현이나 VPN의 검증 실패로 확정하지 않는다.
기존 DEV-98의 RFC1918 전용 주소 검사는 Tailscale IPv4를 거부했으며, 이번 변경으로
명시적인 Tailscale 주소와 LAN 추가 주소를 함께 설정할 수 있도록 보완했다.

2026-10-12 작업에서는 서버, 테스트, 브라우저, 실기기 또는 공유기를 실행·조작하지 않았다.
2026-10-22 재개 시 프록시 설정 테스트 5개가 통과했다. API 테스트와 기기 조회는 아래처럼
실행 단계에서 차단됐다. 이는 프로젝트 테스트 실패나 기기 연결 불가를 확인한 결과가 아니다.

| 명령 | 2026-10-22 결과 |
| --- | --- |
| `node --test tools/dev/vpn-next-config.test.cjs` | 5 passed, 0 failed, exit 0 |
| `pnpm --filter api-server test --runInBand src/config/env.schema.spec.ts` | exit 126, `<agent-runtime>/bin/fallback/pnpm: Operation not permitted` |
| `adb devices -l` | exit 127, `zsh:1: operation not permitted: adb` |

이 Agent는 실제 환경파일을 열거나 변경하지 않았다. 이후 관리 세션이 설정 적용과
`validateEnv` 성공을 보고했으므로 환경파일 준비 차단은 해소되었다. 이 보고는 DB 연결·서버·빌드·
실기기 기능 검증 통과를 뜻하지 않는다. Gate 1에서 로컬 테스트·빌드를
별도로 수행할 수 있지만, 이것이 모바일 실기기 결과를 대신하지는 않는다.

### 관리 세션 실기기 결과 — 2026-10-22 KST

출처는 이슈에 제공된 2026-10-21 20:10 UTC 관리 세션 보고다. 관리 세션이 사용자 승인을 받은
Galaxy Z Flip7(Android 16)의 실제 Chrome 화면/CDP, 개발 서버와 로컬 개발 DB로 확인했다.
아래는 해당 보고를 반영한 것이며 이 worker가 직접 기기를 조작한 결과는 아니다.

| 수용 기준 관련 항목 | 확인된 결과 |
| --- | --- |
| LAN web 로그인·세션·쓰기 | 실제 이메일 로그인 → `/today` → 새로고침 후 세션 200. UI로 작성한 임시 글 1건의 개발 DB 저장 확인 |
| Tailscale web 연동 | VPN tun 인터페이스 경유 확인. health/public stats 200, 실제 로그인·새로고침 후 세션 유지, UI 작성글 1건의 개발 DB 저장 확인 |
| admin·공유 세션 | 승인된 임시 QA 관리자 권한으로 실제 관리 화면과 `/admin/settings` 200. web/admin 공유 세션 및 실제 로그아웃 버튼 사용 후 양쪽 `/auth/me` 401 |
| Storybook | LAN·Tailscale 각각 실기기 preview 컴포넌트 표시, 표시되는 preview 오류 없음 |
| API 직접 노출 제한 | `127.0.0.1:8080` 바인딩. 휴대폰에서 LAN/VPN 주소의 8080 직접 접속 모두 거부 |
| 데스크톱 기본 흐름 | VPN frontend 설정을 끈 localhost 실행에서 web/admin 페이지·API health·로그인·세션 200, 정확한 localhost CORS Origin, 로그아웃 204 및 이후 세션 401 |
| 종료·원복 | 임시 관리자 런타임 종료 후 동일 QA 계정의 `/admin/settings` 403. 영구 관리자 설정 유지. QA 계정 1개·글 2개·잔여 세션 1개를 개발 DB에서만 제거하고 임시 자격정보 파일·서버·ADB 포워드 정리 |

LAN과 Tailscale frontend는 각각 해당 주소에만 바인딩해 검증했다. `0.0.0.0` 바인딩이나
공유기·방화벽 변경은 수행하지 않았다. 기존 사용자 계정·데이터·운영 환경도 변경하지 않았다.
WAN 3000 포워딩 제거는 **사용자가 직접 완료를 확인한 사항**이며 관리 세션의 공유기 조작
결과가 아니다. 비밀값, 실제 주소, 기기 식별자 및 QA 자격증명은 이 문서에 기록하지 않는다.

이 보고로 이전의 설정 재적용·실기기 결과 제출 차단은 해소되었다. 확인된 핵심 로그인·세션·
데이터 조회/쓰기·관리 화면·Storybook·API 직접 접근 제한·종료 결과를 근거로 구현을 완료한다.
후속 Gate 1·독립 리뷰·PR/Human Review는 별도 절차이며 이 worker가 실행하거나 통과를 선언하지 않는다.

### 검증 범위의 한계

- Tailscale은 **Wi-Fi 연결 상태의 VPN 경유**다. 셀룰러 데이터만의 시험이나 VPN을 끈
  공용 인터넷 전체 노출 검사는 수행하지 않았다. WAN 포워딩 제거 확인과 구분한다.
- iPhone, 외부 OAuth callback, HTTP에서 지원되지 않는 PWA/web push 등 secure-context 기능은 미검증이다.
- 데스크톱은 HTTP/API 회귀 확인이며 시각적 UI 조작 시험은 별도로 수행하지 않았다.
- 방화벽 전체 정책 감사, Swagger/DB 포트의 휴대폰 직접 접근 시험은 보고되지 않았다.
- 답변 작성, admin의 모든 변경 작업, 비회원 쿠키와 SSE 복구까지 통과했다고 확대하지 않는다.

위 항목은 확인한 핵심 개발 연동 흐름의 범위를 명확히 하는 기록이다. 새로운 실패가 확인된
것이 아니며, 승인된 구현 완료를 막는 새 조건이나 별도 Backlog 작업으로 만들지 않는다.

문제 발생 시 기기/OS/브라우저, 실패 흐름, 응답 상태와 오류 코드만 기록하고
쿠키·토큰·실제 데이터는 제외한다. 403 `CSRF_ORIGIN_REJECTED`는 API에도 동일한
호스트 목록을 설정했는지, 502/연결 실패는 DEV-98 API가 루프백 8080에서 실행 중인지 확인한다.
404 `/api/auth/me`라면 실행 중인 web/admin의 워크트리와 개발 환경변수 적용을 먼저 확인한다.
주소가 다른 기기의 것인지, 바인딩이 한 인터페이스에만 되어 있는지도 구분한다.
로그인하지 않은 `/api/auth/me`의 401은 API에 도달했다는 진단 신호이며 로그인 성공의 증거는 아니다.

설정 회귀 테스트 명령(실행 결과는 위 표 참조):

```sh
node --test tools/dev/vpn-next-config.test.cjs
pnpm --filter api-server test --runInBand src/config/env.schema.spec.ts
```

## 종료 및 기존 데스크톱 개발로 복귀

1. 테스트 계정을 로그아웃하고 각 서버 터미널에서 Ctrl+C로 종료한다(Swagger를 켰다면 함께 종료).
2. 각 셸에서 `unset DEV_VPN_HOST DEV_VPN_ADDITIONAL_HOSTS`를 실행한다.
   `.env*`에 저장했다면 그 값도 제거한다.
3. VPN 연결을 종료하고 임시 방화벽 허용 규칙과 임시 VPN 계정을 정리한다.
   제거한 WAN 포워딩은 복원하지 않는다.
4. 기존 `pnpm --filter api-server start:dev`, `pnpm --filter web dev`,
   `pnpm --filter admin dev`로 localhost 개발을 재개한다.
   일반 실행은 각 앱의 기존 `NEXT_PUBLIC_API_BASE_URL`과 CORS 설정을 그대로 사용한다.
5. 3000/3002/6006(선택적으로 8081)에 테스트 프로세스가 남지 않았고,
   Wi-Fi를 끈 모바일 데이터 기기에서 VPN 해제 시 개발 서비스에 접속할 수 없는지 확인한다.
