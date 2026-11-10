export function getEncryptionKeyHex(): string {
  const key = process.env.ENDPOINT_SECRET_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENDPOINT_SECRET_ENCRYPTION_KEY is required for the worker");
  }
  return key;
}

export function getPollIntervalMs(): number {
  return Number(process.env.WORKER_POLL_INTERVAL_MS ?? "2000");
}

export function getWorkerId(): string {
  return process.env.WORKER_ID ?? `worker_${process.pid}`;
}
