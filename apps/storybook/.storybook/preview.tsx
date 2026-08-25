import type { Preview } from "@storybook/nextjs-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
// Design tokens (--background/--primary/etc.) aren't extracted to
// packages/ui yet, so this imports apps/web's copy specifically — both
// apps/web's and apps/admin's copies are identical today, but if they ever
// diverge, whichever one Storybook should visually match needs to be
// picked deliberately here, not left as an accident of import order.
import "../../web/app/globals.css";

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
  ],
};

export default preview;
