# apps/api — Nest.js backend

App-specific rules only. Project-wide rules (branching policy, decision-confirmation process, etc.) live in the root `AGENTS.md`.

## Running

- `pnpm --filter api start:dev` — local run. Requires `.env` (see `.env.example`; `DATABASE_URL` must point at a local Postgres).
- `pnpm --filter api lint` / `typecheck` (`tsc --noEmit`) / `test` / `build` — all four must pass before a PR.
- `pnpm --filter api db:generate` — generate migration SQL from schema (`src/database/schema/*.schema.ts`) changes.
- `pnpm --filter api db:migrate` — apply generated migrations to the DB at `DATABASE_URL`.

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

`requests`/`replies` allow writing without logging in — see `docs/decisions/2026-08-21-onseol-anonymous-posting-decisions.md`. Routes that accept both use `OptionalSessionGuard` (`src/auth/optional-session.guard.ts`) instead of `SessionGuard`: it never rejects the request, it just sets `request.userId` when a valid session exists. Read it with `OptionalCurrentUser()` (`string | undefined`), not `CurrentUser()` (which still throws outside a guarded route). Anonymous callers identify themselves via the `X-Guest-Id` header (`GuestId()` decorator, `src/common/decorators/guest-id.decorator.ts`) — a client-generated id the server trusts without verification. `requests.author_id`/`replies.author_id` are nullable with a matching `guest_id` column and a `CHECK (author_id IS NOT NULL OR guest_id IS NOT NULL)` constraint; guests are capped at 1 request and 5 replies per request (enforced in `RequestsService`/`RepliesService`, not the DB, except the 1-request cap which is a unique constraint on `guest_id`). `reports` did **not** get this treatment — guests can't report at all (`SessionGuard`, not optional), so `reports.reporter_id` stays `NOT NULL` and the 3-distinct-reporter threshold is unaffected.

## Answer queue (skip/hold)

`GET /requests/queue` returns the single next request a viewer should answer — not a list, since the ranking/exclusion rules (freshness, reply cap, self/already-replied/skipped/held exclusion) live entirely in `RequestsRepository.findQueueCandidate()` and shouldn't be reimplemented client-side. Rules are grounded in `docs/decisions/2026-08-22-onseol-answer-queue-decisions.md`: 60-hour freshness window (hard exclusion, no fallback), fewest-replies-first with a cap of 5 per request (soft exclusion — falls back to ignoring the cap only when every eligible request has already hit it), and skip/hold are per-viewer only, never a ranking signal for anyone else.

Skip and hold live in one table (`answer_interactions`, `src/answer-interactions/`) with a `status` enum, following the same nullable-`authorId`/`guestId` pattern as `requests`/`replies` — but unlike those, skip allows guests while hold requires a session (`POST /requests/:id/skip` uses `OptionalSessionGuard`, `POST /requests/:id/hold` and `GET /requests/held` use `SessionGuard`). A `CHECK` constraint enforces "guest rows may only be `skipped`" at the DB level. `RepliesService.create()` clears any interaction row for the (request, viewer) pair on a successful reply — answering a held request resolves it. `GET /replies/mine` (a separate `RepliesMineController`, since `RepliesController` is nested under `requests/:requestId/replies`) returns a viewer's own answer log joined with the original request.

## Error codes

Every error response is `{ statusCode, code, message }`, produced by the global `AppExceptionFilter` (`src/common/filters/`, registered in `main.ts`). Domain errors extend `AppException` (`src/common/exceptions/app.exception.ts`) with a stable `code` string the frontend can branch on (e.g. `AUTH_EMAIL_TAKEN`, `AUTH_INVALID_CREDENTIALS`). Plain Nest `HttpException`s (like `ValidationPipe`'s 400s) get a generic code derived from their status (`VALIDATION_ERROR`, `NOT_FOUND`, ...); anything unexpected becomes a 500 with `INTERNAL_ERROR` and a generic message — internals never leak into the response.

## DB / reporting & admin rules

Schema, the report threshold, and admin identification are all grounded in `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md` — in particular, the `reports` table's `(target_type, target_id, reporter_id)` unique constraint and the "3 distinct reporters" auto-hide rule must be preserved across schema changes. `ReportsService` inserts the report row, counts distinct reporters, then hands that count to `ModerationService.evaluateAutoHide()` (`src/moderation/`), which sets `hidden` on the target via `RequestsService.hide()`/`RepliesService.hide()` — `ModerationService` never touches the `reports` table itself.

## Still-empty modules

Only `admin` currently has just a folder and an empty `@Module({})` — it gets filled in by its own feature PR (whitelist guard + "신고 검토" review controller, per `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md`). `users`, `auth`, `requests`, `replies`, `reports`, and `moderation` are all implemented now.

## Frontend wiring status

Auth and `/today` (`apps/web/app/lib/auth/`, `apps/web/app/lib/requests/` + `today/useTodayComposer.ts`) call this API for real. `/answer` and `/read` (`apps/web/app/today/prototype/useAnswerQueue.ts`, `useReadFeed.ts`, `useMyRecords.ts`) are still 100% localStorage — the queue/skip/hold routes above exist but aren't consumed by the frontend yet; that's the next round. Routes without a frontend consumer yet are verified via unit tests and manual `curl` against a local Postgres.
