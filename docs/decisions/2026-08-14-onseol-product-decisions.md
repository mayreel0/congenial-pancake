# 온설 제품 결정 기록 - 2026-08-14

이 문서는 지금까지의 대화에서 정한 제품/기술 방향을 기록한다.
다음 작업자가 같은 결정을 다시 묻거나 반대로 구현하지 않도록 하는 것이 목적이다.

## 제품 방향

- 서비스 이름은 **온설**이다.
- 보조 문구는 **정답고 따뜻하게 나누는 이야기**다.
- 온설은 사용자가 오늘 힘들었던 일, 칭찬받고 싶은 일, 위로받고 싶은 일을 짧게 남기고 다른 사용자가 현실적이고 담백한 답장을 남기는 서비스다.
- 기존 v0의 칭찬 커뮤니티 방향은 너무 무거워져서 축소한다.
- 단순한 핵심을 가진 서비스가 목표지만, 한강물 온도 사이트를 따라 하려는 것은 아니다.

## 진행 단계

1. 빠른 프론트엔드 프로토타입을 먼저 만든다.
2. 프로토타입은 운영 판단 검증이 아니라 핵심 UX 확인이 목적이다.
3. UX 방향이 잡히면 풀스택 MVP로 넘어간다.
4. 웹 흐름이 검증된 뒤 앱 확장을 고려한다.

## 프로토타입 결정

- 프로토타입은 localStorage를 사용한다.
- 로그인은 실제 인증이 아니라 시뮬레이션으로 처리한다.
- 로그인 전 작성한 요청과 답변은 임시 저장한다.
- 랜딩 페이지는 필요하다.
- 랜딩은 짧게 유지하되 텅 비어 보이지 않아야 한다.
- 랜딩에는 오늘의 요청 수, 오늘의 답변 수, 답변 대기 수 같은 작은 지표와 요청/답변 맛보기를 포함한다.
- 앱 본문은 요청 작성, 답변 작성, 최근 요청/답변, 답변 부족 요청 우선 노출, 신고 UI 상태, 내 활동 보기를 보여준다.

## 기술 결정

- 프론트엔드: Next.js, React, TypeScript, Tailwind CSS.
- UI 컴포넌트: 작은 custom component를 먼저 만들고, shadcn/ui는 필요한 primitive만 선택적으로 도입한다.
- 아이콘: lucide-react를 사용할 수 있다.
- 프론트엔드 배포: Vercel.
- MVP 백엔드: Nest.js와 TypeScript.
- MVP 인증: Nest.js 자체 세션/JWT로 시작한다.
- 백엔드 운영: 초기에는 개인 PC/서버에서 돌려보는 방향을 허용한다.
- 클라우드 방향: AWS식 인프라와 managed Postgres 활용 가능성을 열어 둔다.
- Supabase는 필수가 아니며 기본 백엔드로 간주하지 않는다.

## 백엔드 아키텍처 방향

Nest.js를 애플리케이션 백엔드 경계로 둔다.
다음 영역은 provider/repository 스타일 경계를 둔다.

- auth provider
- request repository
- reply repository
- report repository
- moderation/safety filter
- notification provider, later

MVP 인증은 Nest.js 자체 세션/JWT로 시작한다.
Supabase Auth는 사용하지 않는다.
이 경계는 strategy/provider 패턴으로 전환 비용을 낮추기 위한 것이다.
하지만 인증과 세션은 쿠키, JWT, refresh token, 클라이언트 세션 상태, authorization rule이 함께 얽히므로 무비용 교체를 가정하지 않는다.

## Supabase에 대한 입장

Supabase는 Auth와 Postgres를 빠르게 붙일 수 있다는 이유로 검토했다.
현재 결정은 Supabase에 커밋하지 않는 것이다.
MVP 인증도 Supabase Auth가 아니라 Nest.js 자체 세션/JWT로 시작한다.
사용자는 초기 vendor lock-in을 피하고, 개인 서버와 AWS식 클라우드 운영을 직접 활용해보고 싶어 한다.
Supabase는 나중에 비교할 수 있는 인프라/provider 후보 중 하나로 남긴다.

## 확정 전에 물어볼 결정

- Nest.js 자체 인증을 cookie session으로 구현할지 JWT로 구현할지, 또는 둘을 조합할지.
- 첫 실제 데이터베이스: 개인 서버 Postgres, AWS/RDS식 Postgres, 다른 managed Postgres 중 어디에 둘지.
- 개인 서버 운영 방식: reverse proxy, TLS, backup, monitoring, deploy flow.
- 신고된 요청/답변을 처리할 최소 관리자/운영 흐름.
- 모바일 앱 작업을 언제 실제 scope로 올릴지.

## 작업 합의

제품, UX, 기술스택, 백엔드, 인프라, 배포, 신고/필터 정책, 작업 방식에 의미 있는 tradeoff가 있으면 에이전트는 추천안과 이유를 먼저 제시하고 사용자 확인을 받은 뒤 확정한다.
`main` 또는 `v1` 브랜치에는 직접 push하지 않는다.
모든 기능/문서 변경은 별도 브랜치에서 커밋하고 PR을 생성해 남긴다.

## LLM Wiki 운영 의도

초기에 적용한 `effective-doodle`은 이 프로젝트의 LLM wiki 시스템이다.
다만 위키 작성 자체는 제품 플랜이나 구현 플랜의 필수 작업으로 넣지 않는다.
별도 에이전트가 위키 문서를 작성할 수 있으므로, 작업 에이전트는 누락 없이 넘길 수 있는 상세 기록을 남기는 데 집중한다.

작업 기록에는 다음을 남긴다.

- 확정된 결정과 아직 확정하지 않은 질문
- 고려한 대안과 선택하지 않은 이유
- 사용자가 직접 확정한 내용과 에이전트가 추천만 한 내용의 구분
- 구현 또는 문서화 과정에서 발생한 실수, 수정, 교훈
- 검증 명령, 결과, 실패했거나 실행하지 못한 검증
- 관련 커밋, 브랜치, PR 링크

이 기록은 나중에 Obsidian 기반 프로젝트 위키로 승격될 원천 자료다.
`OBSIDIAN_VAULT_DIR`가 설정되어 있고 위키 문서 작성이 요청되면, repo 안이 아니라 Project Wiki Mode가 지정한 Vault 경로에 기록한다.
