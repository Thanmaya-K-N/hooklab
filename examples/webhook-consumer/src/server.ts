import { buildConsumer } from "./app.js";

const host = process.env.CONSUMER_HOST ?? "127.0.0.1";
const port = Number(process.env.CONSUMER_PORT ?? "4000");

const app = await buildConsumer({ logger: true });

try {
  await app.listen({ host, port });
  app.log.info(`Sample webhook consumer listening at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
