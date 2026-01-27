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

      // Coverage thresholds - start conservative, increase over time
      thresholds: {
        // Global thresholds
        statements: 20,
        branches: 15,
        functions: 20,
        lines: 20,

        // Stricter thresholds for critical business logic
        "src/lib/*.ts": {
          statements: 60,
          branches: 50,
          functions: 60,
          lines: 60,
        },
        "src/lib/server/*.ts": {
          statements: 40,
          branches: 30,
          functions: 40,
          lines: 40,
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
