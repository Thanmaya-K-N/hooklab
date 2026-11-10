import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateApiKey,
  generatePrefixedId,
  hashApiKey,
} from "@hooklab/shared";
import { prisma } from "../../src/db/client.js";
import { buildApi } from "../../src/app.js";
import { createPrismaStore } from "../../src/store/prisma-store.js";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!runIntegration)("HookLab API + PostgreSQL", () => {
  let apiKey: string;
  let organizationId: string;
  let app: Awaited<ReturnType<typeof buildApi>>["app"];

  beforeAll(async () => {
    if (!process.env.ENDPOINT_SECRET_ENCRYPTION_KEY) {
      process.env.ENDPOINT_SECRET_ENCRYPTION_KEY = "b".repeat(64);
    }

    apiKey = generateApiKey();
    organizationId = generatePrefixedId("org");
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: "Integration Test Org",
        apiKeyHash: hashApiKey(apiKey),
      },
    });

    const store = createPrismaStore();
    ({ app } = await buildApi({ logger: false, store, auth: true }));
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await app.close();
    await prisma.$disconnect();
  });

  it("returns 401 without Authorization header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/endpoints",
    });
    expect(response.statusCode).toBe(401);
  });

  it("persists endpoint, event, and delivery in PostgreSQL", async () => {
    const auth = { authorization: `Bearer ${apiKey}` };

    const createEndpoint = await app.inject({
      method: "POST",
      url: "/api/v1/endpoints",
      headers: auth,
      payload: {
        url: "http://127.0.0.1:4000/webhooks",
        subscribedEvents: ["task.completed"],
      },
    });
    expect(createEndpoint.statusCode).toBe(201);

    const publish = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: auth,
      payload: {
        type: "task.completed",
        data: { taskId: "pg_1" },
      },
    });
    expect(publish.statusCode).toBe(202);
    const eventId = publish.json().id;

    const eventRow = await prisma.event.findUnique({ where: { id: eventId } });
    expect(eventRow?.organizationId).toBe(organizationId);

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { eventId },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.status).toBe("pending");
  });
});
