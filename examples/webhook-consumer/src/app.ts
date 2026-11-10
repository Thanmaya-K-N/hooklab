import Fastify, { type FastifyInstance } from "fastify";
import { registerWebhookRoutes } from "./routes/webhooks.js";

export type BuildConsumerOptions = {
  logger?: boolean;
  signingSecret?: string;
  timestampToleranceSeconds?: number;
  requireVerification?: boolean;
  enableSimulate?: boolean;
};

export async function buildConsumer(
  options: BuildConsumerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 1_048_576,
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "webhook-consumer",
    signatureVerification:
      options.signingSecret !== undefined || options.requireVerification === true,
  }));

  const signingSecret =
    options.signingSecret ?? process.env.WEBHOOK_SIGNING_SECRET;
  const timestampToleranceSeconds = Number(
    options.timestampToleranceSeconds ??
      process.env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS ??
      "300",
  );

  await registerWebhookRoutes(app, {
    signingSecret,
    timestampToleranceSeconds,
    requireVerification: options.requireVerification,
    enableSimulate: options.enableSimulate,
  });

  return app;
}
