import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@prisma/client": path.resolve(__dirname, "test/mocks/prisma-client.ts"),
      "@hooklab/queue": path.resolve(__dirname, "test/mocks/hooklab-queue.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["test/integration/**"],
    env: {
      DASHBOARD_CORS: "0",
      RATE_LIMIT_ENABLED: "0",
      WEBHOOK_ALLOW_LOCALHOST: "1",
    },
  },
});
