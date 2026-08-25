# packages/api — shared fetch wrapper + auth calls between apps/web and apps/admin

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for the full reasoning (originally lived inside `packages/ui`, split out once that name stopped fitting non-React code).

## Why this package can be named `api`

The NestJS backend is `apps/api-server` (`"name": "api-server"` in its `package.json`), not `apps/api` — it was renamed specifically so this package could claim the more natural name `api` without a pnpm workspace collision (an earlier attempt at naming this package `api` while the backend was still `apps/api` broke `pnpm --filter api` and consuming apps' `tsc` resolution). Don't rename the backend back to `apps/api` without renaming this package first, or the collision returns.

## What belongs here

Plain TS, no React: `apiFetch`, `ApiError`, `API_BASE_URL`, `CurrentUser`, `login`/`logout`/`fetchCurrentUser` — only what's genuinely identical between `apps/web` and `apps/admin`. `signup`/`googleLoginUrl` (`apps/web`-only, `apps/admin` has neither) stay in `apps/web/app/lib/api.ts`, not here.

## No build step

Same pattern as `packages/ui`: `package.json`'s `exports` maps `"."` straight to `src/index.ts`, no `tsc` build. Consuming apps transpile this package as part of their own build (`transpilePackages: ["ui", "api", "utils"]` in each app's `next.config.ts`).

`API_BASE_URL` reads `process.env.NEXT_PUBLIC_API_BASE_URL` — because there's no build step, this source file is compiled once per consuming app, so the same line legitimately resolves to a different value in `apps/web` vs `apps/admin` depending on each app's own `.env.local`. Don't hardcode or parameterize this.
