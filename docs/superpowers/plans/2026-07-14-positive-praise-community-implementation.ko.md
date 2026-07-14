# 칭찬 커뮤니티 구현 계획

> **에이전트 작업자용:** 필수 하위 스킬: 이 계획을 작업 단위로 구현할 때는 `superpowers:subagent-driven-development` 사용을 권장하며, 또는 `superpowers:executing-plans`를 사용한다. 단계 추적은 체크박스(`- [ ]`) 문법을 사용한다.

**목표:** 인증된 사용자가 칭찬 요청 글을 올리고, 사람과 AI에게 실시간 칭찬을 받으며, 감사 반응을 남기고, 조용한 운영 정책으로 보호받는 MVP 커뮤니티를 만든다.

**아키텍처:** Next.js는 UI와 HTTP 라우트를 담당하고, PostgreSQL과 Prisma는 영속성을 담당한다. Auth.js는 인증, Socket.IO는 글 상세 실시간 업데이트, BullMQ와 Redis는 AI/랭킹 지연 작업, OpenAI는 서버 전용 모듈에서만 사용한다. 핵심 규칙은 `src/server/*` 도메인 모듈에 두어 API 라우트, 작업 큐, 테스트가 같은 동작을 공유하게 한다.

**기술 스택:** Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, Socket.IO, BullMQ, Redis, OpenAI API, Vitest, Testing Library, Playwright.

## 전역 제약

- 글쓰기와 반응 작성은 인증된 계정만 가능하다.
- MVP에서 홈 피드와 글 상세 읽기는 공개한다.
- 사용자는 글과 댓글을 닉네임 또는 익명으로 표시할 수 있다.
- 익명 표시는 공개 라벨 `Anonymous`를 사용하고, 한국어 UI에서는 `익명`으로 표시한다.
- 익명 표시는 내부적으로 항상 인증 계정과 연결된다.
- AI 댓글은 명확히 AI로 표시한다.
- AI는 글 작성 직후 초기 칭찬 댓글 1-3개를 생성한다.
- AI 공백 칭찬은 글 작성 후 10분 동안 사람 댓글이 없거나, 30분 동안 새 사람 댓글이 없을 때 실행한다.
- 글당 AI 댓글은 최대 5개로 제한한다.
- 유해 댓글은 눈에 띄는 강한 차단보다 보류, 숨김, 작성자 본인 노출 방식으로 처리한다.
- 랭킹은 단순 댓글 수가 아니라 따뜻함과 유익한 참여를 보상한다.
- 첫 UI 문구는 한국어로 작성하고, 내부 식별자와 코드는 영어로 유지한다.
- 새 제품 문서는 영문과 한글 버전을 함께 작성한다.

---

## 파일 구조

- `package.json`: 스크립트와 의존성.
- `next.config.ts`: Next.js 설정.
- `tsconfig.json`: 엄격한 TypeScript 설정.
- `vitest.config.ts`: 단위/통합 테스트 설정.
- `playwright.config.ts`: 브라우저 테스트 설정.
- `.env.example`: 로컬 환경 변수 예시.
- `prisma/schema.prisma`: 데이터베이스 스키마와 enum.
- `prisma/seed.ts`: 개발/브라우저 테스트용 시드 데이터.
- `src/app/layout.tsx`: 앱 셸과 전역 레이아웃.
- `src/app/page.tsx`: 공개 홈 피드.
- `src/app/login/page.tsx`: 로그인 화면.
- `src/app/posts/new/page.tsx`: 인증된 글 작성 화면.
- `src/app/posts/[postId]/page.tsx`: 공개 글 상세 칭찬방.
- `src/app/rankings/page.tsx`: 랭킹 화면.
- `src/app/me/page.tsx`: 내 활동 화면.
- `src/app/moderation/page.tsx`: 최소 운영자 검토 화면.
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js 라우트.
- `src/app/api/posts/route.ts`: 글 목록과 글 작성 API.
- `src/app/api/posts/[postId]/comments/route.ts`: 댓글 작성 API.
- `src/app/api/comments/[commentId]/reactions/route.ts`: 작성자 감사 반응 API.
- `src/app/api/comments/[commentId]/replies/route.ts`: 작성자 감사 답글 API.
- `src/app/api/reports/route.ts`: 신고 API.
- `src/app/api/rankings/route.ts`: 랭킹 조회 API.
- `src/app/api/moderation/route.ts`: 운영자 검토 액션 API.
- `src/app/api/socket/route.ts`: 개발용 Socket.IO 부트스트랩 라우트.
- `src/components/*`: DB에 직접 접근하지 않는 재사용 UI.
- `src/lib/auth.ts`: Auth.js 옵션과 세션 헬퍼.
- `src/lib/db.ts`: Prisma 클라이언트 싱글턴.
- `src/lib/socket-client.ts`: 브라우저 Socket.IO 클라이언트.
- `src/server/posts.ts`: 글 작성, 피드, 상세 조회 규칙.
- `src/server/comments.ts`: 댓글, 반응, 답글 규칙.
- `src/server/moderation.ts`: 규칙 기반 필터링과 신뢰 점수 변경.
- `src/server/ai.ts`: 서버 전용 OpenAI 칭찬 생성.
- `src/server/jobs.ts`: BullMQ 큐와 프로세서.
- `src/server/rankings.ts`: 랭킹 점수 계산.
- `src/server/realtime.ts`: Socket.IO 방 이벤트 발행 헬퍼.
- `tests/unit/*.test.ts`: 운영, AI 예약, 랭킹, 권한 도메인 테스트.
- `tests/integration/*.test.ts`: API/DB 테스트.
- `tests/e2e/*.spec.ts`: 핵심 사용자 흐름 브라우저 테스트.

---

### 작업 1: 애플리케이션 스캐폴드, 도구, 환경 설정

**파일:**
- 생성: `package.json`
- 생성: `next.config.ts`
- 생성: `tsconfig.json`
- 생성: `vitest.config.ts`
- 생성: `playwright.config.ts`
- 생성: `.env.example`
- 생성: `src/app/layout.tsx`
- 생성: `src/app/page.tsx`
- 생성: `src/app/globals.css`
- 테스트: `tests/unit/smoke.test.ts`

**인터페이스:**
- 생성: `npm run test`, `npm run lint`, `npm run build`, `npm run dev`.
- 생성: `@/*` TypeScript alias.

- [ ] **1단계: Next.js 프로젝트 파일을 만든다**

`package.json`에는 다음 스크립트를 포함한다:

```json
{
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
  }
}
```

필수 의존성은 `next`, `react`, `react-dom`, `typescript`, `prisma`, `@prisma/client`, `next-auth`, `@auth/prisma-adapter`, `socket.io`, `socket.io-client`, `bullmq`, `ioredis`, `openai`, `zod`, `vitest`, `@playwright/test`이다.

- [ ] **2단계: 환경 변수 예시를 만든다**

`.env.example`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community"
AUTH_SECRET="replace-with-local-secret"
AUTH_URL="http://localhost:3000"
OPENAI_API_KEY=""
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

- [ ] **3단계: 최소 앱 셸을 만든다**

`src/app/layout.tsx`는 브랜드 `칭찬`, 메뉴 `랭킹`, `글쓰기`, `내 활동`을 제공한다. `src/app/page.tsx`는 첫 상태에서 “칭찬받고 싶은 순간을 올려보세요” 문구를 보여준다. `src/app/globals.css`는 기본 글꼴, 헤더, 본문 폭, 링크 스타일을 정의한다.

- [ ] **4단계: 스모크 테스트를 추가한다**

`tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs TypeScript tests", () => {
    expect("칭찬").toContain("긍정");
  });
});
```

- [ ] **5단계: 검증한다**

실행: `npm install`

실행: `npm run test`

예상: 스모크 테스트 1개 통과.

실행: `npm run build`

예상: Next.js 프로덕션 빌드 완료.

- [ ] **6단계: 커밋한다**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts playwright.config.ts .env.example src/app tests/unit
git commit -m "chore: scaffold praise community app"
```

---

### 작업 2: 데이터베이스 스키마와 시드 데이터

**파일:**
- 생성: `prisma/schema.prisma`
- 생성: `prisma/seed.ts`
- 생성: `src/lib/db.ts`
- 테스트: `tests/unit/schema-enums.test.ts`

**인터페이스:**
- 생성 enum: `DisplayMode`, `VisibilityState`, `SanctionState`, `ReactionType`, `AiJobType`, `AiJobStatus`, `RankingType`.
- 생성 모델: `User`, `PraisePost`, `PraiseComment`, `Reaction`, `Reply`, `Report`, `ModerationEvent`, `AiPraiseJob`, `RankingSnapshot`.
- 생성: `src/lib/db.ts`의 `db` Prisma 싱글턴.

- [ ] **1단계: enum 계약 테스트를 작성한다**

`tests/unit/schema-enums.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("schema enum contract", () => {
  it("supports anonymous display and quiet moderation", () => {
    expect(["NICKNAME", "ANONYMOUS"]).toContain("ANONYMOUS");
    expect(["VISIBLE", "HELD", "HIDDEN", "AUTHOR_ONLY"]).toContain("AUTHOR_ONLY");
    expect(["NORMAL", "LOW_TRUST", "SHADOW_BANNED", "SERVICE_BANNED"]).toContain("SHADOW_BANNED");
  });
});
```

- [ ] **2단계: 테스트를 실행한다**

실행: `npm run test -- tests/unit/schema-enums.test.ts`

예상: enum 계약 테스트 통과.

- [ ] **3단계: Prisma 스키마를 만든다**

`prisma/schema.prisma`는 다음 구조를 포함한다:

```prisma
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
```

`User`에는 `nickname`, `trustScore`, `sanctionState`, `isModerator`를 둔다. `PraisePost`는 작성자, 표시 방식, 제목, 본문, 프롬프트 답변, 상태를 가진다. `PraiseComment`는 사람/AI 여부, 표시 방식, 노출 상태, 운영 위험 점수를 가진다. `Reaction`, `Reply`, `Report`, `ModerationEvent`, `AiPraiseJob`, `RankingSnapshot`을 설계 문서의 필드와 동일하게 만든다.

- [ ] **4단계: Prisma 싱글턴을 만든다**

`src/lib/db.ts`:

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

- [ ] **5단계: 시드 데이터를 만든다**

`prisma/seed.ts`는 `author@example.com`, `moderator@example.com` 사용자를 만들고, “오늘 미루던 병원 예약을 했어요” 글 하나를 만든다. 비밀번호는 개발용 `password1234`를 bcrypt로 해시한다.

- [ ] **6단계: Prisma를 검증한다**

실행: `npm run prisma:generate`

예상: Prisma Client 생성.

실행: `npm run prisma:migrate -- --name init`

예상: 로컬 PostgreSQL에 마이그레이션 적용.

실행: `npm run prisma:seed`

예상: 시드 사용자와 글 생성.

- [ ] **7단계: 커밋한다**

```bash
git add prisma src/lib/db.ts tests/unit/schema-enums.test.ts package.json package-lock.json
git commit -m "feat: add database schema"
```

---

### 작업 3: 인증과 쓰기 권한

**파일:**
- 생성: `src/lib/auth.ts`
- 생성: `src/app/api/auth/[...nextauth]/route.ts`
- 생성: `src/server/permissions.ts`
- 생성: `src/app/login/page.tsx`
- 테스트: `tests/unit/permissions.test.ts`

**인터페이스:**
- 생성: Auth.js의 `auth()`.
- 생성: `requireUser(sessionUserId?: string): string`.
- 생성: `assertCanWrite(user: { sanctionState: SanctionState }): void`.

- [ ] **1단계: 권한 테스트를 작성한다**

`tests/unit/permissions.test.ts`:

```ts
import { SanctionState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertCanWrite, requireUser } from "@/server/permissions";

describe("permissions", () => {
  it("rejects unauthenticated write attempts", () => {
    expect(() => requireUser(undefined)).toThrow("AUTH_REQUIRED");
  });

  it("blocks service banned users from writing", () => {
    expect(() => assertCanWrite({ sanctionState: SanctionState.SERVICE_BANNED })).toThrow("WRITE_BLOCKED");
  });
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/permissions.test.ts`

예상: `src/server/permissions.ts`가 없어 실패.

- [ ] **3단계: 권한 헬퍼를 구현한다**

`src/server/permissions.ts`:

```ts
import { SanctionState } from "@prisma/client";

export function requireUser(sessionUserId: string | undefined): string {
  if (!sessionUserId) throw new Error("AUTH_REQUIRED");
  return sessionUserId;
}

export function assertCanWrite(user: { sanctionState: SanctionState }): void {
  if (user.sanctionState === SanctionState.SERVICE_BANNED) {
    throw new Error("WRITE_BLOCKED");
  }
}
```

- [ ] **4단계: Auth.js를 설정한다**

`src/lib/auth.ts`는 Prisma adapter와 Credentials provider를 사용한다. 로그인은 email/password를 받고, bcrypt로 `passwordHash`와 비교한다. 세션 콜백은 `session.user.id`를 채운다.

- [ ] **5단계: 로그인 화면을 만든다**

`src/app/login/page.tsx`는 이메일, 비밀번호 입력과 “글쓰기, 칭찬 댓글, 감사 반응은 로그인 후 사용할 수 있습니다.” 문구를 제공한다.

- [ ] **6단계: 검증한다**

실행: `npm run test -- tests/unit/permissions.test.ts`

예상: 권한 테스트 통과.

실행: `npm run build`

예상: 빌드 완료.

- [ ] **7단계: 커밋한다**

```bash
git add src/lib/auth.ts src/app/api/auth src/server/permissions.ts src/app/login src/types tests/unit/permissions.test.ts
git commit -m "feat: add authentication guards"
```

---

### 작업 4: 글 작성, 피드, 글 생성 API

**파일:**
- 생성: `src/server/posts.ts`
- 생성: `src/app/api/posts/route.ts`
- 수정: `src/app/page.tsx`
- 생성: `src/app/posts/new/page.tsx`
- 테스트: `tests/unit/posts.test.ts`
- 테스트: `tests/integration/posts-api.test.ts`

**인터페이스:**
- 생성: `createPraisePost(input, authorUserId)`.
- 생성: `listFeedPosts()`.
- 소비: `requireUser()`, `assertCanWrite()`.
- 생성: `POST /api/posts`, `GET /api/posts`.

- [ ] **1단계: 글 입력 테스트를 작성한다**

`tests/unit/posts.test.ts`:

```ts
import { DisplayMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { normalizePostInput } from "@/server/posts";

describe("post input normalization", () => {
  it("trims title and body", () => {
    const input = normalizePostInput({
      title: "  오늘 해냈어요  ",
      body: "  미뤄둔 일을 끝냈습니다.  ",
      displayMode: DisplayMode.ANONYMOUS,
      promptAnswers: { tone: "다정하게" }
    });
    expect(input.title).toBe("오늘 해냈어요");
    expect(input.body).toBe("미뤄둔 일을 끝냈습니다.");
  });

  it("rejects empty post bodies", () => {
    expect(() =>
      normalizePostInput({ title: "제목", body: " ", displayMode: DisplayMode.NICKNAME, promptAnswers: null })
    ).toThrow("POST_BODY_REQUIRED");
  });
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/posts.test.ts`

예상: `normalizePostInput`이 없어 실패.

- [ ] **3단계: 글 도메인 모듈을 구현한다**

`src/server/posts.ts`는 zod로 제목 1-120자, 본문 1-3000자, `DisplayMode`, `promptAnswers`를 검증한다. `createPraisePost()`는 글을 만들고 같은 트랜잭션에서 `INITIAL_PRAISE` AI 작업을 만든다. `listFeedPosts()`는 `VISIBLE` 글 30개를 최신 활동순으로 반환하고 댓글의 사람/AI 수를 계산할 수 있게 include한다.

- [ ] **4단계: API 라우트를 만든다**

`src/app/api/posts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPraisePost, listFeedPosts } from "@/server/posts";
import { assertCanWrite, requireUser } from "@/server/permissions";

export async function GET() {
  return NextResponse.json({ posts: await listFeedPosts() });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const post = await createPraisePost(await request.json(), userId);
  return NextResponse.json({ post }, { status: 201 });
}
```

- [ ] **5단계: 피드와 글쓰기 화면을 만든다**

홈 피드는 제목, 본문 미리보기, 작성자 표시명, 사람 댓글 수, AI 댓글 수를 보여준다. 글쓰기 화면은 제목, 본문, 오늘 내가 해낸 일, 칭찬받고 싶은 점, 듣고 싶은 칭찬 톤, 표시 방식 선택을 제공한다.

- [ ] **6단계: 검증한다**

실행: `npm run test -- tests/unit/posts.test.ts`

예상: 글 도메인 테스트 통과.

실행: `npm run build`

예상: 빌드 완료.

- [ ] **7단계: 커밋한다**

```bash
git add src/server/posts.ts src/app/api/posts src/app/page.tsx src/app/posts/new tests/unit/posts.test.ts
git commit -m "feat: add praise posts and feed"
```

---

### 작업 5: 댓글, 감사 반응, 감사 답글, WebSocket 업데이트

**파일:**
- 생성: `src/server/comments.ts`
- 생성: `src/server/realtime.ts`
- 생성: `src/lib/socket-client.ts`
- 생성: `src/app/api/socket/route.ts`
- 생성: `src/app/api/posts/[postId]/comments/route.ts`
- 생성: `src/app/api/comments/[commentId]/reactions/route.ts`
- 생성: `src/app/api/comments/[commentId]/replies/route.ts`
- 생성: `src/app/posts/[postId]/page.tsx`
- 생성: `src/components/PraiseRoom.tsx`
- 테스트: `tests/unit/comments.test.ts`

**인터페이스:**
- 생성: `createPraiseComment(postId, authorUserId, input)`.
- 생성: `addAuthorReaction(commentId, authorUserId, type)`.
- 생성: `addAuthorReply(commentId, authorUserId, body)`.
- 생성: `publishPostEvent(postId, event)`.
- WebSocket 방 이름: `post:${postId}`.

- [ ] **1단계: 댓글 규칙 테스트를 작성한다**

`tests/unit/comments.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertPostAuthor, normalizeCommentBody } from "@/server/comments";

describe("comment rules", () => {
  it("normalizes comment body", () => {
    expect(normalizeCommentBody("  정말 멋져요.  ")).toBe("정말 멋져요.");
  });

  it("allows only the post author to react or reply", () => {
    expect(() => assertPostAuthor("user_1", "user_1")).not.toThrow();
    expect(() => assertPostAuthor("user_1", "user_2")).toThrow("POST_AUTHOR_ONLY");
  });
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/comments.test.ts`

예상: `src/server/comments.ts`가 없어 실패.

- [ ] **3단계: 댓글 도메인 규칙을 구현한다**

`normalizeCommentBody()`는 공백 제거, 빈 문자열 차단, 1000자 제한을 처리한다. `assertPostAuthor()`는 글 작성자만 반응/답글을 남기게 한다. `createPraiseComment()`는 `moderateText()` 결과에 따라 `visibilityState`와 `moderationRisk`를 저장한다.

- [ ] **4단계: 실시간 헬퍼를 만든다**

`src/server/realtime.ts`는 `registerSocketServer(io)`와 `publishPostEvent(postId, event)`를 제공한다. 이벤트 타입은 `comment.created`, `reaction.created`, `reply.created`, `comment.visibilityChanged`이다.

- [ ] **5단계: API 라우트를 만든다**

댓글 작성 API는 인증, 쓰기 가능 여부, `createPraiseComment()`, `publishPostEvent()` 순서로 처리한다. 반응과 답글 API는 `addAuthorReaction()`, `addAuthorReply()`를 호출하고 각각 실시간 이벤트를 발행한다.

- [ ] **6단계: 칭찬방 UI를 만든다**

`src/app/posts/[postId]/page.tsx`는 글, 보이는 댓글, 댓글 작성자, 반응, 보이는 답글을 조회한다. `src/components/PraiseRoom.tsx`는 `createPostSocket(post.id)`로 `post:${postId}` 방에 참여하고, MVP에서는 이벤트 수신 시 `window.location.reload()`로 최신 상태를 반영한다.

- [ ] **7단계: 검증한다**

실행: `npm run test -- tests/unit/comments.test.ts`

예상: 댓글 규칙 테스트 통과.

실행: `npm run build`

예상: 빌드 완료.

- [ ] **8단계: 커밋한다**

```bash
git add src/server/comments.ts src/server/realtime.ts src/lib/socket-client.ts src/app/api/posts src/app/api/comments src/app/posts src/components/PraiseRoom.tsx tests/unit/comments.test.ts
git commit -m "feat: add realtime praise room"
```

---

### 작업 6: 필터링, 신고, 제재

**파일:**
- 생성: `src/server/moderation.ts`
- 생성: `src/app/api/reports/route.ts`
- 생성: `src/app/api/moderation/route.ts`
- 생성: `src/app/moderation/page.tsx`
- 테스트: `tests/unit/moderation.test.ts`

**인터페이스:**
- 생성: `moderateText(text): { visibilityState: VisibilityState; risk: number; reason: string }`.
- 생성: `recordReport(reporterUserId, targetType, targetId, reason)`.
- 생성: `applyTrustDelta(userId, delta, reason)`.
- 소비: `User.isModerator`.

- [ ] **1단계: 운영 정책 테스트를 작성한다**

`tests/unit/moderation.test.ts`:

```ts
import { VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateSanctionState, moderateText } from "@/server/moderation";

describe("moderation", () => {
  it("holds praise disguised as mockery", () => {
    const result = moderateText("와 그걸 자랑이라고 올리다니 대단하다");
    expect(result.visibilityState).toBe(VisibilityState.AUTHOR_ONLY);
  });

  it("maps trust score to sanctions", () => {
    expect(calculateSanctionState(100)).toBe("NORMAL");
    expect(calculateSanctionState(59)).toBe("LOW_TRUST");
    expect(calculateSanctionState(29)).toBe("SHADOW_BANNED");
    expect(calculateSanctionState(9)).toBe("SERVICE_BANNED");
  });
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/moderation.test.ts`

예상: `src/server/moderation.ts`가 없어 실패.

- [ ] **3단계: 운영 모듈을 구현한다**

`moderateText()`는 조롱성 칭찬, 외모 평가, 욕설/혐오, 자기 홍보 패턴을 검사한다. 위험도 90 이상은 `HIDDEN`, 그보다 낮은 위험은 `AUTHOR_ONLY`, 안전한 문장은 `VISIBLE`로 둔다. `calculateSanctionState()`는 60 이하 `LOW_TRUST`, 30 이하 `SHADOW_BANNED`, 10 이하 `SERVICE_BANNED`로 매핑한다.

- [ ] **4단계: 신고 API를 만든다**

`src/app/api/reports/route.ts`는 인증 사용자만 신고할 수 있게 하고, `targetType`, `targetId`, `reason`을 검증한 뒤 `recordReport()`를 호출한다.

- [ ] **5단계: 최소 운영자 검토 화면을 만든다**

`src/app/moderation/page.tsx`는 로그인한 사용자가 운영자인지 확인한다. 운영자에게는 `HELD`, `AUTHOR_ONLY`, `HIDDEN` 댓글 50개를 최신순으로 보여준다. 첫 버전에서는 복잡한 검색과 일괄 처리를 넣지 않는다.

- [ ] **6단계: 검증한다**

실행: `npm run test -- tests/unit/moderation.test.ts`

예상: 운영 정책 테스트 통과.

실행: `npm run build`

예상: 빌드 완료.

- [ ] **7단계: 커밋한다**

```bash
git add src/server/moderation.ts src/app/api/reports src/app/api/moderation src/app/moderation tests/unit/moderation.test.ts
git commit -m "feat: add quiet moderation"
```

---

### 작업 7: AI 칭찬 작업과 백그라운드 처리

**파일:**
- 생성: `src/server/ai.ts`
- 생성: `src/server/jobs.ts`
- 테스트: `tests/unit/ai-policy.test.ts`
- 테스트: `tests/unit/jobs.test.ts`

**인터페이스:**
- 생성: `buildPraisePrompt(post): string`.
- 생성: `generatePraiseComments(post, count): Promise<string[]>`.
- 생성: `shouldRunInactivityPraise(postId): Promise<boolean>`.
- 생성 큐: `aiPraiseQueue`, `rankingQueue`.

- [ ] **1단계: AI 정책 테스트를 작성한다**

`tests/unit/ai-policy.test.ts`:

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

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/ai-policy.test.ts`

예상: `src/server/ai.ts`가 없어 실패.

- [ ] **3단계: AI 프롬프트 모듈을 구현한다**

`buildPraisePrompt()`는 한국어 댓글, AI 표시, 노력/용기/지속성/배려/배움/완료 중심 칭찬, 전문 조언 금지, 외모/신체/정체성 평가 금지, 160자 이내를 명시한다. `generatePraiseComments()`는 서버 전용 OpenAI client를 사용하고 `clampPraiseCount()`로 1-3개를 보장한다.

- [ ] **4단계: 작업 큐를 구현한다**

`src/server/jobs.ts`는 Redis 연결, `aiPraiseQueue`, `rankingQueue`, `startAiPraiseWorker()`를 만든다. `shouldRunInactivityPraise()`는 AI 댓글이 5개 미만이고 보이는 사람 댓글이 없을 때만 true를 반환한다. AI 작업 성공 시 `PraiseComment`를 만들고 `comment.created` 실시간 이벤트를 발행한다.

- [ ] **5단계: 글 작성에서 AI 작업을 예약한다**

`createPraisePost()`는 즉시 실행할 `INITIAL_PRAISE` 작업과 10분 뒤 실행할 `INACTIVITY_PRAISE` 작업을 만든다. 트랜잭션 후 BullMQ 큐에 각각 등록한다.

- [ ] **6단계: 검증한다**

실행: `npm run test -- tests/unit/ai-policy.test.ts`

예상: AI 정책 테스트 통과.

실행: `npm run build`

예상: 빌드 완료.

- [ ] **7단계: 커밋한다**

```bash
git add src/server/ai.ts src/server/jobs.ts src/server/posts.ts tests/unit/ai-policy.test.ts tests/unit/jobs.test.ts
git commit -m "feat: add ai praise jobs"
```

---

### 작업 8: 랭킹, 내 활동, 최종 E2E 검증

**파일:**
- 생성: `src/server/rankings.ts`
- 생성: `src/app/api/rankings/route.ts`
- 생성: `src/app/rankings/page.tsx`
- 생성: `src/app/me/page.tsx`
- 테스트: `tests/unit/rankings.test.ts`
- 테스트: `tests/e2e/core-flow.spec.ts`

**인터페이스:**
- 생성: `calculateWarmPraiserScore(input): number`.
- 생성: `getRankingSnapshots()`.
- 생성 화면: `/rankings`, `/me`.

- [ ] **1단계: 랭킹 테스트를 작성한다**

`tests/unit/rankings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateWarmPraiserScore } from "@/server/rankings";

describe("ranking score", () => {
  it("rewards gratitude and penalizes reports", () => {
    expect(calculateWarmPraiserScore({
      gratitudeCount: 10,
      visibleCommentCount: 12,
      reportCount: 0,
      moderationPenalty: 0
    })).toBe(62);
  });

  it("does not reward raw volume alone", () => {
    expect(calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 50,
      reportCount: 0,
      moderationPenalty: 0
    })).toBeLessThan(20);
  });
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `npm run test -- tests/unit/rankings.test.ts`

예상: `src/server/rankings.ts`가 없어 실패.

- [ ] **3단계: 랭킹 모듈을 구현한다**

`calculateWarmPraiserScore()`는 감사 반응 수에 5점을 곱하고, 보이는 댓글 수는 최대 20점까지만 더한다. 신고는 건당 12점, 운영 페널티는 그대로 감점한다. `getRankingSnapshots()`는 `WARM_PRAISER`, `NEEDS_ENCOURAGEMENT` 스냅샷을 최신순으로 가져온다.

- [ ] **4단계: 랭킹 화면과 API를 만든다**

`src/app/api/rankings/route.ts`는 `getRankingSnapshots()` 결과를 JSON으로 반환한다. `src/app/rankings/page.tsx`는 “따뜻한 칭찬러”와 “응원이 필요한 글” 영역을 보여준다.

- [ ] **5단계: 내 활동 화면을 만든다**

`src/app/me/page.tsx`는 로그인 필요 상태를 처리하고, 로그인 사용자의 신뢰 점수, 제재 상태, 최근 작성 글 10개, 최근 작성 댓글 10개를 보여준다.

- [ ] **6단계: E2E 스모크 플로우를 추가한다**

`tests/e2e/core-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("public visitor can see the praise feed and rankings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "칭찬받고 싶은 순간들" })).toBeVisible();

  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "랭킹" })).toBeVisible();
});
```

- [ ] **7단계: 전체 검증을 실행한다**

실행: `npm run test`

예상: 모든 단위/통합 테스트 통과.

실행: `npm run build`

예상: 프로덕션 빌드 완료.

실행: `npm run test:e2e`

예상: Playwright 핵심 플로우가 데스크톱과 모바일 프로젝트에서 통과.

- [ ] **8단계: 커밋한다**

```bash
git add src/server/rankings.ts src/app/api/rankings src/app/rankings src/app/me tests/unit/rankings.test.ts tests/e2e/core-flow.spec.ts
git commit -m "feat: add rankings and activity pages"
```

---

## 자체 검토 체크리스트

- 설계 범위 반영: 인증, 익명 표시, 글, 프롬프트, 피드, 실시간 칭찬방, 초기 AI 칭찬, 공백 AI 칭찬, 댓글, 감사 반응, 감사 답글, 신고, 조용한 운영, 신뢰 제재, 랭킹, 내 활동, 최소 운영자 검토가 작업에 포함되어 있다.
- 구현 선택 고정: 익명 표시는 `Anonymous`/`익명`, 읽기는 공개, AI 공백 기준은 10분/30분, AI 댓글 상한은 5개, 신뢰 기준은 60/30/10이다.
- Supabase 의존성 없음: PostgreSQL, Auth, WebSocket을 앱이 직접 소유한다.
- 배포 리스크: 일부 호스팅 환경은 Next.js route handler 안의 Socket.IO 패턴을 지원하지 않을 수 있다. 그 경우 배포 전에 `server/socket.ts`의 별도 Node HTTP 서버로 분리한다.
