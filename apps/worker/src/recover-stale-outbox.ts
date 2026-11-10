import { prisma } from "./db/client.js";

const OUTBOX_PUBLISHING_LEASE_MS = Number(
  process.env.OUTBOX_PUBLISHING_LEASE_MS ?? "60000",
);

/** Reset outbox rows stuck in `publishing` after dispatcher crashes. */
export async function recoverStuckPublishingOutbox(batchSize = 25): Promise<number> {
  const staleBefore = new Date(Date.now() - OUTBOX_PUBLISHING_LEASE_MS);
  const result = await prisma.outboxEvent.updateMany({
    where: {
      status: "publishing",
      createdAt: { lt: staleBefore },
    },
    data: { status: "pending" },
  });
  return Math.min(result.count, batchSize);
}
