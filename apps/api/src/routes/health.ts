import type { FastifyInstance } from "fastify";

export type HealthRouteOptions = {
  skipDatabaseCheck?: boolean;
};

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions = {},
): Promise<void> {
  app.get("/api/v1/health", async (_request, reply) => {
    if (options.skipDatabaseCheck) {
      return reply.send({
        status: "ok",
        service: "hooklab-api",
        checks: { database: true, redis: true },
        milestone: 10,
      });
    }

    let database = false;
    let redis = false;
    try {
      const { checkDatabaseConnection } = await import("../db/client.js");
      database = await checkDatabaseConnection();
    } catch {
      database = false;
    }

    try {
      const { pingRedis } = await import("@hooklab/queue");
      redis = await pingRedis();
    } catch {
      redis = false;
    }

    const ok = database && redis;
    return reply.status(ok ? 200 : 503).send({
      status: ok ? "ok" : "degraded",
      service: "hooklab-api",
      checks: { database, redis },
      milestone: 10,
    });
  });
}
