import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { GlobalToast } from "ui/GlobalToast";
import { QueryProvider } from "ui/QueryProvider";
import { AccountRestoreDialog } from "./components/AccountRestoreDialog";
import { PushSetupPrompt } from "./components/PushSetupPrompt";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";
import { INSTALL_PROMPT_SCRIPT } from "./lib/install-prompt-script";
import { DEFAULT_THEME_COLOR } from "./lib/theme-color";
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

const TITLE = "온설";
const DESCRIPTION = "짧은 위로 요청과 담백한 답장을 주고받는 서비스";

export const metadata: Metadata = {
  // OG 이미지의 상대 경로(app/opengraph-image.tsx)를 절대 URL로 바꾸는 데 쓰임 —
  // Vercel 프리뷰가 아니라 실제 서비스 도메인으로 고정.
  metadataBase: new URL("https://onseol.com"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["온설", "고민 상담", "익명 위로", "감정 공유", "따뜻한 답장"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: TITLE,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // app/manifest.ts covers home-screen icon/name for Android's install
  // prompt — this covers iOS Safari's "홈 화면에 추가" separately, since
  // iOS doesn't read the web manifest's icons for that. No explicit
  // `capable` here — verified against Next's own resolver
  // (resolveAppleWebApp in next/dist/lib/metadata/resolvers/resolve-
  // basics.js) that it defaults to true whenever `appleWebApp` is
  // present without that key, emitting <meta name="mobile-web-app-
  // capable" content="yes"> exactly as if it were set explicitly —
  // confirmed present in a real rendered page too.
  appleWebApp: {
    title: TITLE,
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

// themeColor moved out of `metadata` into its own export as of Next.js
// 14 — matches manifest.ts's background_color (dark theme default, see
// theme-color.ts's comment for why).
export const viewport: Viewport = {
  themeColor: DEFAULT_THEME_COLOR,
};

type RootLayoutProps = {
  children: ReactNode;
};

// /settings의 테마 설정(app/lib/site-settings.ts)을 하이드레이션 전에
// 적용 — 그 모듈을 그대로 import할 수 없는 위치(인라인 스크립트)라 저장
// 키/형식을 손으로 맞춰뒀다. site-settings.ts의 STORAGE_KEY나
// SiteSettings.theme 필드를 바꾸면 이 문자열도 같이 고칠 것.
//
// next/script의 beforeInteractive 전략을 처음 썼었는데(실제 프로덕션
// 빌드로 확인, 2026-09-14), 그건 진짜 동기 실행 <script>가 아니라
// `self.__next_s.push([...])`로 코드를 데이터로 밀어넣고 Next 런타임이
// 나중에 처리하는 방식이라 첫 페인트 전에 실행된다는 보장이 없었다 —
// 시스템이 다크인데 라이트를 저장해둔 사용자가 새로고침할 때마다 다크로
// 잠깐 번쩍이는 원인이었음. 다크모드 라이브러리들이 쓰는 방식대로
// dangerouslySetInnerHTML로 진짜 순수 <script> 태그를 직접 렌더링해야
// 브라우저가 파싱하는 즉시(첫 페인트 전에) 동기 실행한다.
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }} />
        <ServiceWorkerRegistration />
        <QueryProvider>
          <AccountRestoreDialog />
          <PushSetupPrompt />
          {children}
          <GlobalToast />
        </QueryProvider>
      </body>
    </html>
  );
}
