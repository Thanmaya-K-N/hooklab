import type { SampleEvent } from "./event.js";

export type PublishResult = {
  statusCode: number;
  body: unknown;
  rawBody: string;
};

export type PublishOptions = {
  webhookUrl: string;
  event: SampleEvent;
  /** Optional extra headers (HookLab adds signing headers on platform delivery). */
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Sends one JSON event to a webhook URL via HTTP POST.
 * Uses fetch + AbortSignal so timeouts behave like real delivery workers will.
 */
export async function publishEvent(options: PublishOptions): Promise<PublishResult> {
  const { webhookUrl, event, headers = {}, timeoutMs = 10_000 } = options;

  const rawBody = JSON.stringify(event);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: rawBody,
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = text.length ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }

    return {
      statusCode: response.status,
      body,
      rawBody,
    };
  } finally {
    clearTimeout(timer);
  }
}
