import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(): string {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  return url;
}

/** BullMQ connection options (ioredis-compatible). */
export async function pingRedis(url = getRedisUrl()): Promise<boolean> {
  const Redis = (await import("ioredis")).default;
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    lazyConnect: true,
  });
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

export function createRedisConnectionOptions(
  url = getRedisUrl(),
): ConnectionOptions {
  const parsed = new URL(url);
  const db =
    parsed.pathname.length > 1
      ? Number.parseInt(parsed.pathname.slice(1), 10)
      : 0;

  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || "6379", 10),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isFinite(db) ? db : 0,
    maxRetriesPerRequest: null,
  };
}
