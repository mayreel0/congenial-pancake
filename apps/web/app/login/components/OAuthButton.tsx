import type { OAuthProviderName } from "../../lib/api";

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

// Naver's button guideline (https://developers.naver.com/docs/login/bi/
// bi.md) allows an abbreviated/label-only form — using the white "N"
// glyph instead of the exact bordered mark, since that mark isn't
// reproducible here without the official downloaded asset either. The
// guideline sets minimum N-mark sizes of 18px (icon type) / 16px+
// (label-combined type, which is what this button is) — 20px/18px here
// clears both with margin instead of sitting right at the floor.
function NaverIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center text-[18px] font-extrabold leading-none text-white"
    >
      N
    </span>
  );
}

const VARIANTS: Record<
  OAuthProviderName,
  { label: string; className: string; Icon: () => React.JSX.Element }
> = {
  google: {
    label: "Google 계정으로 로그인",
    // Google's "Light"/"Dark" themes (not the single "Neutral" theme) —
    // swaps with the rest of the app's own light/dark palette via the
    // --google-btn-* custom properties in globals.css, which already
    // follow prefers-color-scheme (and the Storybook data-theme toggle).
    className:
      "border border-[var(--google-btn-border)] bg-[var(--google-btn-bg)] text-[var(--google-btn-fg)] hover:opacity-90",
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
};

export function OAuthButton({ provider, href }: OAuthButtonProps) {
  const { label, className, Icon } = VARIANTS[provider];

  return (
    <a
      className={`inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg text-[15px] font-semibold transition ${className}`}
      href={href}
    >
      <Icon />
      {label}
    </a>
  );
}
