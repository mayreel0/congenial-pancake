import type { AuthorDisplayDto } from "./requests/api";

// Prefer the real nickname the author chose to reveal for this specific
// post over the anonymous fallback label — the fallback is authorSlot-based
// on /read (a thread can show several distinct anonymous authors) and
// session-counter-based on /answer (each request just gets its own "익명
// N"). See docs/decisions/2026-08-28-onseol-nickname-post-reveal-
// decisions.md.
export function authorDisplayLabel(
  author: AuthorDisplayDto,
  fallbackLabel: string,
): string {
  if (author.anonymous) return fallbackLabel;
  return `${author.nickname}#${author.nicknameDiscriminator}`;
}

// null for an anonymous author — there's no profile to link to. See
// app/u/[slug]/page.tsx (and its parseProfileSlug) for the reverse
// direction — this is the one place that builds that slug.
export function authorProfileHref(author: AuthorDisplayDto): string | null {
  if (author.anonymous) return null;
  return `/u/${encodeURIComponent(`${author.nickname}-${author.nicknameDiscriminator}`)}`;
}
