// Blocks typing/pasting past the shared MAX_BODY_NEWLINES cap (see
// packages/shared/src/dto.ts) the same way the textarea's own maxLength
// attribute already blocks typing past the character cap — truncating
// right where the extra newline appears, rather than letting the field
// silently fail validation and disable submit with no visible reason.
export function clampNewlines(value: string, maxNewlines: number): string {
  const lines = value.split("\n");
  if (lines.length - 1 <= maxNewlines) return value;
  return lines.slice(0, maxNewlines + 1).join("\n");
}
