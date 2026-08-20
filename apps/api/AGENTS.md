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

## Error codes

Every error response is `{ statusCode, code, message }`, produced by the global `AppExceptionFilter` (`src/common/filters/`, registered in `main.ts`). Domain errors extend `AppException` (`src/common/exceptions/app.exception.ts`) with a stable `code` string the frontend can branch on (e.g. `AUTH_EMAIL_TAKEN`, `AUTH_INVALID_CREDENTIALS`). Plain Nest `HttpException`s (like `ValidationPipe`'s 400s) get a generic code derived from their status (`VALIDATION_ERROR`, `NOT_FOUND`, ...); anything unexpected becomes a 500 with `INTERNAL_ERROR` and a generic message — internals never leak into the response.

## DB / reporting & admin rules

Schema, the report threshold, and admin identification are all grounded in `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md` — in particular, the `reports` table's `(target_type, target_id, reporter_id)` unique constraint and the "3 distinct reporters" auto-hide rule must be preserved across schema changes.

## Still-empty modules

`requests`, `replies`, `reports`, `moderation`, `admin` currently have only a folder and an empty `@Module({})` — no real providers/controllers yet (`users` and `auth` are now implemented). Each gets filled in by its own feature PR. Leaving them empty is intentional, not an omission.

## Not yet wired to the frontend

`apps/web` is still a 100% localStorage prototype — it does not call this API yet. `/auth/*` routes are verified via unit tests and manual `curl` against a local Postgres, not from the actual UI. Real frontend integration (`/login` form, Google button, session-aware nav) is a separate, later PR.
