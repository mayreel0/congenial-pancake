# Praise Community MVP

A Next.js community app where authenticated users can share moments they want praise for and receive supportive comments in real time. The app includes public reading, authenticated posting/commenting, quiet moderation, trust-based sanctions, AI praise jobs, rankings, and a personal activity page.

For Korean setup instructions, see [docs/RUNNING.ko.md](docs/RUNNING.ko.md).

## Features

- Authenticated posting and commenting with Auth.js credentials.
- Public praise feed and post detail rooms.
- Socket.IO realtime updates for new comments.
- Anonymous or nickname display modes.
- Thank-you reactions and author replies.
- Quiet moderation for risky text, reports, trust score changes, shadow bans, and service bans.
- BullMQ/Redis-backed AI praise job model for initial and inactivity praise.
- Moderator-managed AI on/off controls and daily AI usage limits.
- Moderator review actions for held comments, reports, trust score changes, AI usage logs, and ranking recomputation.
- Ranking snapshots and a personal activity page.
- Unit, integration, and Playwright smoke tests.

## Tech Stack

- Next.js App Router, React, TypeScript
- PostgreSQL, Prisma
- Auth.js
- Socket.IO
- BullMQ, Redis
- Gemini API by default, with OpenAI as a switchable provider
- Vitest, Testing Library, Playwright

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL
- Redis
- Gemini API key for AI praise generation, or an OpenAI API key when `AI_PROVIDER="openai"`

## Environment

Copy the example file and edit values for your local machine:

```bash
cp .env.example .env
```

Required variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community"
AUTH_SECRET="replace-with-local-secret"
AUTH_URL="http://localhost:3000"
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.1-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

Generate a local auth secret with:

```bash
openssl rand -base64 32
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create the database if it does not exist:

```bash
createdb praise_community
```

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Seed local data:

```bash
npm run prisma:seed
```

Seeded accounts use the password `password1234`:

- `author@example.com`
- `moderator@example.com`

Start Redis, then run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Scripts

```bash
npm run dev          # Start the Next.js custom server with Socket.IO
npm run build        # Production build
npm run start        # Start production server
npm run test         # Unit and integration tests
npm run test:e2e     # Playwright smoke tests
npm run lint         # ESLint
npm run jobs:dev     # Start AI praise and ranking workers
npm run prisma:seed  # Seed local database
```

## CI

Pull requests and pushes to `main` run GitHub Actions CI. The workflow installs dependencies, generates the Prisma Client, runs lint, runs unit/integration tests, builds the app, and runs TypeScript checking.

## Testing Notes

- `npm run test` does not require a live PostgreSQL or Redis instance for the current unit/integration test set.
- `npm run test:e2e` skips database-backed smoke tests when `DATABASE_URL` is not set.
- To run Playwright fully, install browsers and provide a working database:

```bash
npx playwright install
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community" npm run test:e2e
```

## Background Jobs

AI praise creation depends on Redis and the configured AI provider key. Gemini is the default provider via `AI_PROVIDER="gemini"`, `GEMINI_API_KEY`, and `GEMINI_MODEL`. Set `AI_PROVIDER="openai"` with `OPENAI_API_KEY` and `OPENAI_MODEL` to switch providers. The domain logic and worker factories are implemented in `src/server/jobs.ts`; production deployment should run worker processes for AI praise and ranking recomputation, or run `npm run jobs:dev` for local combined workers.

Moderators can manage AI praise generation at `/moderation`. The AI controls are stored in the database with default values of enabled, 100 daily AI jobs, and 300 daily AI-generated comments. Disabled or quota-limited jobs are skipped before Gemini/OpenAI is called, and usage events record completed, skipped, and failed AI work for the current UTC day. The moderation page also shows recent AI usage events, review actions for held comments and reports, trust score controls, and a manual ranking recomputation action.

## Current Limitations

- No hosted environment is configured yet.
- AI/Redis/PostgreSQL integration should be verified in a real integration environment before launch.
- Scheduled ranking recomputation still needs production scheduler wiring.
