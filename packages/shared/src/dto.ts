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
