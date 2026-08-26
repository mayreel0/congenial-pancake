import type { OAuthProviderName } from "../../lib/api";
import { setLastOAuthProvider } from "../lib/lastOAuthProvider";

// Official Google "G" mark — colors/shape are non-negotiable per Google's
// branding guidelines (https://developers.google.com/identity/branding-
// guidelines), so this is reproduced pixel-accurate, not simplified.
function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Simplified speech-bubble silhouette — Kakao's guideline requires the
// symbol stay recognizable and unmodified in color (#000000), but doesn't
// ship a licensable path here, so this is a close approximation rather
// than the exact downloaded asset from developers.kakao.com/tool/resource.
// Rendered at 20px (vs. the 18x18 viewBox) so it reads at the same visual
// weight as Google's icon instead of looking undersized next to it.
function KakaoIcon() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 18 18" width="20">
      <path
        d="M9 2C4.86 2 1.5 4.71 1.5 8.06c0 2.14 1.37 4.02 3.45 5.11-.15.54-.94 3.28-.97 3.5 0 0-.02.16.08.22.1.06.22.01.22.01.3-.04 3.48-2.3 4.03-2.69.55.08 1.12.12 1.69.12 4.14 0 7.5-2.71 7.5-6.06C17.5 4.71 14.14 2 9 2z"
        fill="#000000"
      />
    </svg>
  );
}

// Official Naver "N" mark (https://developers.naver.com/docs/login/bi/
// bi.md) — the exact provided path, at the guideline's 18px size rather
// than a hand-drawn approximation.
function NaverIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        clipRule="evenodd"
        d="M12.2045 9.63547L5.53116 0H0V18H5.79552V8.36792L12.4688 18H18V0H12.2045V9.63547Z"
        fill="white"
        fillRule="evenodd"
      />
    </svg>
  );
}

const VARIANTS: Record<
  OAuthProviderName,
  { label: string; className: string; Icon: () => React.JSX.Element }
> = {
  google: {
    label: "Google 계정으로 로그인",
    // Google's "Neutral" theme (one of the three officially sanctioned
    // variants) — a light/dark swap (tried once) looked jarring against
    // this app's dark palette, so this stays one fixed theme regardless
    // of prefers-color-scheme, same as Kakao/Naver's fixed brand colors.
    className: "bg-[#F2F2F2] text-[#1F1F1F] hover:bg-[#E8E8E8]",
    Icon: GoogleIcon,
  },
  kakao: {
    label: "카카오 로그인",
    className: "bg-[#FEE500] text-black/85 hover:opacity-90",
    Icon: KakaoIcon,
  },
  naver: {
    label: "네이버 로그인",
    className: "bg-[#03C75A] text-white hover:opacity-90",
    Icon: NaverIcon,
  },
};

type OAuthButtonProps = {
  provider: OAuthProviderName;
  href: string;
  lastUsed?: boolean;
};

export function OAuthButton({ provider, href, lastUsed = false }: OAuthButtonProps) {
  const { label, className, Icon } = VARIANTS[provider];

  return (
    <a
      className={`relative inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg text-[16px] font-semibold transition ${className}`}
      href={href}
      onClick={() => setLastOAuthProvider(provider)}
    >
      <Icon />
      {label}
      {lastUsed ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-current/15 px-2 py-0.5 text-[11px] font-semibold">
          최근 로그인
        </span>
      ) : null}
    </a>
  );
}
