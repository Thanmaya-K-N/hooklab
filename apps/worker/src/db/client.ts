import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { workerPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.workerPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.workerPrisma = prisma;
}
