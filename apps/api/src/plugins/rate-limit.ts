import type { FastifyInstance } from "fastify";

export async function registerRateLimitPlugin(
  app: FastifyInstance,
): Promise<void> {
  if (process.env.RATE_LIMIT_ENABLED === "0") {
    return;
  }

  const max = Number(process.env.API_RATE_LIMIT_MAX ?? "120");
  const timeWindow = process.env.API_RATE_LIMIT_WINDOW ?? "1 minute";

  const rateLimit = await import("@fastify/rate-limit");
  await app.register(rateLimit.default, {
    max,
    timeWindow,
    allowList: (request) => {
      const path = request.url.split("?")[0];
      return path === "/api/v1/health";
    },
  });
}
