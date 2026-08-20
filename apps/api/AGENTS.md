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

This wasn't needed yet — `health` has no input, and `auth`'s session pieces aren't wired to routes yet — but it's the convention starting with the first real controller (the login PR).

## OAuth (planned, not yet implemented)

Login will support Google, Naver, and Kakao in addition to email/password. This is compatible with the DB-session design as-is: an OAuth callback looks up or creates a `users` row, then issues a normal session via `SessionService` — no separate auth path. Not yet reflected in the `users` schema (e.g. `password_hash` will need to become nullable for OAuth-only accounts, and an identity/linking table is likely needed) — do that as part of the login PR, not before there's a controller to use it.

## Error codes (planned, not yet implemented)

A consistent error response shape (HTTP status + a stable domain error code the frontend can branch on) and a global exception filter land with the first real routes (the login PR) — not before, since there's nothing yet to standardize against.

## DB / reporting & admin rules

Schema, the report threshold, and admin identification are all grounded in `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md` — in particular, the `reports` table's `(target_type, target_id, reporter_id)` unique constraint and the "3 distinct reporters" auto-hide rule must be preserved across schema changes.

## Still-empty modules

`users`, `requests`, `replies`, `reports`, `moderation`, `admin` currently have only a folder and an empty `@Module({})` — no real providers/controllers yet. Each gets filled in by its own feature PR. Leaving them empty is intentional, not an omission.
