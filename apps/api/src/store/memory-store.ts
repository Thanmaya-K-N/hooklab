import type {
  CreateEndpointInput,
  DeliveryAttempt,
  HookLabEvent,
  PublishEventAck,
  PublishEventInput,
  UpdateEndpointInput,
  WebhookDelivery,
  WebhookEndpoint,
} from "@hooklab/shared";
import {
  findMatchingEndpoints,
  generateEndpointSecret,
  generatePrefixedId,
} from "@hooklab/shared";
import type { HookLabStore } from "./types.js";

/** In-memory persistence for fast unit tests. */
export class MemoryStore implements HookLabStore {
  private endpoints = new Map<string, WebhookEndpoint>();
  private events = new Map<string, HookLabEvent>();
  private deliveries = new Map<string, WebhookDelivery>();
  private idempotency = new Map<string, PublishEventAck>();

  async listEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
    return [...this.endpoints.values()]
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEndpoint(
    organizationId: string,
    id: string,
  ): Promise<WebhookEndpoint | undefined> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint || endpoint.organizationId !== organizationId) return undefined;
    return endpoint;
  }

  async createEndpoint(
    organizationId: string,
    input: CreateEndpointInput,
  ): Promise<WebhookEndpoint> {
    const now = new Date().toISOString();
    const endpoint: WebhookEndpoint = {
      id: generatePrefixedId("ep"),
      organizationId,
      url: input.url,
      description: input.description ?? null,
      secret: generateEndpointSecret(),
      subscribedEvents: input.subscribedEvents,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    this.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  async updateEndpoint(
    organizationId: string,
    id: string,
    input: UpdateEndpointInput,
  ): Promise<WebhookEndpoint | undefined> {
    const existing = await this.getEndpoint(organizationId, id);
    if (!existing) return undefined;

    const updated: WebhookEndpoint = {
      ...existing,
      url: input.url ?? existing.url,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      subscribedEvents: input.subscribedEvents ?? existing.subscribedEvents,
      enabled: input.enabled ?? existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.endpoints.set(id, updated);
    return updated;
  }

  async deleteEndpoint(organizationId: string, id: string): Promise<boolean> {
    const existing = await this.getEndpoint(organizationId, id);
    if (!existing) return false;
    return this.endpoints.delete(id);
  }

  async listEvents(organizationId: string): Promise<HookLabEvent[]> {
    return [...this.events.values()]
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEvent(
    organizationId: string,
    id: string,
  ): Promise<HookLabEvent | undefined> {
    const event = this.events.get(id);
    if (!event || event.organizationId !== organizationId) return undefined;
    return event;
  }

  async listDeliveries(
    organizationId: string,
    filters?: { eventId?: string; endpointId?: string },
  ): Promise<WebhookDelivery[]> {
    let items = [...this.deliveries.values()].filter(
      (d) => d.organizationId === organizationId,
    );
    if (filters?.eventId) {
      items = items.filter((d) => d.eventId === filters.eventId);
    }
    if (filters?.endpointId) {
      items = items.filter((d) => d.endpointId === filters.endpointId);
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getDelivery(
    organizationId: string,
    id: string,
  ): Promise<WebhookDelivery | undefined> {
    const delivery = this.deliveries.get(id);
    if (!delivery || delivery.organizationId !== organizationId) return undefined;
    return delivery;
  }

  async listDeliveryAttempts(
    organizationId: string,
    deliveryId: string,
  ): Promise<DeliveryAttempt[] | null> {
    const delivery = await this.getDelivery(organizationId, deliveryId);
    if (!delivery) return null;
    return [];
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
      const cacheKey = `${organizationId}:${idempotencyKey}`;
      const cached = this.idempotency.get(cacheKey);
      if (cached) {
        return { kind: "replay", ack: cached };
      }
    }

    const now = new Date().toISOString();
    const event: HookLabEvent = {
      id: generatePrefixedId("evt"),
      organizationId,
      eventType: input.type,
      payload: { type: input.type, data: input.data },
      createdAt: now,
    };
    this.events.set(event.id, event);

    const orgEndpoints = await this.listEndpoints(organizationId);
    const matches = findMatchingEndpoints(orgEndpoints, input.type);
    const deliveries = matches.map((endpoint) => {
      const delivery: WebhookDelivery = {
        id: generatePrefixedId("dlv"),
        organizationId,
        eventId: event.id,
        endpointId: endpoint.id,
        status: "pending",
        attemptCount: 0,
        responseStatus: null,
        responseBody: null,
        errorMessage: null,
        deliveredAt: null,
        nextRetryAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.deliveries.set(delivery.id, delivery);
      return delivery;
    });

    const ack: PublishEventAck = {
      id: event.id,
      status: "accepted",
      deliveriesCreated: deliveries.length,
    };

    if (idempotencyKey) {
      this.idempotency.set(`${organizationId}:${idempotencyKey}`, ack);
    }

    return { kind: "created", event, deliveries };
  }
}
