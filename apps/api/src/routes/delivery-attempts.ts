import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../plugins/auth.js";
import type { HookLabStore } from "../store/types.js";

export async function registerDeliveryAttemptRoutes(
  app: FastifyInstance,
  store: HookLabStore,
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    "/api/v1/deliveries/:id/attempts",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const attempts = await store.listDeliveryAttempts(
        organizationId,
        request.params.id,
      );
      if (attempts === null) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send({ data: attempts });
    },
  );
}
