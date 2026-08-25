# packages/utils — shared plain-TS helpers between apps/web and apps/admin

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for the full reasoning (originally lived inside `packages/ui`, split out once that name stopped fitting non-React code).

## Named `utils`, not `util`

`util` is a Node.js built-in core module name. A workspace package named `util` risks being shadowed by the built-in during module resolution depending on the resolver (Node's own resolution always prefers the built-in for a bare `util` specifier). Named this package `utils` (plural) from the start to avoid the collision entirely — don't rename it to `util`.

## What belongs here

Plain TS, no React, no app-specific logic: currently just `formatTimestamp`. Only things genuinely identical between `apps/web` and `apps/admin` — `apps/web`-only helpers like `isSameCalendarDay`/`formatDayLabel`/`formatJoinedDate` (used by `/today`'s day grouping and `/me`'s join date) stay in `apps/web/app/lib/format.ts`, not here.

## No build step

Same pattern as `packages/ui`/`packages/api-client`: `package.json`'s `exports` maps `"."` straight to `src/index.ts`, no `tsc` build. Consuming apps transpile this package as part of their own build (`transpilePackages: ["ui", "api-client", "utils"]` in each app's `next.config.ts`).
