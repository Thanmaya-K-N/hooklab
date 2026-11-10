import { describe, it, expect } from "vitest";
import { createRedisConnectionOptions } from "../src/redis.js";

describe("createRedisConnectionOptions", () => {
  it("parses redis URL host, port, and db", () => {
    const opts = createRedisConnectionOptions("redis://127.0.0.1:6379/2");
    expect(opts).toMatchObject({
      host: "127.0.0.1",
      port: 6379,
      db: 2,
    });
  });
});
