<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — 온설 공개 사이트

Project-wide rules live in the root `AGENTS.md`.

## Shared code with apps/admin

Split across three packages by kind, not lumped into one: `ActionConfirmDialog`/`QueryProvider` live in `packages/ui` (imported as `"ui/..."`), `apiFetch`/`ApiError`/`login`/`logout`/`fetchCurrentUser`/`CurrentUser` live in `packages/api` (imported as `"api"`), `formatTimestamp` lives in `packages/utils` (imported as `"utils"`) — all byte-identical between this app and `apps/admin`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for what's shared vs. kept local and why (short version: only things genuinely identical in both apps with no reason to diverge get shared — `signup`/`googleLoginUrl`/auth hooks/day-formatting helpers stay here since apps/admin either doesn't need them or needs a structurally different version). `app/lib/api.ts` and `app/lib/format.ts` are thin re-export shims over `api`/`utils` plus this app's own additions — don't move their remaining local exports into a shared package without checking apps/admin actually needs them too.

Before adding a new component/util/type that feels generic, check whether `apps/admin` would plausibly use the exact same thing — if yes, put it in `packages/ui` from the start rather than duplicating and extracting later.

## Storybook

This app does **not** run Storybook — that lives in `apps/storybook-app` (see `apps/storybook-app/AGENTS.md`, `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`). `.stories.tsx` files for this app's own components (e.g. `app/today/components/NoteCard.stories.tsx`) still live here, right next to the component they document — only the Storybook runner/config moved out. `@storybook/nextjs-vite`, `storybook`, and `eslint-plugin-storybook` stay as devDependencies here so those story files still typecheck/lint as part of this app's own `pnpm --filter web typecheck`/`lint` — don't remove them just because `pnpm --filter web storybook` no longer exists.

Tailwind v4's class-scanning is directory-scoped, so `app/globals.css`'s `@source "../../../packages/ui/src";` line is required for `packages/ui` components' Tailwind classes to generate wherever this file gets imported (including from `apps/storybook-app`, which imports this exact file) — don't remove it even if nothing in this app's own source appears to need it.

## Nickname reveal (opt-in per-post)

`/me` has a nickname-setting section (`app/me/components/NicknameSection.tsx`, self-contained — calls `useAuth()` itself, no props from the page, matching `MyAnswerLogSection`'s pattern) nested inside the top "내 정보" identity card (email/joined-date), not a standalone section — deliberate placement per user feedback. `RequestComposer` (`/today`) and `AnswerComposer` (`/answer`) both show a reveal toggle ("닉네임(닉네임)으로 남기기"), but **only when `user.nickname` is set** — a guest or a nicknameless member never sees it at all, since the backend would reject/ignore the choice anyway (see `apps/api-server/AGENTS.md`'s "Nicknames" section). `app/lib/author-label.ts`'s `authorDisplayLabel(author, fallbackLabel)` is the one place that decides "real nickname vs. anonymous fallback label" — used by both `/read` (`ReadThread`, fallback is the `authorSlot`-based label) and `/answer` (`AnswerLog`, fallback is the session-counter "익명 N" label); don't reimplement this decision at a new call site. `RequestDto`/`ReplyDto`/`FeedReplyDto`/`MyAnswerLogEntryDto` all carry an `author`/`requestAuthor`/`replyAuthor: AuthorDisplayDto` field (`app/lib/requests/api.ts`) mirroring the backend's discriminated union — `authorId`/`guestId` themselves still never cross the boundary. See `docs/decisions/2026-08-28-onseol-nickname-post-reveal-frontend-decisions.md`.

Changing an already-set nickname has a 7-day server-enforced cooldown (see `apps/api-server/AGENTS.md`'s "Nicknames" section) — `CurrentUser.nicknameChangeAvailableAt` (ISO string, `null` if never changed) lets `NicknameSection` disable the edit button and show "N일 후에 다시 바꿀 수 있어요." proactively, not just surface the 429 after a failed attempt. See `docs/decisions/2026-08-29-onseol-nickname-cooldown-decisions.md`.
