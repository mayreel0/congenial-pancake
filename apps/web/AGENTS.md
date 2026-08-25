<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — 온설 공개 사이트

Project-wide rules live in the root `AGENTS.md`.

## Shared code with apps/admin

`apiFetch`/`ApiError`/`login`/`logout`/`fetchCurrentUser`/`CurrentUser`, `ActionConfirmDialog`, `QueryProvider`, and `formatTimestamp` live in `packages/ui` (imported as `"ui/..."`), not here — they're byte-identical between this app and `apps/admin`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for what's shared vs. kept local and why (short version: only things genuinely identical in both apps with no reason to diverge get shared — `signup`/`googleLoginUrl`/auth hooks/day-formatting helpers stay here since apps/admin either doesn't need them or needs a structurally different version). `app/lib/api.ts` and `app/lib/format.ts` are thin re-export shims over `ui/api`/`ui/format` plus this app's own additions — don't move their remaining local exports into `packages/ui` without checking apps/admin actually needs them too.

Before adding a new component/util/type that feels generic, check whether `apps/admin` would plausibly use the exact same thing — if yes, put it in `packages/ui` from the start rather than duplicating and extracting later.

## Storybook

`.storybook/` here documents `packages/ui`'s shared components too (e.g. `app/components/shared/ActionConfirmDialog.stories.tsx` imports from `"ui/ActionConfirmDialog"`) — `apps/admin` has no separate Storybook instance. Tailwind v4's class-scanning is directory-scoped, so `app/globals.css`'s `@source "../../../packages/ui/src";` line is required for `packages/ui` components' Tailwind classes to actually generate — don't remove it even if nothing in this app's own source appears to need it.
