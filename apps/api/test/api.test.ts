import { describe, it, expect, beforeEach } from "vitest";
import { buildApi } from "../src/app.js";
import { MemoryStore } from "../src/store/memory-store.js";

describe("HookLab API — Milestone 2", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  async function createApp() {
    return buildApi({ logger: false, store, auth: false, testOrganizationId: "org_test" });
  }

  it("registers an endpoint and lists it without secret", async () => {
    const { app } = await createApp();

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/endpoints",
      payload: {
        url: "http://127.0.0.1:4000/webhooks",
        description: "Local consumer",
        subscribedEvents: ["task.completed"],
      },
    });

    expect(create.statusCode).toBe(201);
    const created = create.json();
    expect(created.id).toMatch(/^ep_/);
    expect(created.signingSecret).toBeDefined();
    expect(created.enabled).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/v1/endpoints" });
    const item = list.json().data[0];
    expect(item.signingSecret).toBeUndefined();
    expect(item.secret).toBeUndefined();
  });

  it("publishes an event and creates pending deliveries for subscribers", async () => {
    const { app } = await createApp();

    await app.inject({
      method: "POST",
      url: "/api/v1/endpoints",
      payload: {
        url: "http://127.0.0.1:4000/webhooks",
        subscribedEvents: ["task.completed", "task.failed"],
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/endpoints",
      payload: {
        url: "http://127.0.0.1:4001/other",
        subscribedEvents: ["task.failed"],
      },
    });

    const publish = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: {
        type: "task.completed",
        data: { taskId: "task_1", status: "completed" },
      },
    });

    expect(publish.statusCode).toBe(202);
    const ack = publish.json();
    expect(ack.status).toBe("accepted");
    expect(ack.deliveriesCreated).toBe(1);

    const eventRes = await app.inject({
      method: "GET",
      url: `/api/v1/events/${ack.id}`,
    });
    expect(eventRes.json().eventType).toBe("task.completed");

    const deliveries = await app.inject({
      method: "GET",
      url: `/api/v1/deliveries?eventId=${ack.id}`,
    });
    expect(deliveries.json().data).toHaveLength(1);
    expect(deliveries.json().data[0].status).toBe("pending");
  });

  it("does not create deliveries when no endpoint matches", async () => {
    const { app } = await createApp();

    const publish = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { type: "task.completed", data: { taskId: "x" } },
    });

    expect(publish.json().deliveriesCreated).toBe(0);
  });

  it("skips disabled endpoints when publishing", async () => {
    const { app } = await createApp();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/endpoints",
      payload: {
        url: "http://127.0.0.1:4000/webhooks",
        subscribedEvents: ["task.completed"],
      },
    });
    const endpointId = created.json().id;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/endpoints/${endpointId}`,
      payload: { enabled: false },
    });

    const publish = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { type: "task.completed", data: { taskId: "x" } },
    });

    expect(publish.json().deliveriesCreated).toBe(0);
  });

  it("returns the same publish ack for duplicate Idempotency-Key", async () => {
    const { app } = await createApp();

    const headers = {
      "idempotency-key": "idem_test_1",
    };
    const payload = {
      type: "task.completed",
      data: { taskId: "idem_1" },
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers,
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers,
      payload,
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(second.json().id).toBe(first.json().id);
  });
});
