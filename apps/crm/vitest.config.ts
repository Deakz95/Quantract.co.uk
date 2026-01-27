import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Test file patterns
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/playwright/**", "tests/e2e/**"],

    // Environment for React component tests
    environment: "jsdom",

    // Global test setup
    globals: true,

    // Setup file for DOM mocks and testing-library
    setupFiles: ["./src/test/setup.ts"],

    // Path aliases matching tsconfig.json
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },

    // Coverage configuration
    coverage: {
      enabled: false, // Enable with --coverage flag
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      reportsDirectory: "./coverage",

      // Files to include in coverage
      include: ["src/**/*.ts", "src/**/*.tsx"],

      // Files to exclude from coverage
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/types/**",
        "node_modules/**",
      ],

      // Coverage thresholds - realistic targets for current codebase
      // These will be increased incrementally as coverage improves
      thresholds: {
        // Global thresholds (current: ~5% statements, ~15% functions)
        statements: 5,
        branches: 10,
        functions: 10,
        lines: 5,

        // Critical business logic thresholds (current: ~20%)
        "src/lib/*.ts": {
          statements: 20,
          branches: 20,
          functions: 30,
          lines: 20,
        },
        // Server-side logic thresholds (current: ~10%)
        "src/lib/server/*.ts": {
          statements: 9,
          branches: 10,
          functions: 10,
          lines: 9,
        },
      },
    },

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporter configuration
    reporters: ["default"],

    // Watch mode configuration
    watch: false,

    // Retry failed tests
    retry: 0,

    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
