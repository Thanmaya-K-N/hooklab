import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../plugins/auth.js";
import type { HookLabStore } from "../store/types.js";
import { toPublicEndpoint } from "../store/types.js";
import {
  getWebhookUrlPolicyFromEnv,
  validateEndpointUrl,
  validateSubscribedEvents,
  type UpdateEndpointInput,
} from "@hooklab/shared";

const webhookUrlPolicy = getWebhookUrlPolicyFromEnv();

export async function registerEndpointRoutes(
  app: FastifyInstance,
  store: HookLabStore,
): Promise<void> {
  app.get("/api/v1/endpoints", async (request, reply) => {
    const organizationId = requireOrganizationId(request);
    const endpoints = (await store.listEndpoints(organizationId)).map(
      toPublicEndpoint,
    );
    return reply.send({ data: endpoints });
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/endpoints/:id",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const endpoint = await store.getEndpoint(organizationId, request.params.id);
      if (!endpoint) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send(toPublicEndpoint(endpoint));
    },
  );

  app.post("/api/v1/endpoints", async (request, reply) => {
    const organizationId = requireOrganizationId(request);
    const body = request.body as Record<string, unknown>;

    const urlResult = validateEndpointUrl(body.url, webhookUrlPolicy);
    if (!urlResult.ok) {
      return reply.status(400).send({ error: "validation_error", message: urlResult.error });
    }
    const eventsResult = validateSubscribedEvents(body.subscribedEvents);
    if (!eventsResult.ok) {
      return reply
        .status(400)
        .send({ error: "validation_error", message: eventsResult.error });
    }

    const description =
      body.description === undefined
        ? undefined
        : typeof body.description === "string"
          ? body.description
          : null;

    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return reply.status(400).send({
        error: "validation_error",
        message: "description must be a string when provided",
      });
    }

    const created = await store.createEndpoint(organizationId, {
      url: urlResult.value,
      description: description ?? undefined,
      subscribedEvents: eventsResult.value,
    });

    const publicView = toPublicEndpoint(created);
    return reply.status(201).send({
      ...publicView,
      signingSecret: created.secret,
    });
  });

  app.patch<{ Params: { id: string } }>(
    "/api/v1/endpoints/:id",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const body = request.body as Record<string, unknown>;
      const patch: UpdateEndpointInput = {};

      if (body.url !== undefined) {
        const urlResult = validateEndpointUrl(body.url, webhookUrlPolicy);
        if (!urlResult.ok) {
          return reply
            .status(400)
            .send({ error: "validation_error", message: urlResult.error });
        }
        patch.url = urlResult.value;
      }

      if (body.subscribedEvents !== undefined) {
        const eventsResult = validateSubscribedEvents(body.subscribedEvents);
        if (!eventsResult.ok) {
          return reply
            .status(400)
            .send({ error: "validation_error", message: eventsResult.error });
        }
        patch.subscribedEvents = eventsResult.value;
      }

      if (body.enabled !== undefined) {
        if (typeof body.enabled !== "boolean") {
          return reply.status(400).send({
            error: "validation_error",
            message: "enabled must be a boolean",
          });
        }
        patch.enabled = body.enabled;
      }

      if (body.description !== undefined) {
        if (body.description !== null && typeof body.description !== "string") {
          return reply.status(400).send({
            error: "validation_error",
            message: "description must be a string or null",
          });
        }
        patch.description = body.description;
      }

      const updated = await store.updateEndpoint(
        organizationId,
        request.params.id,
        patch,
      );
      if (!updated) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send(toPublicEndpoint(updated));
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/endpoints/:id",
    async (request, reply) => {
      const organizationId = requireOrganizationId(request);
      const deleted = await store.deleteEndpoint(organizationId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.status(204).send();
    },
  );
}
