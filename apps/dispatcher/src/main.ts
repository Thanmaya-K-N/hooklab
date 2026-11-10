import { closeDispatcher, dispatchOutboxBatch } from "./dispatch-outbox.js";

const pollMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? "1000");
let stopping = false;

console.log(
  JSON.stringify({
    level: "info",
    msg: "outbox_dispatcher_started",
    pollIntervalMs: pollMs,
  }),
);

while (!stopping) {
  try {
    const result = await dispatchOutboxBatch();
    if (result.published > 0) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "outbox_batch_dispatched",
          ...result,
        }),
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "outbox_dispatcher_error",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  await new Promise((resolve) => setTimeout(resolve, pollMs));
}

async function shutdown(): Promise<void> {
  stopping = true;
  await closeDispatcher();
}

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
