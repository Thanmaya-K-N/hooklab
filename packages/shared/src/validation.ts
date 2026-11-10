import type { WebhookUrlPolicy } from "./webhook-url-policy.js";
import { validateWebhookHostname } from "./ssrf.js";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/i;

export function validateEventType(type: unknown): ValidationResult<string> {
  if (typeof type !== "string" || type.trim().length === 0) {
    return { ok: false, error: "type must be a non-empty string" };
  }
  if (type.length > 128) {
    return { ok: false, error: "type must be at most 128 characters" };
  }
  if (!EVENT_TYPE_PATTERN.test(type)) {
    return {
      ok: false,
      error:
        "type must look like a dotted name (e.g. task.completed)",
    };
  }
  return { ok: true, value: type };
}

export function validateEventData(
  data: unknown,
): ValidationResult<Record<string, unknown>> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "data must be a JSON object" };
  }
  return { ok: true, value: data as Record<string, unknown> };
}

export function validateEndpointUrl(
  url: unknown,
  policy: WebhookUrlPolicy = { allowLocalhost: false },
): ValidationResult<string> {
  if (typeof url !== "string" || url.trim().length === 0) {
    return { ok: false, error: "url must be a non-empty string" };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "url must be a valid absolute URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "url must use http or https" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "url must not embed credentials" };
  }
  const hostCheck = validateWebhookHostname(parsed.hostname, policy);
  if (!hostCheck.ok) {
    return hostCheck;
  }
  return { ok: true, value: parsed.toString() };
}

export function validateSubscribedEvents(
  events: unknown,
): ValidationResult<string[]> {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      ok: false,
      error: "subscribedEvents must be a non-empty array",
    };
  }
  const normalized: string[] = [];
  for (const item of events) {
    const result = validateEventType(item);
    if (!result.ok) {
      return { ok: false, error: `subscribedEvents: ${result.error}` };
    }
    if (!normalized.includes(result.value)) {
      normalized.push(result.value);
    }
  }
  return { ok: true, value: normalized };
}
