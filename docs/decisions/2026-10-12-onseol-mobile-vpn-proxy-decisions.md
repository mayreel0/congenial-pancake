# 모바일 VPN 개발 프록시 (DEV-98)

## 배경

모바일 브라우저의 localhost는 개발 PC를 가리키지 않는다. 기존 클라이언트는 기본적으로
localhost API를 호출하고 Next.js에는 API 프록시가 없었다. 실제 장애 재현은 미수행이다.
2026-10-11 사용자 댓글이 이전 조사 기록의 연결 방식·접근 제한·DB 분리 미결정을 해결했다.

## 결정과 근거

- 사용자는 개발 전용 동일 Origin API 프록시를 승인했다. web/admin의 `/api/*`를 개발 PC의
  루프백 8080 API로 연결한다. 별도 API 포트 공개와 교차 Origin 세션 문제를 피하기 위함이다.
- 공유기 L2TP/IPsec VPN을 이용하며 기존 WAN 3000 포워딩을 제거한다. web 3000,
  admin 3002, Storybook 6006만 VPN 테스트 기기가 PC 내부 IP로 접근한다.
  PC의 인터페이스 바인딩만으로는 VPN 접근 제한을 보장할 수 없어 방화벽 규칙도 필요하다.
- 개발 API/DB는 운영과 분리되어 있다는 사용자 확인을 받았다. 운영 API/DB로 우회하지 않는다.
  개발 모드는 명시한 LAN/Tailscale IPv4와 루프백 DB만 허용하고 운영에서 켜지면 시작을 거부한다.
- 기존 SameSite=Lax, 운영 Secure=true, CSRF Origin 검사와 관리자 권한 검사를 유지한다.
  admin의 정적 export는 VPN 개발 서버에서만 해제하고 기존 배포 방식은 유지한다.

### 후속 실기기 보고에 따른 주소 설정 보완

2026-10-12 추가 문맥은 갤럭시의 Tailscale 접근과 아이폰의 LAN 접근을 구분해 함께 지원하도록
실행 환경 점검·보완을 요청했다. 기존 RFC1918 전용 검사를 유지하면 Tailscale 목적지를 설정할
수 없으므로, `100.64.0.0/10` 주소도 설정값으로 허용한다. 주소 대역 전체를 Origin 허용 목록에
넣지는 않는다. `DEV_VPN_HOST`와 선택적 쉼표 목록 `DEV_VPN_ADDITIONAL_HOSTS`에 지정한
호스트만 web/admin 개발 Origin 및 API CORS/CSRF에 반영한다.

기존 단일 호스트 설정은 호환된다. 두 인터페이스 동시 접근은 사용자 측 방화벽·tailnet 제한
적용 후 frontend를 IPv4 전체 인터페이스에 바인딩하는 실행 방법으로 안내한다. 기본 실행
명령은 단일 주소 바인딩을 유지하며 코드가 서버나 네트워크 접근 정책을 자동 변경하지 않는다.
API/Swagger 루프백, 고정 API upstream, 운영 모드 거부 조건은 유지한다.

쿠키는 LAN 주소와 Tailscale 주소 간 공유되지 않으며 각각 로그인한다. OAuth callback은
기본 호스트 하나로 고정하고 그 주소에서 시작하도록 안내한다. 요청 Host에 따라 callback을
바꾸거나 CSRF Origin을 덮어쓰지 않는다. 주소 변경은 소스 수정 대신 환경변수 갱신으로 처리한다.

## 산출물

- `tools/dev/vpn-next-config.cjs`: web/admin 공유 개발 설정. `DEV_VPN_HOST`로 활성화,
  브라우저 API base 강제 `/api`, 고정 루프백 upstream, 정확한 개발 호스트 허용.
- API 환경 검증과 main/Swagger 진입점: 개발 모드 검사, Origin 추가, callback URL 설정,
  루프백 바인딩. Swagger는 선택적인 PC 로컬 확인만 안내한다.
- 각 앱 환경 예시, 설정 회귀 테스트, `docs/development-vpn.md` 실행·종료 안내.
- LAN/Tailscale 허용 주소 목록, 대역 경계·잘못된 추가 주소·기본 호스트 누락 회귀 테스트.
- DEV-98 워크트리 및 기존 포트 점유 확인, 동시 바인딩 조건, 주소 변경·별도 세션 안내.

## 검증

최초 구현에서는 코드와 기존 설정을 읽고 구현했다. 당시 사용자 지시에 따라 외부 연동, 리뷰어, 검증 게이트,
서버 실행 및 실기기 검증을 수행하지 않았다. 회귀 테스트는 작성만 했으며 통과를 주장하지 않는다.
워크트리에 Next.js 로컬 배포 문서가 없어 해당 버전의 설치 문서 확인도 수행하지 못했다.
사용자의 DB 분리 확인은 실제 접속 검증과 구분한다.
후속 댓글의 모바일 실패 보고는 DEV-97 서버에 대한 접속이었다는 제공된 진단과 함께 기록한다.
그 당시 실제 요청 URL/HTTP 상태와 PC의 Tailscale 주소 소유 여부는 미확인이었다.
DEV-97 접속 보고만으로 DEV-98 구현의 런타임 성공·실패를 판단하지 않았다.

2026-10-22 재개에서 `node --test tools/dev/vpn-next-config.test.cjs` 5개가 통과했다.
pnpm/adb는 실행 제한으로 차단되었으며 정확한 명령과 오류는 `docs/development-vpn.md`에 있다.
이후 제공된 관리 세션 보고는 API `.env` 설정 적용 및 `validateEnv` 성공(development,
loopback DB, 호스트 2개, `/api`, Origin 7개)을 확인했다. web/admin의 호스트 설정은
`.env.development.local`에 적용해 production build에서 읽히지 않도록 했다.
기존 자격증명 보존, 파일 권한 600, Git ignore 확인은 관리 세션 보고이며 Agent가
비밀파일을 직접 읽은 결과가 아니다. 설정 재적용 요구는 해소되었다.

추가 관리 세션 보고(2026-10-22 KST)는 승인된 Android 실기기에서 LAN/Tailscale web 로그인,
새로고침 후 세션, UI 글쓰기와 로컬 개발 DB 저장을 확인했다. admin 화면·공유 세션·로그아웃,
양쪽 Storybook preview, API 루프백 바인딩·휴대폰 직접 접속 거부, localhost HTTP/API 회귀와
테스트 자원 정리도 확인했다. WAN 포워딩 제거는 사용자 확인이다.
상세 증거와 한계의 기준 문서는 `docs/development-vpn.md`의 관리 세션 실기기 결과다.
이 worker의 직접 시험과 관리 세션 보고를 구분하며 설정·확인 결과를 다시 요구하지 않는다.

## 남은 일

요청된 구현과 검증 기록 반영을 완료했다. 후속 Gate 1·독립 리뷰·PR·Human Review는
Orchestrator가 별도로 수행하며 이 작업에서 실행하지 않았다. 자동 병합하지 않는다.
셀룰러 단독, iPhone, 외부 OAuth, secure-context 기능, 데스크톱 시각적 UI,
방화벽 전체 감사·공용 인터넷 전체 노출 검사는 미검증으로 유지한다.
Tailscale 시험은 Wi-Fi 상태에서 VPN tun 경유를 확인한 것이며, 전체 네트워크 보안을
증명한 것으로 해석하지 않는다. 이 한계를 현재 구현 결함이나 새로운 완료 차단으로 만들지 않는다.
