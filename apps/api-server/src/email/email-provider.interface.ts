export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  // Human-readable name for logging which provider actually sent (or
  // failed to send) a given message — not used for lookup, unlike
  // OAuthProviderName.
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}
