import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  validateTimestamp,
  verifyWebhookSignature,
} from "@hooklab/shared";

/** Shape mirrors HookLab outbound webhook bodies. */
export type IncomingWebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export type WebhookConsumerOptions = {
  signingSecret?: string;
  timestampToleranceSeconds?: number;
  /** When true, reject requests if signingSecret is missing. */
  requireVerification?: boolean;
  /** Dev-only failure injection (`X-HookLab-Simulate`). Defaults to env `CONSUMER_ENABLE_SIMULATE=1`. */
  enableSimulate?: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

const receivedEventIds = new Set<string>();

export function getReceivedEventIds(): ReadonlySet<string> {
  return receivedEventIds;
}

export function resetReceivedEvents(): void {
  receivedEventIds.clear();
}

function isIncomingWebhookEvent(value: unknown): value is IncomingWebhookEvent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.data === "object" &&
    v.data !== null &&
    !Array.isArray(v.data)
  );
}

function registerRawJsonBodyParser(app: FastifyInstance): void {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (request, body, done) => {
      request.rawBody = body;
      try {
        done(null, JSON.parse(body) as unknown);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );
}

function verifyRequest(
  request: FastifyRequest,
  options: WebhookConsumerOptions,
):
  | { ok: true; timestampSeconds: number }
  | { ok: false; statusCode: number; error: string; message: string } {
  const mustVerify =
    options.requireVerification ?? Boolean(options.signingSecret);

  if (!mustVerify) {
    return { ok: true, timestampSeconds: Math.floor(Date.now() / 1000) };
  }

  if (!options.signingSecret) {
    return {
      ok: false,
      statusCode: 500,
      error: "server_misconfigured",
      message: "WEBHOOK_SIGNING_SECRET is not set",
    };
  }

  const signatureHeader = request.headers["x-hooklab-signature"];
  const timestampHeader = request.headers["x-hooklab-timestamp"];
  const rawBody = request.rawBody;

  if (typeof signatureHeader !== "string" || typeof timestampHeader !== "string") {
    return {
      ok: false,
      statusCode: 401,
      error: "missing_signature_headers",
      message: "X-HookLab-Signature and X-HookLab-Timestamp are required",
    };
  }

  if (typeof rawBody !== "string") {
    return {
      ok: false,
      statusCode: 400,
      error: "missing_raw_body",
      message: "Could not read raw request body for verification",
    };
  }

  const timestampSeconds = Number.parseInt(timestampHeader, 10);
  const tsResult = validateTimestamp(timestampSeconds, {
    toleranceSeconds: options.timestampToleranceSeconds ?? 300,
  });
  if (!tsResult.ok) {
    return {
      ok: false,
      statusCode: 401,
      error: tsResult.reason,
      message: "Timestamp outside allowed skew window",
    };
  }

  const sigResult = verifyWebhookSignature({
    endpointSecret: options.signingSecret,
    timestampSeconds,
    rawBody,
    signatureHeader,
  });
  if (!sigResult.ok) {
    return {
      ok: false,
      statusCode: 401,
      error: sigResult.reason,
      message: "Invalid webhook signature",
    };
  }

  return { ok: true, timestampSeconds };
}

export async function registerWebhookRoutes(
  app: FastifyInstance,
  options: WebhookConsumerOptions = {},
): Promise<void> {
  registerRawJsonBodyParser(app);

  app.post("/webhooks", async (request, reply) => {
    const verified = verifyRequest(request, options);
    if (!verified.ok) {
      return reply.status(verified.statusCode).send({
        error: verified.error,
        message: verified.message,
      });
    }

    const body = request.body;

    if (!isIncomingWebhookEvent(body)) {
      return reply.status(400).send({
        error: "invalid_payload",
        message: "Body must include id, type, createdAt, and data object",
      });
    }

    const simulate = request.headers["x-hooklab-simulate"];
    const simulateEnabled =
      options.enableSimulate ??
      process.env.CONSUMER_ENABLE_SIMULATE === "1";
    if (simulateEnabled && typeof simulate === "string") {
      switch (simulate.toLowerCase()) {
        case "500":
          return reply.status(500).send({ error: "simulated_server_error" });
        case "429":
          return reply
            .status(429)
            .header("retry-after", "30")
            .send({ error: "simulated_rate_limit" });
        case "400":
          return reply.status(400).send({ error: "simulated_client_error" });
        case "slow":
          await new Promise((resolve) => setTimeout(resolve, 12_000));
          break;
        default:
          break;
      }
    }

    const duplicate = receivedEventIds.has(body.id);
    if (duplicate) {
      request.log.info({ eventId: body.id }, "duplicate webhook event (ignored)");
      return reply.status(200).send({
        status: "duplicate",
        eventId: body.id,
      });
    }

    receivedEventIds.add(body.id);
    request.log.info(
      { eventId: body.id, eventType: body.type },
      "webhook event received (signature verified)",
    );

    return reply.status(200).send({
      status: "accepted",
      eventId: body.id,
    });
  });
}
