import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Import boundary enforcement — mobile engineer must be fully isolated
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@quantract/crm", "@quantract/crm/*"], message: "Mobile app must not import from CRM." },
            { group: ["@quantract/certificates", "@quantract/certificates/*"], message: "Mobile app must not import from Certificates." },
            { group: ["@quantract/tools", "@quantract/tools/*"], message: "Mobile app must not import from Tools." },
            { group: ["@quantract/marketing", "@quantract/marketing/*"], message: "Mobile app must not import from Marketing." },
            { group: ["@quantract/ui", "@quantract/ui/*"], message: "Mobile app must not import the web UI package." },
            { group: ["@quantract/shared", "@quantract/shared/*"], message: "Mobile app must not import @quantract/shared." },
            { group: ["**/apps/*"], message: "Relative cross-app imports are forbidden." },
          ],
        },
      ],
    },
  },
];
