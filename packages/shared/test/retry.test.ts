import { describe, it, expect } from "vitest";
import {
  computeRetryDelayMs,
  isRetryableDeliveryError,
  parseRetryAfterHeader,
} from "../src/retry.js";

describe("retry policy", () => {
  it("computes schedule delays", () => {
    expect(computeRetryDelayMs(2)).toBe(5_000);
    expect(computeRetryDelayMs(5)).toBe(120_000);
  });

  it("classifies HTTP failures", () => {
    expect(isRetryableDeliveryError({ statusCode: 500, errorMessage: "x" })).toBe(
      true,
    );
    expect(isRetryableDeliveryError({ statusCode: 400, errorMessage: "x" })).toBe(
      false,
    );
    expect(isRetryableDeliveryError({ errorMessage: "ECONNREFUSED" })).toBe(true);
    expect(
      isRetryableDeliveryError({
        errorMessage: "ssrf_blocked: private address",
      }),
    ).toBe(false);
  });

  it("parses Retry-After", () => {
    expect(parseRetryAfterHeader("30")).toBe(30_000);
  });
});
