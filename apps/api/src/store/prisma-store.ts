import type { Prisma } from "@prisma/client";
import type {
  CreateEndpointInput,
  DeliveryAttempt,
  EventPayload,
  HookLabEvent,
  PublishEventAck,
  PublishEventInput,
  UpdateEndpointInput,
  WebhookDelivery,
  WebhookEndpoint,
} from "@hooklab/shared";
import {
  decryptSecret,
  encryptSecret,
  findMatchingEndpoints,
  generateEndpointSecret,
  generatePrefixedId,
} from "@hooklab/shared";
import { prisma } from "../db/client.js";
import type { HookLabStore } from "./types.js";

function mapEndpoint(row: {
  id: string;
  organizationId: string;
  url: string;
  description: string | null;
  secretCiphertext: string;
  subscribedEvents: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}, secretPlaintext: string): WebhookEndpoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    url: row.url,
    description: row.description,
    secret: secretPlaintext,
    subscribedEvents: row.subscribedEvents,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapEvent(row: {
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

function mapDelivery(row: {
  id: string;
  organizationId: string;
  eventId: string;
  endpointId: string;
  status: string;
  attemptCount: number;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  deliveredAt: Date | null;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WebhookDelivery {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventId: row.eventId,
    endpointId: row.endpointId,
    status: row.status as WebhookDelivery["status"],
    attemptCount: row.attemptCount,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    errorMessage: row.errorMessage,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaStore implements HookLabStore {
  constructor(private readonly encryptionKeyHex: string) {}

  private decryptRowSecret(ciphertext: string): string {
    return decryptSecret(ciphertext, this.encryptionKeyHex);
  }

  async listEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
    const rows = await prisma.webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) =>
      mapEndpoint(row, this.decryptRowSecret(row.secretCiphertext)),
    );
  }

  async getEndpoint(
    organizationId: string,
    id: string,
  ): Promise<WebhookEndpoint | undefined> {
    const row = await prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });
    if (!row) return undefined;
    return mapEndpoint(row, this.decryptRowSecret(row.secretCiphertext));
  }

  async createEndpoint(
    organizationId: string,
    input: CreateEndpointInput,
  ): Promise<WebhookEndpoint> {
    const secret = generateEndpointSecret();
    const row = await prisma.webhookEndpoint.create({
      data: {
        id: generatePrefixedId("ep"),
        organizationId,
        url: input.url,
        description: input.description ?? null,
        secretCiphertext: encryptSecret(secret, this.encryptionKeyHex),
        subscribedEvents: input.subscribedEvents,
        enabled: true,
      },
    });
    return mapEndpoint(row, secret);
  }

  async updateEndpoint(
    organizationId: string,
    id: string,
    input: UpdateEndpointInput,
  ): Promise<WebhookEndpoint | undefined> {
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });
    if (!existing) return undefined;

    const row = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: input.url,
        description: input.description,
        subscribedEvents: input.subscribedEvents,
        enabled: input.enabled,
      },
    });
    return mapEndpoint(row, this.decryptRowSecret(row.secretCiphertext));
  }

  async deleteEndpoint(organizationId: string, id: string): Promise<boolean> {
    const result = await prisma.webhookEndpoint.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }

  async listEvents(organizationId: string): Promise<HookLabEvent[]> {
    const rows = await prisma.event.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapEvent);
  }

  async getEvent(
    organizationId: string,
    id: string,
  ): Promise<HookLabEvent | undefined> {
    const row = await prisma.event.findFirst({
      where: { id, organizationId },
    });
    return row ? mapEvent(row) : undefined;
  }

  async listDeliveries(
    organizationId: string,
    filters?: { eventId?: string; endpointId?: string },
  ): Promise<WebhookDelivery[]> {
    const rows = await prisma.webhookDelivery.findMany({
      where: {
        organizationId,
        eventId: filters?.eventId,
        endpointId: filters?.endpointId,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDelivery);
  }

  async getDelivery(
    organizationId: string,
    id: string,
  ): Promise<WebhookDelivery | undefined> {
    const row = await prisma.webhookDelivery.findFirst({
      where: { id, organizationId },
    });
    return row ? mapDelivery(row) : undefined;
  }

  async listDeliveryAttempts(
    organizationId: string,
    deliveryId: string,
  ): Promise<DeliveryAttempt[] | null> {
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, organizationId },
      select: { id: true },
    });
    if (!delivery) return null;

    const rows = await prisma.deliveryAttempt.findMany({
      where: { deliveryId },
      orderBy: { attemptNumber: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      deliveryId: row.deliveryId,
      attemptNumber: row.attemptNumber,
      requestTimestamp: row.requestTimestamp.toISOString(),
      responseTimestamp: row.responseTimestamp?.toISOString() ?? null,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
      errorMessage: row.errorMessage,
      durationMs: row.durationMs,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async publishEvent(
    organizationId: string,
    input: PublishEventInput,
    idempotencyKey?: string,
  ): Promise<
    | { kind: "created"; event: HookLabEvent; deliveries: WebhookDelivery[] }
    | { kind: "replay"; ack: PublishEventAck }
  > {
    if (idempotencyKey) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId,
            idempotencyKey,
          },
        },
      });
      if (existing) {
        return {
          kind: "replay",
          ack: existing.response as PublishEventAck,
        };
      }
    }

    return prisma.$transaction(async (tx) => {
      const eventRow = await tx.event.create({
        data: {
          id: generatePrefixedId("evt"),
          organizationId,
          eventType: input.type,
          payload: {
            type: input.type,
            data: input.data,
          } satisfies EventPayload as Prisma.InputJsonValue,
        },
      });

      const endpointRows = await tx.webhookEndpoint.findMany({
        where: { organizationId, enabled: true },
      });

      const endpoints = endpointRows.map((row) =>
        mapEndpoint(row, this.decryptRowSecret(row.secretCiphertext)),
      );
      const matches = findMatchingEndpoints(endpoints, input.type);

      const deliveryRows = await Promise.all(
        matches.map(async (endpoint) => {
          const delivery = await tx.webhookDelivery.create({
            data: {
              id: generatePrefixedId("dlv"),
              organizationId,
              eventId: eventRow.id,
              endpointId: endpoint.id,
              status: "pending",
              attemptCount: 0,
            },
          });
          await tx.outboxEvent.create({
            data: {
              id: generatePrefixedId("obx"),
              deliveryId: delivery.id,
              status: "pending",
              availableAt: new Date(),
            },
          });
          return delivery;
        }),
      );

      const ack: PublishEventAck = {
        id: eventRow.id,
        status: "accepted",
        deliveriesCreated: deliveryRows.length,
      };

      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            organizationId,
            idempotencyKey,
            eventId: eventRow.id,
            response: ack as Prisma.InputJsonValue,
          },
        });
      }

      return {
        kind: "created" as const,
        event: mapEvent(eventRow),
        deliveries: deliveryRows.map(mapDelivery),
      };
    });
  }
}

export function createPrismaStore(): PrismaStore {
  const key = process.env.ENDPOINT_SECRET_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENDPOINT_SECRET_ENCRYPTION_KEY is required for PostgreSQL mode");
  }
  return new PrismaStore(key);
}
