<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/admin — 온설 신고 검토 관리자 앱

Project-wide rules live in the root `AGENTS.md`. This app used to be `/admin` inside `apps/web`; it was split into its own Next.js app so the public site never ships admin code/routes in its bundle — see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md` for the full reasoning.

## Running

- `pnpm --filter admin dev` — runs on **port 3002** (not 3000, which `apps/web` owns). Needs `.env.local` (see `.env.example`) pointing `NEXT_PUBLIC_API_BASE_URL` at the same `apps/api` instance `apps/web` uses.
- `pnpm --filter admin lint` / `typecheck` / `test` / `build` — all four must pass before a PR, same as the other apps.

## Scope

Single route (`app/page.tsx` → `AdminReview.tsx`). Only one section — "신고 검토" (hidden requests/replies, restore/soft-delete) — matching the original `/admin` decision's deliberately narrow scope. No nav, no other tabs; add a real nav shell only when a second section is actually being built, not preemptively.

## Auth: same session cookie as apps/web, no JWT

This app is **not** a separate identity system. It calls the exact same `apps/api` (`POST /auth/login`, `GET /auth/me`, `POST /auth/logout`) and gets the same httpOnly session cookie apps/web gets. That cookie is set by the API's own domain, not by whichever frontend asked for it — so it's already sent on requests from any same-site origin (`apps/web`'s origin and this app's origin are same-site: same registrable domain in production, both literally `localhost` in dev), independent of port/subdomain. The only thing that had to change for this to work across two separate frontend origins was `apps/api`'s CORS config (`CORS_ORIGIN` is now a comma-separated list, not a single URL — see `apps/api/src/config/env.schema.ts`). No token duplication, no separate auth backend.

There is **no signup and no Google OAuth here** — `app/lib/api.ts` only exposes `login`/`logout`/`fetchCurrentUser`. Admin accounts already exist (created via the public site or directly in the DB); getting onto the `ADMIN_USER_IDS` whitelist (`apps/api`'s `AdminGuard`) is a separate, server-side-only step.

## Don't repeat the ServiceNav mount-loop bug

`AdminReview.tsx`'s outer shell (title + logout button) renders **unconditionally**, regardless of `useAdminReview()`'s `status`. Only the `<main>` content branches on loading/signed-out/forbidden/ready. Gating the whole shell's mount on the same auth query's own loading state caused a real infinite mount→refetch→unmount loop when this page briefly lived inside `apps/web` (confirmed empirically: 100+ calls to `/auth/me` in 500ms in a test, before the fix) — see `docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md` for the root cause. Don't reintroduce a component that conditionally mounts based on the loading state of a query something inside it also subscribes to.

## No shared package with apps/web

`app/lib/api.ts`, `app/lib/format.ts`, `app/components/shared/ActionConfirmDialog.tsx`, etc. are deliberately small standalone copies, not imports from `apps/web` or a shared `packages/*` package. At this size (one page, a handful of generic helpers) extracting a shared package would be more infrastructure than the duplication it avoids — revisit only if apps/admin grows enough sections that the duplication actually starts hurting.
