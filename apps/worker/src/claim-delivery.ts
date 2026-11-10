import { generatePrefixedId, getProcessingLeaseMs } from "@hooklab/shared";
import { prisma } from "./db/client.js";

export async function claimDeliveryForProcessing(
  deliveryId: string,
): Promise<boolean> {
  const staleBefore = new Date(Date.now() - getProcessingLeaseMs());

  const claimed = await prisma.webhookDelivery.updateMany({
    where: {
      id: deliveryId,
      OR: [
        { status: { in: ["pending", "retrying"] } },
        { status: "processing", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "processing" },
  });

  return claimed.count === 1;
}

/** Re-queue deliveries stuck in `processing` after worker crashes. */
export async function recoverStaleProcessingDeliveries(
  batchSize = 25,
): Promise<number> {
  const staleBefore = new Date(Date.now() - getProcessingLeaseMs());
  const staleRows = await prisma.webhookDelivery.findMany({
    where: {
      status: "processing",
      updatedAt: { lt: staleBefore },
    },
    orderBy: { updatedAt: "asc" },
    take: batchSize,
  });

  let recovered = 0;

  for (const row of staleRows) {
    const didRecover = await prisma.$transaction(async (tx) => {
      const updated = await tx.webhookDelivery.updateMany({
        where: {
          id: row.id,
          status: "processing",
          updatedAt: row.updatedAt,
        },
        data: {
          status: "retrying",
          nextRetryAt: new Date(),
          errorMessage: "processing_lease_expired",
        },
      });
      if (updated.count !== 1) {
        return false;
      }

      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId("obx"),
          deliveryId: row.id,
          status: "pending",
          availableAt: new Date(),
        },
      });
      return true;
    });

    if (didRecover) recovered += 1;
  }

  return recovered;
}
