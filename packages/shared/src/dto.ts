import { z } from "zod";

// All request/response zod schemas shared between apps/api-server and
// apps/web live in this one file, deliberately — a schema importing
// another schema from a *different file within this same package* (e.g.
// requests.ts importing author.ts via a relative or self-referencing
// "shared/..." specifier) breaks two different consumers in two different
// ways: apps/api-server's plain Node runtime (no bundler, no build step)
// can't resolve a relative import without a real .js file to find, and
// resolving it via the package's own name instead ("shared/dto/author")
// works for Node but then breaks ts-jest's test-time module resolution
// (TS2209 "ambiguous project root"). One file with zero internal imports
// sidesteps both failure modes entirely. See
// docs/decisions/2026-09-01-onseol-zod-validation-migration-decisions.md.

// Mirrors apps/api-server's common/author-display.ts — a guest post is
// always { anonymous: true }; a member post is only
// { anonymous: false, ... } when they opted in for that specific post AND
// had a nickname set at the time. authorId/guestId themselves never cross
// this boundary (see toAuthorDisplayDto, which stays backend-only).
export const authorDisplaySchema = z.discriminatedUnion("anonymous", [
  z.object({ anonymous: z.literal(true) }),
  z.object({
    anonymous: z.literal(false),
    nickname: z.string(),
    nicknameDiscriminator: z.string(),
  }),
]);
export type AuthorDisplayDto = z.infer<typeof authorDisplaySchema>;

// POST /requests body — mirrors the limits that used to live as
// class-validator decorators on apps/api-server's CreateRequestDto.
// anonymous defaults to true (anonymous) in the service when omitted — a
// guest can never set this to false; that's still enforced in
// RequestsService, not here.
export const createRequestSchema = z
  .object({
    body: z
      .string()
      .min(1, "내용을 입력해주세요.")
      .max(500, "500자 이하로 입력해주세요."),
    anonymous: z.boolean().optional(),
  })
  .strict();
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// GET/POST /requests response shape. createdAt is a plain ISO string, not
// z.date() — nestjs-zod's createZodDto types a DTO class against the
// schema's *output* shape, so a z.date() field would force every mapper to
// hand a real Date to something typed as the DTO, then fight the type
// system. Instead each backend mapper calls `.toISOString()` itself when
// building the response object — explicit over a schema-level transform,
// and it's what every mapper already did before this migration anyway.
export const requestResponseSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  replyCount: z.number(),
  author: authorDisplaySchema,
});
export type RequestResponseDto = z.infer<typeof requestResponseSchema>;

// POST /requests/:requestId/replies body.
export const createReplySchema = z
  .object({
    body: z
      .string()
      .min(1, "내용을 입력해주세요.")
      .max(500, "500자 이하로 입력해주세요."),
    anonymous: z.boolean().optional(),
  })
  .strict();
export type CreateReplyInput = z.infer<typeof createReplySchema>;

// Reply response shape — see requestResponseSchema for the createdAt note.
export const replyResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: authorDisplaySchema,
});
export type ReplyResponseDto = z.infer<typeof replyResponseSchema>;

// /read's feed and /records' "내 기록": a request/reply extended with
// authorSlot, a per-thread (not global) identity marker — see
// apps/api-server's feed-author-slots.ts. Composed via .extend() the same
// way the backend mapper composes it via object spread.
export const feedReplyResponseSchema = replyResponseSchema.extend({
  authorSlot: z.number(),
});
export type FeedReplyResponseDto = z.infer<typeof feedReplyResponseSchema>;

export const feedItemResponseSchema = z.object({
  request: requestResponseSchema.extend({ authorSlot: z.number() }),
  replies: z.array(feedReplyResponseSchema),
});
export type FeedItemResponseDto = z.infer<typeof feedItemResponseSchema>;

// "내 기록" → 내가 작성한 고민: nested, not flattened like
// myAnswerLogEntrySchema, since a request can have many replies (an answer
// log entry is always exactly one request + one reply). No authorSlot here
// — this is the viewer's own private list, not a shared thread.
const myRequestLogItemSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: authorDisplaySchema,
});
export const myRequestLogEntrySchema = z.object({
  request: myRequestLogItemSchema,
  replies: z.array(myRequestLogItemSchema),
});
export type MyRequestLogEntryDto = z.infer<typeof myRequestLogEntrySchema>;

// "내 기록" → 내가 남긴 답변: flattened (always exactly one request + one
// reply per entry, unlike the request-log's one-to-many).
export const myAnswerLogEntrySchema = z.object({
  requestId: z.string(),
  requestBody: z.string(),
  requestCreatedAt: z.string(),
  requestAuthor: authorDisplaySchema,
  replyId: z.string(),
  replyBody: z.string(),
  replyCreatedAt: z.string(),
  replyAuthor: authorDisplaySchema,
});
export type MyAnswerLogEntryDto = z.infer<typeof myAnswerLogEntrySchema>;

const EMAIL_MESSAGE = "올바른 이메일 형식이 아닙니다.";
const PASSWORD_MESSAGE = "비밀번호는 8자 이상이어야 합니다.";

// POST /auth/signup, POST /auth/login bodies — identical shape.
export const signupSchema = z
  .object({
    email: z.string().email(EMAIL_MESSAGE),
    password: z.string().min(8, PASSWORD_MESSAGE),
  })
  .strict();
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z
  .object({
    email: z.string().email(EMAIL_MESSAGE),
    password: z.string().min(8, PASSWORD_MESSAGE),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

// POST /auth/reset-password body.
export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8, PASSWORD_MESSAGE),
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// POST /auth/nickname body.
export const updateNicknameSchema = z
  .object({
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요.")
      .max(20, "닉네임은 20자 이하여야 합니다.")
      .regex(/\S/, "닉네임은 공백만으로 이루어질 수 없습니다."),
  })
  .strict();
export type UpdateNicknameInput = z.infer<typeof updateNicknameSchema>;

// PATCH /auth/profile-visibility body — each field independent/optional so
// the frontend can flip one switch at a time without resending the others.
export const updateProfileVisibilitySchema = z
  .object({
    showRequestsOnProfile: z.boolean().optional(),
    showRepliesOnProfile: z.boolean().optional(),
    showCountsOnProfile: z.boolean().optional(),
    nicknameVisible: z.boolean().optional(),
  })
  .strict();
export type UpdateProfileVisibilityInput = z.infer<
  typeof updateProfileVisibilitySchema
>;

// POST /reports body.
export const createReportSchema = z
  .object({
    targetType: z.enum(["request", "reply"]),
    targetId: z.string().uuid(),
  })
  .strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;

// PATCH /admin/settings body — each field independent/optional, same
// reasoning as updateProfileVisibilitySchema.
export const updateSettingsSchema = z
  .object({
    queueFreshnessHours: z.number().int().min(1).max(720).optional(),
    queueReplyCap: z.number().int().min(1).max(50).optional(),
    guestReplyLimit: z.number().int().min(1).max(50).optional(),
    nicknameCooldownDays: z.number().int().min(1).max(90).optional(),
  })
  .strict();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// POST /admin/users/password-reset-link body.
export const issuePasswordResetLinkSchema = z
  .object({
    email: z.string().email(EMAIL_MESSAGE),
  })
  .strict();
export type IssuePasswordResetLinkInput = z.infer<
  typeof issuePasswordResetLinkSchema
>;

// GET /auth/me and every auth response (signup/login/etc.) — the
// authenticated user's own view of themselves. createdAt and
// nicknameChangeAvailableAt are both plain ISO strings (or null for the
// latter), same createdAt convention as every other response schema here;
// the backend mapper calls `?.toISOString() ?? null` for the nullable one.
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  nickname: z.string().nullable(),
  nicknameDiscriminator: z.string(),
  nicknameChangeAvailableAt: z.string().nullable(),
  showRequestsOnProfile: z.boolean(),
  showRepliesOnProfile: z.boolean(),
  showCountsOnProfile: z.boolean(),
  nicknameVisible: z.boolean(),
});
export type UserResponseDto = z.infer<typeof userResponseSchema>;

// GET/PATCH /admin/settings response.
export const settingsResponseSchema = z.object({
  queueFreshnessHours: z.number(),
  queueReplyCap: z.number(),
  guestReplyLimit: z.number(),
  nicknameCooldownDays: z.number(),
  updatedAt: z.string(),
});
export type SettingsResponseDto = z.infer<typeof settingsResponseSchema>;

// GET /users/:nickname/:discriminator (public profile) response pieces.
export const publicRequestItemSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type PublicRequestItemDto = z.infer<typeof publicRequestItemSchema>;

export const publicReplyItemSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  requestId: z.string(),
  requestBody: z.string(),
});
export type PublicReplyItemDto = z.infer<typeof publicReplyItemSchema>;

export const publicProfileSchema = z.object({
  nickname: z.string(),
  nicknameDiscriminator: z.string(),
  requestsVisible: z.boolean(),
  repliesVisible: z.boolean(),
  countsVisible: z.boolean(),
  requestCount: z.number().nullable(),
  replyCount: z.number().nullable(),
  requests: z.array(publicRequestItemSchema),
  replies: z.array(publicReplyItemSchema),
});
export type PublicProfileDto = z.infer<typeof publicProfileSchema>;

// Admin moderation queue rows — authorId/guestId still never cross the
// HTTP boundary, even admin doesn't need to know who wrote it, just
// whether to restore or delete it.
export const adminRequestResponseSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  reportCount: z.number(),
});
export type AdminRequestResponseDto = z.infer<
  typeof adminRequestResponseSchema
>;

export const adminReplyResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  requestBody: z.string(),
  body: z.string(),
  createdAt: z.string(),
  reportCount: z.number(),
});
export type AdminReplyResponseDto = z.infer<typeof adminReplyResponseSchema>;

// GET /public/stats (landing page) — no auth, counts only, never anything
// author-identifying.
const landingCountsSchema = z.object({
  today: z.number(),
  total: z.number(),
});
export type LandingCountsDto = z.infer<typeof landingCountsSchema>;

export const landingStatsResponseSchema = z.object({
  requests: landingCountsSchema,
  replies: landingCountsSchema,
  // Snapshot, not a time-windowed count — requests with zero replies right
  // now, not "opened in this period."
  waitingForReply: z.number(),
});
export type LandingStatsResponseDto = z.infer<typeof landingStatsResponseSchema>;

// GET /public/samples (landing page) — a handful of real, already-public
// (non-hidden, non-deleted) request+reply pairs to show as examples.
// authorId/guestId never crossed this boundary to begin with, so there's
// nothing extra to strip here beyond the usual response shape.
export const sampleExchangeResponseSchema = z.object({
  request: z.object({ body: z.string(), createdAt: z.string() }),
  reply: z.object({ body: z.string(), createdAt: z.string() }),
});
export type SampleExchangeResponseDto = z.infer<typeof sampleExchangeResponseSchema>;

export const sampleExchangesResponseSchema = z.object({
  samples: z.array(sampleExchangeResponseSchema),
});
export type SampleExchangesResponseDto = z.infer<
  typeof sampleExchangesResponseSchema
>;
