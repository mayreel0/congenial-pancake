import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AccountRestoreDialog />
          {children}
          <GlobalToast />
        </QueryProvider>
      </body>
    </html>
  );
}
