import type { StorybookConfig } from "@storybook/nextjs-vite";

// This app runs Storybook only — it doesn't own any components itself.
// Each glob root scans component-adjacent story files where they actually
// live (apps/web for its own domain components, packages/ui for shared
// ones) rather than requiring stories to move into this app. See
// docs/decisions/2026-08-26-onseol-storybook-app-decisions.md.
const config: StorybookConfig = {
  stories: [
    "../../web/app/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../../packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: "@storybook/nextjs-vite",
};
export default config;
