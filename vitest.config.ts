import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
