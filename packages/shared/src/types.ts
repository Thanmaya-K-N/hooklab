/** Canonical event shape stored and eventually delivered to subscribers. */
export type HookLabEvent = {
  id: string;
  organizationId: string;
  eventType: string;
  payload: EventPayload;
  createdAt: string;
};

/** Public JSON body for `POST /api/v1/events` and webhook delivery bodies. */
export type EventPayload = {
  type: string;
  data: Record<string, unknown>;
};

export type WebhookEndpoint = {
  id: string;
  organizationId: string;
  url: string;
  description: string | null;
  secret: string;
  subscribedEvents: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "retrying"
  | "failed"
  | "dead_lettered";

export type WebhookDelivery = {
  id: string;
  organizationId: string;
  eventId: string;
  endpointId: string;
  status: DeliveryStatus;
  attemptCount: number;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublishEventAck = {
  id: string;
  status: "accepted";
  deliveriesCreated: number;
};

export type DeliveryAttempt = {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  requestTimestamp: string;
  responseTimestamp: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type PublishEventInput = {
  type: string;
  data: Record<string, unknown>;
};

export type CreateEndpointInput = {
  url: string;
  description?: string;
  subscribedEvents: string[];
};

export type UpdateEndpointInput = {
  url?: string;
  description?: string | null;
  subscribedEvents?: string[];
  enabled?: boolean;
};
