import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      // Import boundary: UI package must not import from any app
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@quantract/crm", "@quantract/crm/*"], message: "UI package must not import from apps." },
            { group: ["@quantract/certificates", "@quantract/certificates/*"], message: "UI package must not import from apps." },
            { group: ["@quantract/tools", "@quantract/tools/*"], message: "UI package must not import from apps." },
            { group: ["@quantract/marketing", "@quantract/marketing/*"], message: "UI package must not import from apps." },
            { group: ["**/apps/*"], message: "Relative cross-boundary imports are forbidden." },
          ],
        },
      ],
    },
  },
];
