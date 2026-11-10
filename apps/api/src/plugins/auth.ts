import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { hashApiKey } from "@hooklab/shared";
import { prisma } from "../db/client.js";

declare module "fastify" {
  interface FastifyRequest {
    organizationId?: string;
  }
}

function isPublicApiRoute(request: FastifyRequest): boolean {
  const path = request.url.split("?")[0];
  return request.method === "GET" && path === "/api/v1/health";
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith("/api/v1/")) {
      return;
    }
    if (isPublicApiRoute(request)) {
      return;
    }

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const apiKey = header.slice("Bearer ".length).trim();
    if (!apiKey) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const apiKeyHash = hashApiKey(apiKey);
    const organization = await prisma.organization.findUnique({
      where: { apiKeyHash },
      select: { id: true },
    });

    if (!organization) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    request.organizationId = organization.id;
  });
}

export function requireOrganizationId(request: FastifyRequest): string {
  if (!request.organizationId) {
    throw new Error("organizationId missing — auth hook must run first");
  }
  return request.organizationId;
}
