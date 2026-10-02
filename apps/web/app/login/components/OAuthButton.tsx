import { OAUTH_PROVIDER_STYLES } from "../../components/shared/oauthProviders";
import type { OAuthProviderName } from "../../lib/api";
import { setLastOAuthProvider } from "../lib/lastOAuthProvider";

const LABELS: Record<OAuthProviderName, string> = {
  google: "Google 계정으로 로그인",
  kakao: "카카오 로그인",
  naver: "네이버 로그인",
};

type OAuthButtonProps = {
  provider: OAuthProviderName;
  href: string;
  lastUsed?: boolean;
  disabled?: boolean;
};

export function OAuthButton({ provider, href, lastUsed = false, disabled = false }: OAuthButtonProps) {
  const label = LABELS[provider];
  const { className, Icon } = OAUTH_PROVIDER_STYLES[provider];

  const buttonClassName = `relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[16px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`;
  const content = (
    <>
      <Icon />
      {label}
      {lastUsed && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-current/15 px-2 py-0.5 text-[11px] font-semibold">
          최근 로그인
        </span>
      )}
    </>
  );

  if (disabled) {
    return <button className={buttonClassName} disabled type="button">{content}</button>;
  }

  return (
    <a className={buttonClassName} href={href} onClick={() => setLastOAuthProvider(provider)}>
      {content}
    </a>
  );
}
