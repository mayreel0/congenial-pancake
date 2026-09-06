import type { Preview } from "@storybook/nextjs-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import localFont from "next/font/local";
import { useEffect } from "react";
// Design tokens (--background/--primary/etc.) aren't extracted to
// packages/ui yet, so this imports apps/web's copy specifically — both
// apps/web's and apps/admin's copies are identical today, but if they ever
// diverge, whichever one Storybook should visually match needs to be
// picked deliberately here, not left as an accident of import order.
// (Goes through ./globals.css, not apps/web's file directly, so this
// app's own extra Tailwind @source roots don't have to live inside
// apps/web's globals.css — see that file's comment.)
import "./globals.css";

// apps/web/app/layout.tsx loads this the same way (Pretendard, self-hosted
// via the npm package's variable woff2 — see that file's comment for why
// not Geist) — Storybook never renders that layout (it only renders one
// component in isolation), so without this every story would silently
// fall back to the system font stack instead.
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    (Story) => {
      // Must land on <html>, not a wrapper div: globals.css's `@theme
      // inline` declares `--font-sans: var(--font-pretendard)` at :root,
      // and a var() reference inside another custom property's value
      // resolves against the cascade at ITS OWN declaration site (:root),
      // not wherever --font-pretendard later gets defined deeper in the
      // tree. A wrapper div here silently produces no font at all —
      // apps/web/app/layout.tsx puts these classes on <html> for the same
      // reason.
      // apps/web/app/layout.tsx also puts h-full on <html> and
      // min-h-full on <body> — without these, an isolated story's body
      // box is only as tall as that one component's own content, so the
      // dark/light bg color only paints that short area and the rest of
      // the canvas falls back to the browser's own default background,
      // looking "wrong" even though the color tokens themselves are
      // computed correctly.
      useEffect(() => {
        document.documentElement.classList.add(
          pretendard.variable,
          "h-full",
          "antialiased",
        );
        document.body.classList.add("min-h-full");
      }, []);
      return <Story />;
    },
  ],
};

export default preview;
