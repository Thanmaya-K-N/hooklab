export type IdempotencyKeyResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateIdempotencyKey(
  header: unknown,
): IdempotencyKeyResult | { ok: true; value: undefined } {
  if (header === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof header !== "string") {
    return { ok: false, error: "Idempotency-Key must be a string" };
  }
  const trimmed = header.trim();
  if (trimmed.length < 1 || trimmed.length > 256) {
    return {
      ok: false,
      error: "Idempotency-Key must be between 1 and 256 characters",
    };
  }
  return { ok: true, value: trimmed };
}
