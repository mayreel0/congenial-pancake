const DEFAULT_RETURN_TO = "/today";

// Only a same-origin relative path is allowed. "//evil.com" and "/\evil.com"
// both parse as a protocol-relative absolute URL in most browsers despite
// starting with a slash-like character, so a bare startsWith("/") check
// isn't enough on its own to stop an open redirect via ?returnTo=. The
// character class also covers whitespace/tab/newline (e.g. "/\t/evil.com")
// — the URL spec strips those out during parsing, so a value that looks
// like a safe single-slash path can still resolve to "//evil.com" once a
// browser actually navigates to it.
export function safeReturnTo(param: string | null): string {
  if (
    !param ||
    !param.startsWith("/") ||
    /^\/[/\\\s]/.test(param) ||
    param.startsWith("/login")
  ) {
    return DEFAULT_RETURN_TO;
  }
  return param;
}
