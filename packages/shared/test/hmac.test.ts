import { describe, it, expect } from "vitest";
import {
  computeWebhookSignature,
  formatSignatureHeader,
  validateTimestamp,
  verifyWebhookSignature,
} from "../src/hmac.js";

describe("webhook HMAC", () => {
  const secret = "endpoint_secret_abc";
  const rawBody = JSON.stringify({ id: "evt_1", type: "task.completed" });
  const timestamp = 1_700_000_000;

  it("signs timestamp.rawBody and verifies with constant-time path", () => {
    const hex = computeWebhookSignature(secret, timestamp, rawBody);
    const header = formatSignatureHeader(hex);
    const result = verifyWebhookSignature({
      endpointSecret: secret,
      timestampSeconds: timestamp,
      rawBody,
      signatureHeader: header,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects wrong secret", () => {
    const header = formatSignatureHeader(
      computeWebhookSignature(secret, timestamp, rawBody),
    );
    const result = verifyWebhookSignature({
      endpointSecret: "wrong",
      timestampSeconds: timestamp,
      rawBody,
      signatureHeader: header,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects tampered body", () => {
    const header = formatSignatureHeader(
      computeWebhookSignature(secret, timestamp, rawBody),
    );
    const result = verifyWebhookSignature({
      endpointSecret: secret,
      timestampSeconds: timestamp,
      rawBody: rawBody + " ",
      signatureHeader: header,
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateTimestamp", () => {
  it("allows timestamps within tolerance", () => {
    const now = 1_700_000_000;
    expect(
      validateTimestamp(now - 60, { nowSeconds: now, toleranceSeconds: 300 }),
    ).toEqual({ ok: true });
  });

  it("rejects stale timestamps", () => {
    const now = 1_700_000_000;
    expect(
      validateTimestamp(now - 400, { nowSeconds: now, toleranceSeconds: 300 }),
    ).toEqual({ ok: false, reason: "stale_timestamp" });
  });
});
