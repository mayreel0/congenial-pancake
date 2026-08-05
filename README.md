# Comfort Praise MVP

A Korean-first comfort and praise exchange app where users can write one daily request for encouragement and leave one thoughtful reply on another person's request.

For Korean setup instructions, see [docs/RUNNING.ko.md](docs/RUNNING.ko.md).

## Features

- Email/password signup, Auth.js credentials login, and optional Naver OAuth login.
- Web-first comfort request and reply MVP.
- One comfort request per user per Korean local day.
- One reply per user per comfort request, with reply bodies capped at 1000 characters.
- Anonymous or nickname display modes.
- In-app notifications for the first reply on a request.
- Quiet moderation for risky text, reports, trust score changes, shadow bans, and service bans.
- AI provider configuration and usage controls kept for future writing assistance and safety filtering.
- No automatic public AI replies in the comfort MVP.
- Moderator review actions for held requests/replies, reports, trust score changes, AI usage logs, and worker heartbeat.
- Personal activity page for my comfort requests and replies.
- Unit, integration, and Playwright smoke tests.

## Tech Stack

- Next.js App Router, React, TypeScript
- PostgreSQL, Prisma
- Auth.js
- Gemini API by default, with OpenAI as a switchable provider for future AI assistance
- Vitest, Testing Library, Playwright

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL
- Optional Gemini/OpenAI provider keys for future AI assistance and quality-filter work

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
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.1-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

Generate a local auth secret with:

```bash
openssl rand -base64 32
```

Naver OAuth is enabled only when both `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` are set. Signup suggests a random nickname, prevents duplicate emails and nicknames, and lets OAuth users confirm their community nickname on first login before continuing. Sanctioned users should recover or appeal the existing account instead of bypassing sanctions with a new signup.

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

For production or shared environments, apply migrations with:

```bash
npm run prisma:deploy
```

Seed local data:

```bash
npm run prisma:seed
```

Seeded accounts use the password `password1234`:

- `author@example.com`
- `moderator@example.com`

Run the app:

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
npm run jobs:dev     # Start the comfort MVP diagnostic heartbeat worker
npm run prisma:deploy # Apply committed Prisma migrations
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

MVP에서는 AI가 공개 답변을 자동 작성하지 않습니다. AI provider 설정은 이후 작성 보조와 콘텐츠 품질 필터 기능을 위해 유지됩니다.

`npm run jobs:dev` starts a diagnostic worker that records `WorkerHeartbeat` and logs that no automatic AI praise worker runs in the comfort MVP. Moderators can see recent, stale, warning, or unknown worker state in `/moderation`.

Moderators can manage AI configuration at `/moderation`. The AI controls are stored in the database with default values of enabled, 100 daily AI jobs, and 300 daily generated comments for future assistance/filtering work. The moderation page also shows recent AI usage events, review actions for held comfort requests/replies and reports, trust score controls, and worker health.

## Operations

See [docs/OPERATIONS.ko.md](docs/OPERATIONS.ko.md) for the deployment checklist, smoke checks, worker heartbeat verification, and branch cleanup flow.

## Current Limitations

- No hosted environment is configured yet.
- PostgreSQL integration should be verified in a real integration environment before launch.
- Native/mobile app push notifications are not implemented yet.
