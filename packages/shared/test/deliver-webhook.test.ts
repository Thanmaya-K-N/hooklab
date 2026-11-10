import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { buildOutboundWebhookBody } from "../src/webhook-body.js";
import { deliverWebhook } from "../src/deliver-webhook.js";

describe("deliverWebhook", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  it("POSTs JSON with HookLab headers", async () => {
    let seenHeaders: Record<string, string | string[] | undefined> = {};

    server = createServer((req, res) => {
      seenHeaders = req.headers;
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "accepted" }));
      });
    });

    const port = await new Promise<number>((resolve) => {
      server!.listen(0, "127.0.0.1", () => {
        const addr = server!.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });

    const event = {
      id: "evt_1",
      organizationId: "org_1",
      eventType: "task.completed",
      payload: { type: "task.completed", data: { taskId: "t1" } },
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const body = buildOutboundWebhookBody(event);

    const result = await deliverWebhook({
      url: `http://127.0.0.1:${port}/webhooks`,
      deliveryId: "dlv_1",
      eventType: event.eventType,
      endpointSecret: "test_signing_secret",
      body,
      urlPolicy: { allowLocalhost: true },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statusCode).toBe(200);
    }
    expect(seenHeaders["x-hooklab-delivery"]).toBe("dlv_1");
    expect(seenHeaders["x-hooklab-event"]).toBe("task.completed");
    expect(seenHeaders["x-hooklab-signature"]).toMatch(/^v1=[a-f0-9]+$/);
  });
});
