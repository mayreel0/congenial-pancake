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

## 남은 일

- 사용자가 Kakao Developers/Naver Developers에 실제 앱을 등록해 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`/`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` 실값을 발급받아야 실제 계정으로 전체 로그인 플로우 테스트가 가능하다 — 계정 생성은 어시스턴트가 대행할 수 없는 영역.
- `apps/admin`의 OAuth 전용 계정 단독 로그인 문제(이전 라운드부터 반복적으로 보류된 백로그 항목)는 이번에도 범위 밖.
