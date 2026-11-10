import {
  buildOutboundWebhookBody,
  computeRetryDelayMs,
  decryptSecret,
  deliverWebhook,
  generatePrefixedId,
  getRetryConfigFromEnv,
  isRetryableDeliveryError,
} from "@hooklab/shared";
import { getEncryptionKeyHex } from "./config.js";
import type { EventPayload, HookLabEvent } from "@hooklab/shared";
import { prisma } from "./db/client.js";
import { claimDeliveryForProcessing } from "./claim-delivery.js";

function toHookLabEvent(row: {
  id: string;
  organizationId: string;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}): HookLabEvent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventType: row.eventType,
    payload: row.payload as EventPayload,
    createdAt: row.createdAt.toISOString(),
  };
}

export type ProcessDeliveryResult =
  | { outcome: "skipped" }
  | {
      outcome: "succeeded" | "failed" | "retrying" | "dead_lettered";
      deliveryId: string;
    };

export async function processDelivery(
  deliveryId: string,
): Promise<ProcessDeliveryResult> {
  const initial = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { status: true },
  });

  if (!initial) return { outcome: "skipped" };
  if (
    initial.status === "succeeded" ||
    initial.status === "dead_lettered" ||
    initial.status === "failed"
  ) {
    return { outcome: "skipped" };
  }

  const claimed = await claimDeliveryForProcessing(deliveryId);
  if (!claimed) {
    return { outcome: "skipped" };
  }

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { event: true, endpoint: true },
  });

  if (!delivery) return { outcome: "skipped" };

  if (!delivery.endpoint.enabled) {
    await recordAttemptAndUpdateDelivery({
      deliveryId,
      attemptNumber: delivery.attemptCount + 1,
      requestTimestamp: new Date(),
      responseTimestamp: new Date(),
      errorMessage: "endpoint_disabled",
      durationMs: 0,
      terminalStatus: "failed",
    });
    return { outcome: "failed", deliveryId };
  }

  const event = toHookLabEvent(delivery.event);
  const body = buildOutboundWebhookBody(event);
  const requestTimestamp = new Date();
  const endpointSecret = decryptSecret(
    delivery.endpoint.secretCiphertext,
    getEncryptionKeyHex(),
  );

  const httpResult = await deliverWebhook({
    url: delivery.endpoint.url,
    deliveryId,
    eventType: event.eventType,
    endpointSecret,
    body,
    timeoutMs: Number(process.env.DELIVERY_TIMEOUT_MS ?? "10000"),
  });

  const responseTimestamp = new Date();
  const attemptNumber = delivery.attemptCount + 1;
  const retryConfig = getRetryConfigFromEnv();

  if (httpResult.ok) {
    const applied = await recordAttemptAndUpdateDelivery({
      deliveryId,
      attemptNumber,
      requestTimestamp,
      responseTimestamp,
      responseStatus: httpResult.statusCode,
      responseBody: httpResult.responseBody,
      durationMs: httpResult.durationMs,
      terminalStatus: "succeeded",
      deliveredAt: responseTimestamp,
    });
    if (!applied) return { outcome: "skipped" };
    return { outcome: "succeeded", deliveryId };
  }

  const retryable = isRetryableDeliveryError({
    statusCode: httpResult.statusCode,
    errorMessage: httpResult.errorMessage,
  });

  if (!retryable || attemptNumber >= retryConfig.maxAttempts) {
    const terminalStatus =
      retryable && attemptNumber >= retryConfig.maxAttempts
        ? "dead_lettered"
        : "failed";

    const applied = await recordAttemptAndUpdateDelivery({
      deliveryId,
      attemptNumber,
      requestTimestamp,
      responseTimestamp,
      responseStatus: httpResult.statusCode ?? null,
      responseBody: httpResult.responseBody ?? null,
      errorMessage: httpResult.errorMessage,
      durationMs: httpResult.durationMs,
      terminalStatus,
    });
    if (!applied) return { outcome: "skipped" };
    return { outcome: terminalStatus, deliveryId };
  }

  const delayMs = computeRetryDelayMs(attemptNumber + 1, retryConfig);
  const nextRetryAt = new Date(Date.now() + delayMs);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.deliveryAttempt.create({
        data: {
          id: generatePrefixedId("att"),
          deliveryId,
          attemptNumber,
          requestTimestamp,
          responseTimestamp,
          responseStatus: httpResult.statusCode ?? null,
          responseBody: httpResult.responseBody ?? null,
          errorMessage: httpResult.errorMessage,
          durationMs: httpResult.durationMs,
        },
      });

      const updated = await tx.webhookDelivery.updateMany({
        where: { id: deliveryId, status: "processing" },
        data: {
          status: "retrying",
          attemptCount: attemptNumber,
          responseStatus: httpResult.statusCode ?? null,
          responseBody: httpResult.responseBody ?? null,
          errorMessage: httpResult.errorMessage,
          nextRetryAt,
        },
      });
      if (updated.count !== 1) {
        throw new Error("delivery_not_processing");
      }

      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId("obx"),
          deliveryId,
          status: "pending",
          availableAt: nextRetryAt,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "delivery_not_processing") {
      return { outcome: "skipped" };
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return { outcome: "skipped" };
    }
    throw err;
  }

  return { outcome: "retrying", deliveryId };
}

async function recordAttemptAndUpdateDelivery(input: {
  deliveryId: string;
  attemptNumber: number;
  requestTimestamp: Date;
  responseTimestamp: Date;
  responseStatus?: number | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  durationMs?: number;
  terminalStatus: "succeeded" | "failed" | "dead_lettered";
  deliveredAt?: Date;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    try {
      await tx.deliveryAttempt.create({
        data: {
          id: generatePrefixedId("att"),
          deliveryId: input.deliveryId,
          attemptNumber: input.attemptNumber,
          requestTimestamp: input.requestTimestamp,
          responseTimestamp: input.responseTimestamp,
          responseStatus: input.responseStatus ?? null,
          responseBody: input.responseBody ?? null,
          errorMessage: input.errorMessage ?? null,
          durationMs: input.durationMs ?? null,
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "P2002"
      ) {
        return false;
      }
      throw err;
    }

    const updated = await tx.webhookDelivery.updateMany({
      where: { id: input.deliveryId, status: "processing" },
      data: {
        status: input.terminalStatus,
        attemptCount: input.attemptNumber,
        responseStatus: input.responseStatus ?? null,
        responseBody: input.responseBody ?? null,
        errorMessage: input.errorMessage ?? null,
        deliveredAt: input.deliveredAt ?? null,
        nextRetryAt: null,
      },
    });

    return updated.count === 1;
  });
}
