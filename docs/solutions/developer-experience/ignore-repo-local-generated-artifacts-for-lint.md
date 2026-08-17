---
title: repo-local 생성물과 worktree를 lint 대상에서 제외하기
date: 2026-08-18
category: developer-experience
module: Next.js verification workflow
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "repo-local `.worktrees` 아래에 다른 브랜치의 Next 생성물이 남아 있다."
  - "ESLint가 현재 PR과 무관한 `.next` 산출물까지 검사한다."
tags: [eslint, nextjs, worktree, verification]
---

# repo-local 생성물과 worktree를 lint 대상에서 제외하기

## Context

네비게이션 구현 PR의 최종 검증에서 `pnpm lint`가 현재 변경과 무관한 `.worktrees/onseol-mobile-today-fix/.next` 산출물을 검사했다. 그 결과 Next/Turbopack generated file의 `require()`, `module` 할당, generated type의 `any` 같은 오류가 대량으로 보고되었다.

원인은 `eslint.config.mjs`에서 `eslint-config-next`의 기본 ignore를 `globalIgnores`로 덮어쓰면서 repo-local 작업 산출물 경로를 충분히 제외하지 않은 것이다.

## Guidance

repo 안에 worktree 또는 로컬 tooling 산출물 디렉터리를 둘 때는 ESLint ignore에도 같은 경계를 둔다.

```js
globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  ".worktrees/**",
  ".pnpm-store/**",
  ".superpowers/**",
]);
```

이 프로젝트에서는 `.gitignore`가 `.worktrees/`를 제외해도 ESLint가 자동으로 그 경계를 따라가지 않았다. lint 대상은 ESLint 설정에서 별도로 명시해야 한다.

## Why This Matters

lint 실패가 현재 PR의 소스가 아니라 다른 worktree의 generated output에서 발생하면, 구현 문제와 환경 문제를 구분하기 어렵다. 특히 `.next` 산출물은 사람이 수정할 코드가 아니므로 lint 결과에 포함되면 검증 신뢰도가 떨어진다.

repo-local worktree를 쓰는 프로젝트에서는 “git에 안 들어간다”와 “lint/test/build 도구가 무시한다”가 같은 뜻이 아니다. 두 경계를 모두 설정해야 검증이 현재 checkout의 소스 변경에 집중된다.

## When to Apply

- repo 안에 `.worktrees/`, worktrees 디렉터리, local store, generated cache를 둔다.
- ESLint가 현재 PR과 무관한 generated file 또는 다른 branch output을 검사한다.
- `globalIgnores`로 framework 기본 ignore를 재정의한다.
- Next.js `.next` output, pnpm local store, local skill/tooling state처럼 사람이 리뷰하지 않을 산출물이 repo 아래에 생긴다.

## Examples

이번 PR에서는 `pnpm lint`가 `.worktrees/onseol-mobile-today-fix/.next/**`를 검사하면서 9,000개 이상의 문제를 출력했다. `.worktrees/**`, `.pnpm-store/**`, `.superpowers/**`를 ignore에 추가한 뒤 lint는 현재 checkout 소스만 검사했고 통과했다.

## Related

- [오늘 화면 재설계 구현 기록](../../work-logs/2026-08-17-today-redesign-implementation.md)
