import type { FastifyInstance } from "fastify";
import type { DeliveryJobPublisher } from "@hooklab/queue";
import { requireOrganizationId } from "../plugins/auth.js";

export async function registerMetricsRoutes(
  app: FastifyInstance,
  publisher: DeliveryJobPublisher,
): Promise<void> {
  app.get("/api/v1/metrics", async (request, reply) => {
    requireOrganizationId(request);

    const organizationId = request.organizationId!;
    const queue = await publisher.getQueueMetrics();

    const { prisma } = await import("../db/client.js");
    const deliveryCounts = await prisma.webhookDelivery.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      deliveryCounts.map((row) => [row.status, row._count._all]),
    );

    const eventsTotal = await prisma.event.count({
      where: { organizationId },
    });

    return reply.send({
      queue: {
        name: "webhook-deliveries",
        ...queue,
      },
      deliveries: {
        byStatus,
      },
      events: {
        total: eventsTotal,
      },
    });
  });
}
