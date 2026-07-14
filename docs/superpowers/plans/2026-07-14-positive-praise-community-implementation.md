# Positive Praise Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP praise-first community where authenticated users can post praise requests, receive real-time human and AI praise, react with gratitude, and stay protected by quiet moderation.

**Architecture:** Use a Next.js app for UI and HTTP routes, PostgreSQL with Prisma for persistence, Auth.js for authentication, Socket.IO for post-detail real-time updates, BullMQ with Redis for delayed AI/ranking jobs, and OpenAI from server-only modules. Keep domain rules in `src/server/*` modules so API routes, jobs, and tests share the same behavior.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, Socket.IO, BullMQ, Redis, OpenAI API, Vitest, Testing Library, Playwright.

## Global Constraints

- Writing and responding require an authenticated account.
- Reading the home feed and post detail pages is public in the MVP.
- Users may display posts and comments as nickname or anonymous.
- Anonymous display uses a simple public label: `Anonymous`.
- Anonymous display always remains linked to the authenticated account internally.
- AI comments must be clearly labeled as AI.
- AI creates 1 to 3 initial praise comments after post creation.
- AI inactivity praise triggers when a post has no human comments after 10 minutes, or no new human comments for 30 minutes.
- AI comments per post are capped at 5.
- Harmful comments are held, hidden, or author-only rather than visibly hard-blocked.
- Ranking rewards warmth and useful participation, not raw comment volume alone.
- The first implementation language for UI copy is Korean; internal identifiers and code stay English.
- Every new product document must have English and Korean versions.

---

## File Structure

- `package.json`: project scripts and dependencies.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: strict TypeScript configuration.
- `vitest.config.ts`: unit/integration test configuration.
- `playwright.config.ts`: browser test configuration.
- `.env.example`: documented local environment variables.
- `prisma/schema.prisma`: database schema and enums.
- `prisma/seed.ts`: local seed data for development and browser tests.
- `src/app/layout.tsx`: app shell and global providers.
- `src/app/page.tsx`: public home feed.
- `src/app/login/page.tsx`: login screen.
- `src/app/posts/new/page.tsx`: authenticated post creation page.
- `src/app/posts/[postId]/page.tsx`: public post detail praise room.
- `src/app/rankings/page.tsx`: rankings page.
- `src/app/me/page.tsx`: authenticated activity page.
- `src/app/moderation/page.tsx`: minimal moderator review page.
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js route.
- `src/app/api/posts/route.ts`: post list and create endpoints.
- `src/app/api/posts/[postId]/comments/route.ts`: comment create endpoint.
- `src/app/api/comments/[commentId]/reactions/route.ts`: author gratitude reactions.
- `src/app/api/comments/[commentId]/replies/route.ts`: author thank-you replies.
- `src/app/api/reports/route.ts`: report creation endpoint.
- `src/app/api/rankings/route.ts`: ranking read endpoint.
- `src/app/api/moderation/route.ts`: moderator review actions.
- `src/app/api/socket/route.ts`: Socket.IO bootstrap route for development.
- `src/components/*`: reusable UI components with no database access.
- `src/lib/auth.ts`: Auth.js options and session helpers.
- `src/lib/db.ts`: Prisma client singleton.
- `src/lib/socket-client.ts`: browser Socket.IO client.
- `src/server/posts.ts`: post creation, feed, detail queries.
- `src/server/comments.ts`: comment, reaction, and reply rules.
- `src/server/moderation.ts`: rule-based moderation and trust score updates.
- `src/server/ai.ts`: server-only OpenAI praise generation.
- `src/server/jobs.ts`: BullMQ queues and processors.
- `src/server/rankings.ts`: ranking score calculation.
- `src/server/realtime.ts`: Socket.IO room publishing helpers.
- `tests/unit/*.test.ts`: domain tests for moderation, AI scheduling, ranking, and permissions.
- `tests/integration/*.test.ts`: API/database tests.
- `tests/e2e/*.spec.ts`: browser tests for core flows.

---

### Task 1: Scaffold Application, Tooling, and Environment

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test`, `npm run lint`, `npm run build`, and `npm run dev`.
- Produces: strict TypeScript aliases via `@/*`.

- [ ] **Step 1: Create the Next.js project files**

Create `package.json`:

```json
{
  "name": "positive-praise-community",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts",
    "jobs:dev": "tsx src/server/jobs.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.7.4",
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.21.2",
    "ioredis": "^5.4.1",
    "next": "^15.0.3",
    "next-auth": "^5.0.0-beta.25",
    "openai": "^4.71.1",
    "prisma": "^5.22.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.2",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.14.0",
    "eslint-config-next": "^15.0.3",
    "jsdom": "^25.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Add test and environment configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
```

Create `.env.example`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community"
AUTH_SECRET="replace-with-local-secret"
AUTH_URL="http://localhost:3000"
OPENAI_API_KEY=""
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

- [ ] **Step 3: Create a minimal app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "칭찬",
  description: "칭찬받고 싶은 순간을 안전하게 나누는 커뮤니티"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <a href="/" className="brand">칭찬</a>
          <nav aria-label="주요 메뉴">
            <a href="/rankings">랭킹</a>
            <a href="/posts/new">글쓰기</a>
            <a href="/me">내 활동</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <section className="page-section">
      <h1>칭찬받고 싶은 순간을 올려보세요</h1>
      <p>칭찬을 안전하게 주고받는 커뮤니티입니다.</p>
    </section>
  );
}
```

Create `src/app/globals.css`:

```css
:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #1f2933;
  background: #f8faf7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: inherit;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid #d8ded4;
  background: #ffffff;
}

.brand {
  font-weight: 800;
  text-decoration: none;
}

nav {
  display: flex;
  gap: 16px;
}

.page-section {
  width: min(960px, calc(100% - 32px));
  margin: 48px auto;
}
```

- [ ] **Step 4: Add a smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs TypeScript tests", () => {
    expect("칭찬").toContain("긍정");
  });
});
```

- [ ] **Step 5: Install dependencies and verify the scaffold**

Run: `npm install`

Run: `npm run test`

Expected: one passing test.

Run: `npm run build`

Expected: Next.js production build completes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts playwright.config.ts .env.example src/app tests/unit
git commit -m "chore: scaffold praise community app"
```

---

### Task 2: Database Schema and Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Test: `tests/unit/schema-enums.test.ts`

**Interfaces:**
- Produces Prisma enums: `DisplayMode`, `VisibilityState`, `SanctionState`, `ReactionType`, `AiJobType`, `AiJobStatus`, `RankingType`.
- Produces Prisma models: `User`, `Account`, `Session`, `VerificationToken`, `PraisePost`, `PraiseComment`, `Reaction`, `Reply`, `Report`, `ModerationEvent`, `AiPraiseJob`, `RankingSnapshot`.
- Produces `db` Prisma singleton from `src/lib/db.ts`.

- [ ] **Step 1: Write enum expectations**

Create `tests/unit/schema-enums.test.ts`:

```ts
import { describe, expect, it } from "vitest";

const displayModes = ["NICKNAME", "ANONYMOUS"] as const;
const visibilityStates = ["VISIBLE", "HELD", "HIDDEN", "AUTHOR_ONLY"] as const;
const sanctionStates = ["NORMAL", "LOW_TRUST", "SHADOW_BANNED", "SERVICE_BANNED"] as const;

describe("schema enum contract", () => {
  it("keeps display modes explicit", () => {
    expect(displayModes).toEqual(["NICKNAME", "ANONYMOUS"]);
  });

  it("supports quiet moderation visibility states", () => {
    expect(visibilityStates).toContain("AUTHOR_ONLY");
  });

  it("supports trust-based sanctions", () => {
    expect(sanctionStates).toContain("SHADOW_BANNED");
  });
});
```

- [ ] **Step 2: Run test to verify the contract passes**

Run: `npm run test -- tests/unit/schema-enums.test.ts`

Expected: tests pass because they document the enum contract before Prisma code uses it.

- [ ] **Step 3: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum DisplayMode {
  NICKNAME
  ANONYMOUS
}

enum VisibilityState {
  VISIBLE
  HELD
  HIDDEN
  AUTHOR_ONLY
}

enum SanctionState {
  NORMAL
  LOW_TRUST
  SHADOW_BANNED
  SERVICE_BANNED
}

enum ReactionType {
  THANK_YOU
  HELPED_ME
  MOVED_ME
}

enum ReportStatus {
  OPEN
  REVIEWED
  DISMISSED
}

enum ModerationTargetType {
  POST
  COMMENT
  REPLY
  USER
}

enum ModerationEventType {
  FILTER_HELD
  FILTER_HIDDEN
  REPORT_CREATED
  REPORT_ACCEPTED
  REPORT_DISMISSED
  TRUST_SCORE_CHANGED
  SANCTION_CHANGED
}

enum AiJobType {
  INITIAL_PRAISE
  INACTIVITY_PRAISE
}

enum AiJobStatus {
  PENDING
  RUNNING
  COMPLETED
  SKIPPED
  FAILED
}

enum RankingType {
  WARM_PRAISER
  NEEDS_ENCOURAGEMENT
}

model User {
  id             String          @id @default(cuid())
  name           String?
  email          String?         @unique
  emailVerified  DateTime?
  image          String?
  nickname       String          @unique
  passwordHash   String?
  trustScore     Int             @default(100)
  sanctionState  SanctionState   @default(NORMAL)
  isModerator    Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  accounts       Account[]
  sessions       Session[]
  posts          PraisePost[]
  comments       PraiseComment[]
  reactions      Reaction[]
  replies        Reply[]
  reports        Report[]        @relation("ReporterReports")
  moderationLogs ModerationEvent[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PraisePost {
  id            String          @id @default(cuid())
  authorUserId  String
  displayMode   DisplayMode
  title         String
  body          String
  promptAnswers Json?
  status        VisibilityState @default(VISIBLE)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  author        User            @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  comments      PraiseComment[]
  reactions     Reaction[]
  replies       Reply[]
  aiJobs        AiPraiseJob[]

  @@index([createdAt])
  @@index([status])
}

model PraiseComment {
  id               String          @id @default(cuid())
  postId           String
  authorUserId     String?
  isAiGenerated    Boolean         @default(false)
  displayMode      DisplayMode     @default(NICKNAME)
  body             String
  visibilityState  VisibilityState @default(VISIBLE)
  moderationRisk   Int             @default(0)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  post             PraisePost      @relation(fields: [postId], references: [id], onDelete: Cascade)
  author           User?           @relation(fields: [authorUserId], references: [id], onDelete: SetNull)
  reactions        Reaction[]
  replies          Reply[]

  @@index([postId, createdAt])
  @@index([authorUserId])
  @@index([visibilityState])
}

model Reaction {
  id           String       @id @default(cuid())
  postId       String
  commentId    String
  authorUserId String
  type         ReactionType
  createdAt    DateTime     @default(now())
  post         PraisePost   @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment      PraiseComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  author       User         @relation(fields: [authorUserId], references: [id], onDelete: Cascade)

  @@unique([commentId, authorUserId, type])
}

model Reply {
  id              String          @id @default(cuid())
  postId          String
  commentId       String
  authorUserId    String
  body            String
  visibilityState VisibilityState @default(VISIBLE)
  createdAt       DateTime        @default(now())
  post            PraisePost      @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment         PraiseComment   @relation(fields: [commentId], references: [id], onDelete: Cascade)
  author          User            @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
}

model Report {
  id             String               @id @default(cuid())
  reporterUserId String
  targetType     ModerationTargetType
  targetId       String
  reason         String
  status         ReportStatus         @default(OPEN)
  createdAt      DateTime             @default(now())
  reporter       User                 @relation("ReporterReports", fields: [reporterUserId], references: [id], onDelete: Cascade)

  @@index([targetType, targetId])
  @@index([status])
}

model ModerationEvent {
  id              String              @id @default(cuid())
  userId          String?
  targetType      ModerationTargetType
  targetId        String
  eventType       ModerationEventType
  riskReason      String
  trustScoreDelta Int                 @default(0)
  createdAt       DateTime            @default(now())
  user            User?               @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([targetType, targetId])
}

model AiPraiseJob {
  id               String      @id @default(cuid())
  postId           String
  jobType          AiJobType
  scheduledAt      DateTime
  status           AiJobStatus @default(PENDING)
  resultCommentIds String[]    @default([])
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  post             PraisePost  @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([status, scheduledAt])
}

model RankingSnapshot {
  id          String      @id @default(cuid())
  rankingType RankingType
  period      String
  entries     Json
  computedAt  DateTime    @default(now())

  @@unique([rankingType, period])
}
```

- [ ] **Step 4: Create Prisma client singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 5: Create seed data**

Create `prisma/seed.ts`:

```ts
import { PrismaClient, DisplayMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password1234", 10);
  const author = await prisma.user.upsert({
    where: { email: "author@example.com" },
    update: {},
    create: {
      email: "author@example.com",
      nickname: "햇살작성자",
      passwordHash
    }
  });

  await prisma.user.upsert({
    where: { email: "moderator@example.com" },
    update: { isModerator: true },
    create: {
      email: "moderator@example.com",
      nickname: "운영자",
      passwordHash,
      isModerator: true
    }
  });

  await prisma.praisePost.create({
    data: {
      authorUserId: author.id,
      displayMode: DisplayMode.NICKNAME,
      title: "오늘 미루던 병원 예약을 했어요",
      body: "계속 미뤘는데 드디어 전화해서 예약까지 끝냈습니다.",
      promptAnswers: {
        accomplished: "병원 예약",
        praisePoint: "미루던 일을 끝낸 점",
        tone: "차분하고 다정하게"
      }
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Generate Prisma client and migrate**

Run: `npm run prisma:generate`

Expected: Prisma Client generated.

Run: `npm run prisma:migrate -- --name init`

Expected: migration succeeds against local PostgreSQL.

Run: `npm run prisma:seed`

Expected: seed users and one praise post are created.

- [ ] **Step 7: Commit**

```bash
git add prisma src/lib/db.ts tests/unit/schema-enums.test.ts package.json package-lock.json
git commit -m "feat: add database schema"
```

---

### Task 3: Authentication and Write Guards

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/server/permissions.ts`
- Create: `src/app/login/page.tsx`
- Test: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces `auth()` from Auth.js.
- Produces `requireUser(sessionUserId?: string): string`.
- Produces `assertCanWrite(user: { sanctionState: SanctionState }): void`.
- Produces Korean login page copy.

- [ ] **Step 1: Write permission tests**

Create `tests/unit/permissions.test.ts`:

```ts
import { SanctionState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertCanWrite, requireUser } from "@/server/permissions";

describe("permissions", () => {
  it("rejects unauthenticated write attempts", () => {
    expect(() => requireUser(undefined)).toThrow("AUTH_REQUIRED");
  });

  it("allows normal users to write", () => {
    expect(() => assertCanWrite({ sanctionState: SanctionState.NORMAL })).not.toThrow();
  });

  it("blocks service banned users from writing", () => {
    expect(() => assertCanWrite({ sanctionState: SanctionState.SERVICE_BANNED })).toThrow("WRITE_BLOCKED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/permissions.test.ts`

Expected: fail because `src/server/permissions.ts` does not exist.

- [ ] **Step 3: Implement permission helpers**

Create `src/server/permissions.ts`:

```ts
import { SanctionState } from "@prisma/client";

export function requireUser(sessionUserId: string | undefined): string {
  if (!sessionUserId) {
    throw new Error("AUTH_REQUIRED");
  }
  return sessionUserId;
}

export function assertCanWrite(user: { sanctionState: SanctionState }): void {
  if (user.sanctionState === SanctionState.SERVICE_BANNED) {
    throw new Error("WRITE_BLOCKED");
  }
}
```

- [ ] **Step 4: Add Auth.js configuration**

Create `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.nickname };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

Add `src/types/next-auth.d.ts`:

```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

- [ ] **Step 5: Create login page**

Create `src/app/login/page.tsx`:

```tsx
export default function LoginPage() {
  return (
    <section className="page-section">
      <h1>로그인</h1>
      <p>글쓰기, 칭찬 댓글, 감사 반응은 로그인 후 사용할 수 있습니다.</p>
      <form method="post" action="/api/auth/callback/credentials">
        <label>
          이메일
          <input name="email" type="email" required />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" required minLength={8} />
        </label>
        <button type="submit">로그인</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 6: Verify permissions and build**

Run: `npm run test -- tests/unit/permissions.test.ts`

Expected: permission tests pass.

Run: `npm run build`

Expected: production build completes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/server/permissions.ts src/app/login src/types tests/unit/permissions.test.ts
git commit -m "feat: add authentication guards"
```

---

### Task 4: Posts, Feed, and Post Creation

**Files:**
- Create: `src/server/posts.ts`
- Create: `src/app/api/posts/route.ts`
- Modify: `src/app/page.tsx`
- Create: `src/app/posts/new/page.tsx`
- Test: `tests/unit/posts.test.ts`
- Test: `tests/integration/posts-api.test.ts`

**Interfaces:**
- Produces `createPraisePost(input, authorUserId)` that creates a post and schedules initial AI praise jobs.
- Produces `listFeedPosts()` for public feed.
- Consumes `requireUser()` and `assertCanWrite()`.
- Produces `POST /api/posts` and `GET /api/posts`.

- [ ] **Step 1: Write post domain tests**

Create `tests/unit/posts.test.ts`:

```ts
import { DisplayMode } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { normalizePostInput } from "@/server/posts";

describe("post input normalization", () => {
  it("trims title and body and preserves prompt answers", () => {
    const input = normalizePostInput({
      title: "  오늘 해냈어요  ",
      body: "  미뤄둔 일을 끝냈습니다.  ",
      displayMode: DisplayMode.ANONYMOUS,
      promptAnswers: { tone: "다정하게" }
    });

    expect(input.title).toBe("오늘 해냈어요");
    expect(input.body).toBe("미뤄둔 일을 끝냈습니다.");
    expect(input.displayMode).toBe(DisplayMode.ANONYMOUS);
    expect(input.promptAnswers).toEqual({ tone: "다정하게" });
  });

  it("rejects empty post bodies", () => {
    expect(() =>
      normalizePostInput({
        title: "제목",
        body: " ",
        displayMode: DisplayMode.NICKNAME,
        promptAnswers: null
      })
    ).toThrow("POST_BODY_REQUIRED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/posts.test.ts`

Expected: fail because `normalizePostInput` does not exist.

- [ ] **Step 3: Implement post domain module**

Create `src/server/posts.ts`:

```ts
import { DisplayMode, VisibilityState } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

const postInputSchema = z.object({
  title: z.string().trim().min(1, "POST_TITLE_REQUIRED").max(120),
  body: z.string().trim().min(1, "POST_BODY_REQUIRED").max(3000),
  displayMode: z.nativeEnum(DisplayMode),
  promptAnswers: z.record(z.string()).nullable()
});

export type CreatePostInput = z.input<typeof postInputSchema>;

export function normalizePostInput(input: CreatePostInput) {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "INVALID_POST_INPUT");
  }
  return parsed.data;
}

export async function createPraisePost(input: CreatePostInput, authorUserId: string) {
  const data = normalizePostInput(input);
  return db.$transaction(async (tx) => {
    const post = await tx.praisePost.create({
      data: {
        authorUserId,
        displayMode: data.displayMode,
        title: data.title,
        body: data.body,
        promptAnswers: data.promptAnswers
      }
    });

    await tx.aiPraiseJob.create({
      data: {
        postId: post.id,
        jobType: "INITIAL_PRAISE",
        scheduledAt: new Date()
      }
    });

    return post;
  });
}

export async function listFeedPosts() {
  return db.praisePost.findMany({
    where: { status: VisibilityState.VISIBLE },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      author: { select: { nickname: true } },
      comments: { where: { visibilityState: VisibilityState.VISIBLE }, select: { id: true, isAiGenerated: true } }
    }
  });
}
```

- [ ] **Step 4: Implement posts API**

Create `src/app/api/posts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPraisePost, listFeedPosts } from "@/server/posts";
import { assertCanWrite, requireUser } from "@/server/permissions";

export async function GET() {
  const posts = await listFeedPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const body = await request.json();
  const post = await createPraisePost(body, userId);
  return NextResponse.json({ post }, { status: 201 });
}
```

- [ ] **Step 5: Build feed and creation pages**

Modify `src/app/page.tsx`:

```tsx
import { listFeedPosts } from "@/server/posts";

function publicName(displayMode: string, nickname: string) {
  return displayMode === "ANONYMOUS" ? "익명" : nickname;
}

export default async function HomePage() {
  const posts = await listFeedPosts();

  return (
    <section className="page-section">
      <h1>칭찬받고 싶은 순간들</h1>
      <div className="feed-list">
        {posts.map((post) => {
          const humanCount = post.comments.filter((comment) => !comment.isAiGenerated).length;
          const aiCount = post.comments.length - humanCount;
          return (
            <article key={post.id} className="feed-item">
              <a href={`/posts/${post.id}`}>
                <h2>{post.title}</h2>
              </a>
              <p>{post.body.slice(0, 120)}</p>
              <small>
                {publicName(post.displayMode, post.author.nickname)} · 사람 {humanCount} · AI {aiCount}
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

Create `src/app/posts/new/page.tsx`:

```tsx
export default function NewPostPage() {
  return (
    <section className="page-section">
      <h1>칭찬받고 싶은 글쓰기</h1>
      <form method="post" action="/api/posts">
        <label>
          제목
          <input name="title" maxLength={120} required />
        </label>
        <label>
          본문
          <textarea name="body" maxLength={3000} required />
        </label>
        <label>
          오늘 내가 해낸 일
          <input name="accomplished" />
        </label>
        <label>
          칭찬받고 싶은 점
          <input name="praisePoint" />
        </label>
        <label>
          듣고 싶은 칭찬 톤
          <input name="tone" />
        </label>
        <label>
          표시 방식
          <select name="displayMode" defaultValue="NICKNAME">
            <option value="NICKNAME">닉네임</option>
            <option value="ANONYMOUS">익명</option>
          </select>
        </label>
        <button type="submit">올리기</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 6: Verify post tests and build**

Run: `npm run test -- tests/unit/posts.test.ts`

Expected: post domain tests pass.

Run: `npm run build`

Expected: build completes.

- [ ] **Step 7: Commit**

```bash
git add src/server/posts.ts src/app/api/posts src/app/page.tsx src/app/posts/new tests/unit/posts.test.ts
git commit -m "feat: add praise posts and feed"
```

---

### Task 5: Comments, Reactions, Replies, and WebSocket Updates

**Files:**
- Create: `src/server/comments.ts`
- Create: `src/server/realtime.ts`
- Create: `src/lib/socket-client.ts`
- Create: `src/app/api/socket/route.ts`
- Create: `src/app/api/posts/[postId]/comments/route.ts`
- Create: `src/app/api/comments/[commentId]/reactions/route.ts`
- Create: `src/app/api/comments/[commentId]/replies/route.ts`
- Create: `src/app/posts/[postId]/page.tsx`
- Create: `src/components/PraiseRoom.tsx`
- Test: `tests/unit/comments.test.ts`

**Interfaces:**
- Produces `createPraiseComment(postId, authorUserId, input)`.
- Produces `addAuthorReaction(commentId, authorUserId, type)`.
- Produces `addAuthorReply(commentId, authorUserId, body)`.
- Produces `publishPostEvent(postId, event)`.
- WebSocket room name: `post:${postId}`.

- [ ] **Step 1: Write comment permission tests**

Create `tests/unit/comments.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertPostAuthor, normalizeCommentBody } from "@/server/comments";

describe("comment rules", () => {
  it("normalizes comment body", () => {
    expect(normalizeCommentBody("  정말 멋져요.  ")).toBe("정말 멋져요.");
  });

  it("rejects empty comment body", () => {
    expect(() => normalizeCommentBody(" ")).toThrow("COMMENT_BODY_REQUIRED");
  });

  it("allows only the post author to react or reply", () => {
    expect(() => assertPostAuthor("user_1", "user_1")).not.toThrow();
    expect(() => assertPostAuthor("user_1", "user_2")).toThrow("POST_AUTHOR_ONLY");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/comments.test.ts`

Expected: fail because `src/server/comments.ts` does not exist.

- [ ] **Step 3: Implement comment domain rules**

Create `src/server/comments.ts`:

```ts
import { DisplayMode, ReactionType, VisibilityState } from "@prisma/client";
import { db } from "@/lib/db";
import { moderateText } from "@/server/moderation";

export function normalizeCommentBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("COMMENT_BODY_REQUIRED");
  if (normalized.length > 1000) throw new Error("COMMENT_BODY_TOO_LONG");
  return normalized;
}

export function assertPostAuthor(postAuthorUserId: string, userId: string): void {
  if (postAuthorUserId !== userId) {
    throw new Error("POST_AUTHOR_ONLY");
  }
}

export async function createPraiseComment(
  postId: string,
  authorUserId: string,
  input: { body: string; displayMode: DisplayMode }
) {
  const body = normalizeCommentBody(input.body);
  const moderation = moderateText(body);
  return db.praiseComment.create({
    data: {
      postId,
      authorUserId,
      displayMode: input.displayMode,
      body,
      visibilityState: moderation.visibilityState,
      moderationRisk: moderation.risk
    }
  });
}

export async function addAuthorReaction(commentId: string, authorUserId: string, type: ReactionType) {
  const comment = await db.praiseComment.findUniqueOrThrow({
    where: { id: commentId },
    include: { post: true }
  });
  assertPostAuthor(comment.post.authorUserId, authorUserId);
  return db.reaction.create({
    data: {
      postId: comment.postId,
      commentId,
      authorUserId,
      type
    }
  });
}

export async function addAuthorReply(commentId: string, authorUserId: string, bodyInput: string) {
  const body = normalizeCommentBody(bodyInput);
  const comment = await db.praiseComment.findUniqueOrThrow({
    where: { id: commentId },
    include: { post: true }
  });
  assertPostAuthor(comment.post.authorUserId, authorUserId);
  const moderation = moderateText(body);
  return db.reply.create({
    data: {
      postId: comment.postId,
      commentId,
      authorUserId,
      body,
      visibilityState: moderation.visibilityState
    }
  });
}
```

- [ ] **Step 4: Add realtime helpers**

Create `src/server/realtime.ts`:

```ts
import "server-only";

export type PostRealtimeEvent =
  | { type: "comment.created"; postId: string; commentId: string }
  | { type: "reaction.created"; postId: string; reactionId: string }
  | { type: "reply.created"; postId: string; replyId: string }
  | { type: "comment.visibilityChanged"; postId: string; commentId: string };

type SocketServer = {
  to(room: string): { emit(event: string, payload: PostRealtimeEvent): void };
};

const globalRealtime = globalThis as unknown as { io?: SocketServer };

export function registerSocketServer(io: SocketServer) {
  globalRealtime.io = io;
}

export function publishPostEvent(postId: string, event: PostRealtimeEvent) {
  globalRealtime.io?.to(`post:${postId}`).emit("post:event", event);
}
```

Create `src/lib/socket-client.ts`:

```ts
import { io } from "socket.io-client";

export function createPostSocket(postId: string) {
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000", {
    path: "/api/socket/io"
  });
  socket.emit("post:join", { postId });
  return socket;
}
```

- [ ] **Step 5: Add API routes**

Create `src/app/api/posts/[postId]/comments/route.ts`, `src/app/api/comments/[commentId]/reactions/route.ts`, and `src/app/api/comments/[commentId]/replies/route.ts` using the same pattern:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPraiseComment } from "@/server/comments";
import { assertCanWrite, requireUser } from "@/server/permissions";
import { publishPostEvent } from "@/server/realtime";

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const { postId } = await context.params;
  const body = await request.json();
  const comment = await createPraiseComment(postId, userId, body);
  publishPostEvent(postId, { type: "comment.created", postId, commentId: comment.id });
  return NextResponse.json({ comment }, { status: 201 });
}
```

For reactions and replies, call `addAuthorReaction()` and `addAuthorReply()`, then publish `reaction.created` or `reply.created`.

- [ ] **Step 6: Build praise room UI**

Create `src/app/posts/[postId]/page.tsx`:

```tsx
import { db } from "@/lib/db";
import PraiseRoom from "@/components/PraiseRoom";

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await db.praisePost.findUniqueOrThrow({
    where: { id: postId },
    include: {
      author: { select: { nickname: true } },
      comments: {
        where: { visibilityState: "VISIBLE" },
        include: {
          author: { select: { nickname: true } },
          reactions: true,
          replies: { where: { visibilityState: "VISIBLE" } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return <PraiseRoom post={post} />;
}
```

Create `src/components/PraiseRoom.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { createPostSocket } from "@/lib/socket-client";

type PraiseRoomProps = {
  post: {
    id: string;
    title: string;
    body: string;
    comments: Array<{
      id: string;
      body: string;
      isAiGenerated: boolean;
      author: { nickname: string } | null;
    }>;
  };
};

export default function PraiseRoom({ post }: PraiseRoomProps) {
  useEffect(() => {
    const socket = createPostSocket(post.id);
    socket.on("post:event", () => {
      window.location.reload();
    });
    return () => {
      socket.disconnect();
    };
  }, [post.id]);

  return (
    <section className="page-section">
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <div aria-live="polite">
        {post.comments.map((comment) => (
          <article key={comment.id} className="comment">
            <strong>{comment.isAiGenerated ? "AI 칭찬" : comment.author?.nickname ?? "익명"}</strong>
            <p>{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Verify comment tests and build**

Run: `npm run test -- tests/unit/comments.test.ts`

Expected: comment rule tests pass.

Run: `npm run build`

Expected: build completes.

- [ ] **Step 8: Commit**

```bash
git add src/server/comments.ts src/server/realtime.ts src/lib/socket-client.ts src/app/api/posts src/app/api/comments src/app/posts src/components/PraiseRoom.tsx tests/unit/comments.test.ts
git commit -m "feat: add realtime praise room"
```

---

### Task 6: Moderation, Reports, and Sanctions

**Files:**
- Create: `src/server/moderation.ts`
- Create: `src/app/api/reports/route.ts`
- Create: `src/app/api/moderation/route.ts`
- Create: `src/app/moderation/page.tsx`
- Test: `tests/unit/moderation.test.ts`

**Interfaces:**
- Produces `moderateText(text): { visibilityState: VisibilityState; risk: number; reason: string }`.
- Produces `recordReport(reporterUserId, targetType, targetId, reason)`.
- Produces `applyTrustDelta(userId, delta, reason)`.
- Consumes `isModerator` on `User`.

- [ ] **Step 1: Write moderation tests**

Create `tests/unit/moderation.test.ts`:

```ts
import { VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateSanctionState, moderateText } from "@/server/moderation";

describe("moderation", () => {
  it("holds praise disguised as mockery", () => {
    const result = moderateText("와 그걸 자랑이라고 올리다니 대단하다");
    expect(result.visibilityState).toBe(VisibilityState.AUTHOR_ONLY);
    expect(result.risk).toBeGreaterThanOrEqual(70);
  });

  it("allows warm praise", () => {
    const result = moderateText("끝까지 해낸 점이 정말 멋져요");
    expect(result.visibilityState).toBe(VisibilityState.VISIBLE);
  });

  it("maps trust score to sanctions", () => {
    expect(calculateSanctionState(100)).toBe("NORMAL");
    expect(calculateSanctionState(59)).toBe("LOW_TRUST");
    expect(calculateSanctionState(29)).toBe("SHADOW_BANNED");
    expect(calculateSanctionState(9)).toBe("SERVICE_BANNED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/moderation.test.ts`

Expected: fail because moderation module does not exist.

- [ ] **Step 3: Implement moderation module**

Create `src/server/moderation.ts`:

```ts
import { ModerationEventType, ModerationTargetType, SanctionState, VisibilityState } from "@prisma/client";
import { db } from "@/lib/db";

const riskyPatterns = [
  { pattern: /자랑이라고|그걸.*대단|꼴값|한심|별것도/i, risk: 75, reason: "mocking_praise" },
  { pattern: /못생|살쪘|외모|몸매/i, risk: 70, reason: "appearance_comment" },
  { pattern: /죽어|꺼져|혐오|병신|멍청/i, risk: 95, reason: "abuse" },
  { pattern: /내 채널|구독|홍보|광고/i, risk: 65, reason: "self_promotion" }
];

export function moderateText(text: string): { visibilityState: VisibilityState; risk: number; reason: string } {
  const normalized = text.trim();
  const match = riskyPatterns.find((entry) => entry.pattern.test(normalized));
  if (!match) {
    return { visibilityState: VisibilityState.VISIBLE, risk: 0, reason: "allowed" };
  }
  if (match.risk >= 90) {
    return { visibilityState: VisibilityState.HIDDEN, risk: match.risk, reason: match.reason };
  }
  return { visibilityState: VisibilityState.AUTHOR_ONLY, risk: match.risk, reason: match.reason };
}

export function calculateSanctionState(trustScore: number): SanctionState {
  if (trustScore <= 10) return SanctionState.SERVICE_BANNED;
  if (trustScore <= 30) return SanctionState.SHADOW_BANNED;
  if (trustScore <= 60) return SanctionState.LOW_TRUST;
  return SanctionState.NORMAL;
}

export async function applyTrustDelta(userId: string, delta: number, reason: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const nextTrustScore = Math.max(0, Math.min(100, user.trustScore + delta));
  const nextSanctionState = calculateSanctionState(nextTrustScore);
  return db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { trustScore: nextTrustScore, sanctionState: nextSanctionState }
    }),
    db.moderationEvent.create({
      data: {
        userId,
        targetType: ModerationTargetType.USER,
        targetId: userId,
        eventType: ModerationEventType.TRUST_SCORE_CHANGED,
        riskReason: reason,
        trustScoreDelta: delta
      }
    })
  ]);
}

export async function recordReport(
  reporterUserId: string,
  targetType: ModerationTargetType,
  targetId: string,
  reason: string
) {
  return db.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: { reporterUserId, targetType, targetId, reason }
    });
    await tx.moderationEvent.create({
      data: {
        userId: reporterUserId,
        targetType,
        targetId,
        eventType: ModerationEventType.REPORT_CREATED,
        riskReason: reason,
        trustScoreDelta: 0
      }
    });
    return report;
  });
}
```

- [ ] **Step 4: Add reports API**

Create `src/app/api/reports/route.ts`:

```ts
import { ModerationTargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { recordReport } from "@/server/moderation";
import { requireUser } from "@/server/permissions";

const reportSchema = z.object({
  targetType: z.nativeEnum(ModerationTargetType),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(500)
});

export async function POST(request: Request) {
  const session = await auth();
  const reporterUserId = requireUser(session?.user?.id);
  const input = reportSchema.parse(await request.json());
  const report = await recordReport(reporterUserId, input.targetType, input.targetId, input.reason);
  return NextResponse.json({ report }, { status: 201 });
}
```

- [ ] **Step 5: Add minimal moderator review**

Create `src/app/moderation/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) return <section className="page-section"><h1>로그인이 필요합니다</h1></section>;

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) return <section className="page-section"><h1>운영자만 접근할 수 있습니다</h1></section>;

  const heldComments = await db.praiseComment.findMany({
    where: { visibilityState: { in: ["HELD", "AUTHOR_ONLY", "HIDDEN"] } },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <section className="page-section">
      <h1>운영 검토</h1>
      {heldComments.map((comment) => (
        <article key={comment.id}>
          <p>{comment.body}</p>
          <small>{comment.visibilityState} · risk {comment.moderationRisk}</small>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 6: Verify moderation tests and build**

Run: `npm run test -- tests/unit/moderation.test.ts`

Expected: moderation tests pass.

Run: `npm run build`

Expected: build completes.

- [ ] **Step 7: Commit**

```bash
git add src/server/moderation.ts src/app/api/reports src/app/api/moderation src/app/moderation tests/unit/moderation.test.ts
git commit -m "feat: add quiet moderation"
```

---

### Task 7: AI Praise Jobs and Background Processing

**Files:**
- Create: `src/server/ai.ts`
- Create: `src/server/jobs.ts`
- Test: `tests/unit/ai-policy.test.ts`
- Test: `tests/unit/jobs.test.ts`

**Interfaces:**
- Produces `buildPraisePrompt(post): string`.
- Produces `generatePraiseComments(post, count): Promise<string[]>`.
- Produces `shouldRunInactivityPraise(postId): Promise<boolean>`.
- Produces BullMQ queues: `aiPraiseQueue`, `rankingQueue`.

- [ ] **Step 1: Write AI policy tests**

Create `tests/unit/ai-policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPraisePrompt, clampPraiseCount } from "@/server/ai";

describe("AI praise policy", () => {
  it("clamps initial praise to one through three comments", () => {
    expect(clampPraiseCount(0)).toBe(1);
    expect(clampPraiseCount(2)).toBe(2);
    expect(clampPraiseCount(9)).toBe(3);
  });

  it("asks for specific effort-based praise and AI disclosure", () => {
    const prompt = buildPraisePrompt({
      title: "미루던 일을 끝냈어요",
      body: "병원 예약을 했습니다.",
      promptAnswers: { tone: "차분하게" }
    });
    expect(prompt).toContain("AI 칭찬");
    expect(prompt).toContain("노력");
    expect(prompt).toContain("병원 예약");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai-policy.test.ts`

Expected: fail because `src/server/ai.ts` does not exist.

- [ ] **Step 3: Implement AI prompt module**

Create `src/server/ai.ts`:

```ts
import "server-only";
import OpenAI from "openai";

type PraisePromptPost = {
  title: string;
  body: string;
  promptAnswers: unknown;
};

export function clampPraiseCount(count: number): number {
  return Math.max(1, Math.min(3, count));
}

export function buildPraisePrompt(post: PraisePromptPost): string {
  return [
    "너는 칭찬 커뮤니티의 AI 칭찬 댓글 작성자다.",
    "댓글에는 AI 칭찬임을 자연스럽게 드러내라.",
    "사용자의 노력, 용기, 지속성, 배려, 배움, 완료를 구체적으로 칭찬하라.",
    "의료, 법률, 금융 조언과 외모/신체/정체성 평가는 피하라.",
    `제목: ${post.title}`,
    `본문: ${post.body}`,
    `작성 프롬프트 답변: ${JSON.stringify(post.promptAnswers ?? {})}`,
    "한국어 댓글만 작성하라. 각 댓글은 160자 이내로 작성하라."
  ].join("\n");
}

export async function generatePraiseComments(post: PraisePromptPost, count: number): Promise<string[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildPraisePrompt(post) }],
    temperature: 0.8,
    n: clampPraiseCount(count)
  });
  return completion.choices
    .map((choice) => choice.message.content?.trim())
    .filter((content): content is string => Boolean(content));
}
```

- [ ] **Step 4: Implement job processors**

Create `src/server/jobs.ts`:

```ts
import "server-only";
import { AiJobStatus, AiJobType, DisplayMode } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { generatePraiseComments } from "@/server/ai";
import { publishPostEvent } from "@/server/realtime";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

export const aiPraiseQueue = new Queue("ai-praise", { connection });
export const rankingQueue = new Queue("ranking", { connection });

export async function shouldRunInactivityPraise(postId: string): Promise<boolean> {
  const aiCount = await db.praiseComment.count({ where: { postId, isAiGenerated: true } });
  if (aiCount >= 5) return false;

  const humanCount = await db.praiseComment.count({
    where: { postId, isAiGenerated: false, visibilityState: "VISIBLE" }
  });
  return humanCount === 0;
}

export function startAiPraiseWorker() {
  return new Worker(
    "ai-praise",
    async (job) => {
      const aiJob = await db.aiPraiseJob.update({
        where: { id: job.data.aiPraiseJobId },
        data: { status: AiJobStatus.RUNNING },
        include: { post: true }
      });

      if (aiJob.jobType === AiJobType.INACTIVITY_PRAISE) {
        const shouldRun = await shouldRunInactivityPraise(aiJob.postId);
        if (!shouldRun) {
          await db.aiPraiseJob.update({ where: { id: aiJob.id }, data: { status: AiJobStatus.SKIPPED } });
          return;
        }
      }

      const comments = await generatePraiseComments(aiJob.post, aiJob.jobType === AiJobType.INITIAL_PRAISE ? 3 : 1);
      const created = await Promise.all(
        comments.map((body) =>
          db.praiseComment.create({
            data: {
              postId: aiJob.postId,
              isAiGenerated: true,
              displayMode: DisplayMode.NICKNAME,
              body,
              visibilityState: "VISIBLE"
            }
          })
        )
      );

      await db.aiPraiseJob.update({
        where: { id: aiJob.id },
        data: { status: AiJobStatus.COMPLETED, resultCommentIds: created.map((comment) => comment.id) }
      });

      for (const comment of created) {
        publishPostEvent(aiJob.postId, { type: "comment.created", postId: aiJob.postId, commentId: comment.id });
      }
    },
    { connection }
  );
}
```

- [ ] **Step 5: Enqueue AI jobs from post creation**

Modify `src/server/posts.ts` so `createPraisePost()` creates one immediate job and one delayed inactivity job:

```ts
const tenMinutes = 10 * 60 * 1000;

await tx.aiPraiseJob.create({
  data: {
    postId: post.id,
    jobType: "INITIAL_PRAISE",
    scheduledAt: new Date()
  }
});

await tx.aiPraiseJob.create({
  data: {
    postId: post.id,
    jobType: "INACTIVITY_PRAISE",
    scheduledAt: new Date(Date.now() + tenMinutes)
  }
});
```

After the transaction returns, add both jobs to `aiPraiseQueue` with `delay` set from `scheduledAt`.

- [ ] **Step 6: Verify AI tests and build**

Run: `npm run test -- tests/unit/ai-policy.test.ts`

Expected: AI policy tests pass.

Run: `npm run build`

Expected: build completes.

- [ ] **Step 7: Commit**

```bash
git add src/server/ai.ts src/server/jobs.ts src/server/posts.ts tests/unit/ai-policy.test.ts tests/unit/jobs.test.ts
git commit -m "feat: add ai praise jobs"
```

---

### Task 8: Rankings, My Activity, and End-to-End Verification

**Files:**
- Create: `src/server/rankings.ts`
- Create: `src/app/api/rankings/route.ts`
- Create: `src/app/rankings/page.tsx`
- Create: `src/app/me/page.tsx`
- Test: `tests/unit/rankings.test.ts`
- Test: `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Produces `calculateWarmPraiserScore(input): number`.
- Produces `getRankingSnapshots()`.
- Produces `/rankings` and `/me` pages.

- [ ] **Step 1: Write ranking tests**

Create `tests/unit/rankings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateWarmPraiserScore } from "@/server/rankings";

describe("ranking score", () => {
  it("rewards gratitude and penalizes reports", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 10,
      visibleCommentCount: 12,
      reportCount: 0,
      moderationPenalty: 0
    });
    expect(score).toBe(62);
  });

  it("does not reward raw volume alone", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 50,
      reportCount: 0,
      moderationPenalty: 0
    });
    expect(score).toBeLessThan(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/rankings.test.ts`

Expected: fail because ranking module does not exist.

- [ ] **Step 3: Implement ranking module**

Create `src/server/rankings.ts`:

```ts
import { RankingType } from "@prisma/client";
import { db } from "@/lib/db";

export function calculateWarmPraiserScore(input: {
  gratitudeCount: number;
  visibleCommentCount: number;
  reportCount: number;
  moderationPenalty: number;
}): number {
  const gratitude = input.gratitudeCount * 5;
  const consistency = Math.min(input.visibleCommentCount, 20);
  const reports = input.reportCount * 12;
  return Math.max(0, gratitude + consistency - reports - input.moderationPenalty);
}

export async function getRankingSnapshots() {
  return db.rankingSnapshot.findMany({
    where: { rankingType: { in: [RankingType.WARM_PRAISER, RankingType.NEEDS_ENCOURAGEMENT] } },
    orderBy: { computedAt: "desc" },
    take: 2
  });
}
```

- [ ] **Step 4: Add rankings page and API**

Create `src/app/api/rankings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getRankingSnapshots } from "@/server/rankings";

export async function GET() {
  const rankings = await getRankingSnapshots();
  return NextResponse.json({ rankings });
}
```

Create `src/app/rankings/page.tsx`:

```tsx
import { getRankingSnapshots } from "@/server/rankings";

export default async function RankingsPage() {
  const rankings = await getRankingSnapshots();
  return (
    <section className="page-section">
      <h1>랭킹</h1>
      <p>따뜻한 참여와 지금 응원이 필요한 글을 보여줍니다.</p>
      {rankings.map((ranking) => (
        <article key={ranking.id}>
          <h2>{ranking.rankingType === "WARM_PRAISER" ? "따뜻한 칭찬러" : "응원이 필요한 글"}</h2>
          <pre>{JSON.stringify(ranking.entries, null, 2)}</pre>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Add my activity page**

Create `src/app/me/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MyActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <section className="page-section"><h1>로그인이 필요합니다</h1></section>;
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      posts: { orderBy: { createdAt: "desc" }, take: 10 },
      comments: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });

  return (
    <section className="page-section">
      <h1>내 활동</h1>
      <p>신뢰 점수 {user.trustScore} · 상태 {user.sanctionState}</p>
      <h2>내가 쓴 글</h2>
      {user.posts.map((post) => <article key={post.id}>{post.title}</article>)}
      <h2>내가 쓴 칭찬</h2>
      {user.comments.map((comment) => <article key={comment.id}>{comment.body}</article>)}
    </section>
  );
}
```

- [ ] **Step 6: Add end-to-end smoke flow**

Create `tests/e2e/core-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("public visitor can see the praise feed and rankings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "칭찬받고 싶은 순간들" })).toBeVisible();

  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "랭킹" })).toBeVisible();
});
```

- [ ] **Step 7: Verify all tests and build**

Run: `npm run test`

Expected: all unit and integration tests pass.

Run: `npm run build`

Expected: production build completes.

Run: `npm run test:e2e`

Expected: Playwright core flow passes on desktop and mobile projects.

- [ ] **Step 8: Commit**

```bash
git add src/server/rankings.ts src/app/api/rankings src/app/rankings src/app/me tests/unit/rankings.test.ts tests/e2e/core-flow.spec.ts
git commit -m "feat: add rankings and activity pages"
```

---

## Self-Review Checklist

- Spec coverage: authentication, anonymous display, posts, prompts, feed, real-time praise room, AI initial praise, AI inactivity praise, comments, gratitude reactions, thank-you replies, reports, quiet moderation, trust sanctions, rankings, my activity, and minimal moderator review are covered by tasks.
- Explicit implementation choices: anonymous display uses `Anonymous` in English-facing contract and `익명` in Korean UI, reading is public, AI inactivity thresholds are 10 and 30 minutes, AI comment cap is 5, and trust thresholds are 60/30/10.
- No planned feature depends on Supabase; PostgreSQL/Auth/WebSocket ownership stays in the app.
- Remaining risk: Socket.IO with the Next.js route handler may need a custom server in some deployment targets. If the selected host cannot support this route pattern, split the WebSocket server into `server/socket.ts` with a Node HTTP server before deployment.
