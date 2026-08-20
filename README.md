# v1

온설은 짧은 위로 요청과 담백한 답장을 주고받는 서비스입니다.

이 저장소는 pnpm 워크스페이스입니다. 프론트엔드(Next.js)는 `apps/web`에 있습니다.

## Local Development

```bash
corepack enable pnpm
pnpm install
pnpm --filter web dev
```

## Verification

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```
