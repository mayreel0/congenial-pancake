import {
  OAUTH_PROVIDER_NAMES_KO,
  OAUTH_PROVIDER_STYLES,
} from "../../components/shared/oauthProviders";
import { oauthLoginUrl, type OAuthProviderName } from "../../lib/api";

const PROVIDERS: OAuthProviderName[] = ["google", "kakao", "naver"];

function CheckIcon() {
  return (
    <svg aria-hidden="true" height="10" viewBox="0 0 16 16" width="10">
      <path
        d="M3 8.5L6.5 12L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

type LinkedProvidersSectionProps = {
  linkedProviders: OAuthProviderName[];
};

// One fixed-size tile per provider regardless of linked state — a linked
// tile shows a checkmark badge instead of swapping to a differently-sized
// "연동됨" label/button, so the row never reflows when a provider gets
// linked. No "연동 해제" yet (deliberately out of scope, see docs/
// decisions for the OAuth/email collision round this shipped with).
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

      <div className="flex gap-3">
        {PROVIDERS.map((name) => {
          const linked = linkedProviders.includes(name);
          const { className, Icon } = OAUTH_PROVIDER_STYLES[name];
          const providerLabel = OAUTH_PROVIDER_NAMES_KO[name];
          const tileClassName = `relative flex h-11 w-11 items-center justify-center rounded-lg transition ${className}`;

          if (linked) {
            return (
              <div
                aria-label={`${providerLabel} 연동됨`}
                className={`${tileClassName} ring-2 ring-primary ring-offset-2 ring-offset-surface`}
                key={name}
              >
                <Icon />
                <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-background ring-2 ring-surface">
                  <CheckIcon />
                </span>
              </div>
            );
          }

          return (
            <a
              aria-label={`${providerLabel} 연동하기`}
              className={`${tileClassName} hover:opacity-90`}
              href={oauthLoginUrl(name)}
              key={name}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </section>
  );
}
