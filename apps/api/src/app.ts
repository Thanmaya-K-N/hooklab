import Fastify, { type FastifyInstance } from "fastify";
import {
  createNoopDeliveryJobPublisher,
  type DeliveryJobPublisher,
} from "@hooklab/queue";
import { registerDeliveryAttemptRoutes } from "./routes/delivery-attempts.js";
import { registerDeliveryRoutes } from "./routes/deliveries.js";
import { registerEndpointRoutes } from "./routes/endpoints.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMetricsRoutes } from "./routes/metrics.js";
import { registerRateLimitPlugin } from "./plugins/rate-limit.js";
import { MemoryStore } from "./store/memory-store.js";
import type { HookLabStore } from "./store/types.js";

async function registerRateLimitIfEnabled(app: FastifyInstance): Promise<void> {
  await registerRateLimitPlugin(app);
}

export type BuildApiOptions = {
  logger?: boolean;
  store?: HookLabStore;
  deliveryJobPublisher?: DeliveryJobPublisher;
  /** When false, attaches a fixed organization id (unit tests). */
  auth?: boolean;
  testOrganizationId?: string;
};

export async function buildApi(
  options: BuildApiOptions = {},
): Promise<{ app: FastifyInstance; store: HookLabStore }> {
  const store = options.store ?? new MemoryStore();
  const publisher =
    options.deliveryJobPublisher ?? createNoopDeliveryJobPublisher();
  const useAuth = options.auth ?? true;
  const testOrganizationId = options.testOrganizationId ?? "org_test";

  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 1_048_576,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: "x-request-id",
  });

  await registerRateLimitIfEnabled(app);

  if (process.env.DASHBOARD_CORS !== "0") {
    const corsOrigin =
      process.env.DASHBOARD_CORS_ORIGIN ?? "http://127.0.0.1:5173";
    const cors = await import("@fastify/cors");
    await app.register(cors.default, {
      origin: corsOrigin,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    });
  }

  if (useAuth) {
    const { registerAuthPlugin } = await import("./plugins/auth.js");
    await registerAuthPlugin(app);
  } else {
    app.addHook("onRequest", async (request) => {
      const path = request.url.split("?")[0];
      if (path === "/api/v1/health") return;
      if (request.url.startsWith("/api/v1/")) {
        request.organizationId = testOrganizationId;
      }
    });
  }

  await registerHealthRoutes(app, { skipDatabaseCheck: !useAuth });
  await registerEndpointRoutes(app, store);
  await registerEventRoutes(app, store);
  await registerDeliveryRoutes(app, store);
  await registerDeliveryAttemptRoutes(app, store);
  if (useAuth) {
    await registerMetricsRoutes(app, publisher);
  }

  return { app, store };
}
