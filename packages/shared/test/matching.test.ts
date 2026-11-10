import { describe, it, expect } from "vitest";
import { findMatchingEndpoints } from "../src/matching.js";
import type { WebhookEndpoint } from "../src/types.js";

const baseEndpoint = (
  overrides: Partial<WebhookEndpoint> = {},
): WebhookEndpoint => ({
  id: "ep_1",
  organizationId: "org_1",
  url: "https://example.com/hook",
  description: null,
  secret: "secret",
  subscribedEvents: ["task.completed"],
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("findMatchingEndpoints", () => {
  it("matches enabled endpoints subscribed to the event type", () => {
    const endpoints = [
      baseEndpoint({ id: "ep_a" }),
      baseEndpoint({
        id: "ep_b",
        subscribedEvents: ["task.failed"],
      }),
      baseEndpoint({ id: "ep_c", enabled: false }),
    ];

    const matches = findMatchingEndpoints(endpoints, "task.completed");
    expect(matches.map((e) => e.id)).toEqual(["ep_a"]);
  });
});
