import { describe, it, expect, beforeEach } from "vitest";
import {
  computeWebhookSignature,
  formatSignatureHeader,
} from "@hooklab/shared";
import { buildConsumer } from "../src/app.js";
import { resetReceivedEvents } from "../src/routes/webhooks.js";

const SIGNING_SECRET = "consumer_test_signing_secret";

function signedHeaders(rawBody: string, timestampSeconds: number) {
  const signature = formatSignatureHeader(
    computeWebhookSignature(SIGNING_SECRET, timestampSeconds, rawBody),
  );
  return {
    "content-type": "application/json",
    "x-hooklab-timestamp": String(timestampSeconds),
    "x-hooklab-signature": signature,
    "x-hooklab-event": "task.completed",
    "x-hooklab-delivery": "dlv_test",
  };
}

describe("POST /webhooks", () => {
  beforeEach(() => {
    resetReceivedEvents();
  });

  it("accepts a valid signed event payload", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
    });

    const payload = {
      id: "evt_test_1",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_123", status: "completed" },
    };
    const raw = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: signedHeaders(raw, ts),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "accepted",
      eventId: "evt_test_1",
    });
  });

  it("returns 401 for invalid signature", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
    });

    const payload = {
      id: "evt_bad_sig",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_1" },
    };
    const raw = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: {
        ...signedHeaders(raw, ts),
        "x-hooklab-signature": "v1=deadbeef",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: "signature_mismatch" });
  });

  it("returns 401 for stale timestamp", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
      timestampToleranceSeconds: 60,
    });

    const payload = {
      id: "evt_stale",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_1" },
    };
    const raw = JSON.stringify(payload);
    const staleTs = Math.floor(Date.now() / 1000) - 10_000;

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: signedHeaders(raw, staleTs),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: "stale_timestamp" });
  });

  it("returns 400 for invalid payload after verification", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
    });

    const raw = JSON.stringify({ type: "task.completed" });
    const ts = Math.floor(Date.now() / 1000);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: signedHeaders(raw, ts),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_payload" });
  });

  it("returns 500 when simulate is enabled and header requests it", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
      enableSimulate: true,
    });

    const payload = {
      id: "evt_sim_500",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_1" },
    };
    const raw = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: {
        ...signedHeaders(raw, ts),
        "x-hooklab-simulate": "500",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ error: "simulated_server_error" });
  });

  it("ignores simulate header when simulate mode is disabled", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
      enableSimulate: false,
    });

    const payload = {
      id: "evt_sim_off",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_1" },
    };
    const raw = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers: {
        ...signedHeaders(raw, ts),
        "x-hooklab-simulate": "500",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("treats duplicate event ids as idempotent success", async () => {
    const app = await buildConsumer({
      logger: false,
      signingSecret: SIGNING_SECRET,
      requireVerification: true,
    });

    const payload = {
      id: "evt_dup",
      type: "task.completed",
      createdAt: "2026-11-05T12:00:00.000Z",
      data: { taskId: "task_1" },
    };
    const raw = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);
    const headers = signedHeaders(raw, ts);

    const first = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers,
    });
    const second = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: raw,
      headers,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ status: "duplicate", eventId: "evt_dup" });
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = await buildConsumer({ logger: false, signingSecret: SIGNING_SECRET });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });
});
