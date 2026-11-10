import type { WebhookEndpoint } from "./types.js";

/** Returns enabled endpoints subscribed to the given event type. */
export function findMatchingEndpoints(
  endpoints: Iterable<WebhookEndpoint>,
  eventType: string,
): WebhookEndpoint[] {
  const matches: WebhookEndpoint[] = [];
  for (const endpoint of endpoints) {
    if (!endpoint.enabled) continue;
    if (endpoint.subscribedEvents.includes(eventType)) {
      matches.push(endpoint);
    }
  }
  return matches;
}
