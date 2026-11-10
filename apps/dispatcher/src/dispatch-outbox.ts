import { createDeliveryJobPublisher } from "@hooklab/queue";
import { prisma } from "./db/client.js";

const publisher = createDeliveryJobPublisher();

export type DispatchBatchResult = {
  claimed: number;
  published: number;
};

const OUTBOX_PUBLISHING_LEASE_MS = Number(
  process.env.OUTBOX_PUBLISHING_LEASE_MS ?? "60000",
);

async function resetStuckPublishingRows(): Promise<void> {
  const staleBefore = new Date(Date.now() - OUTBOX_PUBLISHING_LEASE_MS);
  await prisma.outboxEvent.updateMany({
    where: { status: "publishing", createdAt: { lt: staleBefore } },
    data: { status: "pending" },
  });
}

export async function dispatchOutboxBatch(
  batchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? "25"),
): Promise<DispatchBatchResult> {
  await resetStuckPublishingRows();

  const now = new Date();
  const pending = await prisma.outboxEvent.findMany({
    where: {
      status: "pending",
      availableAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let published = 0;

  for (const row of pending) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: row.id, status: "pending" },
      data: { status: "publishing" },
    });
    if (claimed.count === 0) continue;

    try {
      await publisher.enqueueDeliveryJob(row.deliveryId, {
        jobId: `${row.deliveryId}:${row.id}`,
      });
      await prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });
      published += 1;
    } catch (err) {
      await prisma.outboxEvent.update({
        where: { id: row.id },
        data: { status: "pending" },
      });
      console.error(
        JSON.stringify({
          level: "error",
          msg: "outbox_publish_failed",
          outboxId: row.id,
          deliveryId: row.deliveryId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  return { claimed: pending.length, published };
}

export async function closeDispatcher(): Promise<void> {
  await publisher.close();
  await prisma.$disconnect();
}
