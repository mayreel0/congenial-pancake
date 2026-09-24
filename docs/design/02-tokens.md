# 온설 디자인 토큰 기준

## 목적

디자인 토큰은 색, 글꼴, 간격, radius, shadow 같은 결정을 이름 붙여 재사용하는 방식이다.

온설에서는 새 화면을 만들 때 즉흥적으로 `text-slate-500`, `rounded-xl`, `shadow-lg` 같은 값을 고르지 않는다. 먼저 의미 기반 토큰을 정하고, Tailwind theme variable 또는 CSS 변수로 연결한다.

## 토큰 계층

온설은 두 단계 토큰을 사용한다.

### 1. Primitive Token

색 자체나 수치 자체를 뜻한다.

예:

- `color.ink.900`
- `color.paper.50`
- `color.warm.300`
- `space.3`
- `radius.2`

### 2. Semantic Token

UI에서의 역할을 뜻한다.

예:

- `color.background.default`
- `color.surface.default`
- `color.surface.subtle`
- `color.text.default`
- `color.text.muted`
- `color.action.primary`
- `color.border.default`
- `radius.control`
- `radius.panel`
- `shadow.resting`

구현에서는 가능하면 semantic token을 사용한다. 색 이름보다 역할 이름을 우선하면 나중에 브랜드 색을 바꿔도 컴포넌트 의미가 흔들리지 않는다.

## 색상 방향

현재 팔레트는 PR #206(2026-09-13)에서 확정했다. 출발점은 이전 primary(`#365f50`, 차가운 포레스트 그린)가 "온설 = 따뜻함"이라는 이름의 핵심과 맞지 않는다는 문제 제기였다. 따뜻한 색을 primary로 올리는 후보 8안(A~H)을 같은 UI 조각(네비게이션, 버튼, 답장 카드, 토글)에 입혀 라이트/다크로 비교했고, 사용자가 직접 지정한 F안(primary `#8B5E45`)에서 채도를 조금 낮춘 G안을 골랐다. 후보 비교 자료는 claude.ai의 비공개 artifact "온설 팔레트 후보"에 있다.

실제 값의 기준은 코드다: `apps/web/app/globals.css`, `apps/admin/app/globals.css`. 아래 표는 2026-09-24 시점의 스냅샷이며, 코드와 다르면 코드가 맞다.

| 역할 (CSS 변수) | Light | Dark |
|---|---|---|
| 배경 `--background` | `#faf7f2` | `#171411` |
| 카드 `--surface` | `#ffffff` | `#211c18` |
| 보조 면 `--surface-muted` | `#f0eae0` | `#2a241e` |
| 구분선 `--line` | `#e4dccf` | `#3b332b` |
| 본문 `--foreground` | `#2b2620` | `#f2ece4` |
| 보조 텍스트 `--muted` | `#7a7166` | `#b0a797` |
| 주 색 `--primary` | `#825c48` (브라운) | `#be8c71` |
| 주 색 위 글자 `--primary-foreground` | `#ffffff` | `#171411` |
| 보조 색 `--accent` | `#788a7b` (세이지) | `#9fb09f` |
| 파괴적 동작 `--destructive` | `#dc2626` | `#f87171` |

기준:

- primary(브라운)가 따뜻함을 맡는다. 버튼, 활성 내비게이션, 토글, 포커스 링에 쓴다.
- accent(세이지)는 이전 초록을 무디한 보조 역할로 내린 것이다. primary와 경쟁하지 않게 작은 표시에만 쓴다.
- 배경은 순백보다 따뜻한 종이색, 본문은 검정에 가까운 먹색을 쓴다.
- 다크모드는 순수 검정이나 무채색 대신 아주 어두운 warm-brown 4단계(배경, 카드, 보조 면, 구분선)를 쓴다. 다크에서 배경과 카드가 무채색이면 따뜻한 정체성이 사라진다는 지적을 반영했다. 다크 primary는 같은 색상에서 명도만 올린 값이다.
- 대비는 WCAG AA(텍스트 4.5:1, 비텍스트 3:1)를 지킨다. PR #206에서 쓰임새별(버튼 배경 + 흰 글자, 배경·카드 위 텍스트, 포커스 링)로 계산한 최저값은 5.24:1이다. 새 색 조합을 추가할 때도 같은 방식으로 확인한다.
- `--destructive`(빨강)는 #206 범위 밖이라 그대로 두었다. 이 토큰은 `apps/web`에만 있고 `apps/admin`에는 아직 없다.

피해야 할 색상:

- 보라/남색 gradient 중심 팔레트
- 슬레이트/파란 회색만으로 이루어진 대시보드 팔레트
- 버튼만 과하게 선명한 SaaS 스타일 컬러

## 타이포그래피

온설은 한국어 가독성이 우선이다.

권장 후보:

- `Pretendard`
- `SUIT`
- `IBM Plex Sans KR`
- `Noto Sans KR`
- 시스템 산세리프

기준:

- 한국어 본문이 자연스럽게 읽히는 글꼴을 우선한다.
- display font는 초기에 사용하지 않는다.
- hero 크기의 제목을 남발하지 않는다.
- 좁은 패널, 카드, 버튼 안에서는 작은 제목과 충분한 행간을 사용한다.
- letter spacing은 기본값을 유지한다.

## Radius

온설의 형태는 부드럽지만 말랑한 앱처럼 보이면 안 된다.

- `radius.control`: 8px 이하
- `radius.panel`: 8px 이하
- `radius.note`: 4px 또는 6px 후보

`rounded-xl`, `rounded-2xl`, pill 형태는 명확한 이유가 있을 때만 쓴다.

## Shadow

shadow는 깊이 표현보다 아주 약한 분리에만 쓴다.

- 기본 화면에서 `shadow-lg`, `shadow-xl`은 사용하지 않는다.
- 카드가 많아질수록 shadow보다 border, 배경 차이, spacing으로 구분한다.
- 다크모드에서는 shadow보다 border와 surface 계층을 우선한다.

## Spacing

온설은 조용한 여백을 쓰되, 비어 보이면 안 된다.

- 랜딩은 큰 여백을 쓰더라도 서비스의 실제 말과 활동 힌트가 같이 보여야 한다.
- 앱 본문은 반복 사용을 고려해 더 밀도 있게 구성한다.
- 모바일에서는 좌우 여백을 과하게 줄이지 않는다.

## Tailwind 적용 기준

Tailwind 4에서는 `@theme` theme variable을 디자인 토큰의 코드 표현으로 사용한다.

- utility class는 토큰을 호출하는 API처럼 쓴다.
- 새 색상 utility가 필요하면 먼저 `@theme`에 의미 기반 이름을 추가한다.
- 단발성 arbitrary color는 피한다.
- 컴포넌트 내부에서 raw hex를 직접 쓰지 않는다.

## 참고

- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Style Dictionary design tokens: https://styledictionary.com/info/tokens/
- Figma design tokens and variables: https://www.figma.com/resource-library/design-tokens/
