# 온설 카카오/네이버 로그인 결정 기록

## 배경

`#85`(OpenAPI/Swagger) 머지 후 사용자가 "다음 진행할 사안은 네이버와 카카오 로그인입니까?"라고 물어 진행을 확정했다. 기존 구현은 Google 전용(`GoogleOAuthProvider`, `AuthController`의 `google`/`google/callback` 고정 라우트, `AuthService.loginWithGoogle`)이었어서, 카카오/네이버를 그냥 나란히 추가하는 대신 provider 이름을 일반화하는 방향으로 리팩터링했다.

## 결정 1: Passport 없이, Google과 동일한 패턴으로 구현한다

`apps/api-server/AGENTS.md`에 이미 기록된 이유 그대로 — `passport-kakao`/`passport-naver`는 2022년부터 관리가 끊겼다. `OAuthProvider` 인터페이스(`getAuthorizeUrl(state)`, `exchangeCode(code, state?)`)를 그대로 재사용해 `KakaoOAuthProvider`/`NaverOAuthProvider`를 추가했다 — 각 provider는 `fetch`로 authorize/token/userinfo 엔드포인트를 직접 호출하는 작은 클래스다. 별도 확인 없이 기존 패턴을 따른 결정.

## 결정 2: 라우트/서비스를 provider 이름으로 일반화한다

`google`/`google/callback` 고정 라우트를 `:provider`/`:provider/callback` 와일드카드로, `AuthService.loginWithGoogle`을 `loginWithOAuth(provider, profile, userAgent?)`로 바꿨다. `OAuthProviderRegistry`가 provider 이름 → 인스턴스 매핑과 `isKnown(name): name is OAuthProviderName` 타입가드를 제공해서, 컨트롤러가 런타임 문자열 파라미터를 안전하게 좁힌 뒤 타입이 강한 서비스 메서드로 넘길 수 있다(`as` 캐스트 없이). 라우트 등록 순서상 `:provider` 와일드카드는 정적 라우트(`me` 등) 뒤에 선언해 Express 라우트 섀도잉을 피했다.

## 결정 3: 세 버튼 모두 공식 브랜드 가이드라인을 따른다 (Google도 포함)

사용자가 명시적으로 지정: "공식 브랜드 색상으로 하는데 구글도 가이드라인을 따라주십시오." 세 개의 공식 가이드 URL을 직접 제공받았다.

- Google: https://developers.google.com/identity/branding-guidelines?hl=ko — "Neutral" 테마 채택(`#F2F2F2` 배경 / `#1F1F1F` 텍스트), 4색 G 마크는 정확한 좌표로 재현. 기존엔 로고/스타일 없는 텍스트 링크였던 걸 이번에 처음 가이드라인 준수 버튼으로 교체.
- Kakao: https://developers.kakao.com/docs/ko/kakaologin/design-guide — `#FEE500` 배경, 검정 85% 투명도 텍스트, 검정 말풍선 아이콘.
- Naver: https://developers.naver.com/docs/login/bi/bi.md — `WebFetch`가 이 URL을 두 번 연속 가져오지 못해("Claude Code is unable to fetch from developers.naver.com") `WebSearch`로 공식 색상(`#03C75A`)을 먼저 확인하고, 보조 소스로 검증했다. 첫 보조 소스(`guide.ncloud-docs.com`)는 확인해보니 다른 제품(NAVER Cloud Platform SSO)의 가이드라서 색상이 안 맞아 폐기했고, 두 번째 보조 소스(네아로 버튼 커스터마이징을 다루는 velog.io 블로그 글)에서 `#03c75a` 배경 + 흰색 아이콘/텍스트를 재확인했다.

아이콘은 세 곳 모두 공식 다운로드 에셋을 그대로 쓰지 않고 근사치로 재현했다 — Google G 마크만 좌표 기반이라 정확히 재현 가능했고, Kakao 말풍선/Naver N 글자는 단순화된 형태다. `apps/web/app/login/components/OAuthButton.tsx`의 각 아이콘 컴포넌트 위 주석에 이 한계를 기록해뒀다.

## 산출물

- `apps/api-server`: `oauth_provider` pg enum에 `kakao`/`naver` 추가(마이그레이션 `0007_wakeful_warbird.sql`), `KakaoOAuthProvider`/`NaverOAuthProvider`/`OAuthProviderRegistry` 신규, `AuthController`/`AuthService`/`auth.module.ts` 일반화, `env.schema.ts`에 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`/`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`(전부 optional, 기본값 빈 문자열 — Google 필수 필드와 다름, 실제 앱 등록 전까지 코드만 완성해두는 의도).
- `apps/web`: `oauthLoginUrl(provider)`가 기존 `googleLoginUrl()`을 대체, `OAuthButton.tsx`(신규 — provider별 브랜드 색상/아이콘 lookup table), `OAuthButton.stories.tsx`(신규 — 로그인 상태에서 라이브 `/login` 페이지를 볼 수 없어 Storybook으로 시각 검증), `/login` 페이지에 세 버튼 노출.

## 검증

- `apps/api-server`: `lint`/`typecheck`/`test`(57/57)/`build` 통과. 실제 마이그레이션 적용 후 `psql`로 `oauth_provider` enum에 `google`/`kakao`/`naver` 셋 다 존재 확인.
- curl로 실제 동작 확인: `/auth/google`이 여전히 실제 `client_id`로 기존과 동일한 `redirect_uri`(`/auth/google/callback`)에 리다이렉트함(회귀 없음). `/auth/kakao`, `/auth/naver`도 `client_id=`가 빈 값이지만 정상적인 authorize URL로 리다이렉트(자격증명 미발급 상태에서도 앱이 죽지 않고 사용자가 명시한 "코드 먼저 완성, 자격증명은 나중" 의도와 일치).
- 라우트 섀도잉 회귀 확인: `/auth/me`는 여전히 401(SessionGuard가 처리, unknown-provider 404로 삼켜지지 않음), `/auth/facebook`(실제로 모르는 provider)은 404.
- `apps/web`: `lint`/`typecheck`/`test`(67/67)/`build` 통과.
- Storybook(`http://localhost:6006`, `login/OAuthButton` → `All Three`)에서 세 버튼 실제 렌더링 확인: Google(연회색 배경 + 4색 G), Kakao(노란 배경 + 검정 말풍선 + 검정 텍스트), Naver(초록 배경 + 흰색 N + 흰색 텍스트) — 가이드라인 색상과 스크린샷 대조 완료.

## 추가 결정 (후속): 아이콘 크기/폰트 굵기 조정, Google 라이트/다크 테마 분리

첫 스크린샷 검토 후 사용자 피드백: "카카오랑 네이버 로고가 구글 로고에 비해 너무 작음", "네이버는 N 로고 크기는 아이콘형 18px, 완성형 16px 이상을 사용하고, 기준보다 작지 않도록 주의", "폰트가 얇아서 잘 안보임", "구글 버튼은 light 일때랑 dark 일때 나눠서."

- Kakao 아이콘: 18px → 20px로 확대(viewBox는 그대로, 렌더 크기만 확대해 벡터 화질 유지).
- Naver "N" 글자: 13px → 18px, `font-bold` → `font-extrabold`로 확대 — 네이버가 명시한 완성형(텍스트 결합형) 최소 16px, 아이콘형 최소 18px를 둘 다 여유 있게 충족하도록 함(기존 13px는 완성형 최소 기준에도 못 미쳤음).
- 버튼 라벨 전체: `text-sm font-medium`(14px/500) → `text-[15px] font-semibold`(15px/600)로 상향 — 세 버튼 공통으로 적용되는 가독성 개선.
- Google 버튼: 앱 전체에 이미 있던 라이트/다크 팔레트 스위칭 패턴(`app/globals.css`의 `prefers-color-scheme` 미디어쿼리 + Storybook 테마 토글용 `data-theme` 속성)에 맞춰 `--google-btn-bg`/`--google-btn-fg`/`--google-btn-border` CSS 변수 3개를 추가하고, 기존 "Neutral" 단일 테마 대신 Google 공식 "Light"(`#FFFFFF`/`#1F1F1F`/테두리 `#747775`) · "Dark"(`#131314`/`#E3E3E3`/테두리 `#8E918F`) 테마로 자동 전환되게 함. G 로고 자체는 색이 이미 밝은/어두운 배경 둘 다에서 통용되는 풀컬러 마크라 테마별 변경 없음.

Storybook `data-theme` 토글로 라이트/다크 각각 스크린샷 재확인: 다크 전환 시 Google 버튼이 `#131314` 배경 + `#E3E3E3` 텍스트 + 옅은 회색 테두리로 정확히 바뀌는 것을 확인. `apps/web` lint/typecheck/test(67/67)/build 재통과.

## 추가 결정 (후속 2): Naver 로그인은 공식 SVG로 교체, Google 라이트/다크 분리는 되돌림

두 번째 스크린샷 검토 후 사용자 피드백: "네이버 로고는 span 으로 하면 안되고 제공해주는 svg 로 해야할것같아" (공식 흰색 N 마크 SVG 경로 직접 제공), "구글 로그인 버튼은 테마 어둡게하니까 어색하네 보통 테마로 하자."

- `NaverIcon`을 텍스트 기반(`<span>N</span>`) 근사치에서 사용자가 제공한 공식 SVG(흰색 `fill-rule="evenodd"` 경로)로 완전히 교체 — 이제 폰트 렌더링에 의존하지 않는 정확한 벡터 마크. 처음엔 `viewBox 0 0 20 20`(20px)로 넣었으나, 사용자가 뒤이어 네이버 가이드라인의 아이콘형 최소 규격에 정확히 맞는 `viewBox 0 0 18 18`(18px) 버전의 공식 SVG를 다시 제공해 이걸로 최종 교체.
- Google 버튼의 Light/Dark 자동 전환은 되돌리고, 원래의 단일 "Neutral" 테마(`#F2F2F2`/`#1F1F1F`)로 복귀 — 실제로 다크 테마에서 렌더링해보니 이 앱의 어두운 팔레트와 어울리지 않는다는 사용자 판단에 따름. Kakao/Naver도 원래 테마와 무관하게 고정 브랜드 색상이므로, Google도 동일하게 고정 색상으로 맞추는 게 세 버튼 간 일관성 있다는 점도 근거. 이제 미사용이 된 `--google-btn-*` CSS 변수 3종은 `app/globals.css`(`:root`, 다크 미디어쿼리, `data-theme="dark"/"light"` 블록 4곳)에서 전부 제거.

Storybook에서 라이트/다크 토글 둘 다 재확인: Google 버튼이 테마와 무관하게 동일한 연회색으로 고정 렌더링됨, Naver 아이콘이 공식 SVG 마크로 정확히 표시됨. `apps/web` lint/typecheck/test(67/67)/build 재통과.

## 참고: 콘솔 등록에 필요한 URL, 프로필 정보/권한 관련 운영 지식

`#86` 머지 후 사용자가 "카카오나 네이버에서 받아와야할 제공 정보나 권한이 따로 있는지, 구글처럼 프로필 사진을 쓸 수 있는지"를 물어 정리한 내용.

**프로필 사진**: 세 provider 모두 지금은 프로필 사진을 안 쓴다 — `OAuthProfile` 타입이 `providerAccountId`/`email`만 갖고 있고, Google도 scope가 `openid email`뿐이라 `picture`를 애초에 안 받아온다. `users` 스키마에도 avatar 컬럼이 없다. 나중에 쓰려면 (1) Kakao는 동의항목에서 `profile_nickname`/`profile_image` 활성화(이메일과 달리 비즈니스 인증 불필요), (2) Naver는 "제공정보 선택"에서 별명/프로필사진 체크(서비스 검수에 포함), (3) Google은 scope에 `profile` 추가 — 이후 `OAuthProfile` 타입 확장 + `users` 스키마 컬럼 추가 + UI 반영이 필요하다. 다만 온설은 익명 기반 설계([[anonymous_identity_design]])라 실제 프로필 사진 노출 여부는 기술보다 제품 결정에 가까움 — 필요해지면 그때 범위를 다시 논의.

**실사용자 로그인이 되려면 (자격증명 발급보다 먼저 걸리는 것)**: 카카오는 앱이 "테스트 중" 상태면 콘솔에 등록한 팀원 계정만 로그인되고, `account_email` 동의항목은 비즈니스 앱 전환(카카오톡 채널 연결) + 카카오 로그인 심사를 통과해야 일반 사용자에게 이메일이 내려온다 — 안 되면 지금 코드의 `KakaoOAuthProvider`가 이메일 누락으로 `OAuthExchangeFailedException`을 던진다. 네이버는 기본 "개발중" 상태라 등록된 테스트 네이버 ID(최대 5명)만 로그인되고, 실서비스 URL 등록 + 검수 신청을 거쳐야 "서비스 중"으로 전환되어 전체 사용자가 쓸 수 있다.

**콘솔에 등록할 URL** (로컬 개발 기준, `apps/api-server/.env`의 `API_PUBLIC_URL=http://localhost:8080`/`WEB_PUBLIC_URL=http://localhost:3000` 값 그대로):

- 카카오(Kakao Developers → 내 애플리케이션 → 앱 설정): 플랫폼 → Web 플랫폼 → 사이트 도메인 `http://localhost:3000`, 카카오 로그인 → Redirect URI `http://localhost:8080/auth/kakao/callback`.
- 네이버(Naver Developers → 애플리케이션 정보): 서비스 URL `http://localhost:3000`, Callback URL `http://localhost:8080/auth/naver/callback`.
- (참고) 구글은 이미 등록되어 동작 중: `http://localhost:8080/auth/google/callback` — 동일 패턴 `{API_PUBLIC_URL}/auth/{provider}/callback`.

실제 배포 도메인이 정해지면 이 URL들을 그 도메인으로 다시 등록해야 한다(로컬 서비스 심사/전환과 별개로 프로덕션 도메인 등록도 필요).

## 추가 결정 (후속 3): 카카오/네이버 계정 전환이 안 되던 문제 — 항상 재인증 강제

`#86` 머지 후 사용자가 카카오/네이버로 한 번 로그인하면 이후 계속 그 계정으로만 로그인되고 다른 계정으로 바꿀 방법이 없다고 지적했다. 원인은 구글과 달리 카카오/네이버의 `/oauth/authorize` 엔드포인트가 kakao.com/naver.com에 활성 세션이 있으면 계정 선택 화면 없이 그 세션으로 바로 로그인을 완료시키기 때문 — 구글처럼 매번 계정 선택 화면을 보여주는 동작이 아니다.

해결책은 authorize URL에 재인증을 강제하는 파라미터를 추가하는 것(카카오: `prompt=login`, 네이버: `auth_type=reprompt`) — 다만 이렇게 하면 이미 로그인된 상태에서도 매번 카카오/네이버 비밀번호를 다시 입력해야 해서 실사용자에게도 SSO의 원클릭 편의성이 사라지는 트레이드오프가 있다는 점을 먼저 안내했다. 사용자는 "서비스를 꾸준히 사용하면 어차피 로그아웃되는 일이 없으니, 구글처럼 계정 선택 화면을 띄우는 게 불가능하다면 차라리 항상 재인증을 강제하는 게 낫다"고 판단해 이 방향으로 확정 — 카카오는 사용자가 직접 `prompt: 'login'`을 코드에 추가했고, 동일한 이유로 네이버에도 `auth_type: 'reprompt'`를 추가해 짝을 맞췄다.

추가로 사용자가 "지난번 로그인은 어디서 했는지 정도는 알려주면 좋겠다"고 요청 — 이 서비스는 서버 로그인 화면(`/login`)을 완전히 벗어났다가 provider 콜백 후 `/today`로 리다이렉트되는 풀 리다이렉트 플로우라, 로그인 완료 후 `/login`으로 돌아와 상태를 갱신할 시점이 없다. 대신 각 `OAuthButton` 클릭 시점에 `localStorage`에 어떤 provider를 선택했는지 낙관적으로 기록(`apps/web/app/login/lib/lastOAuthProvider.ts`)하고, `/login` 페이지가 다음에 열릴 때 그 값을 읽어 해당 버튼에 "최근 로그인" 배지를 표시한다. 서버에는 전혀 저장하지 않는 순수 브라우저 로컬 힌트라 세션/계정과 무관하고, 실패한 로그인 시도도 "마지막으로 시도한 provider"로 기록될 수 있지만(실사용자 재시도가 압도적으로 흔하므로) 편의 힌트로는 충분하다고 판단했다.

구현상 `localStorage`를 마운트 후 `useEffect`에서 읽어 `setState`하는 방식은 ESLint `react-hooks/set-state-in-effect` 규칙에 걸렸다 — 서버/클라이언트 스냅샷이 다를 수 있는 브라우저 전용 값을 읽는 정석 패턴인 `useSyncExternalStore`(`getServerSnapshot`을 `null`로 고정)로 바꿔 해결했다. 같은 탭에서 쓰기만 하고 다른 탭의 변경을 구독할 필요가 없어 `subscribe`는 빈 구독 함수를 반환한다.

실제 `http://localhost:3000/login`에서 `localStorage.setItem('onseol:lastOAuthProvider', 'kakao')`로 시뮬레이션 후 새로고침해 카카오 버튼에 배지가 뜨는 것, 콘솔에 hydration mismatch 등 에러가 없는 것을 확인. `apps/api-server`/`apps/web` 양쪽 lint/typecheck/test/build 재통과. curl로 `/auth/kakao`, `/auth/naver` 리다이렉트에 각각 `prompt=login`, `auth_type=reprompt`가 실제로 붙는 것도 확인(이때 실제 발급받은 카카오/네이버 client_id도 처음으로 채워져 있는 것을 확인 — 사용자가 이미 두 콘솔에 앱을 등록한 상태).

## 남은 일

- 사용자가 Kakao Developers/Naver Developers에 실제 앱을 등록해 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`/`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` 실값을 발급받아야 실제 계정으로 전체 로그인 플로우 테스트가 가능하다 — 계정 생성은 어시스턴트가 대행할 수 없는 영역.
- 위 "실사용자 로그인이 되려면" 항목(카카오 비즈니스 앱 전환+심사, 네이버 서비스 URL 검수)도 사용자가 각 콘솔에서 직접 진행해야 하는 부분.
- `apps/admin`의 OAuth 전용 계정 단독 로그인 문제(이전 라운드부터 반복적으로 보류된 백로그 항목)는 이번에도 범위 밖.
