import { createWebhookDeliveryWorker } from "@hooklab/queue";
import { prisma } from "./db/client.js";
import { processDelivery } from "./process-delivery.js";
import { getWorkerId } from "./config.js";
import {
  recoverStaleProcessingDeliveries,
} from "./claim-delivery.js";
import { recoverStuckPublishingOutbox } from "./recover-stale-outbox.js";

const workerId = getWorkerId();
const recoveryIntervalMs = Number(
  process.env.WORKER_RECOVERY_INTERVAL_MS ?? "30000",
);

const bullWorker = createWebhookDeliveryWorker(
  async (job) => {
    const deliveryId = job.data.deliveryId;
    const result = await processDelivery(deliveryId);
    console.log(
      JSON.stringify({
        level: "info",
        msg: "delivery_job_processed",
        workerId,
        deliveryId,
        jobId: job.id,
        outcome: result.outcome,
      }),
    );
  },
  { workerId },
);

bullWorker.on("failed", (job, err) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "delivery_job_failed",
      workerId,
      jobId: job?.id,
      deliveryId: job?.data.deliveryId,
      error: err.message,
    }),
  );
});

console.log(
  JSON.stringify({
    level: "info",
    msg: "worker_started",
    workerId,
    queue: "webhook-deliveries",
    mode: "bullmq",
    recoveryIntervalMs,
  }),
);

async function runRecovery(): Promise<void> {
  const [deliveries, outbox] = await Promise.all([
    recoverStaleProcessingDeliveries(),
    recoverStuckPublishingOutbox(),
  ]);
  if (deliveries > 0 || outbox > 0) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "stale_work_recovered",
        workerId,
        deliveries,
        outbox,
      }),
    );
  }
}

void runRecovery();
const recoveryTimer = setInterval(() => {
  void runRecovery();
}, recoveryIntervalMs);

async function shutdown(): Promise<void> {
  clearInterval(recoveryTimer);
  await bullWorker.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
