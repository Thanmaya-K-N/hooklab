import type { HookLabEvent } from "./types.js";

/** JSON body POSTed to subscriber endpoints (matches sample consumer contract). */
export type OutboundWebhookBody = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export function buildOutboundWebhookBody(event: HookLabEvent): OutboundWebhookBody {
  return {
    id: event.id,
    type: event.eventType,
    createdAt: event.createdAt,
    data: event.payload.data,
  };
}
