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

export interface HookLabStore {
  listEndpoints(organizationId: string): Promise<WebhookEndpoint[]>;
  getEndpoint(
    organizationId: string,
    id: string,
  ): Promise<WebhookEndpoint | undefined>;
  createEndpoint(
    organizationId: string,
    input: CreateEndpointInput,
  ): Promise<WebhookEndpoint>;
  updateEndpoint(
    organizationId: string,
    id: string,
    input: UpdateEndpointInput,
  ): Promise<WebhookEndpoint | undefined>;
  deleteEndpoint(organizationId: string, id: string): Promise<boolean>;

  listEvents(organizationId: string): Promise<HookLabEvent[]>;
  getEvent(
    organizationId: string,
    id: string,
  ): Promise<HookLabEvent | undefined>;

  listDeliveries(
    organizationId: string,
    filters?: { eventId?: string; endpointId?: string },
  ): Promise<WebhookDelivery[]>;
  getDelivery(
    organizationId: string,
    id: string,
  ): Promise<WebhookDelivery | undefined>;

  listDeliveryAttempts(
    organizationId: string,
    deliveryId: string,
  ): Promise<DeliveryAttempt[] | null>;

  publishEvent(
    organizationId: string,
    input: PublishEventInput,
    idempotencyKey?: string,
  ): Promise<
    | { kind: "created"; event: HookLabEvent; deliveries: WebhookDelivery[] }
    | { kind: "replay"; ack: PublishEventAck }
  >;
}

export function toPublicEndpoint(endpoint: WebhookEndpoint) {
  const { secret: _secret, ...rest } = endpoint;
  return rest;
}
