import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../plugins/auth.js";
import type { HookLabStore } from "../store/types.js";
import {
  validateEventData,
  validateEventType,
  validateIdempotencyKey,
} from "@hooklab/shared";

export async function registerEventRoutes(
  app: FastifyInstance,
  store: HookLabStore,
): Promise<void> {
  app.get("/api/v1/events", async (request, reply) => {
    const organizationId = requireOrganizationId(request);
    const events = await store.listEvents(organizationId);
    return reply.send({ data: events });
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const event = await store.getEvent(organizationId, request.params.id);
      if (!event) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send(event);
    },
  );

  app.post("/api/v1/events", async (request, reply) => {
    const organizationId = requireOrganizationId(request);
    const body = request.body as Record<string, unknown>;

    const idemResult = validateIdempotencyKey(request.headers["idempotency-key"]);
    if (!idemResult.ok) {
      return reply.status(400).send({
        error: "validation_error",
        message: idemResult.error,
      });
    }

    const typeResult = validateEventType(body.type);
    if (!typeResult.ok) {
      return reply
        .status(400)
        .send({ error: "validation_error", message: typeResult.error });
    }
    const dataResult = validateEventData(body.data);
    if (!dataResult.ok) {
      return reply
        .status(400)
        .send({ error: "validation_error", message: dataResult.error });
    }

    const result = await store.publishEvent(
      organizationId,
      {
        type: typeResult.value,
        data: dataResult.value,
      },
      idemResult.value,
    );

    if (result.kind === "replay") {
      return reply.status(202).send(result.ack);
    }

    return reply.status(202).send({
      id: result.event.id,
      status: "accepted",
      deliveriesCreated: result.deliveries.length,
    });
  });
}
