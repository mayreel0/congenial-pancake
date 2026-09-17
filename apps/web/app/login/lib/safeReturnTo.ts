const DEFAULT_RETURN_TO = "/today";

// Only a same-origin relative path is allowed. "//evil.com" and "/\evil.com"
// both parse as a protocol-relative absolute URL in most browsers despite
// starting with a slash-like character, so a bare startsWith("/") check
// isn't enough on its own to stop an open redirect via ?returnTo=.
export function safeReturnTo(param: string | null): string {
  if (!param || !param.startsWith("/") || /^\/[/\\]/.test(param)) {
    return DEFAULT_RETURN_TO;
  }
  return param;
}
