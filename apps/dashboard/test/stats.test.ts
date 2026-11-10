import { describe, expect, it } from "vitest";
import { computeSuccessRate } from "../src/lib/stats.js";

describe("computeSuccessRate", () => {
  it("returns null when no terminal deliveries", () => {
    expect(computeSuccessRate({ pending: 3 })).toBeNull();
  });

  it("computes rate from succeeded vs failed + dead_lettered", () => {
    expect(
      computeSuccessRate({
        succeeded: 8,
        failed: 1,
        dead_lettered: 1,
      }),
    ).toBe(80);
  });
});
