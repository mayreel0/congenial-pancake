// Reverses author-label.ts's authorProfileHref: "닉네임-D59D" -> the two
// parts. Matches the LAST "-XXXX" (4 hex chars) so a nickname that itself
// contains a hyphen still parses correctly — the discriminator is always
// exactly 4 hex chars, anchored at the end.
const SLUG_PATTERN = /^(.+)-([0-9A-Fa-f]{4})$/;

export type ProfileSlug = { nickname: string; discriminator: string };

export function parseProfileSlug(slug: string): ProfileSlug | null {
  // useParams() (unlike the server-side params prop) returns the raw,
  // still-percent-encoded path segment — decode once before matching, or a
  // non-ASCII nickname gets encoded a second time downstream and the API
  // call 404s on a mangled nickname.
  const match = SLUG_PATTERN.exec(decodeURIComponent(slug));
  if (!match) return null;
  return { nickname: match[1], discriminator: match[2].toUpperCase() };
}
