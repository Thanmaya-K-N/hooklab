import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    env: {
      WEBHOOK_ALLOW_LOCALHOST: "1",
      RATE_LIMIT_ENABLED: "0",
    },
  },
});
