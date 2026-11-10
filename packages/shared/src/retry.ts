export type RetryScheduleSeconds = readonly number[];

/** Default: immediate, 5s, 15s, 45s, 2m (between attempts 2–5). */
export const DEFAULT_RETRY_SCHEDULE_SECONDS: RetryScheduleSeconds = [
  0,
  5,
  15,
  45,
  120,
];

export type RetryConfig = {
  maxAttempts: number;
  scheduleSeconds: RetryScheduleSeconds;
};

export function getRetryConfigFromEnv(): RetryConfig {
  const maxAttempts = Number(process.env.DELIVERY_MAX_ATTEMPTS ?? "5");
  return {
    maxAttempts: Number.isFinite(maxAttempts) ? maxAttempts : 5,
    scheduleSeconds: DEFAULT_RETRY_SCHEDULE_SECONDS,
  };
}

/** Delay before attempt `nextAttemptNumber` (1-based) after a failure. */
export function computeRetryDelayMs(
  nextAttemptNumber: number,
  config: RetryConfig = getRetryConfigFromEnv(),
): number {
  const schedule = config.scheduleSeconds;
  const index = Math.min(
    Math.max(nextAttemptNumber - 1, 0),
    schedule.length - 1,
  );
  return schedule[index]! * 1000;
}

export function isRetryableHttpStatus(statusCode: number): boolean {
  if (statusCode === 408) return true;
  if (statusCode === 429) return true;
  if (statusCode >= 500) return true;
  return false;
}

export function isRetryableDeliveryError(options: {
  statusCode?: number;
  errorMessage: string;
}): boolean {
  if (options.errorMessage.startsWith("ssrf_blocked")) {
    return false;
  }
  if (options.errorMessage === "endpoint_disabled") {
    return false;
  }
  if (options.statusCode === undefined) {
    return true;
  }
  return isRetryableHttpStatus(options.statusCode);
}

export function parseRetryAfterHeader(
  header: string | undefined,
): number | undefined {
  if (!header) return undefined;
  const asSeconds = Number.parseInt(header, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return undefined;
}
