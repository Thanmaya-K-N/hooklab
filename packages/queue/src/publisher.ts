import { Queue } from "bullmq";
import {
  WEBHOOK_DELIVERIES_QUEUE,
  WEBHOOK_DELIVERY_JOB_NAME,
  type WebhookDeliveryJobData,
} from "./constants.js";
import { createRedisConnectionOptions, getRedisUrl } from "./redis.js";

export type DeliveryJobPublisher = {
  enqueueDeliveryJobs(deliveryIds: string[]): Promise<void>;
  enqueueDeliveryJob(
    deliveryId: string,
    options?: { jobId?: string },
  ): Promise<void>;
  getQueueMetrics(): Promise<QueueMetrics>;
  close(): Promise<void>;
};

export type QueueMetrics = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

let sharedQueue: Queue<WebhookDeliveryJobData> | undefined;

function getQueue(): Queue<WebhookDeliveryJobData> {
  if (!sharedQueue) {
    sharedQueue = new Queue<WebhookDeliveryJobData>(WEBHOOK_DELIVERIES_QUEUE, {
      connection: createRedisConnectionOptions(getRedisUrl()),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return sharedQueue;
}

export function createDeliveryJobPublisher(): DeliveryJobPublisher {
  const queue = getQueue();
  const timeoutMs = Number(process.env.DELIVERY_TIMEOUT_MS ?? "10000");

  async function addJob(deliveryId: string, jobId?: string): Promise<void> {
    try {
      await queue.add(
        WEBHOOK_DELIVERY_JOB_NAME,
        { deliveryId },
        {
          jobId: jobId ?? deliveryId,
          timeout: timeoutMs + 5_000,
        },
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("Job already exists")) {
        return;
      }
      throw err;
    }
  }

  return {
    async enqueueDeliveryJobs(deliveryIds: string[]): Promise<void> {
      for (const deliveryId of deliveryIds) {
        await addJob(deliveryId);
      }
    },

    async enqueueDeliveryJob(deliveryId, options) {
      await addJob(deliveryId, options?.jobId);
    },

    async getQueueMetrics(): Promise<QueueMetrics> {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );
      return {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
      };
    },

    async close(): Promise<void> {
      await queue.close();
      sharedQueue = undefined;
    },
  };
}

export function createNoopDeliveryJobPublisher(): DeliveryJobPublisher {
  return {
    async enqueueDeliveryJobs() {},
    async enqueueDeliveryJob() {},
    async getQueueMetrics() {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    },
    async close() {},
  };
}
