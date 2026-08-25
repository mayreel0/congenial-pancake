import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Lints this app's own .storybook/*.ts(x) config files only — the story
// files it discovers via glob live in, and are linted by, apps/web and
// packages/ui respectively.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["storybook-static/**", "node_modules/**"]),
  // No pages/app router here — see packages/ui/eslint.config.mjs's identical
  // override for why.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);

export default eslintConfig;
