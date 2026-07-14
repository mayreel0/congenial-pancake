import { DisplayMode, ReactionType } from "@prisma/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const commentValidationErrors = new Set([
  "COMMENT_BODY_REQUIRED",
  "COMMENT_BODY_TOO_LONG",
  "INVALID_COMMENT_INPUT",
  "INVALID_REACTION_TYPE"
]);

export function parseCommentInput(value: unknown): { body: string; displayMode: DisplayMode } {
  if (!isRecord(value) || typeof value.body !== "string") {
    throw new Error("INVALID_COMMENT_INPUT");
  }
  if (!Object.values(DisplayMode).includes(value.displayMode as DisplayMode)) {
    throw new Error("INVALID_COMMENT_INPUT");
  }
  return { body: value.body, displayMode: value.displayMode as DisplayMode };
}

export function parseReplyInput(value: unknown): { body: string } {
  if (!isRecord(value) || typeof value.body !== "string") {
    throw new Error("INVALID_COMMENT_INPUT");
  }
  return { body: value.body };
}

export function parseReactionInput(value: unknown): { type: ReactionType } {
  if (!isRecord(value) || !Object.values(ReactionType).includes(value.type as ReactionType)) {
    throw new Error("INVALID_REACTION_TYPE");
  }
  return { type: value.type as ReactionType };
}
