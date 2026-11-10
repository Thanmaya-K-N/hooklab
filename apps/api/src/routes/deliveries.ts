import type { FastifyInstance } from "fastify";
import { generatePrefixedId } from "@hooklab/shared";
import { requireOrganizationId } from "../plugins/auth.js";
import type { HookLabStore } from "../store/types.js";

export async function registerDeliveryRoutes(
  app: FastifyInstance,
  store: HookLabStore,
): Promise<void> {
  app.get("/api/v1/deliveries", async (request, reply) => {
    const organizationId = requireOrganizationId(request);
    const query = request.query as Record<string, string | undefined>;
    const deliveries = await store.listDeliveries(organizationId, {
      eventId: query.eventId,
      endpointId: query.endpointId,
    });
    return reply.send({ data: deliveries });
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/deliveries/:id",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const delivery = await store.getDelivery(organizationId, request.params.id);
      if (!delivery) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send(delivery);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/deliveries/:id/replay",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const delivery = await store.getDelivery(organizationId, request.params.id);
      if (!delivery) {
        return reply.status(404).send({ error: "not_found" });
      }

      if (delivery.status === "succeeded") {
        return reply.status(409).send({
          error: "replay_not_allowed",
          message: "Cannot replay a successful delivery",
        });
      }

      if (delivery.status !== "dead_lettered" && delivery.status !== "failed") {
        return reply.status(409).send({
          error: "replay_not_allowed",
          message: "Only failed or dead-lettered deliveries can be replayed",
        });
      }

      const { prisma } = await import("../db/client.js");
      await prisma.$transaction(async (tx) => {
        await tx.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "pending",
            nextRetryAt: null,
            errorMessage: null,
          },
        });
        await tx.outboxEvent.create({
          data: {
            id: generatePrefixedId("obx"),
            deliveryId: delivery.id,
            status: "pending",
            availableAt: new Date(),
          },
        });
      });

      return reply.status(202).send({
        id: delivery.id,
        status: "replay_accepted",
      });
    },
  );
}
