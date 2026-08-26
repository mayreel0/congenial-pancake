<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/admin — 온설 신고 검토 관리자 앱

Project-wide rules live in the root `AGENTS.md`. This app used to be `/admin` inside `apps/web`; it was split into its own Next.js app so the public site never ships admin code/routes in its bundle — see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md` for the full reasoning.

## Running

- `pnpm --filter admin dev` — runs on **port 3002** (not 3000, which `apps/web` owns). Needs `.env.local` (see `.env.example`) pointing `NEXT_PUBLIC_API_BASE_URL` at the same `apps/api-server` instance `apps/web` uses.
- `pnpm --filter admin lint` / `typecheck` / `test` / `build` — all four must pass before a PR, same as the other apps.
- `pnpm --filter admin build` outputs a **static export** to `out/` (`next.config.ts`'s `output: "export"`) — this app is entirely client components with no `cookies()`/Server Actions/route handlers/image-optimization usage, so no Node server is needed to serve it. `pnpm --filter admin start` (`serve out -l 3002`) previews that static build locally; `next start` does not work here and errors on purpose (that's Next.js telling you the app is static-exported, not a bug). Deploy `out/` to any static host.

## Scope

Two routes: `/` (`AdminReview.tsx` — "신고 검토": hidden requests/replies, restore/soft-delete) and `/settings` (`SettingsReview.tsx` — the DB-backed tunable limits, see `apps/api-server/AGENTS.md`'s "DB-backed settings" and `docs/decisions/2026-08-26-onseol-db-backed-settings-decisions.md`). `app/components/AdminNav.tsx` is the shared nav (신고 검토/설정 tabs + logout) — it was deliberately *not* added until this second section actually existed (see the original `/admin` decision's narrow-scope reasoning). Add a third tab only when a real third section is being built, not preemptively.

## Auth: same session cookie as apps/web, no JWT

This app is **not** a separate identity system. It calls the exact same `apps/api-server` (`POST /auth/login`, `GET /auth/me`, `POST /auth/logout`) and gets the same httpOnly session cookie apps/web gets. That cookie is set by the API's own domain, not by whichever frontend asked for it — so it's already sent on requests from any same-site origin (`apps/web`'s origin and this app's origin are same-site: same registrable domain in production, both literally `localhost` in dev), independent of port/subdomain. The only thing that had to change for this to work across two separate frontend origins was `apps/api-server`'s CORS config (`CORS_ORIGIN` is now a comma-separated list, not a single URL — see `apps/api-server/src/config/env.schema.ts`). No token duplication, no separate auth backend.

There is **no signup and no Google OAuth here** — `app/lib/api.ts` only exposes `login`/`logout`/`fetchCurrentUser`. Admin accounts already exist (created via the public site or directly in the DB); getting onto the `ADMIN_USER_IDS` whitelist (`apps/api-server`'s `AdminGuard`) is a separate, server-side-only step.

## Don't repeat the ServiceNav mount-loop bug

`<AdminNav />` renders **unconditionally** at the top of every page (`AdminReview.tsx`, `SettingsReview.tsx`), regardless of that page's own status. Only the content below it branches on loading/signed-out/forbidden/ready — via `<AdminStatusGate status={...} login={auth.login}>{...}</AdminStatusGate>` (`app/components/AdminStatusGate.tsx`), not a repeated 4-way ternary chain in each page. Gating the whole shell's mount on the same auth query's own loading state caused a real infinite mount→refetch→unmount loop when this page briefly lived inside `apps/web` (confirmed empirically: 100+ calls to `/auth/me` in 500ms in a test, before the fix) — see `docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md` for the root cause. Don't reintroduce a component that conditionally mounts based on the loading state of a query something inside it also subscribes to. `AdminNav` takes `activePath` as an explicit prop rather than calling `usePathname()` (matching `apps/web`'s `ServiceNav`) — each page already knows its own path, and this keeps `AdminNav` renderable in tests without an App Router context. Both `AdminReview`'s and `useAdminSettings`'s status unions are literally `"loading" | "signedOut" | "forbidden" | "ready"` — if a future admin page's status shape diverges from this, `AdminStatusGate` isn't the right fit for it and shouldn't be forced.

## Shared code with apps/web

`ActionConfirmDialog`/`QueryProvider` live in `packages/ui` (imported as `"ui/..."`), `apiFetch`/`ApiError`/`login`/`logout`/`fetchCurrentUser`/`CurrentUser` live in `packages/api` (imported as `"api"`), `formatTimestamp` lives in `packages/utils` (imported as `"utils"`) — split by kind (React components vs. fetch client vs. plain helpers) rather than one grab-bag package, ever since `apps/admin` became a second real consumer of code that was byte-identical to `apps/web`'s copy. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md`. `app/lib/api.ts` is a thin re-export shim over `api` (this app has no signup/OAuth additions of its own, unlike `apps/web`'s copy of that file). Before adding a new generic component/util here, check whether `apps/web` would plausibly want the exact same thing — if yes, add it directly to the relevant shared package instead of duplicating.

Tailwind v4's class-scanning is directory-scoped, so `app/globals.css`'s `@source "../../../packages/ui/src";` line is required for `packages/ui` components' Tailwind classes to actually generate in this app's CSS too — don't remove it.
