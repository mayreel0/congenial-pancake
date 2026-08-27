import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["node_modules/**"]),
  {
    // This package has no pages/app router — it's plain TS utilities
    // consumed by two separate Next.js apps, not a Next app itself.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "no-nested-ternary": "error",
    },
  },
]);

export default eslintConfig;
