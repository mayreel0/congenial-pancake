import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["node_modules/**"]),
  ...storybook.configs["flat/recommended"],
  {
    // This package has no pages/app router — it's a plain React library
    // consumed by two separate Next.js apps, not a Next app itself. The
    // rest of eslint-config-next's rules are still generically useful
    // (React/TS hygiene), just this one Next-routing-specific rule isn't.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "no-nested-ternary": "error",
    },
  },
]);

export default eslintConfig;
