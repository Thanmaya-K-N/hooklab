import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getProcessingLeaseMs,
  isProcessingLeaseExpired,
} from "../src/processing-lease.js";

describe("processing lease", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects expired processing leases", () => {
    vi.stubEnv("PROCESSING_LEASE_MS", "60000");
    const updatedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = updatedAt.getTime() + 61_000;
    expect(isProcessingLeaseExpired(updatedAt, now)).toBe(true);
    expect(getProcessingLeaseMs()).toBe(60_000);
  });
});
