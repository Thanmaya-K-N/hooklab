import { randomBytes } from "node:crypto";

export function generatePrefixedId(prefix: string, byteLength = 8): string {
  const suffix = randomBytes(byteLength).toString("hex");
  return `${prefix}_${suffix}`;
}

export function generateEndpointSecret(): string {
  return randomBytes(32).toString("hex");
}
