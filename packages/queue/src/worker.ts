import { Worker, type Processor } from "bullmq";
import {
  WEBHOOK_DELIVERIES_QUEUE,
  type WebhookDeliveryJobData,
} from "./constants.js";
import { createRedisConnectionOptions, getRedisUrl } from "./redis.js";

export type CreateWebhookDeliveryWorkerOptions = {
  concurrency?: number;
  workerId?: string;
  connectionUrl?: string;
};

export function createWebhookDeliveryWorker(
  processor: Processor<WebhookDeliveryJobData>,
  options: CreateWebhookDeliveryWorkerOptions = {},
): Worker<WebhookDeliveryJobData> {
  const concurrency = Number(
    options.concurrency ?? process.env.WORKER_CONCURRENCY ?? "5",
  );

  return new Worker<WebhookDeliveryJobData>(WEBHOOK_DELIVERIES_QUEUE, processor, {
    connection: createRedisConnectionOptions(
      options.connectionUrl ?? getRedisUrl(),
    ),
    concurrency,
  });
}
