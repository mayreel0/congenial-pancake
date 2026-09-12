import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import Script from "next/script";
import { GlobalToast } from "ui/GlobalToast";
import { QueryProvider } from "ui/QueryProvider";
import { AccountRestoreDialog } from "./components/AccountRestoreDialog";
import "./globals.css";

// Pretendard, not next/font/google's Geist — Geist only ships a Latin
// subset (no Hangul glyphs at all), so Korean text — the vast majority of
// this app's content — was silently falling back to whatever font the
// viewer's OS happens to default to, never actually rendering in Geist.
// Self-hosted via the `pretendard` npm package's single variable woff2
// (covers both Hangul and Latin, weights 45-920) since Pretendard isn't on
// Google Fonts. No separate mono font — `--font-mono` isn't used anywhere
// in this app, so it's just a plain system-monospace stack in globals.css.
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "온설",
  description: "짧은 위로 요청과 담백한 답장을 주고받는 서비스",
};

type RootLayoutProps = {
  children: ReactNode;
};

// /settings의 테마 설정(app/lib/site-settings.ts)을 하이드레이션 전에
// 적용 — 그 모듈을 그대로 import할 수 없는 위치(beforeInteractive 인라인
// 스크립트)라 저장 키/형식을 손으로 맞춰뒀다. site-settings.ts의
// STORAGE_KEY나 SiteSettings.theme 필드를 바꾸면 이 문자열도 같이 고칠 것.
const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("onseol:site-settings");
    if (!raw) return;
    var theme = JSON.parse(raw).theme;
    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
      // theme-bootstrap 스크립트가 하이드레이션 전에 data-theme을 직접
      // 붙이는데, 서버가 렌더링한 HTML에는 이 속성이 없으니 React가
      // "속성이 안 맞다"고 보는 게 정상 — 이 엘리먼트에서만 그 경고를 끈다.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <QueryProvider>
          <AccountRestoreDialog />
          {children}
          <GlobalToast />
        </QueryProvider>
      </body>
    </html>
  );
}
