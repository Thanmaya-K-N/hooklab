export type QueueMetrics = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

export type DeliveryJobPublisher = {
  enqueueDeliveryJobs(deliveryIds: string[]): Promise<void>;
  enqueueDeliveryJob(
    deliveryId: string,
    options?: { jobId?: string },
  ): Promise<void>;
  getQueueMetrics(): Promise<QueueMetrics>;
  close(): Promise<void>;
};

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

export async function pingRedis(): Promise<boolean> {
  return true;
}
