import { createHmac, timingSafeEqual } from "node:crypto";

export const HOOKLAB_SIGNATURE_VERSION = "v1";

export type VerifyWebhookSignatureInput = {
  endpointSecret: string;
  timestampSeconds: number;
  rawBody: string;
  signatureHeader: string;
};

export type VerifyWebhookSignatureResult =
  | { ok: true }
  | { ok: false; reason: string };

/** HMAC-SHA256 over `timestamp + "." + rawBody`, hex-encoded digest. */
export function computeWebhookSignature(
  endpointSecret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  const payload = `${timestampSeconds}.${rawBody}`;
  return createHmac("sha256", endpointSecret).update(payload, "utf8").digest("hex");
}

export function formatSignatureHeader(signatureHex: string): string {
  return `${HOOKLAB_SIGNATURE_VERSION}=${signatureHex}`;
}

export function parseSignatureHeader(
  header: string,
): { version: string; digestHex: string } | null {
  const match = /^([^=]+)=(.+)$/.exec(header.trim());
  if (!match) return null;
  return { version: match[1]!, digestHex: match[2]! };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(
  input: VerifyWebhookSignatureInput,
): VerifyWebhookSignatureResult {
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) {
    return { ok: false, reason: "invalid_signature_header" };
  }
  if (parsed.version !== HOOKLAB_SIGNATURE_VERSION) {
    return { ok: false, reason: "unsupported_signature_version" };
  }

  const expected = computeWebhookSignature(
    input.endpointSecret,
    input.timestampSeconds,
    input.rawBody,
  );
  if (!safeEqualHex(expected, parsed.digestHex)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true };
}

export type ValidateTimestampResult =
  | { ok: true }
  | { ok: false; reason: "invalid_timestamp" | "stale_timestamp" };

export function validateTimestamp(
  timestampSeconds: number,
  options?: { nowSeconds?: number; toleranceSeconds?: number },
): ValidateTimestampResult {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = options?.toleranceSeconds ?? 300;
  const skew = Math.abs(now - timestampSeconds);
  if (skew > tolerance) {
    return { ok: false, reason: "stale_timestamp" };
  }
  return { ok: true };
}
