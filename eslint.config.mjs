import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "postcss.config.mjs",
      "eslint.config.mjs",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
