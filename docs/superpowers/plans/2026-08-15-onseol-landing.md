# 온설 랜딩 구현 계획

## 목표

보일러플레이트 루트 화면을 온설의 첫 정적 랜딩 페이지로 교체한다.

이번 PR은 서비스의 핵심 방향을 짧게 보여주는 진입 페이지만 다룬다. 앱 본 화면, 작성 흐름, 답변 흐름, 로그인, localStorage, 신고/필터, 백엔드는 다음 PR 범위로 남긴다.

## 전제

- 작업 브랜치: `codex/onseol-landing`
- 기준 브랜치: `v1`
- 직접 push 금지 대상: `main`, `v1`
- PR 대상: `v1`
- 프레임워크: Next.js App Router, React, TypeScript, Tailwind CSS
- 패키지 매니저: pnpm

## 구현 범위

- `/` 루트에 온설 랜딩을 구현한다.
- 브랜드명, 짧은 설명, 진입 버튼, 작은 활동 수치, 위로 요청/답장 예시를 첫 화면에서 보여준다.
- 랜딩 컴포넌트는 `app/components/landing/` 아래로 분리한다.
- 정적 데이터는 `landing-data.ts`에 둔다.
- 다크모드는 `prefers-color-scheme` 기반 CSS 변수로 지원한다.
- 이번 PR에는 테마 토글을 넣지 않는다.

## 제외 범위

- `/today` 라우트
- 위로 요청 작성
- 답변 작성
- localStorage 임시 저장
- 로그인 또는 인증 시뮬레이션
- 신고/필터
- 백엔드, 데이터베이스, AI 안전 필터

## 파일 계획

- `app/page.tsx`: 루트 페이지에서 `LandingPage`를 렌더링한다.
- `app/globals.css`: 라이트/다크 색상 토큰과 Tailwind theme 변수를 정의한다.
- `app/components/landing/LandingPage.tsx`: 랜딩 전체 조합을 담당한다.
- `app/components/landing/LandingHero.tsx`: 브랜드, 설명, CTA를 담당한다.
- `app/components/landing/EntryActions.tsx`: 웹/앱 진입 버튼을 담당한다.
- `app/components/landing/ActivityStats.tsx`: 작은 활동 수치를 담당한다.
- `app/components/landing/SampleExchange.tsx`: 위로 요청과 답장 예시를 담당한다.
- `app/components/landing/landing-data.ts`: 정적 랜딩 데이터를 보관한다.
- `docs/work-logs/2026-08-15-onseol-landing.md`: 위키 이전용 한글 구현 기록을 남긴다.

## 디자인 기준

- 첫 화면은 비어 보이지 않되, 기능 설명이 과하게 길어지지 않게 한다.
- 톤은 현실적이고 담백한 위로를 지향한다.
- 색상은 따뜻하지만 한 가지 색 계열로만 보이지 않게 한다.
- 카드 반경은 8px 이하로 유지한다.
- 모바일과 데스크톱에서 텍스트와 버튼이 겹치거나 넘치지 않게 한다.
- 다크모드는 순수 검정 배경이 아니라 부드러운 어두운 배경을 사용한다.

## 빌드 결정

- Next 16 기본 `next build`는 현재 환경에서 Turbopack가 CSS 처리 중 포트 바인딩 권한 문제로 실패했다.
- 같은 코드에서 `next build --webpack`은 성공했다.
- 사용자의 승인을 받고 `package.json`의 `build` 스크립트를 `next build --webpack`으로 임시 고정한다.
- 나중에 Turbopack 문제가 해결되면 `next build`로 되돌릴 수 있다.

## 검증 계획

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- 개발 서버에서 `/` HTML에 온설 핵심 문구가 렌더링되는지 확인
- 브라우저에서 데스크톱 1440px, 모바일 390px 폭을 확인
- 현재 시스템 다크 모드 렌더링과 CSS 라이트/다크 토큰 대비를 확인

## 완료 기준

- 루트 페이지가 보일러플레이트 문구 없이 온설 랜딩을 보여준다.
- 라이트/다크 토큰이 정의되어 있고 대비가 충분하다.
- 모바일과 데스크톱에서 가로 스크롤 또는 텍스트 겹침이 없다.
- 검증 명령이 통과한다.
- 구현 브랜치에서 커밋 후 `v1` 대상 PR을 생성한다.
