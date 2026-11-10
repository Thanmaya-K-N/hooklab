import dns from "node:dns/promises";
import { isIP } from "node:net";
import type { ValidationResult } from "./validation.js";
import type { WebhookUrlPolicy } from "./webhook-url-policy.js";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

const METADATA_IPV4 = "169.254.169.254";

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  return false;
}

function isBlockedIpAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

export function validateWebhookHostname(
  hostname: string,
  policy: WebhookUrlPolicy,
): ValidationResult<string> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(normalized)) {
    if (policy.allowLocalhost && normalized === "localhost") {
      return { ok: true, value: hostname };
    }
    return {
      ok: false,
      error: "url hostname is not allowed (blocked host)",
    };
  }

  if (normalized.endsWith(".localhost") && !policy.allowLocalhost) {
    return { ok: false, error: "url hostname is not allowed (localhost suffix)" };
  }

  const literalFamily = isIP(normalized);
  if (literalFamily === 4 || literalFamily === 6) {
    if (policy.allowLocalhost && (normalized === "127.0.0.1" || normalized === "::1")) {
      return { ok: true, value: hostname };
    }
    if (isBlockedIpAddress(normalized)) {
      return { ok: false, error: "url must not target a private or loopback address" };
    }
    if (normalized === METADATA_IPV4) {
      return { ok: false, error: "url must not target cloud metadata endpoints" };
    }
  }

  return { ok: true, value: hostname };
}

export async function assertResolvableSafeWebhookUrl(
  urlString: string,
  policy: WebhookUrlPolicy,
): Promise<ValidationResult<string>> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "url must be a valid absolute URL" };
  }

  const hostCheck = validateWebhookHostname(parsed.hostname, policy);
  if (!hostCheck.ok) return hostCheck;

  const literalFamily = isIP(parsed.hostname);
  if (literalFamily !== 0) {
    return { ok: true, value: urlString };
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: "url hostname could not be resolved" };
  }

  if (records.length === 0) {
    return { ok: false, error: "url hostname could not be resolved" };
  }

  for (const record of records) {
    if (policy.allowLocalhost && (record.address === "127.0.0.1" || record.address === "::1")) {
      continue;
    }
    if (record.address === METADATA_IPV4) {
      return {
        ok: false,
        error: "url resolves to a blocked destination (metadata)",
      };
    }
    if (isBlockedIpAddress(record.address)) {
      return {
        ok: false,
        error: "url resolves to a private or loopback address",
      };
    }
  }

  return { ok: true, value: urlString };
}

export const SSRF_ERROR_PREFIX = "ssrf_blocked";

export function formatSsrfBlockedError(detail: string): string {
  return `${SSRF_ERROR_PREFIX}: ${detail}`;
}
