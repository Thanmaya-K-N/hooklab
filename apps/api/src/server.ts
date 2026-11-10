import { createDeliveryJobPublisher } from "@hooklab/queue";
import { buildApi } from "./app.js";
import { createPrismaStore } from "./store/prisma-store.js";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number(process.env.API_PORT ?? "3000");

const store = createPrismaStore();
const deliveryJobPublisher = createDeliveryJobPublisher();
const { app } = await buildApi({
  logger: true,
  store,
  auth: true,
  deliveryJobPublisher,
});

const close = async () => {
  await deliveryJobPublisher.close();
  await app.close();
};

process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());

try {
  await app.listen({ host, port });
  app.log.info(`HookLab API listening at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
