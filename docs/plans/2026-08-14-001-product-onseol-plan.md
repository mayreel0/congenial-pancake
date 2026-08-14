---
title: Onseol - Plan
date: 2026-08-14
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Onseol - Plan

## Goal Capsule

- **Objective:** 사람들이 오늘 힘들었던 일, 칭찬받고 싶은 일, 위로받고 싶은 일을 짧게 남기고 다른 사람이 현실적이고 담백한 답장을 남기는 Korean-first 서비스 **온설**을 만든다.
- **Product authority:** 이 문서는 2026년 8월 14일까지의 제품/기술 결정 기록이다. 아직 requirements-only 상태이며, 구현 전 `ce-plan` 수준의 implementation-ready 계획이 필요하다.
- **Current stage:** localStorage 기반 프론트엔드 프로토타입을 먼저 만들고, 이후 Nest.js 백엔드를 가진 풀스택 MVP로 확장한다.
- **Open blockers:** 첫 데이터베이스 운영 위치, 개인 서버 운영 방식, 클라우드 전환 순서, 최소 관리자/신고 처리 방식은 아직 확정하지 않았다.

---

## Product Contract

### Summary

온설은 짧은 위로 요청과 담백한 답장을 주고받는 서비스다.
프로토타입은 운영 판단 검증이 아니라 핵심 사용감을 빠르게 보여주는 데 집중한다.
MVP는 단순함을 유지하면서 실제 백엔드, 저장소, 인증, 신고, 필터 기준을 붙인다.

### Problem Frame

초기 v0 아이디어는 칭찬 커뮤니티에 가까웠고 서비스가 무거워졌다.
새 방향은 커뮤니티보다 더 작고 조용한 공간이다.
사용자는 오늘 있었던 일을 짧게 남기고, 다른 사람은 과하게 감성적이거나 AI스럽지 않은 답장을 남긴다.

### Key Decisions

- **KD1. 브랜드 이름은 온설이다.** 한국어 이름은 "온설", 보조 문구는 "정답고 따뜻하게 나누는 이야기"를 사용한다.
- **KD2. 단계를 나눈다.** 프론트엔드 프로토타입, 풀스택 MVP, 앱 확장을 순서대로 진행한다.
- **KD3. 짧은 랜딩 페이지를 둔다.** 프로토타입에도 랜딩은 필요하지만, 길고 무거운 마케팅 페이지가 아니라 서비스가 얼핏 보이는 진입면으로 둔다.
- **KD4. 빠른 웹 우선으로 간다.** Next.js, React, TypeScript, Tailwind CSS를 기본 프론트엔드 스택으로 둔다.
- **KD5. Supabase는 필수가 아니다.** Supabase에 종속되는 설계는 피하고, 개인 PC/서버와 AWS식 클라우드 운영 가능성을 열어 둔다.
- **KD6. MVP 백엔드는 Nest.js를 사용한다.** 신고, 필터, 1인 1답변, 관리자 검토 같은 서버 규칙을 명시적으로 다루기 위해 별도 API 서버를 둔다.
- **KD7. MVP 인증은 Nest.js 자체 세션/JWT로 시작한다.** Supabase Auth는 사용하지 않고, Nest.js가 로그인과 세션/JWT 발급 및 검증을 담당한다.
- **KD8. 전략/Provider 경계는 쓰되 과신하지 않는다.** 인증, 저장소, 필터, 알림은 교체 가능한 경계를 두지만, 인증/세션 전환이 무비용이라고 가정하지 않는다.
- **KD9. 큰 결정은 물어보고 간다.** 제품, UX, 백엔드, 인프라, 신고/필터 정책은 추천안과 이유를 제시한 뒤 확정한다.
- **KD10. main/v1에는 직접 push하지 않는다.** 모든 변경은 작업 브랜치에서 커밋하고 PR로 남긴 뒤 검토를 거쳐 반영한다.

### Requirements

**Prototype scope**

- R1. 프로토타입은 온설 브랜드, 한 문장 설명, `웹에서 시작하기`, `앱으로 이용하기(준비 중)`이 있는 짧은 랜딩 페이지를 보여준다.
- R2. 랜딩 페이지는 오늘의 위로 요청 수, 오늘의 답변 수, 답변을 기다리는 글 수 같은 작은 서비스 지표를 포함한다.
- R3. 랜딩 페이지는 서비스가 비어 보이지 않도록 짧은 위로 요청 1개와 담백한 답변 1개를 맛보기로 보여준다.
- R4. 사용자는 로그인 전에도 위로 요청을 작성할 수 있다.
- R5. 로그인 전 작성한 위로 요청은 localStorage에 임시 저장되고, 로그인 시뮬레이션 후 이어서 제출할 수 있다.
- R6. 사용자는 로그인 전에도 답변을 작성할 수 있다.
- R7. 로그인 전 작성한 답변은 localStorage에 임시 저장되고, 로그인 시뮬레이션 후 이어서 제출할 수 있다.
- R8. 요청 목록은 오늘 올라온 글, 답변이 적은 글, 아직 답변받지 못한 글을 우선 보여준다.
- R9. 최근 위로/답변 섹션은 샘플 데이터와 localStorage 데이터를 섞어 사용감을 보여준다.
- R10. 요청과 답변에는 신고 버튼이 있고, 프로토타입에서는 신고됨/숨김 같은 UI 상태만 표현한다.
- R11. 내 정보 영역은 내가 쓴 요청과 내가 남긴 답변을 간단히 보여준다.

**MVP scope**

- R12. MVP는 사용자, 위로 요청, 답변, 신고를 실제 데이터베이스에 저장한다.
- R13. MVP는 한 사용자가 한 위로 요청에 답변 1개만 남기도록 제한한다.
- R14. MVP는 한 위로 요청에 여러 사용자가 답변할 수 있게 한다.
- R15. MVP는 같은 사용자의 중복 신고가 신고 수를 부풀리지 않도록 처리한다.
- R16. 공개 최근 섹션에는 신고/필터 기준을 통과한 요청과 답변만 노출한다.
- R17. 답변 대기 목록은 오늘 올라온 글, 답변이 적은 글, 아직 답변받지 못한 글을 우선한다.
- R18. AI는 자동 공개 댓글이 아니라 안전 필터와 작성 보조에 우선 사용한다.

**Technology and operations**

- R19. 웹 프론트엔드는 Next.js, React, TypeScript, Tailwind CSS, 작은 custom component를 기본으로 한다.
- R20. MVP 백엔드는 Nest.js와 TypeScript를 사용한다.
- R21. MVP 인증은 Nest.js 자체 세션/JWT로 시작하고 Supabase Auth를 사용하지 않는다.
- R22. 백엔드는 auth provider, request repository, reply repository, report repository, moderation provider 같은 경계를 둔다.
- R23. 첫 배포 경로는 프론트엔드 Vercel, 백엔드 개인 PC/서버 운영을 허용한다.
- R24. 클라우드 경로는 AWS식 인프라와 managed Postgres를 열어 두며 Supabase 채택을 전제하지 않는다.
- R25. Supabase는 나중에 비교할 수 있는 인프라/Provider 후보이지 기본 아키텍처가 아니다.
- R26. main 또는 v1 브랜치에는 직접 push하지 않고, 기능/문서 변경은 별도 브랜치에서 PR로 제안한다.

### Key Flows

- F1. **로그인 전 요청 작성**
  - **Trigger:** 방문자가 로그인 전 위로 요청을 작성한다.
  - **Steps:** 텍스트를 localStorage에 저장하고, 제출 시 로그인 시뮬레이션을 띄우며, 로그인 후 pending submit을 이어간다.
  - **Covers:** R4, R5.

- F2. **로그인 전 답변 작성**
  - **Trigger:** 방문자가 로그인 전 답변을 작성한다.
  - **Steps:** 텍스트를 localStorage에 저장하고, 제출 시 로그인 시뮬레이션을 띄우며, 로그인 후 pending reply를 이어간다.
  - **Covers:** R6, R7.

- F3. **답변할 글 찾기**
  - **Trigger:** 사용자가 앱 본문에 들어온다.
  - **Steps:** 오늘 글, 답변이 적은 글, 답변이 없는 글을 우선 보여준다.
  - **Covers:** R8, R17.

- F4. **거친 내용 신고**
  - **Trigger:** 사용자가 요청이나 답변을 신고한다.
  - **Steps:** 프로토타입은 로컬에서 신고됨/숨김 상태를 보여주고, MVP는 deduplicated report와 필터 기준을 적용한다.
  - **Covers:** R10, R15, R16.

### Acceptance Examples

- AE1. **랜딩이 비어 보이지 않는다**
  - **Covers:** R1, R2, R3.
  - **Given:** 첫 방문자가 온설을 연다.
  - **When:** 랜딩 페이지가 렌더링된다.
  - **Then:** 브랜드, 짧은 설명, 웹/앱 진입 선택, 작은 활동 수치, 요청/답변 맛보기가 보인다.

- AE2. **로그인 전 작성 내용이 이어진다**
  - **Covers:** R4, R5, R6, R7.
  - **Given:** 익명 사용자가 요청이나 답변을 작성한다.
  - **When:** 제출하려고 한다.
  - **Then:** 앱은 작성 내용을 유지하고 로그인 시뮬레이션 후 제출 흐름을 이어간다.

- AE3. **답변이 없는 글이 먼저 보인다**
  - **Covers:** R8, R17.
  - **Given:** 목록에 답변 있는 글과 답변 없는 오늘 글이 함께 있다.
  - **When:** 답변 대기 목록이 표시된다.
  - **Then:** 답변 없는 글이나 답변이 적은 글이 먼저 보인다.

- AE4. **MVP는 답변 제한을 강제할 수 있다**
  - **Covers:** R12, R13, R14.
  - **Given:** 로그인한 사용자가 이미 특정 요청에 답변했다.
  - **When:** 같은 요청에 두 번째 답변을 남기려 한다.
  - **Then:** 백엔드는 두 번째 답변을 거부하고 다른 사용자의 답변은 허용한다.

### Scope Boundaries

- 프로토타입에는 실제 인증, 실제 백엔드 저장, 실제 필터 판정, AI 필터, 앱 설치 흐름, 푸시 알림, 클라우드 운영을 넣지 않는다.
- MVP에는 시즌 이벤트, 오늘의 분위기, 화로 같은 활동 시각화, 배경 커스터마이징, 풍부한 프로필 설정을 넣지 않는다.
- MVP 백엔드는 Supabase 전용 제품으로 설계하지 않는다.
- Provider 경계는 전환 비용을 줄이기 위한 것이며, 첫 MVP 행동이 생기기 전에 모든 것을 과도하게 추상화하지 않는다.

### Open Questions

- **Resolve Before Planning:** 첫 실제 데이터베이스는 개인 서버 Postgres, AWS/RDS식 managed Postgres, 다른 managed Postgres 중 어디에 둘 것인가?
- **Resolve Before Planning:** MVP에서 필요한 최소 관리자/신고 처리 흐름은 어디까지인가?
- **Deferred to Planning:** Nest.js 자체 인증을 cookie session으로 구현할지 JWT로 구현할지, 또는 둘을 조합할지의 세부 설계.
- **Deferred to Planning:** Next.js 프로젝트 구조, component 구조, Nest.js module 구조, DTO 이름, repository interface 이름.
- **Deferred to Planning:** 개인 PC/서버 단계의 reverse proxy, TLS, backup, monitoring, deploy 방식.

### Success Signals

- 첫 방문자가 약 10초 안에 "짧게 남기면 누군가 담백하게 답해주는 서비스"임을 이해한다.
- 프로토타입이 실제 인증 없이도 로그인 전 작성 후 이어서 제출하는 흐름을 보여준다.
- MVP가 한 사용자당 한 요청에 답변 1개 제한과 중복 신고 처리를 강제한다.
- 인프라 경로가 Supabase에 잠기지 않고 개인 서버 운영과 AWS식 클라우드 학습을 가능하게 한다.
