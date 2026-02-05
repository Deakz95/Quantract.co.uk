import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Import boundary enforcement — prevent cross-app imports
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@quantract/crm", "@quantract/crm/*"], message: "Cross-app imports are forbidden. Use @quantract/shared for shared code." },
            { group: ["@quantract/marketing", "@quantract/marketing/*"], message: "Cross-app imports are forbidden. Use @quantract/shared for shared code." },
            { group: ["@quantract/certificates", "@quantract/certificates/*"], message: "Cross-app imports are forbidden. Use @quantract/shared for shared code." },
            { group: ["**/apps/*"], message: "Relative cross-app imports are forbidden. Use workspace packages." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
