# ComfortRequest/ComfortReply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old praise-community post/comment core with a web-first comfort request/reply MVP based on `ComfortRequest` and `ComfortReply`.

**Architecture:** Introduce new Prisma domain models instead of reusing `PraisePost` and `PraiseComment`. Keep auth, nickname onboarding, trust/sanction checks, reports, moderation events, notification plumbing, and verification rules, but replace praise-specific routes and UI with comfort-first services and screens.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Auth.js, Vitest, Testing Library, existing `npm run verify` pipeline.

## Global Constraints

- Korean-facing copy must use the comfort/praise exchange tone from `docs/superpowers/specs/2026-08-01-comfort-pivot-design.ko.md`.
- Do not reuse `PraisePost`/`PraiseComment` as the new domain.
- Existing operating data is not production data, so destructive replacement of old praise-domain tables is allowed through committed Prisma migrations.
- AI must not automatically publish public replies. This plan keeps data structures for writing assistance and safety/content quality filtering, but it does not build LLM-backed suggestion UI.
- A user can create one comfort request per local day in MVP.
- A user can create one reply per comfort request.
- A comfort reply body is at most 1000 characters.
- Recent comfort/reply previews must use real visible data only.
- Report and filter internals must not expose bypassable details to users.
- Before claiming completion, run `npm run verify`.
- For Prisma changes, also run `npm run prisma:generate` and `npx prisma migrate status`.

---

## File Structure

- `prisma/schema.prisma`: Replace praise-domain models/enums with comfort-domain models/enums.
- `prisma/migrations/<timestamp>_comfort_request_reply_domain/migration.sql`: Committed migration that drops obsolete praise-domain tables and creates comfort-domain tables.
- `src/server/content-quality.ts`: Rule-based quality gate boundary used by requests and replies.
- `src/server/comfort.ts`: Comfort request/reply domain services, validation, query helpers, and write policies.
- `src/server/notifications.ts`: Generalized notification read/list helpers for comfort targets.
- `src/server/moderation.ts`: Report, moderation event, trust, and target author resolution for comfort targets.
- `src/server/moderation-review.ts`: Moderator report context for comfort request/reply targets.
- `src/server/request-validation.ts`: Input parsing for comfort request, reply, report, and moderation actions.
- `src/app/api/comfort/requests/route.ts`: List/create comfort requests.
- `src/app/api/comfort/requests/[requestId]/replies/route.ts`: Create replies for one request.
- `src/app/api/reports/route.ts`: Accept comfort target types.
- `src/app/page.tsx`: Replace praise feed with comfort MVP main screen.
- `src/app/me/page.tsx`, `src/app/me/actions.ts`: Show and manage my comfort requests/replies.
- `src/app/moderation/page.tsx`, `src/app/api/moderation/route.ts`: Review held comfort content and reports.
- `src/app/notifications/page.tsx`, `src/components/NotificationNavLink.tsx`: Display comfort notification messages.
- `src/app/posts/**`, `src/app/rankings/**`, `src/components/PraiseRoom.tsx`, `src/server/posts.ts`, `src/server/comments.ts`, `src/server/rankings.ts`: Remove or replace old praise-only surfaces.
- `src/server/jobs.ts`, `src/server/worker.ts`: Remove automatic AI praise queue behavior from the default MVP path; keep worker health only if still used.
- `README.md`, `docs/CURRENT_WORK.ko.md`, `docs/RUNNING.ko.md`, `docs/OPERATIONS.ko.md`: Update product and local running docs after implementation.

---

### Task 1: Prisma Comfort Domain Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_comfort_request_reply_domain/migration.sql`
- Test: `src/server/__tests__/comfort-schema.test.ts`

**Interfaces:**
- Produces Prisma models: `ComfortRequest`, `ComfortReply`, `ContentQualityReview`, `AiReplySuggestion`, `Notification`, `Report`, `ModerationEvent`.
- Produces enums: `DisplayMode`, `VisibilityState`, `SanctionState`, `ReportStatus`, `ModerationTargetType`, `ModerationEventType`, `NotificationType`, `QualityLabel`, `QualityTargetType`, `AiSuggestionStatus`, `AiUsageEventStatus`.
- Later tasks rely on `ComfortRequest.status`, `ComfortReply.status`, `ComfortReply.requestId_authorUserId`, `Notification.targetType`, `Notification.targetId`, and `ModerationTargetType.COMFORT_REQUEST`.

- [ ] **Step 1: Write schema expectation tests**

Create `src/server/__tests__/comfort-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

describe("comfort Prisma schema", () => {
  it("exposes comfort domain models", () => {
    expect(Prisma.ModelName.ComfortRequest).toBe("ComfortRequest");
    expect(Prisma.ModelName.ComfortReply).toBe("ComfortReply");
    expect(Prisma.ModelName.ContentQualityReview).toBe("ContentQualityReview");
    expect(Prisma.ModelName.AiReplySuggestion).toBe("AiReplySuggestion");
  });

  it("keeps notification targets generic", () => {
    const fields = Prisma.dmmf.datamodel.models.find((model) => model.name === "Notification")?.fields.map((field) => field.name);
    expect(fields).toContain("targetType");
    expect(fields).toContain("targetId");
    expect(fields).not.toContain("postId");
  });
});
```

- [ ] **Step 2: Run the schema test and confirm it fails**

Run: `npm run test -- src/server/__tests__/comfort-schema.test.ts`

Expected: FAIL because `ComfortRequest` and the generic `Notification.targetType` fields do not exist yet.

- [ ] **Step 3: Update `prisma/schema.prisma`**

Replace old praise-domain relations on `User`:

```prisma
model User {
  id                    String            @id @default(cuid())
  name                  String?
  email                 String?           @unique
  emailVerified         DateTime?
  image                 String?
  nickname              String            @unique
  passwordHash          String?
  trustScore            Int               @default(100)
  sanctionState         SanctionState     @default(NORMAL)
  isModerator           Boolean           @default(false)
  nicknameSetupRequired Boolean           @default(false)
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  accounts              Account[]
  sessions              Session[]
  comfortRequests       ComfortRequest[]
  comfortReplies        ComfortReply[]
  reports               Report[]          @relation("ReporterReports")
  moderationLogs        ModerationEvent[]
  notifications         Notification[]    @relation("RecipientNotifications")
  actedNotifications    Notification[]    @relation("ActorNotifications")
  aiReplySuggestions    AiReplySuggestion[]
}
```

Add or update enums:

```prisma
enum ModerationTargetType {
  COMFORT_REQUEST
  COMFORT_REPLY
  AI_REPLY_SUGGESTION
  USER
}

enum NotificationType {
  FIRST_REPLY_ON_REQUEST
  REPLY_ON_REQUEST
}

enum QualityTargetType {
  COMFORT_REQUEST
  COMFORT_REPLY
  AI_REPLY_SUGGESTION
}

enum QualityLabel {
  SUPPORTIVE
  LOW_EFFORT
  SARCASTIC
  BACKHANDED
  DISMISSIVE
  ADVICE_PUSHING
  SELF_CENTERED
  UNSAFE
  SPAM
  ALLOWED
}

enum AiSuggestionStatus {
  CANDIDATE
  SHOWN
  DISMISSED
  ADOPTED
  REJECTED
}
```

Add new models:

```prisma
model ComfortRequest {
  id             String          @id @default(cuid())
  authorUserId   String
  displayMode    DisplayMode
  body           String
  status         VisibilityState @default(VISIBLE)
  qualityScore   Int             @default(0)
  qualityLabel   QualityLabel    @default(ALLOWED)
  firstRepliedAt DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  author         User            @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  replies        ComfortReply[]
  notifications  Notification[]
  aiSuggestions  AiReplySuggestion[]

  @@index([authorUserId, createdAt])
  @@index([status, createdAt])
  @@index([status, firstRepliedAt, createdAt])
}

model ComfortReply {
  id             String          @id @default(cuid())
  requestId      String
  authorUserId   String
  displayMode    DisplayMode
  body           String
  status         VisibilityState @default(VISIBLE)
  qualityScore   Int             @default(0)
  qualityLabel   QualityLabel    @default(ALLOWED)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  request        ComfortRequest  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  author         User            @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  notifications  Notification[]

  @@unique([requestId, authorUserId])
  @@index([requestId, createdAt])
  @@index([authorUserId, createdAt])
  @@index([status, createdAt])
}
```

Add `ContentQualityReview`, `AiReplySuggestion`, and generic `Notification`:

```prisma
model ContentQualityReview {
  id            String            @id @default(cuid())
  targetType    QualityTargetType
  targetId      String
  label         QualityLabel
  score         Int
  reason        String
  modelProvider String?
  modelName     String?
  createdAt     DateTime          @default(now())

  @@index([targetType, targetId])
  @@index([label, createdAt])
}

model AiReplySuggestion {
  id                 String             @id @default(cuid())
  requestId          String
  suggestedForUserId String?
  body               String
  qualityScore       Int                @default(0)
  qualityLabel       QualityLabel       @default(ALLOWED)
  status             AiSuggestionStatus @default(CANDIDATE)
  provider           String
  model              String
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  request            ComfortRequest     @relation(fields: [requestId], references: [id], onDelete: Cascade)
  suggestedFor       User?              @relation(fields: [suggestedForUserId], references: [id], onDelete: SetNull)

  @@index([requestId, status, createdAt])
  @@index([suggestedForUserId, createdAt])
}

model Notification {
  id              String               @id @default(cuid())
  recipientUserId String
  actorUserId     String?
  type            NotificationType
  targetType      ModerationTargetType
  targetId        String
  requestId       String?
  replyId         String?
  readAt          DateTime?
  createdAt       DateTime             @default(now())
  recipient       User                 @relation("RecipientNotifications", fields: [recipientUserId], references: [id], onDelete: Cascade)
  actor           User?                @relation("ActorNotifications", fields: [actorUserId], references: [id], onDelete: SetNull)
  request         ComfortRequest?      @relation(fields: [requestId], references: [id], onDelete: Cascade)
  reply           ComfortReply?        @relation(fields: [replyId], references: [id], onDelete: Cascade)

  @@index([recipientUserId, readAt, createdAt])
  @@index([targetType, targetId])
  @@index([requestId])
  @@index([replyId])
}
```

Remove old models and enums that are no longer used by the pivot MVP:

```prisma
// Remove: ReactionType, AiJobType, AiJobStatus, RankingType
// Remove models: PraisePost, PraiseComment, Reaction, Reply, AiPraiseJob, RankingSnapshot
```

- [ ] **Step 4: Generate migration**

Run: `npm run prisma:migrate -- --name comfort_request_reply_domain`

Expected: Prisma creates a migration. Because there is no production data, accept destructive changes that drop old praise-domain tables. Inspect the generated SQL before committing.

- [ ] **Step 5: Generate Prisma client**

Run: `npm run prisma:generate`

Expected: Prisma Client generation succeeds.

- [ ] **Step 6: Run schema test**

Run: `npm run test -- src/server/__tests__/comfort-schema.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/server/__tests__/comfort-schema.test.ts
git commit -m "feat: add comfort request reply schema"
```

---

### Task 2: Content Quality Gate Boundary

**Files:**
- Create: `src/server/content-quality.ts`
- Test: `src/server/__tests__/content-quality.test.ts`

**Interfaces:**
- Produces `evaluateContentQuality(input: ContentQualityInput): ContentQualityDecision`.
- Produces `qualityDecisionToVisibility(decision: ContentQualityDecision): VisibilityState`.
- Consumes Prisma enums `QualityLabel`, `QualityTargetType`, and `VisibilityState`.
- Later tasks call this before creating `ComfortRequest` and `ComfortReply`.

- [ ] **Step 1: Write failing tests**

Create `src/server/__tests__/content-quality.test.ts`:

```ts
import { QualityLabel, VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateContentQuality, qualityDecisionToVisibility } from "@/server/content-quality";

describe("evaluateContentQuality", () => {
  it("allows concrete comfort text", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REQUEST",
      text: "오늘 회사에서 실수해서 마음이 오래 가라앉았어요. 그냥 괜찮다고 듣고 싶어요."
    });

    expect(decision.label).toBe(QualityLabel.ALLOWED);
    expect(decision.score).toBe(0);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.VISIBLE);
  });

  it("marks repeated meaningless text as low effort", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
    });

    expect(decision.label).toBe(QualityLabel.LOW_EFFORT);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.AUTHOR_ONLY);
  });

  it("holds backhanded comfort without relying on profanity", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "그 정도로 힘들면 사회생활은 어떻게 하시려고요"
    });

    expect(decision.label).toBe(QualityLabel.DISMISSIVE);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.HELD);
  });

  it("hides unsafe violent text", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "그 사람 그냥 죽여버려"
    });

    expect(decision.label).toBe(QualityLabel.UNSAFE);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.HIDDEN);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -- src/server/__tests__/content-quality.test.ts`

Expected: FAIL because `src/server/content-quality.ts` does not exist.

- [ ] **Step 3: Implement content quality module**

Create `src/server/content-quality.ts`:

```ts
import { QualityLabel, QualityTargetType, VisibilityState } from "@prisma/client";

export type ContentQualityInput = {
  targetType: keyof typeof QualityTargetType;
  text: string;
};

export type ContentQualityDecision = {
  label: QualityLabel;
  score: number;
  reason: string;
};

const unsafePatterns = [/죽여버려|자살해|죽어버려|꺼져|병신|혐오/i];
const spamPatterns = [/구독|내 채널|광고|홍보|오픈채팅|카톡방|http/i];
const dismissivePatterns = [/그 정도로|별것도|유난|사회생활은 어떻게|그걸로.*힘들/i];
const sarcasticPatterns = [/대단하시네요\s*ㅋ|참 잘났|잘도 그러/i];

function compactText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function isRepeatedLowInformation(text: string) {
  const withoutSpaces = text.replace(/\s/g, "");
  if (withoutSpaces.length < 4) return true;
  if (/^(.)\1{5,}$/.test(withoutSpaces)) return true;
  if (/^[ㅋㅎㅠㅜ!?.,~]{6,}$/.test(withoutSpaces)) return true;
  return false;
}

export function evaluateContentQuality(input: ContentQualityInput): ContentQualityDecision {
  const text = compactText(input.text);

  if (isRepeatedLowInformation(text)) {
    return { label: QualityLabel.LOW_EFFORT, score: 65, reason: "low_information_text" };
  }
  if (unsafePatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.UNSAFE, score: 95, reason: "unsafe_expression" };
  }
  if (spamPatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.SPAM, score: 85, reason: "spam_or_promotion" };
  }
  if (dismissivePatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.DISMISSIVE, score: 78, reason: "dismissive_tone" };
  }
  if (sarcasticPatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.SARCASTIC, score: 78, reason: "sarcastic_tone" };
  }

  return { label: QualityLabel.ALLOWED, score: 0, reason: "allowed" };
}

export function qualityDecisionToVisibility(decision: ContentQualityDecision): VisibilityState {
  if (decision.score >= 90 || decision.label === QualityLabel.UNSAFE) return VisibilityState.HIDDEN;
  if (decision.score >= 75) return VisibilityState.HELD;
  if (decision.score >= 60) return VisibilityState.AUTHOR_ONLY;
  return VisibilityState.VISIBLE;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/server/__tests__/content-quality.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/content-quality.ts src/server/__tests__/content-quality.test.ts
git commit -m "feat: add content quality gate"
```

---

### Task 3: Comfort Domain Services

**Files:**
- Create: `src/server/comfort.ts`
- Test: `src/server/__tests__/comfort.test.ts`
- Modify: `src/server/permissions.ts` only if existing `assertCanWrite()` cannot be reused unchanged.

**Interfaces:**
- Consumes `evaluateContentQuality()` and `qualityDecisionToVisibility()` from Task 2.
- Produces `normalizeComfortRequestBody(body: string): string`.
- Produces `normalizeComfortReplyBody(body: string): string`.
- Produces `getUtcDayRange(now?: Date): { start: Date; end: Date }`.
- Produces `hasWrittenComfortRequestToday(authorUserId: string, now?: Date): Promise<boolean>`.
- Produces `createComfortRequest(input, authorUserId, now?): Promise<ComfortRequest>`.
- Produces `createComfortReply(requestId, authorUserId, input): Promise<ComfortReply>`.
- Produces `listRecentComfortExamples(): Promise<RecentComfortExample[]>`.
- Produces `listAnswerableComfortRequests(userId: string): Promise<AnswerableComfortRequest[]>`.

- [ ] **Step 1: Write failing service tests**

Create `src/server/__tests__/comfort.test.ts`:

```ts
import { DisplayMode, NotificationType, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComfortReply,
  createComfortRequest,
  getUtcDayRange,
  hasWrittenComfortRequestToday,
  normalizeComfortReplyBody,
  normalizeComfortRequestBody
} from "@/server/comfort";

vi.mock("@/lib/db", () => ({
  db: {
    comfortRequest: {
      count: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    comfortReply: {
      create: vi.fn()
    },
    contentQualityReview: {
      create: vi.fn()
    },
    notification: {
      create: vi.fn()
    },
    user: {
      findUniqueOrThrow: vi.fn()
    },
    $transaction: vi.fn((callback) =>
      callback({
        comfortRequest: {
          findUniqueOrThrow: vi.fn(),
          update: vi.fn()
        },
        comfortReply: {
          create: vi.fn()
        },
        contentQualityReview: {
          create: vi.fn()
        },
        notification: {
          create: vi.fn()
        }
      })
    )
  }
}));

const { db } = await import("@/lib/db");

describe("comfort domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes request bodies", () => {
    expect(normalizeComfortRequestBody("  오늘 좀 지쳤어요  ")).toBe("오늘 좀 지쳤어요");
    expect(() => normalizeComfortRequestBody("")).toThrow("COMFORT_REQUEST_BODY_REQUIRED");
    expect(() => normalizeComfortRequestBody("a".repeat(3001))).toThrow("COMFORT_REQUEST_BODY_TOO_LONG");
  });

  it("normalizes reply bodies", () => {
    expect(normalizeComfortReplyBody("  오늘은 좀 쉬어도 될 것 같아요  ")).toBe("오늘은 좀 쉬어도 될 것 같아요");
    expect(() => normalizeComfortReplyBody("")).toThrow("COMFORT_REPLY_BODY_REQUIRED");
    expect(() => normalizeComfortReplyBody("a".repeat(1001))).toThrow("COMFORT_REPLY_BODY_TOO_LONG");
  });

  it("calculates day range for daily request limits", () => {
    const { start, end } = getUtcDayRange(new Date("2026-08-05T12:34:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });

  it("checks whether user wrote a request today", async () => {
    vi.mocked(db.comfortRequest.count).mockResolvedValue(1);
    await expect(hasWrittenComfortRequestToday("user-1", new Date("2026-08-05T12:00:00.000Z"))).resolves.toBe(true);
  });

  it("creates a comfort request with quality metadata", async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({ sanctionState: "NORMAL" });
    vi.mocked(db.comfortRequest.count).mockResolvedValue(0);
    vi.mocked(db.comfortRequest.create).mockResolvedValue({
      id: "request-1",
      authorUserId: "user-1",
      body: "오늘 좀 지쳤어요",
      displayMode: DisplayMode.ANONYMOUS,
      status: VisibilityState.VISIBLE,
      qualityScore: 0,
      qualityLabel: "ALLOWED",
      firstRepliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const request = await createComfortRequest(
      { body: "오늘 좀 지쳤어요", displayMode: DisplayMode.ANONYMOUS },
      "user-1"
    );

    expect(request.id).toBe("request-1");
    expect(db.comfortRequest.create).toHaveBeenCalled();
    expect(db.contentQualityReview.create).toHaveBeenCalled();
  });

  it("rejects a second request on the same day", async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({ sanctionState: "NORMAL" });
    vi.mocked(db.comfortRequest.count).mockResolvedValue(1);

    await expect(
      createComfortRequest({ body: "오늘도 적고 싶어요", displayMode: DisplayMode.NICKNAME }, "user-1")
    ).rejects.toThrow("COMFORT_REQUEST_DAILY_LIMIT");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -- src/server/__tests__/comfort.test.ts`

Expected: FAIL because `src/server/comfort.ts` does not exist.

- [ ] **Step 3: Implement `src/server/comfort.ts`**

Create service functions with this shape:

```ts
import { DisplayMode, NotificationType, QualityTargetType, VisibilityState } from "@prisma/client";
import { db } from "@/lib/db";
import { evaluateContentQuality, qualityDecisionToVisibility } from "@/server/content-quality";
import { assertCanWrite } from "@/server/permissions";

export function normalizeComfortRequestBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("COMFORT_REQUEST_BODY_REQUIRED");
  if (normalized.length > 3000) throw new Error("COMFORT_REQUEST_BODY_TOO_LONG");
  return normalized;
}

export function normalizeComfortReplyBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("COMFORT_REPLY_BODY_REQUIRED");
  if (normalized.length > 1000) throw new Error("COMFORT_REPLY_BODY_TOO_LONG");
  return normalized;
}

export function getUtcDayRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function hasWrittenComfortRequestToday(authorUserId: string, now = new Date()) {
  const { start, end } = getUtcDayRange(now);
  const count = await db.comfortRequest.count({
    where: { authorUserId, createdAt: { gte: start, lt: end } }
  });
  return count > 0;
}
```

Implement `createComfortRequest()` so it:

```ts
export async function createComfortRequest(
  input: { body: string; displayMode: DisplayMode },
  authorUserId: string,
  now = new Date()
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: authorUserId }, select: { sanctionState: true } });
  assertCanWrite(user);

  if (await hasWrittenComfortRequestToday(authorUserId, now)) {
    throw new Error("COMFORT_REQUEST_DAILY_LIMIT");
  }

  const body = normalizeComfortRequestBody(input.body);
  const quality = evaluateContentQuality({ targetType: "COMFORT_REQUEST", text: body });
  const status = qualityDecisionToVisibility(quality);

  const request = await db.comfortRequest.create({
    data: {
      authorUserId,
      body,
      displayMode: input.displayMode,
      status,
      qualityScore: quality.score,
      qualityLabel: quality.label
    }
  });

  await db.contentQualityReview.create({
    data: {
      targetType: QualityTargetType.COMFORT_REQUEST,
      targetId: request.id,
      label: quality.label,
      score: quality.score,
      reason: quality.reason
    }
  });

  return request;
}
```

Implement `createComfortReply()` so it:

- verifies writer can write,
- rejects replying to own request with `COMFORT_REPLY_SELF_NOT_ALLOWED`,
- relies on Prisma unique `(requestId, authorUserId)` and maps unique conflicts to `COMFORT_REPLY_ALREADY_EXISTS`,
- updates `firstRepliedAt` only when the first visible reply is created,
- creates `FIRST_REPLY_ON_REQUEST` notification for the request author when first visible reply appears.

- [ ] **Step 4: Run service tests**

Run: `npm run test -- src/server/__tests__/comfort.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/comfort.ts src/server/__tests__/comfort.test.ts
git commit -m "feat: add comfort domain services"
```

---

### Task 4: Comfort API Routes and Validation

**Files:**
- Modify: `src/server/request-validation.ts`
- Create: `src/app/api/comfort/requests/route.ts`
- Create: `src/app/api/comfort/requests/[requestId]/replies/route.ts`
- Test: `src/server/__tests__/request-validation.test.ts`

**Interfaces:**
- Consumes `createComfortRequest()`, `listRecentComfortExamples()`, and `createComfortReply()` from Task 3.
- Produces `parseComfortRequestInput(value: unknown): { body: string; displayMode: DisplayMode }`.
- Produces `parseComfortReplyInput(value: unknown): { body: string; displayMode: DisplayMode }`.

- [ ] **Step 1: Add validation tests**

Extend `src/server/__tests__/request-validation.test.ts`:

```ts
import { DisplayMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseComfortReplyInput, parseComfortRequestInput } from "@/server/request-validation";

describe("comfort request validation", () => {
  it("parses request input", () => {
    expect(parseComfortRequestInput({ body: "오늘 힘들었어요", displayMode: "ANONYMOUS" })).toEqual({
      body: "오늘 힘들었어요",
      displayMode: DisplayMode.ANONYMOUS
    });
  });

  it("rejects long reply input", () => {
    expect(() => parseComfortReplyInput({ body: "a".repeat(1001), displayMode: "NICKNAME" })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -- src/server/__tests__/request-validation.test.ts`

Expected: FAIL because comfort parsing functions do not exist.

- [ ] **Step 3: Implement validation helpers**

Add to `src/server/request-validation.ts`:

```ts
const displayModeSchema = z.nativeEnum(DisplayMode);

export function parseComfortRequestInput(value: unknown) {
  return z
    .object({
      body: z.string().trim().min(1).max(3000),
      displayMode: displayModeSchema.default(DisplayMode.ANONYMOUS)
    })
    .parse(value);
}

export function parseComfortReplyInput(value: unknown) {
  return z
    .object({
      body: z.string().trim().min(1).max(1000),
      displayMode: displayModeSchema.default(DisplayMode.ANONYMOUS)
    })
    .parse(value);
}
```

- [ ] **Step 4: Create API routes**

Create `src/app/api/comfort/requests/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortRequest, listRecentComfortExamples } from "@/server/comfort";
import { requireUser } from "@/server/permissions";
import { parseComfortRequestInput } from "@/server/request-validation";

export async function GET() {
  const examples = await listRecentComfortExamples();
  return NextResponse.json({ examples });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const input = parseComfortRequestInput(await request.json());
  const comfortRequest = await createComfortRequest(input, userId);
  return NextResponse.json({ request: comfortRequest }, { status: 201 });
}
```

Create `src/app/api/comfort/requests/[requestId]/replies/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortReply } from "@/server/comfort";
import { requireUser } from "@/server/permissions";
import { parseComfortReplyInput } from "@/server/request-validation";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const { requestId } = await context.params;
  const input = parseComfortReplyInput(await request.json());
  const reply = await createComfortReply(requestId, userId, input);
  return NextResponse.json({ reply }, { status: 201 });
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/server/__tests__/request-validation.test.ts src/server/__tests__/comfort.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/request-validation.ts src/app/api/comfort src/server/__tests__/request-validation.test.ts
git commit -m "feat: add comfort api routes"
```

---

### Task 5: Replace Main UI with Comfort MVP

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/ComfortMain.tsx`
- Create: `src/components/ComfortRequestForm.tsx`
- Create: `src/components/ComfortReplyPanel.tsx`
- Create: `src/components/RecentComfortExamples.tsx`
- Modify or remove: `src/app/posts/page.tsx`, `src/app/posts/new/page.tsx`, `src/app/posts/[postId]/page.tsx`, `src/components/PraiseRoom.tsx`
- Test: `src/components/__tests__/ComfortMain.test.tsx`

**Interfaces:**
- Consumes `hasWrittenComfortRequestToday()`, `listRecentComfortExamples()`, and `listAnswerableComfortRequests()` from Task 3.
- Produces a main screen with today status, recent examples, request form, and reply panel.

- [ ] **Step 1: Write component smoke test**

Create `src/components/__tests__/ComfortMain.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComfortMain from "@/components/ComfortMain";

describe("ComfortMain", () => {
  it("shows today's request status and action choices", () => {
    render(
      <ComfortMain
        hasRequestedToday={false}
        recentExamples={[]}
        answerableRequests={[]}
        isAuthenticated={true}
      />
    );

    expect(screen.getByText("오늘은 아직 위로 요청을 남기지 않았어요.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "위로 요청하기" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "다른 사람에게 답변하기" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run component test and confirm failure**

Run: `npm run test -- src/components/__tests__/ComfortMain.test.tsx`

Expected: FAIL because `ComfortMain` does not exist.

- [ ] **Step 3: Implement `ComfortMain`**

Create `src/components/ComfortMain.tsx` as a client component:

```tsx
"use client";

import { useState } from "react";
import ComfortReplyPanel from "@/components/ComfortReplyPanel";
import ComfortRequestForm from "@/components/ComfortRequestForm";
import RecentComfortExamples from "@/components/RecentComfortExamples";

type Props = {
  hasRequestedToday: boolean;
  isAuthenticated: boolean;
  recentExamples: Array<{ id: string; body: string; replies: Array<{ id: string; body: string }> }>;
  answerableRequests: Array<{ id: string; body: string; replyCount: number }>;
};

export default function ComfortMain({ hasRequestedToday, isAuthenticated, recentExamples, answerableRequests }: Props) {
  const [mode, setMode] = useState<"request" | "reply">("request");

  return (
    <section className="comfort-main">
      <p>{hasRequestedToday ? "오늘 남긴 위로 요청이 있어요." : "오늘은 아직 위로 요청을 남기지 않았어요."}</p>
      <RecentComfortExamples examples={recentExamples} />
      <div role="tablist" aria-label="오늘 할 일">
        <button type="button" role="tab" aria-selected={mode === "request"} onClick={() => setMode("request")}>
          위로 요청하기
        </button>
        <button type="button" role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")}>
          다른 사람에게 답변하기
        </button>
      </div>
      {mode === "request" ? (
        <ComfortRequestForm disabled={hasRequestedToday || !isAuthenticated} />
      ) : (
        <ComfortReplyPanel requests={answerableRequests} isAuthenticated={isAuthenticated} />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Implement form/panel/example components**

Use existing fetch patterns from `src/app/posts/new/page.tsx` and `src/components/PraiseRoom.tsx`, but use `/api/comfort/requests` and `/api/comfort/requests/:requestId/replies`.

`ComfortRequestForm` must use this visible copy:

```tsx
<label htmlFor="comfort-body">오늘 어떤 말을 듣고 싶나요?</label>
<textarea id="comfort-body" name="body" placeholder="오늘 있었던 일이나 듣고 싶은 말을 짧게 적어주세요." maxLength={3000} />
```

`ComfortReplyPanel` must use a single textarea with `maxLength={1000}` and no multi-bubble chat UI.

- [ ] **Step 5: Replace home page**

Modify `src/app/page.tsx`:

```tsx
import ComfortMain from "@/components/ComfortMain";
import { auth } from "@/lib/auth";
import {
  hasWrittenComfortRequestToday,
  listAnswerableComfortRequests,
  listRecentComfortExamples
} from "@/server/comfort";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [recentExamples, answerableRequests, hasRequestedToday] = await Promise.all([
    listRecentComfortExamples(),
    userId ? listAnswerableComfortRequests(userId) : Promise.resolve([]),
    userId ? hasWrittenComfortRequestToday(userId) : Promise.resolve(false)
  ]);

  return (
    <ComfortMain
      isAuthenticated={Boolean(userId)}
      hasRequestedToday={hasRequestedToday}
      recentExamples={recentExamples}
      answerableRequests={answerableRequests}
    />
  );
}
```

- [ ] **Step 6: Remove or redirect old praise pages**

For `/posts`, `/posts/new`, `/posts/[postId]`, and `/rankings`, either delete route files or replace with redirects:

```ts
import { redirect } from "next/navigation";

export default function OldPraiseRoute() {
  redirect("/");
}
```

- [ ] **Step 7: Run UI tests**

Run: `npm run test -- src/components/__tests__/ComfortMain.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/posts src/app/rankings src/components
git commit -m "feat: replace praise home with comfort mvp"
```

---

### Task 6: Notifications, Reports, and Moderation for Comfort Targets

**Files:**
- Modify: `src/server/notifications.ts`
- Modify: `src/app/notifications/page.tsx`
- Modify: `src/app/notifications/actions.ts`
- Modify: `src/server/moderation.ts`
- Modify: `src/server/moderation-review.ts`
- Modify: `src/app/moderation/page.tsx`
- Modify: `src/app/api/moderation/route.ts`
- Modify: `src/app/api/reports/route.ts`
- Test: `src/server/__tests__/notifications.test.ts`
- Test: `src/server/__tests__/moderation.test.ts`

**Interfaces:**
- Consumes generic `Notification.targetType` and comfort target ids from Task 1.
- Consumes `recordReport(reporterUserId, targetType, targetId, reason)`.
- Produces report and moderation behavior for `COMFORT_REQUEST` and `COMFORT_REPLY`.

- [ ] **Step 1: Update notification tests**

Add this assertion to `src/server/__tests__/notifications.test.ts`:

```ts
it("formats first reply notifications for comfort requests", () => {
  expect(
    notificationMessage({
      type: "FIRST_REPLY_ON_REQUEST",
      actor: { nickname: "다정한사람" },
      request: { body: "오늘 좀 지쳤어요" },
      reply: { body: "오늘은 여기까지 온 것만으로도 충분해요." }
    })
  ).toContain("첫 답변");
});
```

If `notificationMessage` is currently inside a page component, extract it to `src/server/notifications.ts` or `src/components/notification-message.ts`.

- [ ] **Step 2: Update moderation target resolution**

In `src/server/moderation.ts`, replace old post/comment/reply author lookup with:

```ts
if (targetType === ModerationTargetType.COMFORT_REQUEST) {
  const request = await tx.comfortRequest.findUnique({
    where: { id: targetId },
    select: { authorUserId: true }
  });
  return request?.authorUserId ?? null;
}

if (targetType === ModerationTargetType.COMFORT_REPLY) {
  const reply = await tx.comfortReply.findUnique({
    where: { id: targetId },
    select: { authorUserId: true }
  });
  return reply?.authorUserId ?? null;
}
```

- [ ] **Step 3: Update report API validation**

`src/app/api/reports/route.ts` should keep `z.nativeEnum(ModerationTargetType)` and accept `COMFORT_REQUEST`, `COMFORT_REPLY`, `AI_REPLY_SUGGESTION`, `USER`.

- [ ] **Step 4: Update moderation review listing**

`src/server/moderation-review.ts` should fetch comfort request/reply previews:

```ts
const requests = await db.comfortRequest.findMany({
  where: { id: { in: idsFor(reports, ModerationTargetType.COMFORT_REQUEST) } },
  include: { author: true }
});

const replies = await db.comfortReply.findMany({
  where: { id: { in: idsFor(reports, ModerationTargetType.COMFORT_REPLY) } },
  include: { author: true, request: true }
});
```

- [ ] **Step 5: Update moderation page actions**

Replace held `PraiseComment` review with held `ComfortRequest` and held `ComfortReply` review. Use labels:

```tsx
<h2>보류된 위로 요청</h2>
<h2>보류된 답변</h2>
```

- [ ] **Step 6: Run focused tests**

Run: `npm run test -- src/server/__tests__/notifications.test.ts src/server/__tests__/moderation.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/notifications.ts src/server/moderation.ts src/server/moderation-review.ts src/app/notifications src/app/moderation src/app/api/reports src/app/api/moderation src/server/__tests__
git commit -m "feat: adapt notifications and moderation to comfort"
```

---

### Task 7: Remove Automatic AI Praise and Ranking Paths

**Files:**
- Modify: `src/server/jobs.ts`
- Modify: `src/server/worker.ts`
- Modify or remove: `src/server/ai.ts`
- Modify or remove: `src/server/rankings.ts`
- Modify: `src/app/api/moderation/ai-controls/route.ts`
- Modify: `src/app/api/rankings/route.ts`
- Modify: `package.json`
- Test: existing job/AI/ranking tests.

**Interfaces:**
- Produces no automatic public AI reply path.
- Keeps `AiUsageEvent` available for future AI assistance and quality filtering.
- Replaces automatic AI praise/ranking workers with a diagnostic worker process that records heartbeat and logs that no automatic AI praise worker runs in the comfort MVP.

- [ ] **Step 1: Identify old tests**

Run: `rg -n "AiPraise|aiPraise|PraiseJob|Ranking|rankings|generatePraise" src`

Expected: the command prints every old AI praise/ranking test and implementation file so each reference can be deleted, redirected, or rewritten in this task.

- [ ] **Step 2: Remove automatic AI praise scheduling from request creation**

No comfort request creation should enqueue jobs. Search result must show no call like:

```ts
enqueueAiPraiseJob(...)
scheduleInactivityPraise(...)
generatePraiseComments(...)
```

inside comfort request/reply code.

- [ ] **Step 3: Keep AI provider utilities only when useful**

Keep `src/server/ai.ts` provider configuration and `src/server/ai-controls.ts` usage tracking in place for future assistance/filtering work. In this task, delete or disconnect every import and route that creates automatic public AI comments.

- [ ] **Step 4: Remove rankings route from navigation and API**

Delete or redirect:

```text
src/app/rankings/page.tsx
src/app/api/rankings/route.ts
src/server/rankings.ts
```

If deletion causes imports to break, replace page/API with redirects or `410` JSON responses:

```ts
return NextResponse.json({ error: "RANKINGS_REMOVED_FOR_COMFORT_PIVOT" }, { status: 410 });
```

- [ ] **Step 5: Update `package.json` jobs script**

Keep `jobs:dev` as a diagnostic script so local operators do not hit a missing script while docs are being updated:

```json
"jobs:dev": "tsx src/server/worker.ts"
```

Change `src/server/worker.ts` to record heartbeat if the heartbeat helper remains available, then log:

```ts
console.log("No automatic AI praise worker runs in the comfort MVP.");
```

- [ ] **Step 6: Run affected tests**

Run: `npm run test`

Expected: PASS after old AI/ranking tests are removed or rewritten to assert the new no-auto-AI policy.

- [ ] **Step 7: Commit**

```bash
git add src/server/jobs.ts src/server/worker.ts src/server/ai.ts src/server/rankings.ts src/app/api/rankings src/app/rankings package.json src/server/__tests__
git commit -m "refactor: remove automatic praise workers"
```

---

### Task 8: Documentation, Seed Data, and Full Verification

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `README.md`
- Modify: `docs/CURRENT_WORK.ko.md`
- Modify: `docs/RUNNING.ko.md`
- Modify: `docs/OPERATIONS.ko.md`
- Test: full repository verification.

**Interfaces:**
- Consumes all previous task outputs.
- Produces final handoff docs for the comfort MVP foundation.

- [ ] **Step 1: Update seed data**

Replace praise post seed with comfort requests/replies:

```ts
await prisma.comfortRequest.create({
  data: {
    authorUserId: author.id,
    displayMode: "ANONYMOUS",
    body: "오늘 작은 실수를 했는데 계속 마음에 남아요. 너무 크게 생각하지 말라는 말을 듣고 싶어요.",
    replies: {
      create: {
        authorUserId: moderator.id,
        displayMode: "NICKNAME",
        body: "그 일이 마음에 남을 수는 있지만, 그 실수 하나로 오늘 전체가 정해지는 건 아닌 것 같아요."
      }
    }
  }
});
```

- [ ] **Step 2: Update README product description**

Replace the opening with:

```md
# Comfort Praise MVP

A Korean-first comfort and praise exchange app where users can write one daily request for encouragement and leave one thoughtful reply on another person's request.
```

- [ ] **Step 3: Update local running docs**

In `docs/RUNNING.ko.md`, replace worker-focused AI praise instructions with comfort MVP instructions:

```md
MVP에서는 AI가 공개 답변을 자동 작성하지 않습니다. AI provider 설정은 이후 작성 보조와 콘텐츠 품질 필터 기능을 위해 유지됩니다.
```

- [ ] **Step 4: Update current work handoff**

In `docs/CURRENT_WORK.ko.md`, state:

```md
현재 구현 기준 도메인은 `ComfortRequest`/`ComfortReply`입니다. 기존 칭찬 커뮤니티 도메인은 피벗 과정에서 제거되었습니다.
```

- [ ] **Step 5: Run Prisma verification**

Run:

```bash
npm run prisma:generate
npx prisma migrate status
```

Expected: Prisma client generation succeeds and migrations are recognized.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm run verify
```

Expected: lint, tests, production build, and TypeScript checking all pass.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts README.md docs/CURRENT_WORK.ko.md docs/RUNNING.ko.md docs/OPERATIONS.ko.md
git commit -m "docs: update comfort mvp handoff"
```

---

## Self-Review

Spec coverage:

- New `ComfortRequest`/`ComfortReply` models: Task 1.
- Do not reuse `PraisePost`/`PraiseComment`: Task 1 and Task 7.
- One request per user per day: Task 3.
- One reply per request per user and 1000 character reply limit: Task 1 and Task 3.
- Recent comfort/reply examples with visible data: Task 3 and Task 5.
- Main screen with today status and action choice: Task 5.
- Reports, moderation, and trust reuse: Task 6.
- First reply notification: Task 3 and Task 6.
- AI as writing assistance/safety filter rather than automatic public replies: Task 1 and Task 7.
- Content quality gate foundation: Task 2 and Task 3.
- Docs and handoff: Task 8.

Separate implementation plans after this one:

- Local draft storage and login handoff can be implemented after the core server/API/UI paths exist.
- LLM-backed content classifier and AI reply suggestion UI should be a separate plan using the `ContentQualityReview` and `AiReplySuggestion` tables created here.
- Mobile app and push notifications remain outside this MVP implementation plan.
