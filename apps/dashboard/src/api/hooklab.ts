import type {
  DeliveryAttempt,
  HookLabEvent,
  WebhookDelivery,
} from "@hooklab/shared";
import { apiFetch } from "./client.js";

export type PublicEndpoint = {
  id: string;
  organizationId: string;
  url: string;
  description: string | null;
  subscribedEvents: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEndpointResponse = PublicEndpoint & {
  signingSecret: string;
};

export type MetricsResponse = {
  queue: {
    name: string;
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  };
  deliveries: {
    byStatus: Record<string, number>;
  };
  events: {
    total: number;
  };
};

export type HealthResponse = {
  status: string;
  checks: { database: boolean; redis: boolean };
};

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch("/api/v1/health");
}

export async function fetchMetrics(): Promise<MetricsResponse> {
  return apiFetch("/api/v1/metrics");
}

export async function fetchEndpoints(): Promise<PublicEndpoint[]> {
  const res = await apiFetch<{ data: PublicEndpoint[] }>("/api/v1/endpoints");
  return res.data;
}

export async function createEndpoint(input: {
  url: string;
  description?: string;
  subscribedEvents: string[];
}): Promise<CreateEndpointResponse> {
  return apiFetch("/api/v1/endpoints", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEndpoint(
  id: string,
  patch: {
    enabled?: boolean;
    subscribedEvents?: string[];
    description?: string | null;
  },
): Promise<PublicEndpoint> {
  return apiFetch(`/api/v1/endpoints/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteEndpoint(id: string): Promise<void> {
  await apiFetch(`/api/v1/endpoints/${id}`, { method: "DELETE" });
}

export async function fetchEvents(): Promise<HookLabEvent[]> {
  const res = await apiFetch<{ data: HookLabEvent[] }>("/api/v1/events");
  return res.data;
}

export async function fetchEvent(id: string): Promise<HookLabEvent> {
  return apiFetch(`/api/v1/events/${id}`);
}

export async function fetchDeliveries(filters?: {
  eventId?: string;
  endpointId?: string;
}): Promise<WebhookDelivery[]> {
  const params = new URLSearchParams();
  if (filters?.eventId) params.set("eventId", filters.eventId);
  if (filters?.endpointId) params.set("endpointId", filters.endpointId);
  const qs = params.toString();
  const res = await apiFetch<{ data: WebhookDelivery[] }>(
    `/api/v1/deliveries${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function fetchDelivery(id: string): Promise<WebhookDelivery> {
  return apiFetch(`/api/v1/deliveries/${id}`);
}

export async function fetchDeliveryAttempts(
  deliveryId: string,
): Promise<DeliveryAttempt[]> {
  const res = await apiFetch<{ data: DeliveryAttempt[] }>(
    `/api/v1/deliveries/${deliveryId}/attempts`,
  );
  return res.data;
}

export async function replayDelivery(
  id: string,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/v1/deliveries/${id}/replay`, { method: "POST" });
}
