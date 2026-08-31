# packages/shared — plain-TS helpers shared between apps/api-server and apps/web

Project-wide rules live in the root `AGENTS.md`.

## What belongs here

Only logic genuinely identical on both sides of the API boundary — currently `pagination.ts` (the `PaginatedDto<T>` envelope shape, page-size whitelist, and query-string parsing) and `kst-date.ts` (`isValidDateString`/`yesterdayKstDateString`). Each app keeps its own app-specific extensions locally rather than here: `apps/api-server/src/common/kst-date.ts` still owns `kstDayRange`/`kstDateRange` (SQL date-range builders, backend-only), `apps/web/app/lib/kst-date.ts` still owns `addDaysToDateString`/`formatKoreanDate` (UI date-string arithmetic/formatting, frontend-only). Both apps' local files re-export the shared subset rather than redeclaring it — a thin shim, same pattern `apps/web/app/lib/api.ts`/`format.ts` already use for `packages/api`/`packages/utils`. Don't move an app-specific helper here just because it looks similar in shape to something on the other side — only genuinely-identical logic belongs here (see `docs/decisions/2026-09-01-onseol-shared-package-spike-decisions.md` for the kst-date split reasoning).

## Different from packages/ui/api/utils: this one crosses the browser/Node boundary

The other three `packages/*` are consumed only by `apps/web`/`apps/admin` (both Next.js, both browser-side bundling via `transpilePackages`). This one is also consumed by `apps/api-server` — a plain Node/NestJS process with no bundler. That only works because this repo's Node version (pinned via root `.nvmrc`, currently 24.14.0) has native TypeScript type-stripping enabled by default, so `require("shared/...")` from `apps/api-server` resolves and executes the raw `.ts` source directly, the same way Next.js's `transpilePackages` lets `apps/web` consume raw `.ts` without a separate build step. **Only use erasable TypeScript syntax here** (type annotations, interfaces, type-only imports) — no `enum`, no `namespace`, no constructor parameter properties, no other construct that needs real compilation rather than simple type-stripping, since Node's stripping can't handle those and `apps/api-server` would fail at runtime (not just typecheck) if this package used them.

## No build step, no own test suite

Same "no build step" pattern as `packages/ui`/`packages/api`/`packages/utils` — `package.json`'s `exports` map points straight at `src/*.ts`. `apps/web/next.config.ts`'s `transpilePackages` includes `"shared"` for the same reason it lists the other three. This package also has no test script of its own (matching `packages/ui`/`packages/utils`' precedent) — its logic is exercised through each consuming app's own existing spec files (`apps/api-server/src/common/kst-date.spec.ts`/`pagination.dto.spec.ts` via Jest, `apps/web/app/lib/kst-date.test.ts` via Vitest), which import the re-export shims and so transitively cover the shared implementation from both runtimes.
