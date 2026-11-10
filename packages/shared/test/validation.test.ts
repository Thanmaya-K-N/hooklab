import { describe, it, expect } from "vitest";
import {
  validateEndpointUrl,
  validateEventType,
  validateSubscribedEvents,
} from "../src/validation.js";

describe("validateEventType", () => {
  it("accepts dotted event names", () => {
    expect(validateEventType("task.completed")).toMatchObject({ ok: true });
  });

  it("rejects empty type", () => {
    expect(validateEventType("")).toMatchObject({ ok: false });
  });
});

describe("validateEndpointUrl", () => {
  it("accepts https URLs", () => {
    const policy = { allowLocalhost: true };
    const result = validateEndpointUrl(
      "http://127.0.0.1:4000/webhooks",
      policy,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(validateEndpointUrl("not-a-url").ok).toBe(false);
  });
});

describe("validateSubscribedEvents", () => {
  it("requires at least one event", () => {
    expect(validateSubscribedEvents([]).ok).toBe(false);
  });
});
