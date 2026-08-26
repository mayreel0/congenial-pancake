# apps/api-server — Nest.js backend

App-specific rules only. Project-wide rules (branching policy, decision-confirmation process, etc.) live in the root `AGENTS.md`.

## Running

- `pnpm --filter api-server start:dev` — local run. Requires `.env` (see `.env.example`; `DATABASE_URL` must point at a local Postgres).
- `pnpm --filter api-server lint` / `typecheck` (`tsc --noEmit`) / `test` / `build` — all four must pass before a PR.
- `pnpm --filter api-server db:generate` — generate migration SQL from schema (`src/database/schema/*.schema.ts`) changes.
- `pnpm --filter api-server db:migrate` — apply generated migrations to the DB at `DATABASE_URL`.

## Architecture boundary

Services depend only on repository/provider interfaces, never on the Drizzle client (`DRIZZLE` token) directly — the Drizzle client is only referenced inside `*.repository.ts` files. Example: `src/auth/sessions.repository.ts` injects `DRIZZLE`, and `src/auth/session.service.ts` depends only on `SessionsRepository`.

## Auth

DB-backed sessions (`src/auth/`) — not JWT. `SessionGuard` reads the token from either a cookie (`SESSION_COOKIE_NAME`, default `session_token`) or an `Authorization: Bearer` header, validating both against the same `SessionService` (web uses the cookie, a future mobile app would use the header). Sessions are issued per device/login, not per user — logging out a single device is just deleting that session row.

## DTOs vs domain models

Controllers never accept or return Drizzle schema types (`typeof requests.$inferSelect` etc.) directly. Every route gets a request DTO and a response DTO:

- **Request DTOs** live in each module's `dto/` folder (e.g. `src/requests/dto/create-request.dto.ts`), as plain classes with `class-validator` decorators (`@IsString()`, `@MaxLength()`, ...). The global `ValidationPipe` in `main.ts` (`whitelist: true, forbidNonWhitelisted: true`) rejects any field a DTO doesn't declare — so an undeclared field in the request body is a 400, not silently ignored.
- **Response DTOs** (or plain mapper functions) convert a repository's domain/row type into exactly what the client should see — this is also where a DB row's internal fields (e.g. a future `passwordHash`) get dropped before serialization.
- Domain/internal types stay in `src/database/schema` and repository return types; they never cross the HTTP boundary unmapped.

See `src/auth/dto/` for the first real example: `SignupDto`/`LoginDto` (request) and `UserResponseDto`/`toUserResponseDto` (response — drops `passwordHash`).

## OAuth

Google is implemented (`src/auth/oauth/google-oauth.provider.ts`); Kakao and Naver are planned follow-ups reusing the same `OAuthProvider` interface. **No Passport** — `passport-kakao`/`passport-naver` have been unmaintained since 2022, so each provider is a small class that calls the provider's authorize/token/userinfo endpoints directly via `fetch`, matching the "explicit, no magic" reasoning behind picking Drizzle over Prisma. An OAuth account links to a `users` row via `oauth_identities` (`(provider, provider_account_id)` unique) — `password_hash` on `users` is nullable for OAuth-only accounts. If someone signs in with Google using an email that already has a password account, it links to that existing account rather than creating a duplicate.

`GET /auth/:provider` redirects to the provider with a CSRF `state` stored in a short-lived cookie; `GET /auth/:provider/callback` verifies that state before exchanging the code.

## Anonymous (guest) writes

`requests`/`replies` allow writing without logging in — see `docs/decisions/2026-08-21-onseol-anonymous-posting-decisions.md`. Routes that accept both use `OptionalSessionGuard` (`src/auth/optional-session.guard.ts`) instead of `SessionGuard`: it never rejects the request, it just sets `request.userId` when a valid session exists. Read it with `OptionalCurrentUser()` (`string | undefined`), not `CurrentUser()` (which still throws outside a guarded route). Anonymous callers identify themselves via a server-issued, httpOnly `guest_id` cookie (`GuestId()` decorator, `src/common/decorators/guest-id.decorator.ts`) — `GuestIdMiddleware` (`src/common/middleware/guest-id.middleware.ts`, registered globally in `main.ts` right after `cookieParser()`) ensures every request has one before it reaches routing, minting and setting it via `Set-Cookie` on first visit if missing. Not DB-validated — still just a value the server trusts, same as before, but no longer directly readable or editable from the browser's JS/devtools (was a client-generated id in `localStorage` sent as `X-Guest-Id`; see `docs/decisions/2026-08-23-onseol-guest-id-cookie-decisions.md`). Because the middleware guarantees a value on every request, `GuestId()` returns a plain `string` (not `string | undefined`) and there's no `GuestIdRequiredException` to handle downstream. `requests.author_id`/`replies.author_id` are nullable with a matching `guest_id` column and a `CHECK (author_id IS NOT NULL OR guest_id IS NOT NULL)` constraint; guests are capped at 1 request total and `settings.guestReplyLimit` replies total (default 5, DB-backed — see "DB-backed settings" below), both per `guestId` across every request (not per-request) — enforced in `RequestsService`/`RepliesService`, not the DB, except the 1-request cap which is a unique constraint on `guest_id`. (An earlier implementation scoped the reply cap to "5 per request" instead of "5 total," letting a guest reply without limit across different requests — fixed to match the original decision doc.) `reports` did **not** get this treatment — guests can't report at all (`SessionGuard`, not optional), so `reports.reporter_id` stays `NOT NULL` and the 3-distinct-reporter threshold is unaffected.

## Answer queue (skip/hold)

`GET /requests/queue` returns the single next request a viewer should answer — not a list, since the ranking/exclusion rules (freshness, reply cap, self/already-replied/skipped/held exclusion) live entirely in `RequestsRepository.findQueueCandidate()` and shouldn't be reimplemented client-side. Rules are grounded in `docs/decisions/2026-08-22-onseol-answer-queue-decisions.md`: a freshness window (hard exclusion, no fallback), fewest-replies-first with a reply cap (soft exclusion — falls back to ignoring the cap only when every eligible request has already hit it), and skip/hold are per-viewer only, never a ranking signal for anyone else. The freshness window and reply cap are **not** hardcoded — see "DB-backed settings" below.

Skip and hold live in one table (`answer_interactions`, `src/answer-interactions/`) with a `status` enum, following the same nullable-`authorId`/`guestId` pattern as `requests`/`replies` — but unlike those, skip allows guests while hold requires a session (`POST /requests/:id/skip` uses `OptionalSessionGuard`, `POST /requests/:id/hold` and `GET /requests/held` use `SessionGuard`). A `CHECK` constraint enforces "guest rows may only be `skipped`" at the DB level. `RepliesService.create()` clears any interaction row for the (request, viewer) pair on a successful reply — answering a held request resolves it. `GET /replies/mine` (a separate `RepliesMineController`, since `RepliesController` is nested under `requests/:requestId/replies`) returns a viewer's own answer log joined with the original request.

`AnswerInteractionsRepository.findHeldForAuthor()` applies the same freshness cutoff as the queue itself (read from `SettingsService`, not duplicated) — a held request silently drops off the holder's `GET /requests/held` once it ages past that window, same as it already had for everyone else's queue. This only filters the query; the `answer_interactions` row itself is never deleted, matching `findQueueCandidate`'s filter-don't-delete approach.

## DB-backed settings

`src/settings/` (`SettingsService`/`SettingsRepository`) is a single-row `settings` table (`id` always 1, `CHECK (id = 1)`) holding the three tunable numbers that used to be hardcoded constants: `queueFreshnessHours`, `queueReplyCap`, `guestReplyLimit`. See `docs/decisions/2026-08-26-onseol-db-backed-settings-decisions.md` for the full reasoning. A few things to know before touching this:

- **Services fetch settings, not repositories.** `RequestsService`/`AnswerInteractionsService`/`RepliesService` inject `SettingsService` and pass the values down as explicit parameters (`RequestsRepository.findQueueCandidate(viewer, { freshnessHours, replyCap })`, `AnswerInteractionsRepository.findHeldForAuthor(authorId, freshnessHours)`) — repositories never import `SettingsService` themselves, matching the "Architecture boundary" rule above.
- **No caching** — `SettingsService.get()` hits the DB every call. Deliberate, not an oversight; add caching only if it becomes a real bottleneck.
- **Lazy-bootstrapped, not seeded.** `SettingsRepository.get()` inserts the `id=1` row with the schema's own column defaults (60/5/5) if it's missing, instead of a migration-time `INSERT`. Self-healing if the row is ever deleted.
- Exposed to admins via `AdminController`'s `GET /admin/settings` / `PATCH /admin/settings` (guarded the same as every other admin route), consumed by `apps/admin`'s "설정" page.
- The guest 1-request-total cap is **not** here — it's the `requests_guest_id_unique` DB constraint, a structural rule rather than a tunable number.

## Error codes

Every error response is `{ statusCode, code, message }`, produced by the global `AppExceptionFilter` (`src/common/filters/`, registered in `main.ts`). Domain errors extend `AppException` (`src/common/exceptions/app.exception.ts`) with a stable `code` string the frontend can branch on (e.g. `AUTH_EMAIL_TAKEN`, `AUTH_INVALID_CREDENTIALS`). Plain Nest `HttpException`s (like `ValidationPipe`'s 400s) get a generic code derived from their status (`VALIDATION_ERROR`, `NOT_FOUND`, ...); anything unexpected becomes a 500 with `INTERNAL_ERROR` and a generic message — internals never leak into the response.

## Rate limiting

`@nestjs/throttler` is wired globally via `APP_GUARD` in `app.module.ts` — every route defaults to 100 requests/60s per IP unless overridden. `AuthController`'s `signup`/`login` override this to 5/60s (`@Throttle({ default: { ttl: 60_000, limit: 5 } })`) since those are the classic brute-force/spam-signup targets; the guest write caps (1 request, 5 replies total — see "Anonymous (guest) writes" above) are a separate, unrelated mechanism and untouched by this. See `docs/decisions/2026-08-25-onseol-api-rate-limiting-decisions.md`. In production, `main.ts` sets `trust proxy` on the Express instance (guarded by `NODE_ENV === 'production'`) — without it, behind a reverse proxy every request would appear to come from the proxy's IP and the whole app would share one throttle bucket. A throttled request gets Nest's generic `HttpException` handling (429, `code: "HTTP_ERROR"`), same as any other un-subclassed exception — see "Error codes" below.

## CORS and multi-origin frontends

`CORS_ORIGIN` (`src/config/env.schema.ts`) is a comma-separated list, not a single URL — this API is called from two separate frontend origins now, `apps/web` and `apps/admin` (see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md`). `main.ts` passes the parsed array straight to `app.enableCors({ origin: [...] })`. Because of this, `WEB_PUBLIC_URL` was added as its own env var for the Google OAuth callback's post-login redirect (`AuthController.googleCallback`) — that redirect target is specifically `apps/web` (the admin app has no Google login), so it can no longer be derived from `CORS_ORIGIN` now that that's a list. Don't reuse `CORS_ORIGIN` for anything that needs exactly one specific frontend URL; add a dedicated env var instead, the way `WEB_PUBLIC_URL` did.

## DB / reporting & admin rules

Schema, the report threshold, and admin identification are all grounded in `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md` — in particular, the `reports` table's `(target_type, target_id, reporter_id)` unique constraint and the "3 distinct reporters" auto-hide rule must be preserved across schema changes. `ReportsService` inserts the report row, counts distinct reporters, then hands that count to `ModerationService.evaluateAutoHide()` (`src/moderation/`), which sets `hidden` on the target via `RequestsService.hide()`/`RepliesService.hide()` — `ModerationService` never touches the `reports` table itself.

## Admin ("신고 검토")

`src/admin/` is a whitelist-gated moderation review surface, scoped to exactly the one section the original decision doc calls for — nothing else (no stats, no other tabs) — see `docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md`. Its frontend lives in the separate `apps/admin` app, not `apps/web` — see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md` and the "CORS and multi-origin frontends" section above. `AdminController` (`GET /admin/moderation/hidden`, `POST /admin/{requests,replies}/:id/{restore,delete}`) sits behind `@UseGuards(SessionGuard, AdminGuard)` — `SessionGuard` resolves `request.userId` first, then `AdminGuard` (`src/admin/admin.guard.ts`) checks that id against the `ADMIN_USER_IDS` env var (comma-separated user ids, no role table — matches the "관리자 식별" decision). "복구" (`restore`) unhides *and* stamps `reviewedAt`; "영구 삭제" (`delete`) soft-deletes via `deletedAt`, same as everywhere else — a real row delete never happens. `requests`/`replies` both gained a `reviewedAt` column: once set, `ReportsService.create()`'s auto-hide count only considers reports created after it, so an old report that already contributed to a past auto-hide can't immediately re-trigger the next one the moment one more person reports again — `ReportsRepository.countDistinctReporters()`'s optional `since` param implements this. The admin list view's own `reportCount` is the unscoped all-time total (for context on severity), which is intentionally a different number from what actually drives the auto-hide re-trigger.

## Still-empty modules

`users`, `auth`, `requests`, `replies`, `reports`, `moderation`, and `admin` are all implemented now. Nothing left empty at the module level.

## Frontend wiring status

Auth, `/today`, `/answer`, and `/read` all call this API for real now (`apps/web/app/lib/`, `today/useTodayComposer.ts`, `answer/useAnswerQueue.ts`, `read/useReadFeed.ts`). Only `today/prototype/useMyRecords.ts` (for a future `/me`) is still localStorage-backed, per its own header comment — not wired to anything yet. `apps/admin` is a second, separate frontend consumer (the moderation screen) — see "Admin" above.

## Read feed (`GET /requests/feed`) and saved replies

`/read` needs a whole thread on screen at once (a request plus every reply), which creates a problem the single-item `/answer` screen never had: `authorId`/`guestId` never cross the HTTP boundary, so the frontend can't tell whether two replies in the same thread came from the same person. `RequestsRepository.findFeed()` + `assignAuthorSlots()` (`src/requests/feed-author-slots.ts`) solve this server-side — each distinct identity in a thread gets an incrementing `authorSlot` (0, 1, 2, ...) that the frontend maps to a randomly-picked nickname (`apps/web/app/read/labels.ts`). The slot carries no identity outside that one thread; see docs/decisions/2026-08-23-onseol-read-feed-decisions.md for why per-thread (not cross-feed, not sequential "익명 N") was chosen.

Saving a reply ("마음에 남기기") is member-only, matching hold — `src/saved-replies/` (`SavedRepliesController`, routes on `/replies`: `POST`/`DELETE /replies/:id/save`, `GET /replies/saved`) follows the same shape as `answer-interactions` but as its own module/table (`saved_replies`) since it's a many-to-many bookmark, not a per-viewer queue exclusion.
