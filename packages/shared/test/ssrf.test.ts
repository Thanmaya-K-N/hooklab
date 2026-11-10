import { describe, expect, it } from "vitest";
import {
  validateWebhookHostname,
  assertResolvableSafeWebhookUrl,
} from "../src/ssrf.js";
import { validateEndpointUrl } from "../src/validation.js";

describe("SSRF — registration", () => {
  const strict = { allowLocalhost: false };
  const dev = { allowLocalhost: true };

  it("rejects localhost without dev flag", () => {
    expect(validateEndpointUrl("http://127.0.0.1/h", strict).ok).toBe(false);
    expect(validateEndpointUrl("http://localhost/h", strict).ok).toBe(false);
  });

  it("allows localhost when WEBHOOK_ALLOW_LOCALHOST policy set", () => {
    expect(validateEndpointUrl("http://127.0.0.1:4000/w", dev).ok).toBe(true);
  });

  it("rejects private IPv4 literals", () => {
    expect(validateEndpointUrl("http://10.0.0.5/h", strict).ok).toBe(false);
    expect(validateEndpointUrl("http://192.168.1.1/h", strict).ok).toBe(false);
  });

  it("rejects credentials in URL", () => {
    expect(
      validateEndpointUrl("http://user:pass@example.com/h", strict).ok,
    ).toBe(false);
  });

  it("rejects metadata hostname", () => {
    expect(validateWebhookHostname("metadata.google.internal", strict).ok).toBe(
      false,
    );
  });
});

describe("SSRF — DNS resolution", () => {
  it("allows public hostnames", async () => {
    const result = await assertResolvableSafeWebhookUrl(
      "https://example.com/webhooks",
      { allowLocalhost: false },
    );
    expect(result.ok).toBe(true);
  });
});
