import Link from "next/link";

// The one place that decides Link-vs-plain-text for an author label —
// used by /read, /answer, and /records. All three used to reimplement this
// ternary independently; /records also used a different color token
// (text-muted) until that was deliberately dropped in favor of consistency
// (records is still "my content", not someone else's, but the reply
// authors read there are other people, same as everywhere else).
export function AuthorLabel({
  label,
  href,
}: {
  label: string;
  href: string | null;
}) {
  if (!href) {
    return <p className="text-xs font-semibold text-foreground">{label}</p>;
  }
  return (
    <Link className="text-xs font-semibold text-foreground hover:underline" href={href}>
      {label}
    </Link>
  );
}
