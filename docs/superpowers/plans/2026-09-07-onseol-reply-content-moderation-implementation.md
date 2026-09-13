---
title: Onseol Reply Content Moderation Implementation
date: 2026-09-07
status: draft
origin: docs/superpowers/specs/2026-09-05-onseol-reply-moderation-requirements.md
scope: apps/api-server/src/moderation internal implementation only
---

# 온설 답장 사전 moderation 내부 구현 계획

## 범위

`apps/api-server/src/moderation` 내부에 답장 사전 검사 엔진을 추가한다. `RepliesService.create()`, API DTO/응답, DB, 프론트, 인프라 연결은 건드리지 않는다.

## 구현 단위

1. `reply-content-moderation.types.ts`
   - `ModerationInput`, `ModerationResult`, `ModerationAction`, `ModerationCategory`, classifier/rewriter 인터페이스를 정의한다.

2. `reply-content-moderation.policy.ts`
   - 명확한 hard block 패턴, load-test/seed/system 제외 판정, LLM 판정 결과를 최종 action으로 정리하는 순수 정책 함수를 둔다.

3. `reply-content-moderation.service.ts`
   - 전처리 → 비프로덕트성 트래픽 처리 → hard block → classifier 호출 → 필요 시 rewrite 호출 순서로 조립한다.
   - classifier/rewrite는 인터페이스로 주입받고, 실제 OpenAI 연결은 후속 작업으로 남긴다.

4. `reply-content-moderation.fixtures.ts`
   - 요구사항 문서의 대표 예시를 테스트 fixture로 둔다.

5. `reply-content-moderation.service.spec.ts`
   - TDD로 hard block, suggest rewrite, allow, LLM 실패, load-test 제외를 검증한다.

## 검증

- `pnpm --filter api-server test -- reply-content-moderation.service.spec.ts`
- `pnpm --filter api-server typecheck`
- 필요 시 `pnpm --filter api-server test -- moderation.service.spec.ts`
