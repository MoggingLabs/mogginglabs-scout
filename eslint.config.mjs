import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "pnpm-lock.yaml"
    ]
  },
  {
    languageOptions: {
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        React: "readonly",
        URL: "readonly"
      }
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals
];

export default eslintConfig;
