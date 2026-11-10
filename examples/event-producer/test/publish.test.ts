import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { createSampleEvent } from "../src/event.js";
import { publishEvent } from "../src/publish.js";

describe("publishEvent", () => {
  let server: Server | undefined;
  let receivedBody = "";

  afterEach(async () => {
    receivedBody = "";
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  it("POSTs JSON and returns status and parsed body", async () => {
    server = createServer((req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        receivedBody = Buffer.concat(chunks).toString("utf8");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "accepted", eventId: "evt_x" }));
      });
    });

    const port = await new Promise<number>((resolve) => {
      server!.listen(0, "127.0.0.1", () => {
        const addr = server!.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });

    const event = createSampleEvent("task.completed", { taskId: "t1" });
    const result = await publishEvent({
      webhookUrl: `http://127.0.0.1:${port}/webhooks`,
      event,
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ status: "accepted", eventId: "evt_x" });
    expect(JSON.parse(receivedBody)).toEqual(event);
  });
});
