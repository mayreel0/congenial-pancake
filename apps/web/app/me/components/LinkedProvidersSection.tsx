import { Button } from "ui/Button";
import { oauthLoginUrl, type OAuthProviderName } from "../../lib/api";

const PROVIDERS: { name: OAuthProviderName; label: string }[] = [
  { name: "google", label: "Google" },
  { name: "kakao", label: "카카오" },
  { name: "naver", label: "네이버" },
];

type LinkedProvidersSectionProps = {
  linkedProviders: OAuthProviderName[];
};

// Link only — no "연동 해제" yet (deliberately out of scope for now, see
// docs/decisions for the OAuth/email collision round this shipped with).
// Visiting the same /auth/:provider URL used for login here works because
// the backend tells the two cases apart by whether a session cookie is
// already present, not by the URL — see AuthController.oauthRedirect.
export function LinkedProvidersSection({
  linkedProviders,
}: LinkedProvidersSectionProps) {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          연동된 계정
        </h2>
        <p className="text-xs text-muted">
          연동한 소셜 계정으로도 로그인할 수 있어요.
        </p>
      </div>

      <ul className="space-y-2">
        {PROVIDERS.map(({ name, label }) => {
          const linked = linkedProviders.includes(name);
          return (
            <li
              className="flex items-center justify-between gap-3 text-sm"
              key={name}
            >
              <span className="text-foreground">{label}</span>
              {linked ? (
                <span className="text-xs text-muted">연동됨</span>
              ) : (
                <Button href={oauthLoginUrl(name)} size="sm" variant="secondary">
                  연동하기
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
