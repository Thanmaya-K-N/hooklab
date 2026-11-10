import {
  computeWebhookSignature,
  formatSignatureHeader,
} from "./hmac.js";
import type { OutboundWebhookBody } from "./webhook-body.js";
import {
  assertResolvableSafeWebhookUrl,
  formatSsrfBlockedError,
} from "./ssrf.js";
import {
  getWebhookUrlPolicyFromEnv,
  type WebhookUrlPolicy,
} from "./webhook-url-policy.js";
import { validateEndpointUrl } from "./validation.js";

export type WebhookDeliveryHttpHeaders = {
  "content-type": string;
  "x-hooklab-event": string;
  "x-hooklab-delivery": string;
  "x-hooklab-timestamp": string;
  "x-hooklab-signature": string;
};

export type DeliverWebhookInput = {
  url: string;
  deliveryId: string;
  eventType: string;
  endpointSecret: string;
  body: OutboundWebhookBody;
  timeoutMs?: number;
  urlPolicy?: WebhookUrlPolicy;
};

export type DeliverWebhookResult =
  | {
      ok: true;
      statusCode: number;
      responseBody: string;
      durationMs: number;
      rawRequestBody: string;
    }
  | {
      ok: false;
      errorMessage: string;
      durationMs: number;
      statusCode?: number;
      responseBody?: string;
      rawRequestBody: string;
    };

const MAX_STORED_RESPONSE_BYTES = 4096;

export function truncateForStorage(text: string): string {
  const buf = Buffer.from(text, "utf8");
  if (buf.byteLength <= MAX_STORED_RESPONSE_BYTES) return text;
  return buf.subarray(0, MAX_STORED_RESPONSE_BYTES).toString("utf8");
}

export function buildDeliveryHeaders(
  deliveryId: string,
  eventType: string,
  timestampSeconds: number,
  rawRequestBody: string,
  endpointSecret: string,
): WebhookDeliveryHttpHeaders {
  const signatureHex = computeWebhookSignature(
    endpointSecret,
    timestampSeconds,
    rawRequestBody,
  );
  return {
    "content-type": "application/json",
    "x-hooklab-event": eventType,
    "x-hooklab-delivery": deliveryId,
    "x-hooklab-timestamp": String(timestampSeconds),
    "x-hooklab-signature": formatSignatureHeader(signatureHex),
  };
}

export async function deliverWebhook(
  input: DeliverWebhookInput,
): Promise<DeliverWebhookResult> {
  const policy = input.urlPolicy ?? getWebhookUrlPolicyFromEnv();
  const urlCheck = validateEndpointUrl(input.url, policy);
  if (!urlCheck.ok) {
    return {
      ok: false,
      errorMessage: formatSsrfBlockedError(urlCheck.error),
      durationMs: 0,
      rawRequestBody: JSON.stringify(input.body),
    };
  }

  const resolveCheck = await assertResolvableSafeWebhookUrl(urlCheck.value, policy);
  if (!resolveCheck.ok) {
    return {
      ok: false,
      errorMessage: formatSsrfBlockedError(resolveCheck.error),
      durationMs: 0,
      rawRequestBody: JSON.stringify(input.body),
    };
  }

  const rawRequestBody = JSON.stringify(input.body);
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const headers = buildDeliveryHeaders(
    input.deliveryId,
    input.eventType,
    timestampSeconds,
    rawRequestBody,
    input.endpointSecret,
  );
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? 10_000,
  );

  try {
    const response = await fetch(resolveCheck.value, {
      method: "POST",
      headers,
      body: rawRequestBody,
      signal: controller.signal,
      redirect: "manual",
    });
    const responseBody = await response.text();
    const durationMs = Date.now() - started;

    if (response.status >= 200 && response.status < 300) {
      return {
        ok: true,
        statusCode: response.status,
        responseBody: truncateForStorage(responseBody),
        durationMs,
        rawRequestBody,
      };
    }

    return {
      ok: false,
      errorMessage: `HTTP ${response.status}`,
      statusCode: response.status,
      responseBody: truncateForStorage(responseBody),
      durationMs,
      rawRequestBody,
    };
  } catch (err) {
    const durationMs = Date.now() - started;
    const message =
      err instanceof Error ? err.message : "Unknown delivery error";
    return {
      ok: false,
      errorMessage: message,
      durationMs,
      rawRequestBody,
    };
  } finally {
    clearTimeout(timer);
  }
}
